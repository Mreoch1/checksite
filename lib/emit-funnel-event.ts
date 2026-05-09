import { getSupabaseServiceClient } from '@/lib/supabase'
import type { FunnelEventName } from '@/lib/funnel-event-names'

/** Used when the browser session id is unknown (server-side emits). */
export const SERVER_FUNNEL_SESSION = 'server'

type EmitParams = {
  event_name: FunnelEventName
  audit_id?: string | null
  customer_id?: string | null
  session_id?: string | null
  url?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Best-effort insert; logs warning on failure. Never throws.
 */
export async function emitFunnelEvent(params: EmitParams): Promise<void> {
  try {
    const db = getSupabaseServiceClient()
    let customer_id = params.customer_id ?? null
    const session_id = params.session_id ?? SERVER_FUNNEL_SESSION

    if (!customer_id && params.audit_id) {
      const { data } = await db.from('audits').select('customer_id').eq('id', params.audit_id).maybeSingle()
      customer_id = data?.customer_id ?? null
    }

    const { error } = await db.from('funnel_events').insert({
      event_name: params.event_name,
      audit_id: params.audit_id ?? null,
      customer_id,
      session_id,
      url: params.url ?? null,
      metadata: params.metadata ?? null,
    })

    if (error) {
      console.error('[FUNNEL_EVENT_INSERT_FAILED]', {
        source: 'emitFunnelEvent',
        event_name: params.event_name,
        code: error.code,
        message: error.message,
      })
    }
  } catch (e) {
    console.error('[FUNNEL_EVENT_INSERT_FAILED]', { source: 'emitFunnelEvent', event_name: params.event_name, error: String(e) })
  }
}
