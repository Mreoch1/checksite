import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    // Get all pending queue items
    const { data: pendingItems, error: pendingError } = await supabase
      .from('audit_queue')
      .select('*, audits(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (pendingError) {
      return NextResponse.json(
        { error: 'Failed to fetch pending items', details: pendingError.message },
        { status: 500 }
      )
    }

    // Get all processing queue items
    const { data: processingItems, error: processingError } = await supabase
      .from('audit_queue')
      .select('*, audits(*)')
      .eq('status', 'processing')
      .order('started_at', { ascending: true })

    if (processingError) {
      return NextResponse.json(
        { error: 'Failed to fetch processing items', details: processingError.message },
        { status: 500 }
      )
    }

    // Analyze each item
    const cleanupActions: any[] = []
    const itemsToCleanup: string[] = []

    // Check pending items
    for (const item of pendingItems || []) {
      const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
      if (!audit) continue

      const auditId = item.audit_id
      const hasEmail = audit.email_sent_at && !audit.email_sent_at.startsWith('sending_')
      const hasReport = !!audit.formatted_report_html
      const isCompleted = audit.status === 'completed'

      if (hasEmail || (isCompleted && hasReport)) {
        itemsToCleanup.push(item.id)
        cleanupActions.push({
          queueId: item.id,
          auditId,
          action: 'mark_completed',
          reason: hasEmail ? 'email_already_sent' : 'audit_completed_with_report',
          email_sent_at: audit.email_sent_at,
          has_report: hasReport,
          status: audit.status,
        })
      }
    }

    // Check processing items (stuck for > 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    for (const item of processingItems || []) {
      const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
      if (!audit) continue

      const auditId = item.audit_id
      const startedAt = item.started_at
      const isStuck = startedAt && startedAt < tenMinutesAgo
      const hasEmail = audit.email_sent_at && !audit.email_sent_at.startsWith('sending_')
      const hasReport = !!audit.formatted_report_html
      const isCompleted = audit.status === 'completed'

      if (hasEmail || (isCompleted && hasReport)) {
        itemsToCleanup.push(item.id)
        cleanupActions.push({
          queueId: item.id,
          auditId,
          action: 'mark_completed',
          reason: hasEmail ? 'email_already_sent' : 'audit_completed_with_report',
          email_sent_at: audit.email_sent_at,
          has_report: hasReport,
          status: audit.status,
          was_stuck: isStuck,
        })
      } else if (isStuck) {
        // Reset stuck items
        itemsToCleanup.push(item.id)
        cleanupActions.push({
          queueId: item.id,
          auditId,
          action: 'reset_to_pending',
          reason: 'stuck_processing',
          started_at: startedAt,
          retry_count: item.retry_count,
        })
      }
    }

    // Perform cleanup if requested
    const shouldCleanup = request.nextUrl.searchParams.get('cleanup') === 'true'
    let cleanupResults: any[] = []

    if (shouldCleanup && itemsToCleanup.length > 0) {
      for (const action of cleanupActions) {
        try {
          if (action.action === 'mark_completed') {
            await supabase
              .from('audit_queue')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
              })
              .eq('id', action.queueId)

            // Also fix audit status if needed
            if (action.status !== 'completed' && action.has_report) {
              await supabase
                .from('audits')
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                })
                .eq('id', action.auditId)
            }

            cleanupResults.push({
              queueId: action.queueId,
              auditId: action.auditId,
              action: 'marked_completed',
              success: true,
            })
          } else if (action.action === 'reset_to_pending') {
            await supabase
              .from('audit_queue')
              .update({
                status: 'pending',
                started_at: null,
                last_error: 'Reset from stuck processing state',
              })
              .eq('id', action.queueId)

            cleanupResults.push({
              queueId: action.queueId,
              auditId: action.auditId,
              action: 'reset_to_pending',
              success: true,
            })
          }
        } catch (err) {
          cleanupResults.push({
            queueId: action.queueId,
            auditId: action.auditId,
            action: action.action,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        pending_items: pendingItems?.length || 0,
        processing_items: processingItems?.length || 0,
        items_to_cleanup: itemsToCleanup.length,
        cleanup_actions: cleanupActions.length,
      },
      pending_items: pendingItems?.map((item: any) => {
        const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
        return {
          queue_id: item.id,
          audit_id: item.audit_id,
          status: item.status,
          created_at: item.created_at,
          audit_status: audit?.status,
          email_sent_at: audit?.email_sent_at,
          has_report: !!audit?.formatted_report_html,
        }
      }),
      processing_items: processingItems?.map((item: any) => {
        const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
        return {
          queue_id: item.id,
          audit_id: item.audit_id,
          status: item.status,
          started_at: item.started_at,
          retry_count: item.retry_count,
          audit_status: audit?.status,
          email_sent_at: audit?.email_sent_at,
          has_report: !!audit?.formatted_report_html,
        }
      }),
      cleanup_actions: cleanupActions,
      cleanup_results: cleanupResults,
      note: shouldCleanup
        ? `Cleanup performed on ${cleanupResults.filter(r => r.success).length} items`
        : 'Add ?cleanup=true to perform cleanup',
    })
  } catch (error) {
    console.error('Error in cleanup-queue:', error)
    return NextResponse.json(
      {
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

