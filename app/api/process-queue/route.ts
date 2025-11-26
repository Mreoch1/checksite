/**
 * Process queue endpoint - processes one pending audit at a time
 * This endpoint should be called by a free cron service (e.g., cron-job.org) every minute
 * 
 * Setup instructions:
 * 1. Go to https://cron-job.org (free)
 * 2. Create a new cron job
 * 3. URL: https://seochecksite.netlify.app/api/process-queue
 * 4. Schedule: Every minute (* * * * *)
 * 5. Add header: Authorization: Bearer YOUR_SECRET_KEY (set in env as QUEUE_SECRET)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { processAudit } from '@/lib/process-audit'
import { getRequestId } from '@/lib/request-id'
import { isEmailSent, isEmailSending } from '@/lib/email-status'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  console.log(`[${requestId}] /api/process-queue called`)
  try {
    // Optional: Add basic auth to prevent unauthorized access
    // Supports both Bearer token header and query parameter (for easier cron-job.org setup)
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

    // Find the oldest pending audit in the queue
    // CRITICAL: Also filter out audits that already have email_sent_at to prevent duplicate processing
    // This prevents processing the same audit multiple times if there are duplicate queue entries
    // Use a simpler query approach to avoid join filter issues
    // NOTE: Get more items to ensure we catch recent ones that might be filtered out
    const { data: queueItems, error: findError } = await supabase
      .from('audit_queue')
      .select('*, audits(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20) // Increased from 10 to catch more items
    
    if (findError) {
      console.error(`[${requestId}] Error finding queue items:`, findError)
      return NextResponse.json(
        { error: 'Database error finding queue items', details: findError.message },
        { status: 500 }
      )
    }
    
    // Log what we found
    console.log(`[${requestId}] Found ${queueItems?.length || 0} pending queue items`)
    if (queueItems && queueItems.length > 0) {
      queueItems.forEach((item: any, idx: number) => {
        const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
        const ageMinutes = Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000 / 60)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const passesDelay = item.created_at < fiveMinutesAgo
        console.log(`[${requestId}] Queue item ${idx + 1}: audit_id=${item.audit_id}, age=${ageMinutes}m, audit_data=${audit ? 'present' : 'MISSING'}, email_sent=${audit?.email_sent_at || 'null'}, passes_5min_delay=${passesDelay}`)
      })
    } else {
      // Check if there are any queue items at all (regardless of status)
      // Get more items to see recent ones - increase limit to catch very recent items
      const { data: allQueueItems, error: allQueueError } = await supabase
        .from('audit_queue')
        .select('id, audit_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50) // Increased from 20 to catch very recent items that might be filtered
      
      if (allQueueError) {
        console.error(`[${requestId}] Error fetching all queue items:`, allQueueError)
      }
      
      if (allQueueItems && allQueueItems.length > 0) {
        // Separate pending vs non-pending
        const pendingItems = allQueueItems.filter((item: any) => item.status === 'pending')
        const nonPendingItems = allQueueItems.filter((item: any) => item.status !== 'pending')
        
        // Log all items for debugging (especially recent ones)
        const recentItems = allQueueItems.slice(0, 20) // Show 20 most recent for better visibility
        console.log(`[${requestId}] 📊 Recent queue items (showing ${recentItems.length} most recent out of ${allQueueItems.length} total):`)
        recentItems.forEach((item: any) => {
          const ageMinutes = Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000 / 60)
          const ageSeconds = Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000)
          console.log(`[${requestId}]   - Queue ID: ${item.id}, Audit ID: ${item.audit_id}, Status: ${item.status}, Age: ${ageMinutes}m (${ageSeconds}s), Created: ${item.created_at}`)
        })
        
        // Also check specifically for the most recent pending item
        const mostRecentPending = allQueueItems.find((item: any) => item.status === 'pending')
        if (mostRecentPending) {
          const ageSeconds = Math.round((Date.now() - new Date(mostRecentPending.created_at).getTime()) / 1000)
          console.log(`[${requestId}] 🔍 Most recent pending item: Audit ID ${mostRecentPending.audit_id}, Age: ${ageSeconds}s`)
        } else {
          console.log(`[${requestId}] 🔍 No pending items found in ${allQueueItems.length} total queue items`)
        }
        
        if (pendingItems.length > 0) {
          console.log(`[${requestId}] ⚠️  Found ${pendingItems.length} pending queue item(s) but they didn't pass filtering:`)
          pendingItems.forEach((item: any) => {
            const ageMinutes = Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000 / 60)
            console.log(`[${requestId}]   - Queue ID: ${item.id}, Audit ID: ${item.audit_id}, Status: ${item.status}, Age: ${ageMinutes}m`)
          })
        }
        
        if (nonPendingItems.length > 0) {
          console.log(`[${requestId}] Found ${nonPendingItems.length} non-pending queue item(s) (showing 5 most recent):`)
          nonPendingItems.slice(0, 5).forEach((item: any) => {
            const ageMinutes = Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000 / 60)
            console.log(`[${requestId}]   - Queue ID: ${item.id}, Audit ID: ${item.audit_id}, Status: ${item.status}, Age: ${ageMinutes}m`)
          })
        }
      } else {
        console.log(`[${requestId}] ⚠️  No queue items found at all in database`)
      }
    }
    
    // Filter out audits that already have email_sent_at (client-side filter)
    // Also filter out audits with "sending_" prefix (another process is sending)
    // Handle both array and single object responses from Supabase
    // First, clean up any queue items for audits that already have emails sent
    const itemsToCleanup: string[] = []
    queueItems?.forEach((item: any) => {
      const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
      if (!audit) {
        console.warn(`[${requestId}] ⚠️  Queue item ${item.id} has no audit data in join - this might indicate a database issue`)
        return
      }
      if (isEmailSent(audit.email_sent_at)) {
        itemsToCleanup.push(item.id)
      }
    })
    
    // Clean up queue items in parallel (fire and forget)
    if (itemsToCleanup.length > 0) {
      console.log(`[${requestId}] Cleaning up ${itemsToCleanup.length} queue items for audits with emails already sent`)
      // Fire and forget - don't await
      void Promise.all(
        itemsToCleanup.map(async (itemId) => {
          try {
            await supabase
              .from('audit_queue')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
              })
              .eq('id', itemId)
            console.log(`[${requestId}] ✅ Cleaned up queue item ${itemId}`)
          } catch (err) {
            console.error(`[${requestId}] Failed to clean up queue item ${itemId}:`, err)
          }
        })
      )
    }
    
    // Now find the first valid queue item
    // Add 5-minute delay: only process audits that were created at least 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const queueItem = queueItems?.find((item: any) => {
      let audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
      
      // Log each item being checked
      const ageMinutes = Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000 / 60)
      
      // FALLBACK: If join didn't return audit data, fetch it separately
      // This handles cases where the foreign key join might fail or return null
      if (!audit && item.audit_id) {
        console.warn(`[${requestId}] ⚠️  Queue item ${item.id} has no audit data in join - fetching separately as fallback`)
        // Note: We can't await in a find() callback, so we'll skip this item
        // and handle it in a separate pass if needed
        // For now, log it and skip - the next cron run will try again
        return false
      }
      
      if (!audit) {
        console.warn(`[${requestId}] ⚠️  Skipping queue item ${item.id} (audit_id: ${item.audit_id}) - no audit data available`)
        return false
      }
      
      // Skip if email was already sent (not a reservation)
      if (isEmailSent(audit.email_sent_at)) {
        console.log(`[${requestId}] ⏳ Skipping audit ${item.audit_id} - email already sent at ${audit.email_sent_at}`)
        return false
      }
      
      // Skip if email is being sent (reservation exists - another process is handling it)
      if (isEmailSending(audit.email_sent_at)) {
        console.log(`[${requestId}] ⏳ Skipping audit ${item.audit_id} - another process is sending email (reserved at ${audit.email_sent_at})`)
        return false
      }
      
      // CRITICAL: Skip audits created less than 5 minutes ago (delay processing)
      // This prevents immediate processing and gives time for any duplicate queue entries to be cleaned up
      if (item.created_at && item.created_at > fiveMinutesAgo) {
        console.log(`[${requestId}] ⏳ Skipping audit ${item.audit_id} - created ${ageMinutes} minute(s) ago (need 5 minutes delay)`)
        return false
      }
      
      // This item passes all checks - log it
      console.log(`[${requestId}] ✅ Found processable audit ${item.audit_id} (age: ${ageMinutes}m, url: ${audit.url || 'unknown'})`)
      return true
    }) || null
    
    if (!queueItem) {
      // Check if there are audits waiting for the 5-minute delay
      const waitingItems = queueItems?.filter((item: any) => {
        const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
        if (!audit) return false
        if (isEmailSent(audit.email_sent_at)) return false
        if (isEmailSending(audit.email_sent_at)) return false
        if (item.created_at && item.created_at > fiveMinutesAgo) return true
        return false
      }) || []
      
      if (waitingItems.length > 0) {
        console.log(`[${requestId}] No pending audits ready to process (${waitingItems.length} waiting for 5-minute delay)`)
      } else if (queueItems && queueItems.length > 0) {
        // This is important - we have queue items but none passed the filter
        console.warn(`[${requestId}] ⚠️  Found ${queueItems.length} pending queue items but none passed filtering criteria`)
        console.warn(`[${requestId}] This might indicate a bug in the filtering logic or missing audit data in joins`)
        // Log details about why each item was filtered out
        queueItems.forEach((item: any) => {
          const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
          const ageMinutes = Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000 / 60)
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
          const passesDelay = item.created_at < fiveMinutesAgo
          const passesEmail = !isEmailSent(audit?.email_sent_at) && !isEmailSending(audit?.email_sent_at)
          console.warn(`[${requestId}]   - Queue item ${item.id} (audit_id: ${item.audit_id}):`)
          console.warn(`[${requestId}]     audit_data=${audit ? 'present' : 'MISSING'}, age=${ageMinutes}m, email_sent=${audit?.email_sent_at || 'null'}, status=${item.status}`)
          console.warn(`[${requestId}]     passes_delay=${passesDelay}, passes_email=${passesEmail}, should_process=${passesDelay && passesEmail && audit ? 'YES' : 'NO'}`)
        })
      } else {
        console.log(`[${requestId}] No pending audits in queue`)
      }
      
      // Check if there are any stuck items (processing for too long)
      const { data: stuckItems } = await supabase
        .from('audit_queue')
        .select('*, audits(*)')
        .eq('status', 'processing')
        .lt('started_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Processing for > 10 minutes
      
      if (stuckItems && stuckItems.length > 0) {
        console.warn(`[${requestId}] Found ${stuckItems.length} stuck processing items - resetting them`)
        
        // Reset stuck items and update audit status
        for (const stuckItem of stuckItems) {
          const stuckAudit = stuckItem.audits as any
          const auditId = stuckItem.audit_id
          
          // Check if audit is still running (should be failed)
          if (stuckAudit && (stuckAudit.status === 'running' || stuckAudit.status === 'pending')) {
            const errorLog = JSON.stringify({
              timestamp: new Date().toISOString(),
              error: 'Audit processing timed out - stuck in processing state for > 10 minutes',
              note: 'Queue processor detected stuck audit and reset it',
            }, null, 2)
            
            // Update audit status to failed
            await supabase
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
          await supabase
            .from('audit_queue')
            .update({
              status: shouldRetry ? 'pending' : 'failed',
              last_error: 'Processing timeout - stuck for > 10 minutes',
              started_at: null, // Reset started_at
            })
            .eq('id', stuckItem.id)
        }
        
        return NextResponse.json({
          success: true,
          message: 'No pending audits in queue',
          processed: false,
          warning: `Reset ${stuckItems.length} stuck processing item(s)`,
          stuckItems: stuckItems.map(item => ({
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
    
    // Additional checks: skip if audit is already completed
    // Now we know queueItem exists, so we can safely access its properties
    const auditData = (queueItem.audits as any) || null
    if (auditData) {
      // CRITICAL: Skip if email was already sent (not a reservation)
      // This is the PRIMARY check to prevent duplicate emails
      if (isEmailSent(auditData.email_sent_at)) {
        console.log(`[${requestId}] ⛔ SKIPPING audit ${queueItem.audit_id} - email already sent at ${auditData.email_sent_at}`)
        // Mark queue item as completed since email was sent
        await supabase
          .from('audit_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', queueItem.id)
        
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
        console.log(`[${requestId}] ⛔ SKIPPING audit ${queueItem.audit_id} - another process is sending the email (${auditData.email_sent_at})`)
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
        console.log(`[${requestId}] Skipping audit ${queueItem.audit_id} - already completed with report and email sent`)
        // Mark queue item as completed
        await supabase
          .from('audit_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', queueItem.id)
        
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
        const { error: fixError } = await supabase
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
          await supabase
            .from('audit_queue')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', queueItem.id)
          
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
      
      // Skip if audit has failed too many times (retry_count >= 3)
      if (queueItem.retry_count >= 3) {
        console.log(`[${requestId}] Skipping audit ${queueItem.audit_id} - exceeded max retries (${queueItem.retry_count})`)
        // Mark as failed permanently
        await supabase
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
      }
    }

    const auditId = queueItem.audit_id

    // CRITICAL: Double-check email_sent_at one more time right before processing
    // This prevents race conditions where email was sent between the initial check and now
    const { data: finalCheck } = await supabase
      .from('audits')
      .select('email_sent_at')
      .eq('id', auditId)
      .single()
    
    if (finalCheck && isEmailSent(finalCheck.email_sent_at)) {
      console.log(`[${requestId}] ⛔ SKIPPING audit ${auditId} - email was sent between initial check and processing (${finalCheck.email_sent_at})`)
      // Mark queue item as completed since email was sent
      await supabase
        .from('audit_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', queueItem.id)
      
      return NextResponse.json({
        success: true,
        message: 'Audit skipped - email was sent by another process',
        processed: false,
        auditId,
        email_sent_at: finalCheck.email_sent_at,
      })
    }

    // Mark as processing
    const { error: updateError } = await supabase
      .from('audit_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        retry_count: queueItem.retry_count + 1,
      })
      .eq('id', queueItem.id)

    if (updateError) {
      console.error('Error updating queue status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update queue status', details: updateError.message },
        { status: 500 }
      )
    }

    // Process the audit (this may take several minutes)
    // Add timeout wrapper to prevent infinite hangs (8 minutes max - Netlify functions have 10s limit, but cron can run longer)
    const PROCESS_TIMEOUT_MS = 8 * 60 * 1000 // 8 minutes
    let processTimedOut = false
    
    try {
      console.log(`[${requestId}] Processing audit ${auditId} from queue`)
      
      // Wrap processAudit in a timeout
      const processPromise = processAudit(auditId)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          processTimedOut = true
          reject(new Error(`Audit processing timeout after ${PROCESS_TIMEOUT_MS / 1000} seconds`))
        }, PROCESS_TIMEOUT_MS)
      })
      
      await Promise.race([processPromise, timeoutPromise])
      
      // Verification: Check if audit is actually completed with report
      // This ensures we don't mark queue as completed if processAudit failed silently
      const { data: verifyAudit } = await supabase
        .from('audits')
        .select('status, formatted_report_html, email_sent_at')
        .eq('id', auditId)
        .single()
      
      if (!verifyAudit) {
        throw new Error('Audit not found after processing')
      }
      
      // CRITICAL: Mark queue as completed if email was sent, regardless of status
      // This prevents the same audit from being processed again
      if (isEmailSent(verifyAudit.email_sent_at)) {
        // Email was sent - mark queue as completed immediately
        await supabase
          .from('audit_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', queueItem.id)
        
        console.log(`[${requestId}] ✅ Audit ${auditId} email sent - queue marked as completed`)
        
        return NextResponse.json({
          success: true,
          message: 'Audit email sent successfully',
          processed: true,
          auditId,
          email_sent_at: verifyAudit.email_sent_at,
          has_report: !!verifyAudit.formatted_report_html,
        })
      }
      
      // If audit is completed with report, mark queue as completed
      if (verifyAudit.status === 'completed' && verifyAudit.formatted_report_html) {
        // Mark queue item as completed
        await supabase
          .from('audit_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', queueItem.id)
        
        console.log(`[${requestId}] ✅ Audit ${auditId} completed successfully`)
        
        return NextResponse.json({
          success: true,
          message: 'Audit processed successfully',
          processed: true,
          auditId,
          email_sent_at: verifyAudit.email_sent_at,
        })
      } else {
        // Audit processing didn't complete properly
        throw new Error(`Audit ${auditId} processing incomplete: status=${verifyAudit.status}, has_report=${!!verifyAudit.formatted_report_html}`)
      }
    } catch (processError) {
      const errorMessage = processError instanceof Error ? processError.message : String(processError)
      
      console.error(`[${requestId}] Failed to process audit ${auditId}:`, processError)
      
      // CRITICAL: Ensure audit status is updated even if processAudit failed silently
      // Check current audit status
      const { data: currentAudit } = await supabase
        .from('audits')
        .select('status, formatted_report_html, email_sent_at')
        .eq('id', auditId)
        .single()
      
      // Only update audit status if it's still "running" or "pending" (not already completed/failed)
      if (currentAudit && (currentAudit.status === 'running' || currentAudit.status === 'pending')) {
        const errorLog = JSON.stringify({
          timestamp: new Date().toISOString(),
          error: errorMessage,
          timeout: processTimedOut,
          note: 'Audit processing failed or timed out in queue processor',
        }, null, 2)
        
        // Try to update audit status to failed
        const { error: auditUpdateError } = await supabase
          .from('audits')
          .update({
            status: 'failed',
            error_log: errorLog,
          } as any)
          .eq('id', auditId)
        
        if (auditUpdateError) {
          console.error(`[${requestId}] Failed to update audit status to failed:`, auditUpdateError)
          // Try without error_log if column doesn't exist
          await supabase
            .from('audits')
            .update({ status: 'failed' })
            .eq('id', auditId)
        } else {
          console.log(`[${requestId}] ✅ Updated audit ${auditId} status to failed`)
        }
      }
      
      // Mark queue as failed (but allow retries if retry_count < 3)
      const shouldRetry = queueItem.retry_count < 3
      await supabase
        .from('audit_queue')
        .update({
          status: shouldRetry ? 'pending' : 'failed',
          last_error: errorMessage.substring(0, 1000), // Limit error message size
        })
        .eq('id', queueItem.id)
      
      // Return 200 (not 500) if this is an expected failure that will be retried
      // Only return 500 for unexpected errors that shouldn't be retried
      const statusCode = shouldRetry ? 200 : 500
      
      return NextResponse.json({
        success: !shouldRetry, // Only "success" if we're not retrying
        message: shouldRetry 
          ? `Audit ${auditId} processing failed - will retry (attempt ${queueItem.retry_count + 1}/3)`
          : `Audit ${auditId} processing failed - exceeded max retries`,
        error: errorMessage,
        processed: true,
        auditId,
        willRetry: shouldRetry,
        retry_count: queueItem.retry_count + 1,
        max_retries: 3,
        auditStatusUpdated: currentAudit?.status === 'failed',
      }, { status: statusCode })
    }
  } catch (error) {
    const requestId = getRequestId(request)
    console.error(`[${requestId}] Unexpected error in /api/process-queue:`, error)
    return NextResponse.json(
      {
        error: 'Unexpected error processing queue',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

