import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { emailSchema } from '@/lib/validate-input'
import { rateLimit, getClientId } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  email: emailSchema,
})

export async function POST(request: NextRequest) {
  const clientId = getClientId(request)
  const rateLimitResult = rateLimit(`checkout-eligibility:${clientId}`, 40, 60_000)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000) },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`) },
      { status: 400 }
    )
  }

  const email = parsed.data.email

  let db
  try {
    db = getSupabaseServiceClient()
  } catch {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 503 })
  }

  const { data: customer } = await db.from('customers').select('id').eq('email', email).maybeSingle()

  let priorAuditCount = 0
  if (customer?.id) {
    const { count } = await db
      .from('audits')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.id)
    priorAuditCount = count ?? 0
  }

  const isFirstReport = priorAuditCount === 0

  return NextResponse.json({
    isFirstReport,
    priorAuditCount,
    requiresMarketingConsent: isFirstReport,
  })
}
