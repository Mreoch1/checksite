import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'
import type { FunnelEventName } from '@/lib/funnel-event-names'
import type { EmailCategory } from '@/lib/email-unified'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function pct(num: number, den: number): number {
  if (den <= 0) return 0
  return Math.round((num / den) * 1000) / 10
}

const ACQUISITION: FunnelEventName[] = [
  'homepage_url_entered',
  'homepage_email_submitted',
  'homepage_consent_given',
  'audit_started_free',
  'audit_started_paid',
  'audit_completed',
  'report_email_sent',
]

const UPSELL: FunnelEventName[] = [
  'report_viewed',
  'upgrade_button_shown',
  'upgrade_button_clicked',
  'upgrade_checkout_started',
  'upgrade_checkout_completed',
]

const EMAIL_CATEGORIES: EmailCategory[] = ['report_delivery', 'free_report_followup', 'upgrade_receipt']

type EmailEngagementRow = {
  event_type: string
  email_category: string | null
  sg_message_id: string | null
}

function distinctMessagesWithEvents(
  rows: EmailEngagementRow[],
  category: EmailCategory,
  eventTypes: string[]
): number {
  const set = new Set<string>()
  for (const r of rows) {
    if (r.email_category !== category || !r.sg_message_id) continue
    if (!eventTypes.includes(r.event_type)) continue
    set.add(r.sg_message_id)
  }
  return set.size
}

function buildEmailEngagement(rows: EmailEngagementRow[], category: EmailCategory) {
  const scoped = rows.filter((r) => r.email_category === category && r.sg_message_id)
  const sent = new Set(scoped.map((r) => r.sg_message_id!)).size
  const delivered = distinctMessagesWithEvents(rows, category, ['delivered'])
  const opened = distinctMessagesWithEvents(rows, category, ['open'])
  const clicked = distinctMessagesWithEvents(rows, category, ['click'])
  const bounced = distinctMessagesWithEvents(rows, category, ['bounce', 'dropped'])
  const spam_reports = distinctMessagesWithEvents(rows, category, ['spamreport'])

  return {
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    spam_reports,
    open_rate_pct: pct(opened, delivered),
    click_rate_pct: pct(clicked, delivered),
  }
}

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  const rawDays = request.nextUrl.searchParams.get('days')
  let windowDays = rawDays ? parseInt(rawDays, 10) : 7
  if (Number.isNaN(windowDays) || windowDays < 1) windowDays = 7
  windowDays = Math.min(windowDays, 90)

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()

  const db = getSupabaseServiceClient()
  const { data: rows, error } = await db
    .from('funnel_events')
    .select('event_name')
    .gte('created_at', since)

  if (error) {
    console.error('[admin/funnel]', error)
    return NextResponse.json({ error: 'Failed to load funnel events', details: error.message }, { status: 500 })
  }

  const counts = new Map<string, number>()
  for (const row of rows || []) {
    const n = row.event_name as string
    counts.set(n, (counts.get(n) ?? 0) + 1)
  }

  const acquisition = Object.fromEntries(ACQUISITION.map((k) => [k, counts.get(k) ?? 0])) as Record<
    (typeof ACQUISITION)[number],
    number
  >
  const upsell = Object.fromEntries(UPSELL.map((k) => [k, counts.get(k) ?? 0])) as Record<
    (typeof UPSELL)[number],
    number
  >

  const urlEntered = acquisition.homepage_url_entered
  const emailSubmitted = acquisition.homepage_email_submitted
  const auditsStarted = acquisition.audit_started_free + acquisition.audit_started_paid
  const reportViewed = upsell.report_viewed
  const upgradeClicked = upsell.upgrade_button_clicked

  const rates = {
    url_to_email_pct: pct(emailSubmitted, urlEntered),
    email_to_audit_pct: pct(auditsStarted, emailSubmitted),
    audit_to_completed_pct: pct(acquisition.audit_completed, auditsStarted),
    report_to_upgrade_click_pct: pct(upgradeClicked, reportViewed),
    upgrade_click_to_paid_pct: pct(upsell.upgrade_checkout_completed, upgradeClicked),
    url_to_paid_pct: pct(acquisition.audit_started_paid, urlEntered),
  }

  const { data: emailRows, error: emailErr } = await db
    .from('email_events')
    .select('event_type, email_category, sg_message_id')
    .gte('created_at', since)

  const emailEngagementRows: EmailEngagementRow[] =
    !emailErr && emailRows
      ? (emailRows as EmailEngagementRow[])
      : []

  if (emailErr) {
    console.warn('[admin/funnel] email_events query failed (migration 011 applied?)', emailErr.message)
  }

  const email = Object.fromEntries(
    EMAIL_CATEGORIES.map((cat) => [cat, buildEmailEngagement(emailEngagementRows, cat)])
  ) as Record<EmailCategory, ReturnType<typeof buildEmailEngagement>>

  return NextResponse.json({
    window_days: windowDays,
    acquisition,
    upsell,
    rates,
    email,
  })
}
