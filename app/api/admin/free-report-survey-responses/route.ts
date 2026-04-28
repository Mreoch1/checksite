import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_LIMIT = 200

/**
 * List submitted free-report follow-up survey responses (preview/upgrade model, newest first).
 * Use Supabase Table Editor on `free_report_survey_responses` for ad-hoc browsing, or this JSON endpoint.
 */
export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  const raw = request.nextUrl.searchParams.get('limit')
  const parsed = raw ? parseInt(raw, 10) : 50
  const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), MAX_LIMIT) : 50

  const db = getSupabaseServiceClient()

  const { data, error } = await db
    .from('free_report_survey_responses')
    .select(
      `
      id,
      audit_id,
      created_at,
      overall_rating,
      met_expectations,
      would_purchase_full,
      additional_comments,
      audits (
        url,
        customers ( email )
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('free-report-survey-responses:', error)
    return NextResponse.json({ error: 'Failed to load responses', details: error.message }, { status: 500 })
  }

  const rows = (data || []).map((row: Record<string, unknown>) => {
    const audits = row.audits as { url?: string; customers?: { email?: string } | { email?: string }[] } | undefined
    const audit = Array.isArray(audits) ? audits[0] : audits
    const cust = audit?.customers
    const customer = Array.isArray(cust) ? cust[0] : cust
    return {
      id: row.id,
      audit_id: row.audit_id,
      created_at: row.created_at,
      overall_rating: row.overall_rating,
      met_expectations: row.met_expectations,
      would_purchase_full: row.would_purchase_full,
      additional_comments: row.additional_comments,
      audit_url: audit?.url ?? null,
      customer_email: customer?.email ?? null,
    }
  })

  return NextResponse.json({
    count: rows.length,
    limit,
    responses: rows,
  })
}
