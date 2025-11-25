import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Require admin authentication
  const authError = requireAdminAuth(request)
  if (authError) return authError
  try {
    const searchParams = request.nextUrl.searchParams
    const auditId = searchParams.get('id')

    if (!auditId) {
      return NextResponse.json(
        { error: 'Audit ID is required' },
        { status: 400 }
      )
    }

    // Get full audit details (including error_log if column exists)
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('*, customers(*)')
      .eq('id', auditId)
      .single()
    
    // Extract error_log if it exists (graceful if column doesn't exist)
    let errorLog = null
    try {
      errorLog = (audit as any)?.error_log || null
      if (errorLog && typeof errorLog === 'string') {
        errorLog = JSON.parse(errorLog)
      }
    } catch {
      // error_log column doesn't exist or invalid JSON, that's okay
      errorLog = null
    }

    if (auditError || !audit) {
      return NextResponse.json(
        { 
          error: 'Audit not found',
          details: auditError?.message,
        },
        { status: 404 }
      )
    }

    // Get audit modules
    const { data: modules, error: modulesError } = await supabase
      .from('audit_modules')
      .select('*')
      .eq('audit_id', auditId)

    // Calculate time elapsed
    const created = new Date(audit.created_at)
    const now = new Date()
    const elapsedMinutes = Math.round((now.getTime() - created.getTime()) / 1000 / 60)
    const elapsedSeconds = Math.round((now.getTime() - created.getTime()) / 1000)

    // Determine what stage the audit is at
    let stage = 'unknown'
    let stageDetails = ''

    if (audit.status === 'pending') {
      stage = 'not_started'
      stageDetails = 'Audit created but processing has not started'
    } else if (audit.status === 'running') {
      if (!audit.raw_result_json) {
        stage = 'fetching_site'
        stageDetails = 'Fetching website data (this should take < 30 seconds)'
      } else if (!audit.formatted_report_html) {
        stage = 'generating_report'
        stageDetails = 'Generating formatted report with LLM (this should take 1-2 minutes)'
      } else {
        stage = 'sending_email'
        stageDetails = 'Report generated, attempting to send email'
      }
    } else if (audit.status === 'completed') {
      stage = 'completed'
      stageDetails = 'Audit completed successfully'
    } else if (audit.status === 'failed') {
      stage = 'failed'
      stageDetails = 'Audit failed - check error details'
    }

    // Check if audit is stuck
    const isStuck = audit.status === 'running' && elapsedMinutes > 5

    return NextResponse.json({
      audit: {
        id: audit.id,
        url: audit.url,
        status: audit.status,
        created_at: audit.created_at,
        completed_at: audit.completed_at,
        elapsed_minutes: elapsedMinutes,
        elapsed_seconds: elapsedSeconds,
        is_stuck: isStuck,
      },
      customer: {
        email: (audit.customers as any)?.email || null,
        name: (audit.customers as any)?.name || null,
      },
      modules: {
        count: modules?.length || 0,
        enabled: modules?.filter(m => m.enabled).length || 0,
        list: modules?.map(m => ({
          key: m.module_key,
          enabled: m.enabled,
          has_score: m.raw_score !== null,
          has_issues: m.raw_issues_json !== null,
        })) || [],
        error: modulesError?.message || null,
      },
      progress: {
        stage,
        stage_details: stageDetails,
        has_raw_results: !!audit.raw_result_json,
        has_formatted_report: !!audit.formatted_report_html,
        has_plaintext_report: !!audit.formatted_report_plaintext,
      },
      diagnostics: {
        should_have_completed: elapsedMinutes > 5 && audit.status === 'running',
        likely_issue: isStuck 
          ? 'Audit is stuck - likely timeout or error in processing'
          : audit.status === 'failed'
          ? 'Audit failed - check error_log below for details'
          : 'No obvious issues detected',
        recommendations: isStuck
          ? [
              'Check Netlify function logs for errors',
              'Verify website URL is accessible',
              'Check if LLM API is responding',
              'Check if email service is configured correctly',
            ]
          : audit.status === 'failed'
          ? [
              'Check error_log below for the exact error',
              'Verify all environment variables are set',
              'Check if external APIs (DeepSeek, email) are accessible',
            ]
          : [],
      },
      errorLog: errorLog,
    })
  } catch (error) {
    console.error('Error diagnosing audit:', error)
    return NextResponse.json(
      {
        error: 'Failed to diagnose audit',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

