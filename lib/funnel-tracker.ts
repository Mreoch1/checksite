'use client'

import type { FunnelEventName } from '@/lib/funnel-event-names'

const STORAGE_KEY = 'sitecheck_session_id'

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export type TrackPayload = {
  auditId?: string
  url?: string
  metadata?: Record<string, unknown>
}

/**
 * Fire-and-forget: POST funnel event + GA4 custom event. Errors ignored.
 */
export function trackFunnelEvent(eventName: FunnelEventName, payload?: TrackPayload): void {
  const session_id = getOrCreateSessionId()
  const body = {
    event_name: eventName,
    session_id,
    audit_id: payload?.auditId,
    url: payload?.url,
    metadata: payload?.metadata,
  }

  void fetch('/api/funnel-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})

  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, {
        ...(payload?.metadata || {}),
        ...(payload?.auditId ? { audit_id: payload.auditId } : {}),
        ...(payload?.url ? { url: payload.url } : {}),
      })
    }
  } catch {
    /* ignore */
  }
}
