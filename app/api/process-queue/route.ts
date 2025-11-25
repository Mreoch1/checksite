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

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Optional: Add basic auth to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.QUEUE_SECRET
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find the oldest pending audit in the queue
    const { data: queueItem, error: findError } = await supabase
      .from('audit_queue')
      .select('*, audits(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (findError || !queueItem) {
      // No pending audits
      return NextResponse.json({
        success: true,
        message: 'No pending audits in queue',
        processed: false,
      })
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
      console.log(`[process-queue] Processing audit ${auditId} from queue`)
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

      console.error(`[process-queue] Failed to process audit ${auditId}:`, processError)
      
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
    console.error('[process-queue] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Unexpected error processing queue',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

