import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'
import { sendFreeReportFollowUpEmail } from '@/lib/free-report-follow-up'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_TEST_TO = 'Mreoch82@hotmail.com'

const bodySchema = z
  .object({
    to: z.string().email().optional(),
    auditId: z.string().uuid().optional(),
  })
  .optional()

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const to = (parsed.data?.to || DEFAULT_TEST_TO).trim()
  const db = getSupabaseServiceClient()

  let auditId = parsed.data?.auditId
  let url = 'https://seochecksite.net'

  if (!auditId) {
    const { data: rows } = await db
      .from('audits')
      .select('id, url, customers!inner(marketing_consent_at)')
      .eq('total_price_cents', 0)
      .eq('status', 'completed')
      .not('email_sent_at', 'is', null)
      .order('email_sent_at', { ascending: false })
      .limit(15)

    const list = rows || []
    const picked = list.find((r) => {
      const c = Array.isArray(r.customers) ? r.customers[0] : r.customers
      return !!(c as { marketing_consent_at?: string | null })?.marketing_consent_at
    }) as { id: string; url: string } | undefined

    if (picked?.id) {
      auditId = picked.id
      url = picked.url || url
    }
  } else {
    const { data: row } = await db.from('audits').select('id, url').eq('id', auditId).maybeSingle()
    if (!row) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
    }
    url = row.url || url
  }

  if (!auditId) {
    return NextResponse.json(
      {
        error: 'No auditId provided and no completed free audit found.',
        hint: 'Pass { "auditId": "<uuid>" } for a specific free audit, or create one first.',
      },
      { status: 400 }
    )
  }

  try {
    await sendFreeReportFollowUpEmail(to, auditId, url)
    return NextResponse.json({
      success: true,
      to,
      auditId,
      note: 'This route does not set free_report_follow_up_sent_at so production follow-up can still run later.',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Send failed', details: msg }, { status: 500 })
  }
}
