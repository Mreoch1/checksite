import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { rateLimit, getClientId } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const surveySchema = z.object({
  auditId: z.string().uuid(),
  previewHelpful: z.enum(['yes', 'somewhat', 'no']),
  didUpgrade: z.enum(['yes', 'no_interested', 'no_not_useful', 'no_too_expensive', 'no_didnt_see']),
  upgradeWorth: z.enum(['yes', 'partially', 'no']).optional().nullable(),
  improvementSuggestions: z.string().max(5000).optional().nullable(),
})

export async function POST(request: NextRequest) {
  const clientId = getClientId(request)
  const rateLimitResult = rateLimit(`survey-free-report:${clientId}`, 10, 600_000)
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = surveySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`) },
      { status: 400 }
    )
  }

  const { auditId, previewHelpful, didUpgrade, upgradeWorth, improvementSuggestions } = parsed.data

  let db
  try {
    db = getSupabaseServiceClient()
  } catch {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 503 })
  }

  const { data: audit, error: auditError } = await db
    .from('audits')
    .select(
      'id, total_price_cents, free_report_follow_up_sent_at, free_report_survey_invited_at, customers!inner ( marketing_consent_at )'
    )
    .eq('id', auditId)
    .maybeSingle()

  if (auditError || !audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  const row = audit as {
    total_price_cents: number
    free_report_follow_up_sent_at: string | null
    free_report_survey_invited_at: string | null
    customers: { marketing_consent_at: string | null } | { marketing_consent_at: string | null }[]
  }
  const cust = Array.isArray(row.customers) ? row.customers[0] : row.customers

  const freeReportWithConsent =
    row.total_price_cents === 0 && !!cust?.marketing_consent_at
  const invitedViaFollowUpEmail =
    !!row.free_report_follow_up_sent_at || !!row.free_report_survey_invited_at

  if (!freeReportWithConsent && !invitedViaFollowUpEmail) {
    return NextResponse.json(
      {
        error:
          'This survey is only available for complimentary first reports (with consent) or for reports where we emailed you the feedback link.',
      },
      { status: 403 }
    )
  }

  const { error: insertError } = await db.from('free_report_survey_responses').insert({
    audit_id: auditId,
    preview_helpful: previewHelpful,
    did_upgrade: didUpgrade,
    upgrade_worth: upgradeWorth?.trim() || null,
    improvement_suggestions: improvementSuggestions?.trim() || null,
  })

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'You have already submitted feedback for this report.' }, { status: 409 })
    }
    console.error('survey free-report insert:', insertError)
    return NextResponse.json({ error: 'Could not save your responses.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
