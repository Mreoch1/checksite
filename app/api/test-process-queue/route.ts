/**
 * Test endpoint to process queue without authentication
 * Only for testing - should be disabled in production
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { processAudit } from '@/lib/process-audit'
import { getRequestId } from '@/lib/request-id'
import { isEmailSent, isEmailSending } from '@/lib/email-status'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  console.log(`[${requestId}] /api/test-process-queue called (test endpoint)`)

  try {
    // Find the oldest pending audit in the queue
    const { data: queueItems, error: findError } = await supabase
      .from('audit_queue')
      .select('*, audits(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5)

    if (findError) {
      console.error(`[${requestId}] Error finding queue items:`, findError)
      return NextResponse.json(
        { error: 'Database error', details: findError.message },
        { status: 500 }
      )
    }

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending audits in queue',
        processed: 0,
      })
    }

    // Filter for processable items (5-minute delay, no email sent)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const queueItem = queueItems.find((item: any) => {
      const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
      if (!audit) return false
      if (isEmailSent(audit.email_sent_at)) return false
      if (isEmailSending(audit.email_sent_at)) return false
      if (item.created_at && item.created_at > fiveMinutesAgo) return false
      return true
    }) || null

    if (!queueItem) {
      return NextResponse.json({
        success: true,
        message: 'No audits ready to process (waiting for delay or already processed)',
        processed: 0,
        queueItems: queueItems.length,
      })
    }

    const auditId = queueItem.audit_id
    console.log(`[${requestId}] Processing audit ${auditId}`)

    // Mark as processing
    await supabase
      .from('audit_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        retry_count: (queueItem.retry_count || 0) + 1,
      })
      .eq('id', queueItem.id)

    // Process the audit
    try {
      await processAudit(auditId)
      console.log(`[${requestId}] ✅ Audit ${auditId} processed successfully`)

      return NextResponse.json({
        success: true,
        message: 'Audit processed successfully',
        processed: true,
        auditId,
      })
    } catch (processError) {
      console.error(`[${requestId}] Error processing audit:`, processError)

      // Update queue with error
      await supabase
        .from('audit_queue')
        .update({
          status: 'pending',
          last_error: processError instanceof Error ? processError.message : String(processError),
        })
        .eq('id', queueItem.id)

      return NextResponse.json(
        {
          error: 'Failed to process audit',
          details: processError instanceof Error ? processError.message : String(processError),
          auditId,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error)
    return NextResponse.json(
      {
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

