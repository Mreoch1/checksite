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

    // Find the oldest pending audit in the queue
    // CRITICAL: Also filter out audits that already have email_sent_at to prevent duplicate processing
    // This prevents processing the same audit multiple times if there are duplicate queue entries
    // Use a simpler query approach to avoid join filter issues
    // NOTE: Get more items to ensure we catch recent ones that might be filtered out
    // CRITICAL: Also check for items that might have been marked as completed but join shows stale data
    let { data: queueItems, error: findError } = await supabase
      .from('audit_queue')
      .select('*, audits(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20) // Increased from 10 to catch more items
    
    // Log query details for debugging
    if (findError) {
      console.error(`[${requestId}] Query error details:`, findError)
    } else {
      console.log(`[${requestId}] Query returned ${queueItems?.length || 0} items (before verification)`)
    }
    
    // CRITICAL: Double-check that queue items are actually pending (handle race conditions)
    // If a queue item was just marked as completed, it might still show up in the query due to replication lag
    // Re-verify the status directly from the database
    if (queueItems && queueItems.length > 0) {
      const verifiedQueueItems = []
      for (const item of queueItems) {
        const { data: statusCheck, error: statusError } = await supabase
          .from('audit_queue')
          .select('status')
          .eq('id', item.id)
          .single()
        
        if (statusError) {
          console.error(`[${requestId}] ⚠️  Error checking queue item ${item.id} status:`, statusError)
          // If we can't verify, trust the initial query result (item is pending)
          verifiedQueueItems.push(item)
        } else if (statusCheck && statusCheck.status === 'pending') {
          verifiedQueueItems.push(item)
        } else {
          console.log(`[${requestId}] ⚠️  Queue item ${item.id} status changed to ${statusCheck?.status || 'unknown'} - skipping`)
        }
      }
      queueItems = verifiedQueueItems
      console.log(`[${requestId}] After status verification: ${queueItems.length} pending queue items`)
    }
    
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
    // First, identify and clean up any queue items for audits that already have emails sent
    const itemsToCleanup: string[] = []
    const itemsToKeep: any[] = []
    
    queueItems?.forEach((item: any) => {
      const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
      if (!audit) {
        console.warn(`[${requestId}] ⚠️  Queue item ${item.id} has no audit data in join - this might indicate a database issue`)
        itemsToKeep.push(item) // Keep items without audit data for now - they'll be filtered out later
        return
      }
      // Check if email was sent - any real timestamp (not reservation) means email was sent
      const emailWasSent = audit.email_sent_at && 
                          !audit.email_sent_at.startsWith('sending_') &&
                          audit.email_sent_at.length > 10
      
      if (emailWasSent || isEmailSent(audit.email_sent_at)) {
        itemsToCleanup.push(item.id)
      } else {
        itemsToKeep.push(item) // Keep items that don't have emails sent
      }
    })
    
    // Clean up queue items - await to ensure they're marked as completed before continuing
    if (itemsToCleanup.length > 0) {
      console.log(`[${requestId}] Cleaning up ${itemsToCleanup.length} queue items for audits with emails already sent`)
      // Await cleanup to ensure it completes before processing new items
      await Promise.all(
        itemsToCleanup.map(async (itemId) => {
          try {
            const { error: cleanupError } = await supabase
              .from('audit_queue')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
              })
              .eq('id', itemId)
            
            if (cleanupError) {
              console.error(`[${requestId}] Failed to clean up queue item ${itemId}:`, cleanupError)
            } else {
              console.log(`[${requestId}] ✅ Cleaned up queue item ${itemId}`)
            }
          } catch (err) {
            console.error(`[${requestId}] Failed to clean up queue item ${itemId}:`, err)
          }
        })
      )
    }
    
    // Update queueItems to exclude items that are being cleaned up
    // This ensures we only look for processable items among the remaining ones
    queueItems = itemsToKeep
    
    // Safety check: Look for audits that are pending/running but not in queue
    // This handles cases where audits were created but never added to queue
    if (!queueItems || queueItems.length === 0) {
      console.log(`[${requestId}] No queue items found. Checking for audits not in queue...`)
      const { data: orphanedAudits } = await supabase
        .from('audits')
        .select('id, url, status, created_at, email_sent_at, formatted_report_html')
        .or('status.eq.running,status.eq.pending')
        .is('email_sent_at', null)
        .order('created_at', { ascending: true })
        .limit(5)
      
      if (orphanedAudits && orphanedAudits.length > 0) {
        console.log(`[${requestId}] Found ${orphanedAudits.length} audit(s) not in queue - adding them...`)
        for (const audit of orphanedAudits) {
          // Check if already in queue
          const { data: existingQueue } = await supabase
            .from('audit_queue')
            .select('id')
            .eq('audit_id', audit.id)
            .single()
          
          if (!existingQueue) {
            // Add to queue
            const { error: addError } = await supabase
              .from('audit_queue')
              .insert({
                audit_id: audit.id,
                status: 'pending',
                retry_count: 0,
                last_error: null,
                created_at: new Date().toISOString(),
              })
            if (addError) {
              console.error(`[${requestId}] Failed to add orphaned audit ${audit.id} to queue:`, addError)
            } else {
              console.log(`[${requestId}] ✅ Added orphaned audit ${audit.id} (${audit.url}) to queue`)
            }
          }
        }
        // Retry finding queue items after adding orphaned audits
        const { data: retryQueueItems } = await supabase
          .from('audit_queue')
          .select('*, audits(*)')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(20)
        
        if (retryQueueItems && retryQueueItems.length > 0) {
          // Use the retry items as the new queue items
          queueItems = retryQueueItems
          console.log(`[${requestId}] ✅ Retrying with ${retryQueueItems.length} queue items after adding orphaned audits`)
        }
      }
    }
    
    // Safety check: Look for audits that are pending/running but not in queue
    // This handles cases where audits were created but never added to queue
    if (!queueItems || queueItems.length === 0) {
      console.log(`[${requestId}] No queue items found. Checking for audits not in queue...`)
      const { data: orphanedAudits } = await supabase
        .from('audits')
        .select('id, url, status, created_at, email_sent_at, formatted_report_html')
        .or('status.eq.running,status.eq.pending')
        .is('email_sent_at', null)
        .order('created_at', { ascending: true })
        .limit(5)
      
      if (orphanedAudits && orphanedAudits.length > 0) {
        console.log(`[${requestId}] Found ${orphanedAudits.length} audit(s) not in queue - adding them...`)
        for (const audit of orphanedAudits) {
          // Check if already in queue
          const { data: existingQueue } = await supabase
            .from('audit_queue')
            .select('id')
            .eq('audit_id', audit.id)
            .single()
          
          if (!existingQueue) {
            // Add to queue
            const { error: addError } = await supabase
              .from('audit_queue')
              .insert({
                audit_id: audit.id,
                status: 'pending',
                retry_count: 0,
                last_error: null,
                created_at: new Date().toISOString(),
              })
            if (addError) {
              console.error(`[${requestId}] Failed to add orphaned audit ${audit.id} to queue:`, addError)
            } else {
              console.log(`[${requestId}] ✅ Added orphaned audit ${audit.id} (${audit.url}) to queue`)
            }
          }
        }
        // Retry finding queue items after adding orphaned audits
        const { data: retryQueueItems } = await supabase
          .from('audit_queue')
          .select('*, audits(*)')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(20)
        
        if (retryQueueItems && retryQueueItems.length > 0) {
          // Use the retry items as the new queue items
          queueItems = retryQueueItems
          console.log(`[${requestId}] ✅ Retrying with ${retryQueueItems.length} queue items after adding orphaned audits`)
        }
      }
    }
    
    // CRITICAL: Filter out queue items where email was already sent
    // Use a for loop instead of find() so we can await fresh data fetches
    // The join query might return stale data (email_sent=null even when email was sent)
    let queueItem: any = null
    
    for (const item of queueItems || []) {
      let audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
      
      // Log each item being checked
      const ageSeconds = Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000)
      const ageMinutes = Math.round(ageSeconds / 60)
      
      // FALLBACK: If join didn't return audit data, fetch it separately
      if (!audit && item.audit_id) {
        console.warn(`[${requestId}] ⚠️  Queue item ${item.id} has no audit data in join - fetching separately`)
        const { data: fetchedAudit } = await supabase
          .from('audits')
          .select('email_sent_at, status, formatted_report_html, url')
          .eq('id', item.audit_id)
          .single()
        audit = fetchedAudit
      }
      
      if (!audit) {
        console.warn(`[${requestId}] ⚠️  Skipping queue item ${item.id} (audit_id: ${item.audit_id}) - no audit data available`)
        continue
      }
      
      // CRITICAL: Fetch fresh email_sent_at to avoid stale join data
      // The join might show null even if email was sent (database replication lag)
      console.log(`[${requestId}] 🔍 Fetching fresh email_sent_at for audit ${item.audit_id} (join showed: ${audit?.email_sent_at || 'null'})`)
      const { data: freshEmailCheck, error: freshEmailError } = await supabase
        .from('audits')
        .select('email_sent_at, status')
        .eq('id', item.audit_id)
        .single()
      
      if (freshEmailError) {
        console.warn(`[${requestId}] ⚠️  Error fetching fresh email_sent_at for ${item.audit_id}:`, freshEmailError.message)
        // If query failed, we can't trust the join data - skip this item to be safe
        if (freshEmailError.code === 'PGRST116') {
          console.warn(`[${requestId}] ⚠️  Audit ${item.audit_id} not found in database - skipping`)
          continue
        }
      }
      
      // If freshEmailCheck is null, the query might have failed or audit doesn't exist
      if (!freshEmailCheck) {
        console.warn(`[${requestId}] ⚠️  Fresh email check returned null for audit ${item.audit_id} - skipping to be safe`)
        continue
      }
      
      const emailSentAt = freshEmailCheck.email_sent_at || audit?.email_sent_at
      
      // Log what we found for debugging - include status
      console.log(`[${requestId}] 🔍 Fresh check result for audit ${item.audit_id}: status=${freshEmailCheck.status || 'null'}, fresh_email=${freshEmailCheck.email_sent_at || 'null'}, join_email=${audit?.email_sent_at || 'null'}, using=${emailSentAt || 'null'}`)
      
      if (freshEmailCheck.email_sent_at && !audit?.email_sent_at) {
        console.log(`[${requestId}] 🔍 Fresh check found email_sent_at=${freshEmailCheck.email_sent_at} but join showed null for audit ${item.audit_id}`)
      }
      
      // Additional safeguard: Check audit status FIRST to avoid replication lag issues
      // Use fresh check status first, fallback to join data status if fresh check doesn't have it
      const auditStatus = freshEmailCheck.status || audit?.status
      
      // Skip if audit is already completed
      if (auditStatus === 'completed') {
        console.log(`[${requestId}] ⏳ Skipping audit ${item.audit_id} - status is 'completed' (fresh_status=${freshEmailCheck.status || 'null'}, join_status=${audit?.status || 'null'}, email_sent_at: ${freshEmailCheck.email_sent_at || 'null'}, may be due to replication lag)`)
        // Mark queue item as completed since audit is already completed
        const { error: updateError } = await supabase
          .from('audit_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', item.id)
          .in('status', ['pending', 'processing'])
        
        if (updateError) {
          console.error(`[${requestId}] ❌ Failed to mark queue item ${item.id} as completed:`, updateError)
        } else {
          console.log(`[${requestId}] ✅ Marked queue item ${item.id} as completed (audit already completed)`)
        }
        continue
      }
      
      // Skip if audit is already failed (permanent error, no retry needed)
      if (auditStatus === 'failed') {
        console.log(`[${requestId}] ⏳ Skipping audit ${item.audit_id} - status is 'failed' (fresh_status=${freshEmailCheck.status || 'null'}, join_status=${audit?.status || 'null'})`)
        // Mark queue item as failed to match audit status
        const { error: updateError } = await supabase
          .from('audit_queue')
          .update({
            status: 'failed',
            last_error: 'Audit already marked as failed - skipping reprocessing',
          })
          .eq('id', item.id)
          .in('status', ['pending', 'processing'])
        
        if (updateError) {
          console.error(`[${requestId}] ❌ Failed to mark queue item ${item.id} as failed:`, updateError)
        } else {
          console.log(`[${requestId}] ✅ Marked queue item ${item.id} as failed (audit already failed)`)
        }
        continue
      }
      
      // Skip if email was already sent (not a reservation)
      // CRITICAL: Check for any valid email_sent_at timestamp (not just ones >5 minutes old)
      if (emailSentAt && 
          !emailSentAt.startsWith('sending_') && 
          emailSentAt.length > 10) {
        // Valid timestamp exists - email was sent (regardless of age)
        console.log(`[${requestId}] ⏳ Skipping audit ${item.audit_id} - email already sent at ${emailSentAt} (fresh check: ${freshEmailCheck.email_sent_at ? 'found' : 'not found'}, join: ${audit?.email_sent_at || 'null'})`)
        // Mark queue item as completed since email was sent
        const { error: updateError } = await supabase
          .from('audit_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', item.id)
          .in('status', ['pending', 'processing'])
        
        if (updateError) {
          console.error(`[${requestId}] ❌ Failed to mark queue item ${item.id} as completed:`, updateError)
        } else {
          console.log(`[${requestId}] ✅ Marked queue item ${item.id} as completed (email already sent)`)
        }
        continue
      }
      
      // Skip if email is being sent (reservation exists - another process is handling it)
      if (emailSentAt && emailSentAt.startsWith('sending_')) {
        console.log(`[${requestId}] ⏳ Skipping audit ${item.audit_id} - another process is sending email (reserved at ${emailSentAt})`)
        continue
      }
      
      // This item passes all checks - use it
      console.log(`[${requestId}] ✅ Found processable audit ${item.audit_id} (age: ${ageMinutes}m, url: ${audit.url || 'unknown'})`)
      queueItem = item
      break // Found a processable item, stop searching
    }
    
    if (!queueItem) {
      // No delay - all pending items should be processable
      if (queueItems && queueItems.length > 0) {
        // This is important - we have queue items but none passed the filter
        console.warn(`[${requestId}] ⚠️  Found ${queueItems.length} pending queue items but none passed filtering criteria`)
        console.warn(`[${requestId}] This might indicate a bug in the filtering logic or missing audit data in joins`)
        // Log details about why each item was filtered out
        queueItems.forEach((item: any) => {
          const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
          const ageSeconds = Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000)
          const passesEmail = !isEmailSent(audit?.email_sent_at) && !isEmailSending(audit?.email_sent_at)
          console.warn(`[${requestId}]   - Queue item ${item.id} (audit_id: ${item.audit_id}):`)
          console.warn(`[${requestId}]     audit_data=${audit ? 'present' : 'MISSING'}, age=${ageSeconds}s, email_sent=${audit?.email_sent_at || 'null'}, status=${item.status}`)
          console.warn(`[${requestId}]     passes_email=${passesEmail}, should_process=${passesEmail && audit ? 'YES' : 'NO'}`)
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
    const auditData = (queueItem.audits as any) || null;
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
      .select('email_sent_at, customers(*)')
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
        await supabase
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
        
        await supabase
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

    // Process the audit
    // With Netlify Pro, we have 26 seconds timeout, but full audits can take longer
    // Strategy: Attempt full processing, but return early if taking too long
    // The processing will continue in the background (Netlify allows this)
    
    // Check if audit already has a report (just needs email sending - fast)
    const { data: quickCheck } = await supabase
      .from('audits')
      .select('status, formatted_report_html, email_sent_at')
      .eq('id', auditId)
      .single()
    
    const hasReport = !!quickCheck?.formatted_report_html
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
      
      // Wrap processAudit in a timeout
      // For full audits, we'll attempt processing but return early if it takes too long
      // The processing will continue in the background
      const processPromise = processAudit(auditId)
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
      const { data: verifyAudit } = await supabase
        .from('audits')
        .select('status, formatted_report_html, email_sent_at')
        .eq('id', auditId)
        .single()
      
      if (!verifyAudit) {
        throw new Error('Audit not found after processing')
      }
      
      // CRITICAL: Mark queue as completed if email was sent
      // If email_sent_at exists and is not a reservation (doesn't start with 'sending_'), it's a real email
      // The 5-minute check is only for distinguishing old reservations, but any real timestamp means email was sent
      const emailWasSent = verifyAudit.email_sent_at && 
                          !verifyAudit.email_sent_at.startsWith('sending_') &&
                          verifyAudit.email_sent_at.length > 10 // Real timestamp format (ISO 8601 is always > 10 chars)
      
      if (emailWasSent) {
        console.log(`[${requestId}] ✅ Email was sent (timestamp: ${verifyAudit.email_sent_at}) - marking queue as completed`)
        // Email was sent - mark queue as completed immediately
        // Use atomic update: only update if still pending or processing (prevents race conditions)
        const { data: queueUpdateResult, error: queueUpdateError } = await supabase
          .from('audit_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', queueItem.id)
          .in('status', ['pending', 'processing']) // Atomic: only update if still pending or processing
          .select('id, status, completed_at')
        
        if (queueUpdateError) {
          console.error(`[${requestId}] ❌ Failed to mark queue as completed:`, queueUpdateError)
        } else if (!queueUpdateResult || queueUpdateResult.length === 0) {
          // Queue item might have been updated by another process - verify current status
          const { data: currentStatus } = await supabase
            .from('audit_queue')
            .select('status')
            .eq('id', queueItem.id)
            .single()
          const currentStatusValue = currentStatus?.status || 'unknown'
          if (currentStatusValue === 'completed') {
            console.log(`[${requestId}] ✅ Queue already marked as completed by another process`)
          } else {
            console.warn(`[${requestId}] ⚠️  Queue update returned no data - current status: ${currentStatusValue}`)
          }
        } else {
          console.log(`[${requestId}] ✅ Audit ${auditId} email sent - queue marked as completed (status: ${queueUpdateResult[0].status})`)
        }
        
        return NextResponse.json({
          success: true,
          message: 'Audit email sent successfully',
          processed: true,
          auditId,
          email_sent_at: verifyAudit.email_sent_at,
          has_report: !!verifyAudit.formatted_report_html,
        })
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
          const { error: fixStatusError } = await supabase
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
        // Use atomic update: only update if still pending or processing (prevents race conditions)
        const { data: queueUpdateResult, error: queueUpdateError } = await supabase
          .from('audit_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', queueItem.id)
          .in('status', ['pending', 'processing']) // Atomic: only update if still pending or processing
          .select('id, status, completed_at')
        
        if (queueUpdateError) {
          console.error(`[${requestId}] ❌ Failed to mark queue as completed:`, queueUpdateError)
        } else if (!queueUpdateResult || queueUpdateResult.length === 0) {
          // Queue item might have been updated by another process - verify current status
          const { data: currentStatus } = await supabase
            .from('audit_queue')
            .select('status')
            .eq('id', queueItem.id)
            .single()
          const currentStatusValue = currentStatus?.status || 'unknown'
          if (currentStatusValue === 'completed') {
            console.log(`[${requestId}] ✅ Queue already marked as completed by another process`)
          } else {
            console.warn(`[${requestId}] ⚠️  Queue update returned no data - current status: ${currentStatusValue}`)
          }
        } else {
          console.log(`[${requestId}] ✅ Audit ${auditId} is complete (${hasReport ? 'has report' : 'email sent'}) - marked queue as completed (queue_id: ${queueUpdateResult[0].id}, status: ${queueUpdateResult[0].status})`)
        }
        
        return NextResponse.json({
          success: true,
          message: isComplete 
            ? 'Audit processed successfully'
            : `Audit has ${hasReport ? 'report' : 'email'} - marked as completed`,
          processed: true,
          auditId,
          email_sent_at: verifyAudit.email_sent_at,
          status_fixed: !isComplete,
        })
      } else {
        // Audit processing didn't complete properly - no report and no email
        // CRITICAL: Re-check one more time before throwing error (handles race conditions)
        const { data: finalCheck } = await supabase
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
            await supabase
              .from('audits')
              .update({
                status: 'completed',
                completed_at: finalCheck.completed_at || new Date().toISOString(),
              })
              .eq('id', auditId)
          }
          
          // Mark queue as completed
          const { data: queueFixResult, error: queueFixError } = await supabase
            .from('audit_queue')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', queueItem.id)
            .in('status', ['pending', 'processing']) // Only update if still pending or processing (prevents race conditions)
            .select('id, status, completed_at')
          
          if (queueFixError) {
            console.error(`[${requestId}] ❌ Failed to mark queue as completed in final check:`, queueFixError)
          } else if (!queueFixResult || queueFixResult.length === 0) {
            // Queue item might have been updated by another process - verify current status
            const { data: currentStatus } = await supabase
              .from('audit_queue')
              .select('status')
              .eq('id', queueItem.id)
              .single()
            const currentStatusValue = currentStatus?.status || 'unknown'
            if (currentStatusValue === 'completed') {
              console.log(`[${requestId}] ✅ Queue already marked as completed by another process`)
            } else {
              console.warn(`[${requestId}] ⚠️  Queue update in final check returned no data - current status: ${currentStatusValue}`)
            }
          } else {
            console.log(`[${requestId}] ✅ Queue marked as completed in final check (queue_id: ${queueFixResult[0].id}, status: ${queueFixResult[0].status}, completed_at: ${queueFixResult[0].completed_at})`)
          }
          
          return NextResponse.json({
            success: true,
            message: 'Audit completed successfully (reconciled after final check)',
            processed: true,
            auditId,
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
        processAudit(auditId).catch((bgError) => {
          console.error(`[${requestId}] Background processing error for ${auditId}:`, bgError)
        })
        
        // Return success - processing continues in background
        return NextResponse.json({
          success: true,
          message: 'Audit processing started - continuing in background',
          processed: true,
          auditId,
          timeout: true,
          note: 'Processing continues in background after function return',
        })
      }
      
      // Actual error (not timeout) - handle normally
      console.error(`[${requestId}] Failed to process audit ${auditId}:`, processError)
      
      // CRITICAL: Re-check audit status one more time before marking as failed
      // This handles race conditions where the report/email were generated but not yet visible
      const { data: currentAudit } = await supabase
        .from('audits')
        .select('status, formatted_report_html, email_sent_at, completed_at')
        .eq('id', auditId)
        .single()
      
      const hasReportNow = !!currentAudit?.formatted_report_html
      const hasEmailNow = isEmailSent(currentAudit?.email_sent_at)
      const isCompletedNow = currentAudit?.status === 'completed'
      
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
          const { error: fixAfterError } = await supabase
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
        // Use atomic update: only update if still pending or processing
        const { data: queueFixResult, error: queueFixError } = await supabase
          .from('audit_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', queueItem.id)
          .in('status', ['pending', 'processing']) // Atomic: only update if still pending or processing
          .select('status')

        if (queueFixError) {
          console.error(`[${requestId}] ❌ Failed to mark queue as completed after error:`, queueFixError)
        } else if (!queueFixResult || queueFixResult.length === 0) {
          // Queue item might have been updated by another process - verify current status
          const { data: currentStatus } = await supabase
            .from('audit_queue')
            .select('status')
            .eq('id', queueItem.id)
            .single()
          const currentStatusValue = currentStatus?.status || 'unknown'
          if (currentStatusValue === 'completed') {
            console.log(`[${requestId}] ✅ Queue already marked as completed by another process`)
          } else {
            console.warn(`[${requestId}] ⚠️  Queue update returned no data - current status: ${currentStatusValue}`)
          }
        } else {
          console.log(
            `[${requestId}] ✅ Audit ${auditId} fixed after error - ` +
            `queue marked as completed (status: ${queueFixResult[0].status})`
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Audit completed successfully after error reconciliation',
          processed: true,
          auditId,
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
          const { error: fixAfterError } = await supabase
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
        // Use atomic update: only update if still pending or processing
        const { data: queueFixResult, error: queueFixError } = await supabase
          .from('audit_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', queueItem.id)
          .in('status', ['pending', 'processing']) // Atomic: only update if still pending or processing
          .select('status')

        if (queueFixError) {
          console.error(`[${requestId}] ❌ Failed to mark queue as completed after error:`, queueFixError)
        } else if (!queueFixResult || queueFixResult.length === 0) {
          // Queue item might have been updated by another process - verify current status
          const { data: currentStatus } = await supabase
            .from('audit_queue')
            .select('status')
            .eq('id', queueItem.id)
            .single()
          const currentStatusValue = currentStatus?.status || 'unknown'
          if (currentStatusValue === 'completed') {
            console.log(`[${requestId}] ✅ Queue already marked as completed by another process`)
          } else {
            console.warn(`[${requestId}] ⚠️  Queue update returned no data - current status: ${currentStatusValue}`)
          }
        } else {
          console.log(
            `[${requestId}] ✅ Audit ${auditId} fixed after error - ` +
            `queue marked as completed (status: ${queueFixResult[0].status})`
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Audit completed successfully after error reconciliation',
          processed: true,
          auditId,
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
        const { error: auditUpdateError } = await supabase
          .from('audits')
          .update({
            status: 'failed',
            error_log: errorLog,
          } as any)
          .eq('id', auditId)
        
        if (auditUpdateError) {
          console.error(`[${requestId}] Failed to update audit status to failed:`, auditUpdateError)
          // Try without error_log if column does not exist
          await supabase
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
          const { data: auditWithErrorLog } = await supabase
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
      
      const isPermanentError = 
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
        console.log(`[${requestId}] ⚠️  Permanent error detected: "${errorMessage.substring(0, 150)}" - marking as failed without retry`)
      } else {
        console.log(`[${requestId}] ℹ️  Transient error (will retry if attempts < 3): "${errorMessage.substring(0, 150)}"`)
      }
      
      await supabase
        .from('audit_queue')
        .update({
          status: shouldRetry ? 'pending' : 'failed',
          last_error: errorMessage.substring(0, 1000), // Limit error message size
        })
        .eq('id', queueItem.id)
      
      // Return 200 (not 500) if this is an expected failure that will be retried
      // Only return 500 for unexpected errors that should not be retried
      const statusCode = shouldRetry ? 200 : 500
      
      return NextResponse.json({
        success: !shouldRetry, // Only "success" if we are not retrying
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
    );
  }
}

