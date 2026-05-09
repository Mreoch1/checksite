export const FUNNEL_EVENT_NAMES = [
  'homepage_url_entered',
  'homepage_email_submitted',
  'homepage_consent_given',
  'audit_started_free',
  'audit_started_paid',
  'audit_completed',
  'report_email_sent',
  'report_viewed',
  'upgrade_button_shown',
  'upgrade_button_clicked',
  'upgrade_checkout_started',
  'upgrade_checkout_completed',
] as const

export type FunnelEventName = (typeof FUNNEL_EVENT_NAMES)[number]

const SET = new Set<string>(FUNNEL_EVENT_NAMES)

export function isValidFunnelEventName(name: unknown): name is FunnelEventName {
  return typeof name === 'string' && SET.has(name)
}
