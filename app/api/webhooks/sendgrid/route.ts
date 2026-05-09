import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import type { EmailCategory } from '@/lib/email-unified'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// CJS package — keep require local for signature verification
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { EventWebhook, EventWebhookHeader } = require('@sendgrid/eventwebhook') as {
  EventWebhook: new () => {
    convertPublicKeyToECDSA: (pem: string) => unknown
    verifySignature: (pk: unknown, payload: string | Buffer, signature: string, timestamp: string) => boolean
  }
  EventWebhookHeader: { SIGNATURE: () => string; TIMESTAMP: () => string }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function safeAuditId(v: unknown): string | null {
  if (typeof v !== 'string' || !UUID_RE.test(v.trim())) return null
  return v.trim().toLowerCase()
}

function safeCategory(v: unknown): EmailCategory | null {
  if (v === 'report_delivery' || v === 'free_report_followup' || v === 'upgrade_receipt') return v
  return null
}

function normalizeIncomingEvent(evt: Record<string, unknown>): Record<string, unknown> | null {
  const sg_event_id = typeof evt.sg_event_id === 'string' ? evt.sg_event_id.trim() : ''
  if (!sg_event_id) return null

  const ev = typeof evt.event === 'string' ? evt.event.toLowerCase() : ''
  if (!ev) return null

  const email = typeof evt.email === 'string' ? evt.email.trim() : ''
  if (!email) return null

  const auditRaw =
    evt.audit_id ??
    (evt.unique_args as Record<string, unknown> | undefined)?.audit_id ??
    (evt.custom_args as Record<string, unknown> | undefined)?.audit_id
  const audit_id = safeAuditId(auditRaw)

  const catRaw =
    evt.email_category ??
    (evt.unique_args as Record<string, unknown> | undefined)?.email_category ??
    (evt.custom_args as Record<string, unknown> | undefined)?.email_category
  const email_category = safeCategory(catRaw)

  const sg_message_id =
    typeof evt.sg_message_id === 'string'
      ? evt.sg_message_id.trim()
      : typeof evt['smtp-id'] === 'string'
        ? String(evt['smtp-id']).trim()
        : null

  const url = typeof evt.url === 'string' ? evt.url : null
  const user_agent =
    typeof evt.useragent === 'string'
      ? evt.useragent
      : typeof evt.user_agent === 'string'
        ? evt.user_agent
        : null
  const ip = typeof evt.ip === 'string' ? evt.ip : null

  return {
    sg_event_id,
    event_type: ev,
    email,
    audit_id,
    email_category,
    sg_message_id,
    url,
    user_agent,
    ip,
    raw: evt,
  }
}

export async function POST(request: NextRequest) {
  const publicKeyPem = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY?.trim()

  const rawBody = await request.text()

  if (publicKeyPem) {
    const signature = request.headers.get(EventWebhookHeader.SIGNATURE()) || ''
    const timestamp = request.headers.get(EventWebhookHeader.TIMESTAMP()) || ''
    const ew = new EventWebhook()
    try {
      const pk = ew.convertPublicKeyToECDSA(publicKeyPem)
      const ok = ew.verifySignature(pk, rawBody, signature, timestamp)
      if (!ok) {
        console.warn('[sendgrid-webhook] Signature verification failed')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } catch (e) {
      console.error('[sendgrid-webhook] Verification error', e)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else {
    console.warn('[sendgrid-webhook] SENDGRID_WEBHOOK_PUBLIC_KEY not set — events processed without signature verification')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const events = Array.isArray(parsed) ? parsed : [parsed]
  const payloadRows: Record<string, unknown>[] = []

  for (const item of events) {
    if (!item || typeof item !== 'object') continue
    const normalized = normalizeIncomingEvent(item as Record<string, unknown>)
    if (!normalized) continue

    payloadRows.push({
      sg_event_id: normalized.sg_event_id,
      event_type: normalized.event_type,
      email: normalized.email,
      audit_id: normalized.audit_id,
      email_category: normalized.email_category,
      sg_message_id: normalized.sg_message_id,
      url: normalized.url,
      user_agent: normalized.user_agent,
      ip: normalized.ip,
      raw: normalized.raw,
    })
  }

  if (payloadRows.length === 0) {
    return NextResponse.json({ received: true, inserted: 0 })
  }

  const db = getSupabaseServiceClient()
  const { data: inserted, error } = await db.rpc('insert_email_events_batch', {
    p_events: payloadRows as unknown as Record<string, unknown>,
  })

  if (error) {
    console.error('[sendgrid-webhook] insert_email_events_batch failed', error.message)
    return NextResponse.json({ error: 'Persist failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true, inserted: inserted ?? 0 })
}
