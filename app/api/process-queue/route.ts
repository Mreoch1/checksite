/**
 * Process queue endpoint - processes one pending audit at a time
 * This endpoint is called by Netlify's scheduled functions (cron jobs) every 2 minutes
 * 
 * IMPORTANT: With Netlify Pro (26s timeout), this endpoint:
 * - Attempts full audit processing with early return if timeout approaches
 * - Processing continues in background after function returns
 * - Fast operations (email sending) complete within timeout
 * - Full audits may timeout but continue processing in background
 * 
 * The cron job is configured in netlify.toml and managed via Netlify CLI
 * 
 * ⸻
 * 
 * CORRECTNESS INVARIANTS:
 * 
 * 1. Atomic Claim: Only one worker can claim a queue item at a time.
 *    - RPC function `claim_oldest_audit_queue()` uses FOR UPDATE SKIP LOCKED
 *    - Fallback uses UPDATE ... WHERE status='pending' (atomic check)
 * 
 * 2. Email Deduplication: Each audit sends exactly one email.
 *    - Atomic reservation: UPDATE audits SET email_sent_at=? WHERE id=? AND email_sent_at IS NULL
 *    - Audit is considered complete if it has report AND real email_sent_at (not 'sending_...')
 *    - Status is reconciled to 'completed' if report/email exists regardless of status field
 * 
 * 3. Queue State Machine:
 *    - pending → processing (via atomic claim)
 *    - processing → completed (when email sent and report exists)
 *    - processing → failed (on permanent error or max retries)
 *    - processing → pending (on transient error with retries left)
 * 
 * 4. Audit State Machine:
 *    - pending → running (when queued)
 *    - running → completed (when report generated and email sent)
 *    - running → failed (on permanent error)
 *    - Status reconciliation: If report exists OR email_sent_at is set, audit is functionally complete
 * 
 * 5. Fresh Reads: All critical reads use supabasePrimary (service role client) to avoid replica lag.
 *    - Per-item verification before processing
 *    - Final sanity check right before processAudit()
 *    - Post-claim verification after atomic claim
 * 
 * 6. Idempotency: All queue updates are conditional on current status to prevent races.
 *    - markQueueItemCompletedWithLogging: .eq('status', 'processing')
 *    - markQueueItemFailedWithLogging: .in('status', ['pending', 'processing'])
 */

import { NextRequest, NextResponse } from 'next/server'
// CRITICAL: Do NOT import anon client - queue worker must use service client only
// import { supabase } from '@/lib/supabase' // REMOVED - prevents accidental replica reads
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { processAudit } from '@/lib/process-audit'
import { getRequestId } from '@/lib/request-id'
import { isEmailSent, isEmailSending, getEmailSentAtAge } from '@/lib/email-status'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// CRITICAL: Create exactly ONE primary client for this worker
// This is the ONLY Supabase client used in this file - all reads and writes use this
// Even with service role key, Supabase may route SELECT queries to read replicas
// We rely on per-item verification and final guards to catch stale data
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for queue worker')
}

// Create the single primary client instance at module level
// This ensures all operations use the same client configuration
const supabasePrimary = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  // Note: Supabase REST API may still route SELECT queries to replicas
  // We use per-item verification and final guards to catch stale data
})

// Log client configuration once at module init
let clientConfigLogged = false
if (!clientConfigLogged) {
  console.log('[client-config] SUPABASE_URL:', SUPABASE_URL || 'NOT SET')
  console.log('[client-config] SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY 
    ? `SET (length=${SERVICE_ROLE_KEY.length}, prefix=${SERVICE_ROLE_KEY.substring(0, 10)}...)` 
    : 'NOT SET')
  console.log('[client-config] Using single primary client for all operations')
  clientConfigLogged = true
}

/**
 * Unified helper to get fresh audit state from database
 * CRITICAL: Uses supabasePrimary (the single primary client) for all reads
 * This ensures all code paths use the same client
 */
async function getFreshAuditState(
  auditId: string
): Promise<{ id: string; status: string | null; email_sent_at: string | null; formatted_report_html: string | null } | null> {
  const { data, error } = await supabasePrimary
    .from('audits')
    .select('id, status, email_sent_at, formatted_report_html')
    .eq('id', auditId)
          .single()
        
  if (error) {
    if (error.code === 'PGRST116') {
      // Audit not found
      return null
    }
    console.warn('[getFreshAuditState] Error fetching audit:', error.message)
    return null
  }
  
  return data
}

/**
 * Helper function to mark queue item as completed with improved logging
 * Differentiates between benign race conditions (already completed by another worker) and real problems
 * 
 * @param expectedStatuses - Array of statuses that the queue item might be in when we try to complete it
 *                          Defaults to ['pending'] for early-guard paths, but should be ['processing'] 
 *                          for paths after processing has started, or ['pending', 'processing'] to cover both
 */
async function markQueueItemCompletedWithLogging(
  requestId: string,
  queueId: string,
  context: string = 'completion',
  expectedStatuses: ('pending' | 'processing')[] = ['pending']
): Promise<'updated' | 'already-completed' | 'not-updated'> {
  const { data: queueUpdateResult, error: queueUpdateError } = await supabasePrimary
                .from('audit_queue')
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                })
    .eq('id', queueId)
    .in('status', expectedStatuses) // Update if in any of the expected statuses
    .select('id, status')
  
  const updated_rows = queueUpdateResult?.length ?? 0
  
  if (queueUpdateError) {
    console.error(`[${requestId}] [queue-complete] Update error for queueId=${queueId} (context: ${context}):`, queueUpdateError)
    return 'not-updated'
  }
  
  if (updated_rows === 0) {
    // Re-read the row to see what actually happened
    const { data: row, error: readError } = await supabasePrimary
                .from('audit_queue')
      .select('status')
      .eq('id', queueId)
      .maybeSingle()
    
    if (readError) {
      console.warn(`[${requestId}] [queue-complete] No rows updated and failed to read row (queueId=${queueId}, context: ${context}):`, readError)
      return 'not-updated'
    } else if (!row) {
      console.warn(`[${requestId}] [queue-complete] No rows updated and row missing (queueId=${queueId}, context: ${context})`)
      return 'not-updated'
    } else if (row.status === 'completed') {
      // Benign race: another worker completed it first
      console.log(`[${requestId}] [queue-complete] Row already completed by another worker (queueId=${queueId}, context: ${context})`)
      return 'already-completed'
    } else {
      console.warn(`[${requestId}] [queue-complete] No rows updated, row still not completed (queueId=${queueId}, db_status=${row.status}, context: ${context}, expected: ${expectedStatuses.join(', ')})`)
      return 'not-updated'
    }
  } else {
    console.log(`[${requestId}] [queue-complete] queueId=${queueId}, updated_rows=${updated_rows}, status=completed (context: ${context})`)
    return 'updated'
  }
}

/**
 * Helper function to mark queue item as failed with improved logging
 * Similar to markQueueItemCompletedWithLogging but sets status to 'failed' instead
 * 
 * @param expectedStatuses - Array of statuses that the queue item might be in when we try to fail it
 *                          Typically ['pending', 'processing'] to cover both states
 */
