import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { isValidFunnelEventName } from '@/lib/funnel-event-names'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  event_name: z.string().refine(isValidFunnelEventName, 'Invalid event_name'),
  session_id: z.string().min(1),
  audit_id: z.string().uuid().optional(),
  url: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { event_name, session_id, audit_id, url, metadata } = parsed.data
    const db = getSupabaseServiceClient()

    let customer_id: string | null = null
    if (audit_id) {
      const { data } = await db.from('audits').select('customer_id').eq('id', audit_id).maybeSingle()
      customer_id = data?.customer_id ?? null
    }

    const { error } = await db.from('funnel_events').insert({
      event_name,
      audit_id: audit_id ?? null,
      customer_id,
      session_id,
      url: url ?? null,
      metadata: metadata ?? null,
    })

    if (error) {
      // Netlify captures stderr; use a fixed prefix so deploy logs / alerts can grep this path.
      console.error('[FUNNEL_EVENT_INSERT_FAILED]', {
        event_name,
        code: error.code,
        message: error.message,
        hint: error.hint,
      })
    }

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error('[FUNNEL_EVENT_INSERT_FAILED]', { phase: 'handler', error: String(e) })
    return new NextResponse(null, { status: 204 })
  }
}
