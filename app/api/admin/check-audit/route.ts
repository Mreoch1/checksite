/**
 * Admin endpoint to check detailed information about a specific audit
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'
import { getRequestId } from '@/lib/request-id'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  const searchParams = request.nextUrl.searchParams
  const auditId = searchParams.get('id')
  
  if (!auditId) {
    return NextResponse.json(
      { error: 'Audit ID parameter is required. Usage: /api/admin/check-audit?id=AUDIT_ID' },
      { status: 400 }
    )
  }
  
  // Require admin authentication
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    // Get audit with customer info
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

    // Get audit modules
    const { data: modules } = await supabase
      .from('audit_modules')
      .select('*')
      .eq('audit_id', auditId)

    // Get queue status
    const { data: queueItem } = await supabase
      .from('audit_queue')
      .select('*')
      .eq('audit_id', auditId)
      .single()

    const customer = audit.customers as any

    // Analyze audit status
    const analysis = {
      hasReport: !!audit.formatted_report_html,
      reportLength: audit.formatted_report_html?.length || 0,
      hasPlaintext: !!audit.formatted_report_plaintext,
      emailSent: !!audit.email_sent_at,
      emailSentAt: audit.email_sent_at,
      status: audit.status,
      isCompleted: audit.status === 'completed',
      hasRawResults: !!audit.raw_result_json,
      queueStatus: queueItem?.status || 'not_queued',
      queueRetryCount: queueItem?.retry_count || 0,
      queueLastError: queueItem?.last_error || null,
    }

    // Check if report URL would work
    const reportUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app'}/report/${auditId}`
    const reportAccessible = audit.status === 'completed' && audit.formatted_report_html

    return NextResponse.json({
      success: true,
      audit: {
        id: audit.id,
        url: audit.url,
        status: audit.status,
        created_at: audit.created_at,
        completed_at: audit.completed_at,
        email_sent_at: audit.email_sent_at,
        customer: {
          email: customer?.email,
          name: customer?.name,
        },
      },
      analysis,
      modules: modules?.map(m => ({
        module_key: m.module_key,
        enabled: m.enabled,
        raw_score: m.raw_score,
        has_issues: !!m.raw_issues_json,
      })),
      queue: queueItem ? {
        id: queueItem.id,
        status: queueItem.status,
        created_at: queueItem.created_at,
        started_at: queueItem.started_at,
        completed_at: queueItem.completed_at,
        retry_count: queueItem.retry_count,
        last_error: queueItem.last_error,
      } : null,
      report: {
        url: reportUrl,
        accessible: reportAccessible,
        has_html: !!audit.formatted_report_html,
        html_length: audit.formatted_report_html?.length || 0,
        has_plaintext: !!audit.formatted_report_plaintext,
        plaintext_length: audit.formatted_report_plaintext?.length || 0,
      },
      raw_data: {
        has_raw_results: !!audit.raw_result_json,
        raw_results_type: audit.raw_result_json ? typeof audit.raw_result_json : null,
      },
      issues: {
        missing_report: audit.status === 'completed' && !audit.formatted_report_html,
        email_sent_no_report: audit.email_sent_at && !audit.formatted_report_html,
        completed_no_email: audit.status === 'completed' && !audit.email_sent_at,
        stuck_in_queue: queueItem?.status === 'processing' && queueItem?.started_at && 
          (Date.now() - new Date(queueItem.started_at).getTime()) > 10 * 60 * 1000,
      },
    })
  } catch (error) {
    console.error(`[${requestId}] Unexpected error in check-audit:`, error)
    return NextResponse.json(
      {
        error: 'Unexpected error checking audit',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

