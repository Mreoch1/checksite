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
    const { data: queueItems, error: findError } = await supabase
      .from('audit_queue')
      .select('*, audits(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10) // Get a few items to filter in code
    
    if (findError) {
      console.error(`[${requestId}] Error finding queue items:`, findError)
      return NextResponse.json(
        { error: 'Database error finding queue items', details: findError.message },
        { status: 500 }
      )
    }
    
    // Filter out audits that already have email_sent_at (client-side filter)
    // Also filter out audits with "sending_" prefix (another process is sending)
    // Handle both array and single object responses from Supabase
    const queueItem = queueItems?.find((item: any) => {
      const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
      if (!audit) return false
      // Skip if email_sent_at exists and is not a "sending_" reservation
      if (audit.email_sent_at && !audit.email_sent_at.startsWith('sending_')) {
        return false
      }
      // Skip if email_sent_at is a "sending_" reservation (another process is handling it)
      if (audit.email_sent_at?.startsWith('sending_')) {
        return false
      }
      return true
    }) || null
    
    if (!queueItem) {
      // No pending audits - log this for debugging
      console.log(`[${requestId}] No pending audits in queue`)
      
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
      // CRITICAL: Skip if email was already sent (regardless of report status)
      // This is the PRIMARY check to prevent duplicate emails
      // Also skip if email is in "sending_" state (another process is handling it)
      const emailSentOrSending = auditData.email_sent_at && 
        !auditData.email_sent_at.startsWith('sending_') && 
        auditData.email_sent_at !== 'null'
      
      if (emailSentOrSending) {
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
      if (auditData.email_sent_at?.startsWith('sending_')) {
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
      
      // Verify audit was actually completed (not just timed out)
      const { data: verifyAudit } = await supabase
        .from('audits')
        .select('status, formatted_report_html')
        .eq('id', auditId)
        .single()
      
      if (verifyAudit && verifyAudit.status === 'completed' && verifyAudit.formatted_report_html) {
        // Mark queue as completed
        await supabase
          .from('audit_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', queueItem.id)

        return NextResponse.json({
          success: true,
          message: `Audit ${auditId} processed successfully`,
          processed: true,
          auditId,
        })
      } else {
        // Process completed but audit status wasn't updated - mark as failed
        throw new Error('Audit processing completed but audit status was not updated to completed')
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
      
      return NextResponse.json({
        success: false,
        message: `Audit ${auditId} processing failed`,
        error: errorMessage,
        processed: true,
        auditId,
        willRetry: shouldRetry,
        auditStatusUpdated: currentAudit?.status === 'failed',
      }, { status: 500 })
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