async function markQueueItemFailedWithLogging(
  requestId: string,
  queueId: string,
  context: string,
  errorMessage: string,
  expectedStatuses: ('pending' | 'processing')[] = ['pending', 'processing']
): Promise<'updated' | 'already-terminal' | 'not-updated'> {
  const { data: queueUpdateResult, error: queueUpdateError } = await supabasePrimary
        .from('audit_queue')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      last_error: errorMessage.substring(0, 1000), // Limit error message size
    })
    .eq('id', queueId)
    .in('status', expectedStatuses) // Update if in any of the expected statuses
    .select('id, status')
  
  const updated_rows = queueUpdateResult?.length ?? 0
  
  if (queueUpdateError) {
    console.error(`[${requestId}] [queue-fail] Update error for queueId=${queueId} (context: ${context}):`, queueUpdateError)
    return 'not-updated'
  }
  
  if (updated_rows === 0) {
    // Re-read the row to see what actually happened
    const { data: row, error: readError } = await supabasePrimary
      .from('audit_queue')
      .select('status')
      .eq('id', queueId)
      .maybeSingle()
    
    if (readError) {
      console.warn(`[${requestId}] [queue-fail] No rows updated and failed to read row (queueId=${queueId}, context: ${context}):`, readError)
      return 'not-updated'
    } else if (!row) {
      console.warn(`[${requestId}] [queue-fail] No rows updated and row missing (queueId=${queueId}, context: ${context})`)
      return 'not-updated'
    } else if (row.status === 'failed' || row.status === 'completed') {
      // Benign race: another worker already marked it as terminal
      console.log(`[${requestId}] [queue-fail] Row already marked as terminal by another worker (queueId=${queueId}, db_status=${row.status}, context: ${context})`)
      return 'already-terminal'
        } else {
      console.warn(`[${requestId}] [queue-fail] No rows updated, row still not failed (queueId=${queueId}, db_status=${row.status}, context: ${context}, expected: ${expectedStatuses.join(', ')})`)
      return 'not-updated'
        }
      } else {
    console.log(`[${requestId}] [queue-fail] queueId=${queueId}, updated_rows=${updated_rows}, status=failed (context: ${context})`)
    return 'updated'
  }
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  console.log(`[${requestId}] /api/process-queue called`)
  
  // CRITICAL: Log request timestamp to detect stale responses
  const requestTimestamp = new Date().toISOString()
  console.log(`[${requestId}] [request-start] timestamp=${requestTimestamp}`)
  
  // CRITICAL: Log database connection info for debugging
  console.log(`[${requestId}] [db-check] Connecting to: ${SUPABASE_URL}`)
  console.log(`[${requestId}] [db-check] Service key prefix: ${SERVICE_ROLE_KEY?.substring(0, 10)}...`)
  
  // Verify database connection by checking queue table count
  try {
    const { count, error: countError } = await supabasePrimary
              .from('audit_queue')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error(`[${requestId}] [db-check] ❌ Database connection error:`, countError)
            } else {
      console.log(`[${requestId}] [db-check] ✅ Connected to database - audit_queue has ${count} row(s)`)
    }
  } catch (dbCheckErr) {
    console.error(`[${requestId}] [db-check] ❌ Failed to verify database:`, dbCheckErr)
  }
  
  // CRITICAL: Use the single primary client for all database operations
  // This is the ONLY client used in this worker - all reads and writes use supabasePrimary
  // Note: Even with service role key, Supabase REST API may route SELECT queries to replicas
  // We use per-item verification and final guards to catch stale data
  
  try {
    // Optional: Add basic auth to prevent unauthorized access
      // Supports both Bearer token header and query parameter (for Netlify cron job setup)
    const expectedSecret = process.env.QUEUE_SECRET
    
    if (expectedSecret) {
      const authHeader = request.headers.get('authorization')
      const querySecret = request.nextUrl.searchParams.get('secret')
      
      // Check both header and query parameter
      const headerValid = authHeader === `Bearer ${expectedSecret}`
      const queryValid = querySecret === expectedSecret
      
      if (!headerValid && !queryValid) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // CRITICAL: Atomically claim one pending queue item using PostgreSQL function
    // This runs in a single transaction on the primary database, eliminating stale read issues
    // The function uses FOR UPDATE SKIP LOCKED for safe concurrent access
    // Step 1+2 combined: atomically claim oldest pending queue item via RPC
    // If RPC fails (e.g., schema cache not refreshed), fall back to SELECT+UPDATE approach
    console.log(`[${requestId}] [atomic-claim] Attempting to claim queue item via RPC function...`)
    const { data: claimedRows, error: claimError } = await supabasePrimary
      .rpc('claim_oldest_audit_queue')
    
    // Declare queueItem at function scope so it's accessible throughout
    let queueItem: any = null
    
    if (claimError) {
      // RPC failed - likely schema cache not refreshed or function doesn't exist
      // Fall back to the SELECT+UPDATE approach with auto-resolve
      console.warn(`[${requestId}] [atomic-claim] RPC failed (code=${claimError.code}), falling back to SELECT+UPDATE approach:`, claimError.message)
      console.log(`[${requestId}] [atomic-claim] Using fallback method: SELECT+UPDATE`)
      
      // Fallback: Two-step approach with auto-resolve for stale rows
      const { data: oldestPending, error: findOldestError } = await supabasePrimary
        .from('audit_queue')
        .select('id, retry_count')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      
      if (findOldestError || !oldestPending) {
        console.log(`[${requestId}] [atomic-claim-fallback] No pending queue items available`)
        // Will check for stuck items below
      } else {
        // Step 2: Atomically claim the oldest pending item by updating it to 'processing'
        const { data: claimedRow, error: updateError } = await supabasePrimary
              .from('audit_queue')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
            retry_count: (oldestPending.retry_count || 0) + 1,
          })
          .eq('id', oldestPending.id)
          .eq('status', 'pending') // CRITICAL: Only update if still pending (atomic claim)
          .select('*, audits!inner(id, status, email_sent_at, formatted_report_html, url, customers(email))')
              .single()
            
        if (updateError || !claimedRow) {
          // Claim failed - another worker got it first, or item no longer pending
          if (updateError?.code === 'PGRST116') {
            console.log(
              `[${requestId}] [atomic-claim-fallback] Failed to claim item ${oldestPending.id} - already claimed or no longer pending on primary`
            )
            
            // Auto-resolve stale rows
            const { data: qRow, error: qErr } = await supabasePrimary
                .from('audit_queue')
              .select('id, status')
              .eq('id', oldestPending.id)
              .maybeSingle()
            
            if (!qErr && qRow && qRow.status !== 'pending') {
              const { error: resolveError } = await supabasePrimary
                .from('audit_queue')
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                  last_error: 'Auto-resolved stale pending row (status differed between replica and primary)',
                })
                .eq('id', oldestPending.id)
              
              if (resolveError) {
                console.error(`[${requestId}] [atomic-claim-fallback] Failed to auto-resolve stale row:`, resolveError)
              } else {
                console.log(
                  `[${requestId}] [atomic-claim-fallback] ✅ Auto-resolved stale row ${oldestPending.id} with status=${qRow.status}`
                )
              }
            }
          } else {
            console.error(`[${requestId}] [atomic-claim-fallback] Error claiming queue item:`, updateError)
          }
          
          return NextResponse.json({
            success: true,
            message: 'No pending audits available for this run (stale row auto-resolved if detected)',
            processed: false,
          })
        }
        
        // Successfully claimed via fallback
        queueItem = claimedRow
        const audit = Array.isArray(claimedRow.audits) ? claimedRow.audits[0] : claimedRow.audits
        const ageMinutes = Math.round((Date.now() - new Date(claimedRow.created_at).getTime()) / 1000 / 60)
        console.log(
          `[${requestId}] [atomic-claim-fallback] ✅ Claimed queue item: ` +
          `id=${claimedRow.id}, audit_id=${claimedRow.audit_id}, age=${ageMinutes}m`
        )
        
        // Post-claim verification for fallback path (same as RPC path)
        if (queueItem.audit_id) {
          const { data: auditStatusCheck } = await supabasePrimary
            .from('audits')
            .select('status, email_sent_at')
            .eq('id', queueItem.audit_id)
            .single()
          
          if (auditStatusCheck) {
            if (auditStatusCheck.email_sent_at && 
                !auditStatusCheck.email_sent_at.startsWith('sending_') && 
                auditStatusCheck.email_sent_at.length > 10) {
              const emailAge = Math.round((Date.now() - new Date(auditStatusCheck.email_sent_at).getTime()) / 1000 / 60)
              console.log(`[${requestId}] [post-claim-verify] Audit ${queueItem.audit_id} already has email_sent_at=${auditStatusCheck.email_sent_at} (${emailAge}m old) - releasing claim and marking queue as completed`)
              await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'post-claim-verify-email-sent', ['processing'])
              return NextResponse.json({
                success: true,
                message: 'Audit skipped - email already sent (caught after atomic claim)',
                processed: false,
                auditId: queueItem.audit_id,
                email_sent_at: auditStatusCheck.email_sent_at,
              })
            }
            
            if (auditStatusCheck.status === 'completed') {
              console.log(`[${requestId}] [post-claim-verify] Audit ${queueItem.audit_id} is already completed - releasing claim and marking queue as completed`)
              await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'post-claim-verify-audit-completed', ['processing'])
              return NextResponse.json({
                success: true,
                message: 'Audit skipped - already completed (caught after atomic claim)',
                processed: false,
                auditId: queueItem.audit_id,
              })
            }
            
            if (auditStatusCheck.status === 'failed') {
              console.log(`[${requestId}] [post-claim-verify] Audit ${queueItem.audit_id} is already failed - releasing claim and marking queue as failed`)
              await markQueueItemFailedWithLogging(
                requestId,
                queueItem.id,
                'post-claim-verify-audit-failed',
                'Audit already marked as failed - skipping reprocessing',
                ['processing']
              )
              return NextResponse.json({
                success: true,
                message: 'Audit skipped - already failed (caught after atomic claim)',
                processed: false,
                auditId: queueItem.audit_id,
              })
            }
          }
        }
      }
    } else {
      // RPC succeeded - process the claimed row
      if (!claimedRows || claimedRows.length === 0) {
        console.log(`[${requestId}] [atomic-claim] RPC returned 0 rows - no pending queue items available`)
        // No pending items - check for stuck processing items below
      } else {
        // Exactly one row from the UPDATE ... RETURNING
        const claimedRow = claimedRows[0]
        console.log(`[${requestId}] [atomic-claim] ✅ RPC succeeded - claimed queue item: id=${claimedRow.id}, audit_id=${claimedRow.audit_id}`)
        console.log(`[${requestId}] [atomic-claim] 🔍 TRACKING: Will process audit ${claimedRow.audit_id} from queue ${claimedRow.id}`)
        
        // CRITICAL: Immediately verify the claimed row exists and is in processing status
        // This prevents processing non-existent or already-completed items
        const { data: verifyClaimed, error: verifyError } = await supabasePrimary
        .from('audit_queue')
          .select('id, audit_id, status')
          .eq('id', claimedRow.id)
        .single()
      
        if (verifyError || !verifyClaimed) {
          console.error(`[${requestId}] [atomic-claim] ❌ CRITICAL: Claimed row ${claimedRow.id} not found after claim:`, verifyError)
          return NextResponse.json({
            success: false,
            message: 'Claimed queue item not found after claim',
            processed: false,
          }, { status: 500 })
        }
        
        if (verifyClaimed.status !== 'processing') {
          console.warn(`[${requestId}] [atomic-claim] ⚠️  Claimed row ${claimedRow.id} has status '${verifyClaimed.status}' (expected 'processing')`)
          // Row was claimed but status changed - another worker may have processed it
          return NextResponse.json({
            success: true,
            message: 'Queue item was processed by another worker',
            processed: false,
          })
        }
        
        if (verifyClaimed.audit_id !== claimedRow.audit_id) {
          console.error(`[${requestId}] [atomic-claim] ❌ CRITICAL: Audit ID mismatch! Claimed: ${claimedRow.audit_id}, Verified: ${verifyClaimed.audit_id}`)
          return NextResponse.json({
            success: false,
            message: 'Audit ID mismatch after claim',
            processed: false,
          }, { status: 500 })
        }
        
        console.log(`[${requestId}] [atomic-claim] ✅ Verified claimed row: id=${verifyClaimed.id}, audit_id=${verifyClaimed.audit_id}, status=${verifyClaimed.status}`)
        
        // CRITICAL: Verify the claimed row is actually in 'processing' status
        // If the RPC function somehow returned a row that's already completed/failed, skip it
        if (claimedRow.status !== 'processing') {
          console.warn(
            `[${requestId}] [atomic-claim] ⚠️  RPC returned row with status='${claimedRow.status}' (expected 'processing') - ` +
            `this should not happen. Row may have been completed between SELECT and UPDATE. Skipping.`
          )
          // Mark as completed if it's already completed, or failed if it's failed
          if (claimedRow.status === 'completed') {
            console.log(`[${requestId}] [atomic-claim] Row ${claimedRow.id} already completed - skipping`)
          } else if (claimedRow.status === 'failed') {
            console.log(`[${requestId}] [atomic-claim] Row ${claimedRow.id} already failed - skipping`)
          }
          // Return early - no work available (row was already processed)
          return NextResponse.json({
            success: true,
            message: 'No pending audits available (claimed row was already processed)',
            processed: false,
          })
        }
        
        // Fetch the audit data with join (RPC doesn't return joined data)
        const { data: queueItemWithAudit, error: auditFetchError } = await supabasePrimary
          .from('audit_queue')
          .select('*, audits!inner(id, status, email_sent_at, formatted_report_html, url, customers(email))')
          .eq('id', claimedRow.id)
          .single()
        
        if (auditFetchError || !queueItemWithAudit) {
          console.error(`[${requestId}] [atomic-claim] Failed to fetch audit data for claimed item:`, auditFetchError)
          return NextResponse.json({
            success: false,
            message: 'Failed to fetch audit data for claimed item',
            processed: false,
          }, { status: 500 })
        }
        
        // CRITICAL: Double-check the queue row status after fetching (handles any race conditions)
        if (queueItemWithAudit.status !== 'processing') {
          console.warn(
            `[${requestId}] [atomic-claim] ⚠️  Queue row ${queueItemWithAudit.id} status changed to '${queueItemWithAudit.status}' ` +
            `after claim (expected 'processing') - another worker may have processed it. Skipping.`
          )
          return NextResponse.json({
            success: true,
            message: 'No pending audits available (queue row was processed by another worker)',
            processed: false,
          })
        }
        
        const audit = Array.isArray(queueItemWithAudit.audits) ? queueItemWithAudit.audits[0] : queueItemWithAudit.audits
        
        // CRITICAL: Fresh read of audit to check email_sent_at
        // Use direct query instead of RPC to avoid replica routing issues
        // This catches cases where the queue row is still pending but the audit is already done
        const { data: freshAuditCheck, error: freshCheckError } = await supabasePrimary
          .from('audits')
          .select('email_sent_at, status, formatted_report_html')
          .eq('id', queueItemWithAudit.audit_id)
          .single()
        
        // Log what the fresh read found for debugging
        console.log(
          `[${requestId}] [atomic-claim-fresh-read] audit_id=${queueItemWithAudit.audit_id}, ` +
          `fresh_email_sent_at=${freshAuditCheck?.email_sent_at || 'null'}, ` +
          `fresh_status=${freshAuditCheck?.status || 'null'}, ` +
          `joined_email_sent_at=${audit?.email_sent_at || 'null'}, ` +
          `query_error=${freshCheckError ? freshCheckError.message : 'none'}`
        )
        
        // CRITICAL: Check if audit already has email sent BEFORE processing
        // Use fresh read instead of joined data to avoid stale reads
        if (freshAuditCheck?.email_sent_at && 
            !freshAuditCheck.email_sent_at.startsWith('sending_') && 
            freshAuditCheck.email_sent_at.length > 10) {
          const emailAge = Math.round((Date.now() - new Date(freshAuditCheck.email_sent_at).getTime()) / 1000 / 60)
          console.log(
            `[${requestId}] [atomic-claim] ⚠️  Audit ${queueItemWithAudit.audit_id} already has email_sent_at=${freshAuditCheck.email_sent_at} ` +
            `(${emailAge}m old) - marking queue as completed and skipping processing`
          )
          await markQueueItemCompletedWithLogging(requestId, queueItemWithAudit.id, 'rpc-claim-audit-already-emailed', ['processing'])
          return NextResponse.json({
            success: true,
            message: 'Audit skipped - email already sent (detected after RPC claim)',
            processed: false,
            auditId: queueItemWithAudit.audit_id,
            email_sent_at: freshAuditCheck.email_sent_at,
          })
        }
        
        const ageMinutes = Math.round((Date.now() - new Date(queueItemWithAudit.created_at).getTime()) / 1000 / 60)
        console.log(
          `[${requestId}] [atomic-claim] ✅ Claimed queue item: ` +
          `id=${queueItemWithAudit.id}, audit_id=${queueItemWithAudit.audit_id}, age=${ageMinutes}m, ` +
          `audit_data=${audit ? 'present' : 'MISSING'}, email_sent=${audit?.email_sent_at || 'null'}`
        )
        
        // Use queueItemWithAudit for the rest of the processing
        queueItem = queueItemWithAudit
        console.log(`[${requestId}] [atomic-claim] 🔍 TRACKING: Set queueItem.audit_id=${queueItem.audit_id}, queueItem.id=${queueItem.id}`)
        
        // CRITICAL: Verify the claimed item is still valid before processing
        // Even though we atomically claimed it, we should verify the audit hasn't been completed
        // This is a safety net, not the primary locking mechanism
        if (queueItem.audit_id) {
          const { data: auditStatusCheck } = await supabasePrimary
          .from('audits')
            .select('status, email_sent_at')
            .eq('id', queueItem.audit_id)
          .single()
        
          if (auditStatusCheck) {
            // If audit already has email sent, release the claim and skip
            if (auditStatusCheck.email_sent_at && 
                !auditStatusCheck.email_sent_at.startsWith('sending_') && 
                auditStatusCheck.email_sent_at.length > 10) {
              const emailAge = Math.round((Date.now() - new Date(auditStatusCheck.email_sent_at).getTime()) / 1000 / 60)
              console.log(`[${requestId}] [post-claim-verify] Audit ${queueItem.audit_id} already has email_sent_at=${auditStatusCheck.email_sent_at} (${emailAge}m old) - releasing claim and marking queue as completed`)
              await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'post-claim-verify-email-sent', ['processing'])
              return NextResponse.json({
                success: true,
                message: 'Audit skipped - email already sent (caught after atomic claim)',
                processed: false,
                auditId: queueItem.audit_id,
                email_sent_at: auditStatusCheck.email_sent_at,
              })
            }
            
            // If audit is already completed, release the claim and skip
            if (auditStatusCheck.status === 'completed') {
              console.log(`[${requestId}] [post-claim-verify] Audit ${queueItem.audit_id} is already completed - releasing claim and marking queue as completed`)
              await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'post-claim-verify-audit-completed', ['processing'])
              return NextResponse.json({
                success: true,
                message: 'Audit skipped - already completed (caught after atomic claim)',
                processed: false,
                auditId: queueItem.audit_id,
              })
            }
            
            // If audit is already failed, release the claim and skip
            if (auditStatusCheck.status === 'failed') {
              console.log(`[${requestId}] [post-claim-verify] Audit ${queueItem.audit_id} is already failed - releasing claim and marking queue as failed`)
              await markQueueItemFailedWithLogging(
                requestId,
                queueItem.id,
                'post-claim-verify-audit-failed',
                'Audit already marked as failed - skipping reprocessing',
                ['processing']
              )
              return NextResponse.json({
                success: true,
                message: 'Audit skipped - already failed (caught after atomic claim)',
                processed: false,
                auditId: queueItem.audit_id,
              })
            }
          }
        }
      }
      
      // Continue with the rest of the processing logic using queueItem
      // The queueItem is already in 'processing' status, so we can proceed directly to processing
      // queueItem is now set and will be used below
      console.log(`[${requestId}] [atomic-claim] ✅ RPC path complete - queueItem.audit_id=${queueItem?.audit_id}, queueItem.id=${queueItem?.id}`)
    }
    
    // CRITICAL: Verify queueItem is set and log it before proceeding
    if (queueItem) {
      console.log(`[${requestId}] [pre-processing-check] ✅ queueItem exists: id=${queueItem.id}, audit_id=${queueItem.audit_id}, status=${queueItem.status}`)
      } else {
      console.warn(`[${requestId}] [pre-processing-check] ⚠️  queueItem is null/undefined - will check for stuck items`)
    }
    
    // If no item was claimed, check for stuck items and return
    if (!queueItem) {
      // Check for stuck processing items (processing for too long)
      const { data: stuckItems } = await supabasePrimary
        .from('audit_queue')
        .select('*, audits(*)')
        .eq('status', 'processing')
        .lt('started_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Processing for > 10 minutes
      
      if (stuckItems && stuckItems.length > 0) {
        console.warn(`[${requestId}] Found ${stuckItems.length} stuck processing items - resetting them`)
        
        const stuckQueueIds: string[] = []
        
        // Reset stuck items and update audit status
        for (const stuckItem of stuckItems) {
          const stuckAudit = stuckItem.audits as any
          const auditId = stuckItem.audit_id
          stuckQueueIds.push(stuckItem.id)
          
          // Check if audit is already completed (has report and email sent)
          const auditIsComplete = stuckAudit && 
            stuckAudit.status === 'completed' && 
            stuckAudit.email_sent_at &&
            !stuckAudit.email_sent_at.startsWith('sending_') &&
            stuckAudit.email_sent_at.length > 10
          
          if (auditIsComplete) {
            // Audit is already done - mark queue as completed directly
            console.log(`[${requestId}] [stuck-reset] Audit ${auditId} is already completed - marking queue as completed`)
            const { data: completeResult, error: completeError } = await supabasePrimary
              .from('audit_queue')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                last_error: null, // Clear any error since audit succeeded
                started_at: null, // Reset started_at
              })
              .eq('id', stuckItem.id)
              .eq('status', 'processing') // Only update if still processing
              .select('id, status')
            
            const updated_rows = completeResult?.length ?? 0
            if (completeError) {
              console.error(`[${requestId}] [stuck-reset] Error marking stuck item ${stuckItem.id} as completed:`, completeError)
            } else if (updated_rows === 0) {
              console.warn(`[${requestId}] [stuck-reset] No rows updated for stuck item ${stuckItem.id} (may have been updated by another worker)`)
            } else {
              console.log(`[${requestId}] [stuck-reset] Marked stuck item ${stuckItem.id} as completed (audit already done)`)
            }
            continue
          }
          
          // Check if audit is still running (should be failed)
          if (stuckAudit && (stuckAudit.status === 'running' || stuckAudit.status === 'pending')) {
            const errorLog = JSON.stringify({
              timestamp: new Date().toISOString(),
              error: 'Audit processing timed out - stuck in processing state for > 10 minutes',
              note: 'Queue processor detected stuck audit and reset it',
            }, null, 2)
            
            // Update audit status to failed
            await supabasePrimary
              .from('audits')
              .update({
                status: 'failed',
                error_log: errorLog,
              } as any)
              .eq('id', auditId)
            
            console.log(`[${requestId}] ✅ Reset stuck audit ${auditId} to failed status`)
          }
          
          // Reset queue item to pending (if retries left) or failed
          const shouldRetry = stuckItem.retry_count < 3
          const { data: resetResult, error: resetError } = await supabasePrimary
            .from('audit_queue')
            .update({
              status: shouldRetry ? 'pending' : 'failed',
              last_error: 'Processing timeout - stuck for > 10 minutes',
              started_at: null, // Reset started_at
            })
            .eq('id', stuckItem.id)
            .eq('status', 'processing') // CRITICAL: Only update if still processing
            .select('id, status')
          
          const reset_updated_rows = resetResult?.length ?? 0
          if (resetError) {
            console.error(`[${requestId}] [stuck-reset] Error resetting stuck item ${stuckItem.id}:`, resetError)
          } else if (reset_updated_rows === 0) {
            // Re-read to see what happened
            const { data: currentRow } = await supabasePrimary
              .from('audit_queue')
              .select('status')
              .eq('id', stuckItem.id)
              .maybeSingle()
            
            if (currentRow?.status === 'processing') {
              console.warn(`[${requestId}] [stuck-reset] No rows updated for stuck item ${stuckItem.id}, still processing (filter may not match)`)
            } else {
              console.log(`[${requestId}] [stuck-reset] Stuck item ${stuckItem.id} already updated by another worker (current status: ${currentRow?.status || 'unknown'})`)
            }
          } else {
            console.log(`[${requestId}] [stuck-reset] Reset stuck item ${stuckItem.id} to ${shouldRetry ? 'pending' : 'failed'} (updated_rows=${reset_updated_rows})`)
          }
        }
        
        // Log summary
        console.log(`[${requestId}] [stuck-reset] Attempted reset for ${stuckQueueIds.length} queue IDs: ${stuckQueueIds.join(', ')}`)
        
        return NextResponse.json({
          success: true,
          message: 'No pending audits in queue',
          processed: false,
          warning: `Reset ${stuckItems.length} stuck processing item(s)`,
          stuckItems: stuckItems.map((item: any) => ({
            id: item.id,
            audit_id: item.audit_id,
            started_at: item.started_at,
            retry_count: item.retry_count,
            reset: true,
          })),
        })
      }
      
      return NextResponse.json({
        success: true,
        message: 'No pending audits in queue',
        processed: false,
      })
    }
    
    // If we reach here, we should have a queueItem from the atomic claim above
    // But if we don't (shouldn't happen), return early
    if (!queueItem) {
      console.error(`[${requestId}] [atomic-claim] Logic error: no queueItem after atomic claim`)
      return NextResponse.json({
        success: false,
        message: 'Logic error: no queue item after atomic claim',
        processed: false,
      }, { status: 500 })
    }
    
    // CRITICAL: Log the exact queueItem we're about to process
    console.log(`[${requestId}] [processing-start] 🔍 FINAL CHECK: queueItem.id=${queueItem.id}, queueItem.audit_id=${queueItem.audit_id}, queueItem.status=${queueItem.status}`)
    
    // Continue with processing the claimed queueItem
    // All the old queueItems loop logic has been removed - we now work with a single claimedRow
    // The queueItem is already in 'processing' status from the atomic claim, so we can proceed directly to processing
    
    // Additional checks: skip if audit is already completed
    // Now we know queueItem exists, so we can safely access its properties
    const auditData = (queueItem.audits as any) || null;
    if (auditData) {
      // CRITICAL: Skip if email was already sent (not a reservation)
      // This is the PRIMARY check to prevent duplicate emails
      if (isEmailSent(auditData.email_sent_at)) {
        const emailAge = getEmailSentAtAge(auditData.email_sent_at)
        const emailAgeMinutes = emailAge ? Math.round(emailAge / 1000 / 60) : null
        console.log(
          `[${requestId}] [skip] queueId=${queueItem.id}, auditId=${queueItem.audit_id}, ` +
          `reason=email-already-sent, email_sent_at=${auditData.email_sent_at}, age=${emailAgeMinutes}m`
        )
        // Mark queue item as completed since email was sent
        // Only update if still pending (prevents repeated updates)
        const completionResult = await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'email-already-sent', ['processing'])
        console.log(
          `[${requestId}] [skip] queueId=${queueItem.id} → status=completed (result: ${completionResult})`
        )
        
        return NextResponse.json({
          success: true,
          message: 'Audit skipped - email already sent',
          processed: false,
          auditId: queueItem.audit_id,
          email_sent_at: auditData.email_sent_at,
          has_report: !!auditData.formatted_report_html,
        })
      }
      
      // Skip if email is in "sending_" state (another process is handling it)
      if (isEmailSending(auditData.email_sent_at)) {
        console.log(
          `[${requestId}] [skip] queueId=${queueItem.id}, auditId=${queueItem.audit_id}, ` +
          `reason=email-sending-in-progress, email_sent_at=${auditData.email_sent_at}`
        )
        // Don't mark as completed - let the other process handle it
        return NextResponse.json({
          success: true,
          message: 'Audit skipped - another process is sending the email',
          processed: false,
          auditId: queueItem.audit_id,
        })
      }
      
      // CRITICAL: Skip if audit has a report AND email was sent
      // BUT: If audit is completed with report but email wasn't sent, we should still process it to send the email
      if (auditData.status === 'completed' && auditData.formatted_report_html && auditData.email_sent_at) {
        console.log(
          `[${requestId}] [skip] queueId=${queueItem.id}, auditId=${queueItem.audit_id}, ` +
          `reason=already-completed-with-email, status=${auditData.status}, hasReport=true, emailSent=true`
        )
        // Mark queue item as completed
        // Only update if still pending (prevents repeated updates)
        const completionResult = await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'already-completed', ['processing'])
        console.log(
          `[${requestId}] [skip] queueId=${queueItem.id} → status=completed (result: ${completionResult})`
        )
        
        return NextResponse.json({
          success: true,
          message: 'Audit already completed (report exists and email sent)',
          processed: false,
          auditId: queueItem.audit_id,
        })
      }
      
      // If audit is completed with report but email wasn't sent, we need to send the email
      // This can happen if email sending failed during initial processing
      if (auditData.status === 'completed' && auditData.formatted_report_html && !auditData.email_sent_at) {
        console.log(`[${requestId}] ⚠️  Audit ${queueItem.audit_id} has report but email not sent - will send email only`)
        // We'll process this audit but only to send the email (skip module execution)
        // This is handled in processAudit by the early check
      }
      
      // FIX: If audit has report but status is wrong, fix it first
      if (auditData.formatted_report_html && auditData.status !== 'completed') {
        console.log(`[${requestId}] ⚠️  Audit ${queueItem.audit_id} has report but wrong status (${auditData.status}) - fixing...`)
        // Use service client for fresh read/write from primary database
        const { error: fixError } = await supabasePrimary
          .from('audits')
          .update({
            status: 'completed',
            completed_at: auditData.completed_at || new Date().toISOString(),
          })
          .eq('id', queueItem.audit_id)
        
        if (fixError) {
          console.error(`[${requestId}] Failed to fix audit status:`, fixError)
        } else {
          console.log(`[${requestId}] ✅ Fixed audit status to completed`)
          // Mark queue as completed since audit is actually done
          // Use service client and only update if still processing
          await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'status-fix', ['processing'])
          
          return NextResponse.json({
            success: true,
            message: 'Audit status fixed - had report but wrong status',
            processed: false,
            auditId: queueItem.audit_id,
            previousStatus: auditData.status,
            newStatus: 'completed',
          })
        }
      }
      
      // CRITICAL: Check retry count, but note that RPC function increments it on claim
      // So if retry_count is 3, it means it was 2 before the RPC claim (which is OK to retry)
      // Only skip if retry_count is > 3 (meaning it was already >= 3 before claim)
      // Actually, let's check the original retry_count before the RPC increment
      // The RPC increments: retry_count = coalesce(retry_count, 0) + 1
      // So if queueItem.retry_count is 3, the original was 2 (OK to process)
      // If queueItem.retry_count is 4, the original was 3 (should skip)
      const originalRetryCount = (queueItem.retry_count || 0) - 1 // RPC incremented it
      
      if (originalRetryCount >= 3) {
        console.log(`[${requestId}] Skipping audit ${queueItem.audit_id} - exceeded max retries (original: ${originalRetryCount}, after RPC increment: ${queueItem.retry_count})`)
        // Mark as failed permanently
        // Use service client for fresh write to primary database
        await supabasePrimary
          .from('audit_queue')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', queueItem.id)
        
        return NextResponse.json({
          success: true,
          message: 'Audit exceeded max retries - marked as failed',
          processed: false,
          auditId: queueItem.audit_id,
        })
      } else {
        console.log(`[${requestId}] Audit ${queueItem.audit_id} retry count OK (original: ${originalRetryCount}, after RPC: ${queueItem.retry_count}) - proceeding with processing`)
      }
    }

    const auditId = queueItem.audit_id

    // CRITICAL: Final sanity check RIGHT before processing - re-read both queue and audit on primary
    // This is the absolute last line of defense against replica lag
    // Even if all previous checks passed, this final check ensures we're seeing fresh data
    const { data: sanityQueueCheck, error: sanityQueueErr } = await supabasePrimary
      .from('audit_queue')
      .select('status, completed_at')
      .eq('id', queueItem.id)
      .single()
    
    const { data: sanityAuditCheck, error: sanityAuditErr } = await supabasePrimary
      .from('audits')
      .select('status, email_sent_at, formatted_report_html, customers(email)')
      .eq('id', auditId)
      .single()
    
    // Sanity log to prove we're seeing fresh data before processing
    console.log(`[${requestId}] [pre-process-sanity] queueId=${queueItem.id}, auditId=${auditId}, queueStatus=${sanityQueueCheck?.status || 'error'}, auditStatus=${sanityAuditCheck?.status || 'error'}, auditEmailSentAt=${sanityAuditCheck?.email_sent_at || 'null'}, auditHasReport=${!!sanityAuditCheck?.formatted_report_html}`)
    
    // If we can't read either row, abort
    if (sanityQueueErr || sanityAuditErr || !sanityQueueCheck || !sanityAuditCheck) {
      console.error(`[${requestId}] [pre-process-sanity] Failed to read final state before processing - aborting (queueErr=${!!sanityQueueErr}, auditErr=${!!sanityAuditErr})`)
      return NextResponse.json(
        { error: 'Failed to verify final state before processing', details: sanityQueueErr?.message || sanityAuditErr?.message },
        { status: 500 }
      )
    }
    
    // Final guard: abort if queue is not processing OR audit already has email sent
    // Note: queueItem should be in 'processing' status from atomic claim
    if (sanityQueueCheck.status !== 'processing') {
      console.log(`[${requestId}] [pre-process-sanity] Queue status is '${sanityQueueCheck.status}' (not processing) - aborting processing`)
      return NextResponse.json({
        success: true,
        message: 'Queue item no longer processing - skipping processing',
        processed: false,
        auditId,
        queueStatus: sanityQueueCheck.status,
      })
    }
    
    if (sanityAuditCheck.email_sent_at && 
        !sanityAuditCheck.email_sent_at.startsWith('sending_') && 
        sanityAuditCheck.email_sent_at.length > 10) {
      const emailAge = Math.round((Date.now() - new Date(sanityAuditCheck.email_sent_at).getTime()) / 1000 / 60)
      console.log(`[${requestId}] [pre-process-sanity] ⛔ ABORTING - Audit already has email_sent_at=${sanityAuditCheck.email_sent_at} (${emailAge}m old) - marking queue as completed`)
      await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'pre-process-sanity-email-sent', ['processing'])
      
      return NextResponse.json({
        success: true,
        message: 'Audit skipped - email was already sent (caught by pre-process sanity check)',
        processed: false,
        auditId,
        email_sent_at: sanityAuditCheck.email_sent_at,
      })
    }
    
    if (sanityAuditCheck.status === 'completed' || sanityAuditCheck.status === 'failed') {
      console.log(`[${requestId}] [pre-process-sanity] Audit status is '${sanityAuditCheck.status}' - marking queue accordingly and aborting`)
      if (sanityAuditCheck.status === 'completed') {
        await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'pre-process-sanity-audit-completed', ['processing'])
      } else {
        await markQueueItemFailedWithLogging(requestId, queueItem.id, 'pre-process-sanity-audit-failed', 'Audit already failed', ['processing'])
      }
      
      return NextResponse.json({
        success: true,
        message: `Audit already ${sanityAuditCheck.status} - skipping processing`,
        processed: false,
        auditId,
        auditStatus: sanityAuditCheck.status,
      })
    }
    
    // Use the sanity check data for customer email (already fetched fresh)
    const finalCheck = sanityAuditCheck
    
    // Validate customer email before processing
    // Handle customers as either array or single object
    let customer: any = null
    if (finalCheck?.customers) {
      customer = Array.isArray(finalCheck.customers) ? finalCheck.customers[0] : finalCheck.customers
    } else if (auditData?.customers) {
      customer = Array.isArray(auditData.customers) ? auditData.customers[0] : auditData.customers
    }
    
    const customerEmail = customer?.email
    if (customerEmail) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(customerEmail)) {
        console.error(`[${requestId}] ❌ Invalid email address for audit ${auditId}: ${customerEmail}`)
        // Mark queue item as failed with error message
        // Use service client for fresh write to primary database
        await supabasePrimary
          .from('audit_queue')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            last_error: `Invalid email address: ${customerEmail}`,
          })
          .eq('id', queueItem.id)
        
        // Also log error to audit
        const errorLog = JSON.stringify({
          timestamp: new Date().toISOString(),
          error: `Invalid email address: ${customerEmail}. Email must be a valid format (e.g., user@example.com).`,
          note: 'Queue processor skipped this audit due to invalid email',
        }, null, 2)
        
        // Use service client for fresh write to primary database
        await supabasePrimary
          .from('audits')
          .update({
            error_log: errorLog,
          } as any)
          .eq('id', auditId)
        
        return NextResponse.json({
          success: true,
          message: 'Audit skipped - invalid email address',
          processed: false,
          auditId,
          error: `Invalid email address: ${customerEmail}`,
        })
      }
    } else if (!customerEmail && (finalCheck || auditData)) {
      // No email found - this is also a problem, but we'll let processAudit handle it
      // to maintain consistent error handling
      console.warn(`[${requestId}] ⚠️  No customer email found for audit ${auditId} - will fail in processAudit`)
    }

    // Note: queueItem is already marked as 'processing' from the atomic claim, so we don't need to update it again
    // Process the audit
    // With Netlify Pro, we have 26 seconds timeout, but full audits can take longer
    // Strategy: Attempt full processing, but return early if it takes too long
    // The processing will continue in the background (Netlify allows this)
    
    // CRITICAL: Early guard - check if email was already sent BEFORE processing
    // This prevents reprocessing audits that already have emails sent
    // Use unified helper to ensure consistency with queue selection and reservation verification
    const preProcessCheck = await getFreshAuditState(auditId)
    
    if (!preProcessCheck) {
      console.error(`[${requestId}] ❌ Audit ${auditId} not found before processing`)
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      )
    }
    
    // EARLY EXIT: If email was already sent, do NOT reprocess (skip modules and report generation)
    // Log fresh check result for debugging
    console.log(`[${requestId}] [fresh-check] audit_id=${auditId}, status=${preProcessCheck.status || 'null'}, email_sent_at=${preProcessCheck.email_sent_at || 'null'}, has_report=${!!preProcessCheck.formatted_report_html}`)
    
    if (preProcessCheck.email_sent_at) {
      const emailAge = getEmailSentAtAge(preProcessCheck.email_sent_at)
      const emailAgeMinutes = emailAge ? Math.round(emailAge / 1000 / 60) : null
      
      console.log(`[${requestId}] ⛔ SKIPPING audit ${auditId} - email already sent at ${preProcessCheck.email_sent_at} (${emailAgeMinutes}m old) - marking queue as completed and NOT calling processAudit`)
      
      // Mark queue item as completed - only update if still processing (prevents repeated updates)
      await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'pre-process-email-sent', ['processing'])
      
      return NextResponse.json({
        success: true,
        message: 'Audit skipped - email already sent (no reprocessing)',
        processed: false,
        auditId,
        email_sent_at: preProcessCheck.email_sent_at,
        has_report: !!preProcessCheck.formatted_report_html,
        skipped_processing: true,
      })
    }
    
    // Check if audit already has a report (just needs email sending - fast)
    const hasReport = !!preProcessCheck.formatted_report_html
    const needsFullProcessing = !hasReport
    
    // Set timeout based on operation type
    // Netlify Pro: 26 seconds max, but we'll return early to avoid timeout
    const MAX_PROCESSING_TIME_MS = 20 * 1000 // 20 seconds (safe margin for 26s limit)
    let processTimedOut = false
    
    if (needsFullProcessing) {
      console.log(`[${requestId}] Audit ${auditId} needs full processing - attempting with ${MAX_PROCESSING_TIME_MS / 1000}s timeout`)
    } else {
      console.log(`[${requestId}] Audit ${auditId} has report - processing email sending only (fast)`)
    }
    
    try {
      console.log(`[${requestId}] Processing audit ${auditId}${needsFullProcessing ? ' (full processing)' : ' (email only)'}`)
      console.log(`[${requestId}] [process-start] auditId=${auditId}, queueItem.id=${queueItem.id}, queueItem.audit_id=${queueItem.audit_id}`)
      
      // CRITICAL: Double-check auditId matches queueItem before processing
      if (auditId !== queueItem.audit_id) {
        console.error(`[${requestId}] [process-start] ❌ CRITICAL BUG: auditId (${auditId}) !== queueItem.audit_id (${queueItem.audit_id})`)
        throw new Error(`Audit ID mismatch before processing: auditId=${auditId}, queueItem.audit_id=${queueItem.audit_id}`)
      }
      
      // Wrap processAudit in a timeout
      // For full audits, we'll attempt processing but return early if it takes too long
      // The processing will continue in the background
      // CRITICAL: Pass service client to processAudit to ensure all DB operations use same client
      const processPromise = processAudit(auditId, supabasePrimary)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          processTimedOut = true
          reject(new Error(`Processing timeout after ${MAX_PROCESSING_TIME_MS / 1000} seconds`))
        }, MAX_PROCESSING_TIME_MS)
      })
      
      // Race between processing and timeout
      // If timeout wins, we return early but processing continues in background
      await Promise.race([processPromise, timeoutPromise])
      
      // Verification: Check if audit is actually completed with report
      // This ensures we don't mark queue as completed if processAudit failed silently
      // Use service client for fresh read from primary database
      console.log(`[${requestId}] [verify] Checking audit ${auditId} after processing...`)
      const { data: verifyAudit } = await supabasePrimary
        .from('audits')
        .select('id, status, formatted_report_html, email_sent_at')
        .eq('id', auditId)
        .single()
      
      if (!verifyAudit) {
        throw new Error(`Audit ${auditId} not found after processing`)
      }
      
      // CRITICAL: Verify the audit ID matches what we processed
      if (verifyAudit.id !== auditId) {
        console.error(`[${requestId}] [verify] ❌ CRITICAL BUG: verifyAudit.id (${verifyAudit.id}) !== auditId (${auditId})`)
        throw new Error(`Audit ID mismatch in verification: expected ${auditId}, got ${verifyAudit.id}`)
      }
      
      console.log(`[${requestId}] [verify] ✅ Verified audit ${auditId} - status=${verifyAudit.status}, email=${verifyAudit.email_sent_at || 'null'}, report=${!!verifyAudit.formatted_report_html}`)
      
      // CRITICAL: Mark queue as completed if email was sent
      // If email_sent_at exists and is not a reservation (doesn't start with 'sending_'), it's a real email
      // The 5-minute check is only for distinguishing old reservations, but any real timestamp means email was sent
      const emailWasSent = verifyAudit.email_sent_at && 
                          !verifyAudit.email_sent_at.startsWith('sending_') &&
                          verifyAudit.email_sent_at.length > 10 // Real timestamp format (ISO 8601 is always > 10 chars)
      
      if (emailWasSent) {
        console.log(`[${requestId}] ✅ Email was sent (timestamp: ${verifyAudit.email_sent_at}) - marking queue as completed`)
        // Email was sent - mark queue as completed immediately
        // CRITICAL: Update by queue row id - queue item is likely in 'processing' status at this point
        // This prevents the same item from being selected on the next run
        const completionResult = await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'email-sent', ['processing'])
        if (completionResult === 'updated' || completionResult === 'already-completed') {
          console.log(`[${requestId}] ✅ Audit ${auditId} email sent - queue marked as completed`)
        }
        
        // CRITICAL: Verify auditId is still correct before returning response
        if (verifyAudit.id !== auditId) {
          console.error(`[${requestId}] [response] ❌ CRITICAL BUG: verifyAudit.id (${verifyAudit.id}) !== auditId (${auditId})`)
          throw new Error(`Audit ID mismatch in response: expected ${auditId}, got ${verifyAudit.id}`)
        }
        
        // CRITICAL: Final verification before returning response
        // Ensure auditId matches queueItem.audit_id to prevent returning wrong audit
        if (auditId !== queueItem.audit_id) {
          console.error(`[${requestId}] [response] ❌ CRITICAL BUG: auditId (${auditId}) !== queueItem.audit_id (${queueItem.audit_id})`)
          throw new Error(`Audit ID mismatch in response: auditId=${auditId}, queueItem.audit_id=${queueItem.audit_id}`)
        }
        if (auditId !== verifyAudit.id) {
          console.error(`[${requestId}] [response] ❌ CRITICAL BUG: auditId (${auditId}) !== verifyAudit.id (${verifyAudit.id})`)
          throw new Error(`Audit ID mismatch in response: auditId=${auditId}, verifyAudit.id=${verifyAudit.id}`)
        }
        
        // CRITICAL: Final triple-check before returning response
        // Ensure all three match to prevent returning wrong audit
        const finalAuditId = queueItem.audit_id
        if (finalAuditId !== auditId || finalAuditId !== verifyAudit.id || auditId !== verifyAudit.id) {
          console.error(`[${requestId}] [response] ❌ CRITICAL BUG: Audit ID mismatch!`)
          console.error(`  queueItem.audit_id: ${finalAuditId}`)
          console.error(`  auditId variable: ${auditId}`)
          console.error(`  verifyAudit.id: ${verifyAudit.id}`)
          throw new Error(`Audit ID mismatch in response: queueItem=${finalAuditId}, auditId=${auditId}, verifyAudit=${verifyAudit.id}`)
        }
        
        console.log(`[${requestId}] [response] ✅ Returning success for auditId=${finalAuditId}, queueItem.id=${queueItem.id}, requestTimestamp=${requestTimestamp}`)
        const responseBody = {
          success: true,
          message: 'Audit email sent successfully',
          processed: true,
          auditId: finalAuditId,  // CRITICAL: Use queueItem.audit_id directly
          email_sent_at: verifyAudit.email_sent_at,
          has_report: !!verifyAudit.formatted_report_html,
          requestId,  // Include requestId in response for debugging
          requestTimestamp,  // Include timestamp to detect stale responses
          _cacheBust: Date.now(),  // Force unique response body
        }
        console.log(`[${requestId}] [response-body] Returning auditId=${responseBody.auditId}`)
        const response = NextResponse.json(responseBody)
        // CRITICAL: Add cache-busting headers to prevent Netlify CDN caching
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
        response.headers.set('X-Request-Id', requestId)
        response.headers.set('X-Audit-Id', finalAuditId)
        return response
      }
      
      // CRITICAL: If audit has report OR email was sent, it's complete regardless of status
      // This handles cases where processAudit succeeded but status update failed, or status was set to 'failed' by error handling
      const hasReport = !!verifyAudit.formatted_report_html
      // Check if email exists and is a real timestamp (not a reservation)
      // Any real timestamp (not starting with 'sending_') means email was sent, regardless of age
      const hasEmail = verifyAudit.email_sent_at && 
                       !verifyAudit.email_sent_at.startsWith('sending_') &&
                       verifyAudit.email_sent_at.length > 10 // Real timestamp format
      const isComplete = verifyAudit.status === 'completed'
      
      if (hasReport || hasEmail) {
        // Audit is functionally complete (has report or email sent)
        // Fix status if it's not 'completed'
        if (!isComplete) {
          console.warn(`[${requestId}] ⚠️  Audit ${auditId} has ${hasReport ? 'report' : 'email'} but status is ${verifyAudit.status} - fixing status to completed`)
          
          // Fix audit status to completed
          const { error: fixStatusError } = await supabasePrimary
            .from('audits')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', auditId)
          
          if (fixStatusError) {
            console.error(`[${requestId}] Failed to fix audit status:`, fixStatusError)
          } else {
            console.log(`[${requestId}] ✅ Fixed audit status from ${verifyAudit.status} to completed`)
          }
        }
        
        // Mark queue as completed
        // CRITICAL: Update by queue row id - queue item may be in 'processing' status
        const completionResult = await markQueueItemCompletedWithLogging(requestId, queueItem.id, `has-${hasReport ? 'report' : 'email'}`, ['processing'])
        if (completionResult === 'updated' || completionResult === 'already-completed') {
          console.log(`[${requestId}] ✅ Audit ${auditId} is complete (${hasReport ? 'has report' : 'email sent'}) - marked queue as completed`)
        }
        
        // CRITICAL: Verify auditId matches queueItem before returning
        if (auditId !== queueItem.audit_id) {
          console.error(`[${requestId}] [response] ❌ CRITICAL BUG: auditId (${auditId}) !== queueItem.audit_id (${queueItem.audit_id})`)
          throw new Error(`Audit ID mismatch in response: auditId=${auditId}, queueItem.audit_id=${queueItem.audit_id}`)
        }
        
        return NextResponse.json({
          success: true,
          message: isComplete 
            ? 'Audit processed successfully'
            : `Audit has ${hasReport ? 'report' : 'email'} - marked as completed`,
          processed: true,
          auditId: queueItem.audit_id,  // CRITICAL: Use queueItem.audit_id directly
          email_sent_at: verifyAudit.email_sent_at,
          status_fixed: !isComplete,
        })
      } else {
        // Audit processing didn't complete properly - no report and no email
        // CRITICAL: Re-check one more time before throwing error (handles race conditions)
        // Use service client for fresh read from primary database
        const { data: finalCheck } = await supabasePrimary
          .from('audits')
          .select('status, formatted_report_html, email_sent_at, completed_at')
          .eq('id', auditId)
          .single()
        
        const finalHasReport = !!finalCheck?.formatted_report_html
        // Check if email exists and is a real timestamp (not a reservation)
        const finalHasEmail = finalCheck?.email_sent_at && 
                             !finalCheck.email_sent_at.startsWith('sending_') &&
                             (isEmailSent(finalCheck.email_sent_at) || finalCheck.email_sent_at.length > 10)
        const finalIsComplete = finalCheck?.status === 'completed'
        
        // If final check shows report or email exists, treat as successful
        if (finalCheck && (finalHasReport || finalHasEmail)) {
          console.warn(
            `[${requestId}] ⚠️  Final check shows audit ${auditId} is complete ` +
            `(status=${finalCheck.status}, hasReport=${finalHasReport}, hasEmail=${finalHasEmail}) - ` +
            `fixing status instead of throwing error`
          )
          
          // Fix audit status
          if (!finalIsComplete) {
            await supabasePrimary
              .from('audits')
              .update({
                status: 'completed',
                completed_at: finalCheck.completed_at || new Date().toISOString(),
              })
              .eq('id', auditId)
          }
          
          // Mark queue as completed
          // CRITICAL: Update by queue row id - queue item may be in 'processing' status
          // This prevents the same item from being selected on the next run
          const completionResult = await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'final-check-reconciliation', ['processing'])
          if (completionResult === 'updated' || completionResult === 'already-completed') {
            console.log(`[${requestId}] ✅ Queue marked as completed in final check`)
          }
          
          // CRITICAL: Verify auditId matches queueItem before returning
          if (auditId !== queueItem.audit_id) {
            console.error(`[${requestId}] [response] ❌ CRITICAL BUG: auditId (${auditId}) !== queueItem.audit_id (${queueItem.audit_id})`)
            throw new Error(`Audit ID mismatch in response: auditId=${auditId}, queueItem.audit_id=${queueItem.audit_id}`)
          }
          
          return NextResponse.json({
            success: true,
            message: 'Audit completed successfully (reconciled after final check)',
            processed: true,
            auditId: queueItem.audit_id,  // CRITICAL: Use queueItem.audit_id directly
            email_sent_at: finalCheck.email_sent_at,
            has_report: finalHasReport,
            reconciled: true,
          })
        }
        
        // Only throw error if final check confirms no report and no email
        throw new Error(`Audit ${auditId} processing incomplete: status=${finalCheck?.status || verifyAudit.status}, has_report=${finalHasReport}, has_email=${finalHasEmail}`)
      }
    } catch (processError) {
      const errorMessage = processError instanceof Error ? processError.message : String(processError)
      
      // If timeout occurred, processing may still be running in background
      // Don't mark as failed immediately - let it continue
      if (processTimedOut) {
        console.log(`[${requestId}] ⏱️  Processing timeout for audit ${auditId} - continuing in background`)
        
        // Continue processing in background (fire and forget)
        // Netlify allows background promises to continue after function returns
        // CRITICAL: Pass service client to processAudit to ensure all DB operations use same client
        processAudit(auditId, supabasePrimary).catch((bgError) => {
          console.error(`[${requestId}] Background processing error for ${auditId}:`, bgError)
        })
        
        // CRITICAL: Verify auditId matches queueItem before returning
        if (auditId !== queueItem.audit_id) {
          console.error(`[${requestId}] [timeout] ❌ CRITICAL BUG: auditId (${auditId}) !== queueItem.audit_id (${queueItem.audit_id})`)
          throw new Error(`Audit ID mismatch in timeout response: auditId=${auditId}, queueItem.audit_id=${queueItem.audit_id}`)
        }
        
        // Return success - processing continues in background
        return NextResponse.json({
          success: true,
          message: 'Audit processing started - continuing in background',
          processed: true,
          auditId: queueItem.audit_id,  // CRITICAL: Use queueItem.audit_id directly
          timeout: true,
          note: 'Processing continues in background after function return',
        })
      }
      
      // Actual error (not timeout) - handle normally
      console.error(`[${requestId}] Failed to process audit ${auditId}:`, processError)
      
      // CRITICAL: Re-check audit status one more time before marking as failed
      // This handles race conditions where the report/email were generated but not yet visible
      // Use service client for fresh read from primary database
      const { data: currentAudit } = await supabasePrimary
        .from('audits')
        .select('status, formatted_report_html, email_sent_at, completed_at')
        .eq('id', auditId)
        .single()
      
      const hasReportNow = !!currentAudit?.formatted_report_html
      const hasEmailNow = isEmailSent(currentAudit?.email_sent_at)
      const isCompletedNow = currentAudit?.status === 'completed'
      
      // CRITICAL: Verify auditId matches queueItem before any response
      if (auditId !== queueItem.audit_id) {
        console.error(`[${requestId}] [error-handler] ❌ CRITICAL BUG: auditId (${auditId}) !== queueItem.audit_id (${queueItem.audit_id})`)
        throw new Error(`Audit ID mismatch in error handler: auditId=${auditId}, queueItem.audit_id=${queueItem.audit_id}`)
      }
      
      // CRITICAL: If audit has report OR email, it's actually complete - don't mark as failed
      // This handles cases where processAudit succeeded but verification happened too early
      if (currentAudit && (hasReportNow || hasEmailNow)) {
        console.warn(
          `[${requestId}] ⚠️  Audit ${auditId} appears complete after error ` +
          `(status=${currentAudit.status}, hasReport=${hasReportNow}, hasEmail=${hasEmailNow}) - ` +
          `marking as completed instead of failed`
        )

        // Fix audit status to completed
        if (!isCompletedNow) {
          const { error: fixAfterError } = await supabasePrimary
            .from('audits')
            .update({
              status: 'completed',
              completed_at: currentAudit.completed_at || new Date().toISOString(),
            })
            .eq('id', auditId)

          if (fixAfterError) {
            console.error(`[${requestId}] Failed to fix audit status after error:`, fixAfterError)
          } else {
            console.log(`[${requestId}] ✅ Fixed audit status to completed after error handling`)
          }
        }

        // Mark queue as completed
        // CRITICAL: Update by queue row id - queue item may be in 'processing' status
        // This prevents the same item from being selected on the next run
        const completionResult = await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'error-reconciliation-has-report-or-email', ['processing'])
        if (completionResult === 'updated' || completionResult === 'already-completed') {
          console.log(`[${requestId}] ✅ Audit ${auditId} fixed after error - queue marked as completed`)
        }

        // CRITICAL: Verify auditId matches queueItem before returning
        if (auditId !== queueItem.audit_id) {
          console.error(`[${requestId}] [response] ❌ CRITICAL BUG: auditId (${auditId}) !== queueItem.audit_id (${queueItem.audit_id})`)
          throw new Error(`Audit ID mismatch in response: auditId=${auditId}, queueItem.audit_id=${queueItem.audit_id}`)
        }
        
        return NextResponse.json({
          success: true,
          message: 'Audit completed successfully after error reconciliation',
          processed: true,
          auditId: queueItem.audit_id,  // CRITICAL: Use queueItem.audit_id directly
          email_sent_at: currentAudit.email_sent_at,
          has_report: hasReportNow,
          reconciled: true,
        })
      }

      // If audit now has report or email, treat it as successful despite the earlier verification error
      if (currentAudit && (hasReportNow || hasEmailNow || isCompletedNow)) {
        console.warn(
          `[${requestId}] ⚠️  Audit ${auditId} appears complete after error ` +
          `(status=${currentAudit.status}, hasReport=${hasReportNow}, hasEmail=${hasEmailNow}) - ` +
          `marking queue as completed instead of failed`
        )

        // If status is not completed, fix it
        if (!isCompletedNow) {
          const { error: fixAfterError } = await supabasePrimary
            .from('audits')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', auditId)

          if (fixAfterError) {
            console.error(`[${requestId}] Failed to fix audit status after error:`, fixAfterError)
          } else {
            console.log(`[${requestId}] ✅ Fixed audit status to completed after error handling`)
          }
        }

        // Mark queue as completed
        // CRITICAL: Update by queue row id - queue item may be in 'processing' status
        // This prevents the same item from being selected on the next run
        const completionResult = await markQueueItemCompletedWithLogging(requestId, queueItem.id, 'error-reconciliation-has-report-or-email', ['processing'])
        if (completionResult === 'updated' || completionResult === 'already-completed') {
          console.log(`[${requestId}] ✅ Audit ${auditId} fixed after error - queue marked as completed`)
        }

        // CRITICAL: Verify auditId matches queueItem before returning
        if (auditId !== queueItem.audit_id) {
          console.error(`[${requestId}] [response] ❌ CRITICAL BUG: auditId (${auditId}) !== queueItem.audit_id (${queueItem.audit_id})`)
          throw new Error(`Audit ID mismatch in response: auditId=${auditId}, queueItem.audit_id=${queueItem.audit_id}`)
        }
        
        return NextResponse.json({
          success: true,
          message: 'Audit completed successfully after error reconciliation',
          processed: true,
          auditId: queueItem.audit_id,  // CRITICAL: Use queueItem.audit_id directly
          email_sent_at: currentAudit.email_sent_at,
          has_report: hasReportNow,
          reconciled: true,
        })
      }
      
      // Only update audit status to failed if it is still running or pending
      if (currentAudit && (currentAudit.status === 'running' || currentAudit.status === 'pending')) {
        const errorLog = JSON.stringify({
          timestamp: new Date().toISOString(),
          error: errorMessage,
          timeout: processTimedOut,
          note: 'Audit processing failed in queue processor',
        }, null, 2)
        
        // Try to update audit status to failed
        const { error: auditUpdateError } = await supabasePrimary
          .from('audits')
          .update({
            status: 'failed',
            error_log: errorLog,
          } as any)
          .eq('id', auditId)
        
        if (auditUpdateError) {
          console.error(`[${requestId}] Failed to update audit status to failed:`, auditUpdateError)
          // Try without error_log if column does not exist
          await supabasePrimary
            .from('audits')
            .update({ status: 'failed' })
            .eq('id', auditId)
        } else {
          console.log(`[${requestId}] ✅ Updated audit ${auditId} status to failed`)
        }
      }
      
      // Determine if error is permanent (should not retry)
      // HTTP errors like 404, 403, 401 are permanent - website doesn't exist or is inaccessible
      // Check both the error message and the audit's error_log for permanent error patterns
      let errorTextToCheck = errorMessage.toLowerCase()
      
      // Also check the audit's error_log if it exists (contains the original error)
      if (currentAudit) {
        try {
          const { data: auditWithErrorLog } = await supabasePrimary
            .from('audits')
            .select('error_log')
            .eq('id', auditId)
            .single()
          
          if (auditWithErrorLog?.error_log) {
            const errorLogStr = typeof auditWithErrorLog.error_log === 'string' 
              ? auditWithErrorLog.error_log 
              : JSON.stringify(auditWithErrorLog.error_log)
            errorTextToCheck += ' ' + errorLogStr.toLowerCase()
          }
        } catch (err) {
          // Ignore errors reading error_log - use original error message only
        }
      }
      
      // Helper function to check for permanent fetch errors (HTTP 401/403/404)
      function isPermanentFetchError(err: unknown): boolean {
        const msg = err instanceof Error ? err.message : String(err)
        return /HTTP 4(01|03|04)/.test(msg) || 
               /http 4(01|03|04)/i.test(msg)
      }
      
      const isPermanentError = 
        isPermanentFetchError(errorMessage) ||
        errorTextToCheck.includes('http 404') ||
        errorTextToCheck.includes('http 403') ||
        errorTextToCheck.includes('http 401') ||
        (errorTextToCheck.includes('404') && (errorTextToCheck.includes('fetch') || errorTextToCheck.includes('error'))) ||
        (errorTextToCheck.includes('403') && (errorTextToCheck.includes('fetch') || errorTextToCheck.includes('error'))) ||
        (errorTextToCheck.includes('401') && (errorTextToCheck.includes('fetch') || errorTextToCheck.includes('error'))) ||
        errorTextToCheck.includes('enotfound') || // DNS resolution failed
        errorTextToCheck.includes('econnrefused') || // Connection refused
        (errorTextToCheck.includes('etimedout') && errorTextToCheck.includes('dns')) // DNS timeout
      
      // Only retry if:
      // 1. Not a permanent error
      // 2. Retry count is less than 3
      const shouldRetry = !isPermanentError && queueItem.retry_count < 3
      
      if (isPermanentError) {
        console.log(
          `[${requestId}] [error] queueId=${queueItem.id}, auditId=${auditId}, ` +
          `type=permanent, error="${errorMessage.substring(0, 150)}"`
        )
        
        // Mark queue item as failed using helper
        const failResult = await markQueueItemFailedWithLogging(
          requestId,
          queueItem.id,
          'permanent-error',
          errorMessage.substring(0, 1000),
          ['processing']
        )
        
        console.log(
          `[${requestId}] [error] queueId=${queueItem.id} → status=failed (result: ${failResult})`
        )
      } else {
        console.log(
          `[${requestId}] [error] queueId=${queueItem.id}, auditId=${auditId}, ` +
          `type=transient, retryCount=${queueItem.retry_count}, willRetry=${shouldRetry}, ` +
          `error="${errorMessage.substring(0, 150)}"`
        )
        
        // For transient errors, mark as pending for retry (only if retries left)
        if (shouldRetry) {
          const { data: retryResult } = await supabasePrimary
        .from('audit_queue')
        .update({
              status: 'pending',
              started_at: null, // Reset started_at so it can be claimed again
              last_error: errorMessage.substring(0, 1000),
        })
        .eq('id', queueItem.id)
            .eq('status', 'processing') // Only update if still processing
            .select('id, status')
          
          const updated = retryResult && retryResult.length > 0
          console.log(
            `[${requestId}] [error] queueId=${queueItem.id} → status=pending (retry ${queueItem.retry_count + 1}/3, updated: ${updated})`
          )
        } else {
          // Max retries exceeded - mark as failed
          const failResult = await markQueueItemFailedWithLogging(
            requestId,
            queueItem.id,
            'max-retries-exceeded',
            errorMessage.substring(0, 1000),
            ['processing']
          )
          
          console.log(
            `[${requestId}] [error] queueId=${queueItem.id} → status=failed (max retries, result: ${failResult})`
          )
        }
      }
      
      return NextResponse.json({
        success: false,
        message: 'Audit processing failed',
        processed: false,
        auditId,
        error: errorMessage.substring(0, 500),
        permanent: isPermanentError,
        willRetry: shouldRetry,
      }, { status: 500 })
    }
  } catch (error) {
    const requestId = getRequestId(request)
    console.error(`[${requestId}] Unexpected error in /api/process-queue:`, error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
