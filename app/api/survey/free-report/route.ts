import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { rateLimit, getClientId } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const surveySchema = z.object({
  auditId: z.string().uuid(),
  overallRating: z.enum(['loved', 'mostly_yes', 'mixed', 'no']),
  metExpectations: z.enum(['yes', 'somewhat', 'no']),
  wouldPurchaseFull: z.enum(['likely', 'maybe', 'unlikely']),
  additionalComments: z.string().max(5000).optional().nullable(),
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

  const { auditId, overallRating, metExpectations, wouldPurchaseFull, additionalComments } = parsed.data

  let db
  try {
    db = getSupabaseServiceClient()
  } catch {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 503 })
  }

  const { data: audit, error: auditError } = await db
    .from('audits')
    .select('id, total_price_cents, customers!inner ( marketing_consent_at )')
    .eq('id', auditId)
    .maybeSingle()

  if (auditError || !audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  const row = audit as {
    total_price_cents: number
    customers: { marketing_consent_at: string | null } | { marketing_consent_at: string | null }[]
  }
  const cust = Array.isArray(row.customers) ? row.customers[0] : row.customers

  if (row.total_price_cents !== 0) {
    return NextResponse.json({ error: 'This questionnaire is only for free reports.' }, { status: 403 })
  }
  if (!cust?.marketing_consent_at) {
    return NextResponse.json({ error: 'This survey is not available for this audit.' }, { status: 403 })
  }

  const { error: insertError } = await db.from('free_report_survey_responses').insert({
    audit_id: auditId,
    overall_rating: overallRating,
    met_expectations: metExpectations,
    would_purchase_full: wouldPurchaseFull,
    additional_comments: additionalComments?.trim() || null,
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
