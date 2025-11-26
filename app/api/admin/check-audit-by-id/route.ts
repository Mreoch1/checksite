import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'
import { getRequestId } from '@/lib/request-id'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  const authError = requireAdminAuth(request)
  if (authError) return authError

  const searchParams = request.nextUrl.searchParams
  const auditId = searchParams.get('id') || 'cff95d0c-32a1-4a27-9893-c3b362e1f222'

  try {
    // Get audit details
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('*, customers(*)')
      .eq('id', auditId)
      .single()

    if (auditError || !audit) {
      return NextResponse.json(
        { error: 'Audit not found', details: auditError?.message },
        { status: 404 }
      )
    }

    const customer = Array.isArray(audit.customers) ? audit.customers[0] : audit.customers

    // Check queue entry
    const { data: queueItem, error: queueError } = await supabase
      .from('audit_queue')
      .select('*')
      .eq('audit_id', auditId)
      .maybeSingle()

    // Check audit modules
    const { data: modules } = await supabase
      .from('audit_modules')
      .select('*')
      .eq('audit_id', auditId)

    const ageMinutes = Math.round((Date.now() - new Date(audit.created_at).getTime()) / 1000 / 60)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const passesDelay = audit.created_at < fiveMinutesAgo

    const result = {
      audit: {
        id: audit.id,
        url: audit.url,
        status: audit.status,
        created_at: audit.created_at,
        age_minutes: ageMinutes,
        email_sent_at: audit.email_sent_at,
        has_report: !!audit.formatted_report_html,
        customer_email: customer?.email,
        error_log: audit.error_log,
      },
      queue: queueItem ? {
        id: queueItem.id,
        status: queueItem.status,
        created_at: queueItem.created_at,
        retry_count: queueItem.retry_count,
        last_error: queueItem.last_error,
      } : null,
      modules: modules?.map(m => ({
        key: m.module_key,
        enabled: m.enabled,
        score: m.raw_score,
      })) || [],
      analysis: {
        passes_5min_delay: passesDelay,
        should_be_in_queue: (audit.status === 'pending' || audit.status === 'running') && !audit.email_sent_at,
        is_in_queue: !!queueItem,
        queue_status: queueItem?.status || 'not_queued',
        can_be_processed: passesDelay && !audit.email_sent_at && audit.status !== 'completed',
        suggestion: (audit.status === 'pending' || audit.status === 'running') && !audit.email_sent_at && !queueItem
          ? 'Audit should be in queue but is missing. Use POST to add it.'
          : undefined,
      },
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(`[${requestId}] Error checking audit:`, error)
    return NextResponse.json(
      {
        error: 'Failed to check audit',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const { auditId, action } = await request.json()

    if (!auditId) {
      return NextResponse.json(
        { error: 'auditId is required' },
        { status: 400 }
      )
    }

    if (action === 'add_to_queue') {
      // Add audit to queue
      // CRITICAL: Reset created_at when upserting to ensure proper 5-minute delay
      const { data: queueResult, error: queueError } = await supabase
        .from('audit_queue')
        .upsert({
          audit_id: auditId,
          status: 'pending',
          retry_count: 0,
          last_error: null,
          created_at: new Date().toISOString(), // Reset created_at to now when upserting
        }, {
          onConflict: 'audit_id',
        })
        .select()

      if (queueError) {
        return NextResponse.json(
          { error: 'Failed to add to queue', details: queueError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Audit added to queue',
        queue_entry: queueResult?.[0],
      })
    }

    if (action === 'fix_status') {
      // Fix audit status if it has a report but wrong status
      const { data: audit, error: auditError } = await supabase
        .from('audits')
        .select('status, formatted_report_html, completed_at')
        .eq('id', auditId)
        .single()

      if (auditError || !audit) {
        return NextResponse.json(
          { error: 'Audit not found', details: auditError?.message },
          { status: 404 }
        )
      }

      const hasReport = !!audit.formatted_report_html
      const needsFix = (audit.status === 'running' || audit.status === 'pending') && hasReport

      if (!needsFix) {
        return NextResponse.json({
          success: true,
          message: 'Audit status is correct',
          status: audit.status,
          hasReport,
          action: 'none',
        })
      }

      // Fix: Update status to completed
      const { error: updateError } = await supabase
        .from('audits')
        .update({
          status: 'completed',
          completed_at: audit.completed_at || new Date().toISOString(),
        })
        .eq('id', auditId)

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update audit status', details: updateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Audit status fixed successfully',
        auditId,
        previousStatus: audit.status,
        newStatus: 'completed',
        hasReport,
      })
    }

    return NextResponse.json(
      { error: 'Unknown action. Supported actions: add_to_queue, fix_status' },
      { status: 400 }
    )
  } catch (error) {
    console.error(`[${requestId}] Error in POST:`, error)
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

