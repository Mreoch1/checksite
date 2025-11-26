/**
 * Admin endpoint to check queue status and identify stuck audits
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'
import { getRequestId } from '@/lib/request-id'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  console.log(`[${requestId}] /api/admin/check-queue-status called`)
  
  // Require admin authentication
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    // Get all queue items with their audit details
    const { data: queueItems, error: queueError } = await supabase
      .from('audit_queue')
      .select('*, audits(*)')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (queueError) {
      console.error(`[${requestId}] Error fetching queue items:`, queueError)
      return NextResponse.json(
        { error: 'Failed to fetch queue items', details: queueError.message },
        { status: 500 }
      )
    }
    
    // Get all audits without reports
    const { data: auditsWithoutReports, error: auditsError } = await supabase
      .from('audits')
      .select('id, url, status, completed_at, email_sent_at, formatted_report_html')
      .or('formatted_report_html.is.null,formatted_report_html.eq.')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(50)
    
    if (auditsError) {
      console.error(`[${requestId}] Error fetching audits without reports:`, auditsError)
    }
    
    // Get all audits with email_sent_at but no report
    const { data: auditsWithEmailNoReport, error: emailError } = await supabase
      .from('audits')
      .select('id, url, status, completed_at, email_sent_at, formatted_report_html')
      .not('email_sent_at', 'is', null)
      .or('formatted_report_html.is.null,formatted_report_html.eq.')
      .order('email_sent_at', { ascending: false })
      .limit(50)
    
    if (emailError) {
      console.error(`[${requestId}] Error fetching audits with email but no report:`, emailError)
    }
    
    // Analyze queue items
    const analysis = {
      totalQueueItems: queueItems?.length || 0,
      pending: queueItems?.filter(q => q.status === 'pending').length || 0,
      processing: queueItems?.filter(q => q.status === 'processing').length || 0,
      completed: queueItems?.filter(q => q.status === 'completed').length || 0,
      failed: queueItems?.filter(q => q.status === 'failed').length || 0,
      stuckItems: queueItems?.filter(q => {
        const audit = q.audits as any
        // Stuck if: processing for > 10 minutes, or pending for > 1 hour, or email sent but no report
        if (q.status === 'processing' && q.started_at) {
          const started = new Date(q.started_at).getTime()
          const now = Date.now()
          return (now - started) > 10 * 60 * 1000 // 10 minutes
        }
        if (q.status === 'pending' && q.created_at) {
          const created = new Date(q.created_at).getTime()
          const now = Date.now()
          return (now - created) > 60 * 60 * 1000 // 1 hour
        }
        if (audit?.email_sent_at && !audit?.formatted_report_html) {
          return true // Email sent but no report
        }
        return false
      }) || [],
      auditsWithoutReports: auditsWithoutReports?.length || 0,
      auditsWithEmailNoReport: auditsWithEmailNoReport?.length || 0,
    }
    
    return NextResponse.json({
      success: true,
      analysis,
      queueItems: queueItems?.map(q => ({
        id: q.id,
        audit_id: q.audit_id,
        status: q.status,
        created_at: q.created_at,
        started_at: q.started_at,
        completed_at: q.completed_at,
        retry_count: q.retry_count,
        last_error: q.last_error,
        audit: {
          id: (q.audits as any)?.id,
          url: (q.audits as any)?.url,
          status: (q.audits as any)?.status,
          has_report: !!(q.audits as any)?.formatted_report_html,
          email_sent_at: (q.audits as any)?.email_sent_at,
          completed_at: (q.audits as any)?.completed_at,
        },
      })),
      auditsWithoutReports: auditsWithoutReports?.map(a => ({
        id: a.id,
        url: a.url,
        status: a.status,
        completed_at: a.completed_at,
        email_sent_at: a.email_sent_at,
        has_report: !!a.formatted_report_html,
      })),
      auditsWithEmailNoReport: auditsWithEmailNoReport?.map(a => ({
        id: a.id,
        url: a.url,
        status: a.status,
        completed_at: a.completed_at,
        email_sent_at: a.email_sent_at,
        has_report: !!a.formatted_report_html,
      })),
    })
  } catch (error) {
    console.error(`[${requestId}] Unexpected error in check-queue-status:`, error)
    return NextResponse.json(
      {
        error: 'Unexpected error checking queue status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

