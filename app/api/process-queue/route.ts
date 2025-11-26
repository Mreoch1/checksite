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
    // Also check that email hasn't been sent yet (prevent processing already-completed audits)
    const { data: queueItem, error: findError } = await supabase
      .from('audit_queue')
      .select('*, audits(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    
    // Check if no queue item found first
    if (findError || !queueItem) {
      // No pending audits - log this for debugging
      console.log(`[${requestId}] No pending audits in queue`)
      
      // Check if there are any stuck items (processing for too long)
      const { data: stuckItems } = await supabase
        .from('audit_queue')
        .select('*, audits(*)')
        .eq('status', 'processing')
        .lt('started_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Processing for > 10 minutes
      
      if (stuckItems && stuckItems.length > 0) {
        console.warn(`[${requestId}] Found ${stuckItems.length} stuck processing items`)
        return NextResponse.json({
          success: true,
          message: 'No pending audits in queue',
          processed: false,
          warning: `${stuckItems.length} audits stuck in processing state`,
          stuckItems: stuckItems.map(item => ({
            id: item.id,
            audit_id: item.audit_id,
            started_at: item.started_at,
            retry_count: item.retry_count,
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
      if (auditData.email_sent_at) {
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
      
      // CRITICAL: Skip if audit has a report already saved (even if email wasn't sent)
      // This prevents reprocessing audits that already have reports
      if (auditData.status === 'completed' && auditData.formatted_report_html) {
        console.log(`[${requestId}] Skipping audit ${queueItem.audit_id} - already completed with report`)
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
          message: 'Audit already completed (report exists)',
          processed: false,
          auditId: queueItem.audit_id,
        })
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
    try {
      console.log(`[${requestId}] Processing audit ${auditId} from queue`)
      await processAudit(auditId)
      
      // Mark as completed
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
    } catch (processError) {
      const errorMessage = processError instanceof Error ? processError.message : String(processError)
      
      // Mark as failed (but allow retries if retry_count < 3)
      const shouldRetry = queueItem.retry_count < 3
      await supabase
        .from('audit_queue')
        .update({
          status: shouldRetry ? 'pending' : 'failed',
          last_error: errorMessage.substring(0, 1000), // Limit error message size
        })
        .eq('id', queueItem.id)

      console.error(`[${requestId}] Failed to process audit ${auditId}:`, processError)
      
      return NextResponse.json({
        success: false,
        message: `Audit ${auditId} processing failed`,
        error: errorMessage,
        processed: true,
        auditId,
        willRetry: shouldRetry,
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

