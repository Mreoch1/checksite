/**
 * Delayed follow-up email for free-report recipients who opted in to marketing.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { isEmailSent } from '@/lib/email-status'
import { sendEmail } from '@/lib/email-unified'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export function getFreeReportFollowUpDelayMs(): number {
  const minutesRaw = process.env.FREE_REPORT_FOLLOW_UP_DELAY_MINUTES
  if (minutesRaw !== undefined && minutesRaw !== '') {
    const n = parseInt(minutesRaw, 10)
    if (!Number.isNaN(n) && n >= 0) {
      return n * 60 * 1000
    }
  }
  const days = parseFloat(process.env.FREE_REPORT_FOLLOW_UP_DELAY_DAYS || '3')
  if (Number.isNaN(days) || days < 0) {
    return 3 * 24 * 60 * 60 * 1000
  }
  return days * 24 * 60 * 60 * 1000
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    const m = url.match(/https?:\/\/([^/]+)/)
    return m ? m[1] : url
  }
}

export function buildFreeReportFollowUpEmailHtml(params: {
  auditId: string
  url: string
}): string {
  const domain = domainFromUrl(params.url)
  const surveyUrl = `${SITE_URL}/survey/free-report?audit=${encodeURIComponent(params.auditId)}`

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; margin-bottom: 15px;">
            <svg width="300" height="90" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SEO CheckSite">
              <circle cx="30" cy="30" r="25" fill="url(#gradientFu)" opacity="0.1"/>
              <circle cx="30" cy="30" r="20" fill="none" stroke="url(#gradientFu)" stroke-width="2"/>
              <path d="M 20 30 L 27 37 L 40 24" stroke="url(#gradientFu)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <text x="55" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#0369a1">SEO</text>
              <text x="55" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#0ea5e9">CheckSite</text>
              <defs>
                <linearGradient id="gradientFu" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#0ea5e9;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#0369a1;stop-opacity:1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <h2 style="color: #0369a1; font-size: 22px; margin-top: 0;">Quick feedback on your free report</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello,</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          A few days ago we sent your free website analysis for <strong style="color: #0369a1;">${domain}</strong>.
          We would love a minute of your time to hear how it landed.
        </p>

        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 22px 0; border-radius: 4px;">
          <p style="color: #0369a1; font-size: 15px; margin: 0 0 8px 0; font-weight: 600;">Short questionnaire</p>
          <ul style="color: #374151; font-size: 14px; margin: 0; padding-left: 18px; line-height: 1.6;">
            <li>How did you like the report?</li>
            <li>Was it what you expected?</li>
            <li>Would you consider purchasing a full paid audit in the future?</li>
            <li>Anything else we should know?</li>
          </ul>
        </div>

        <div style="margin: 28px 0; text-align: center;">
          <a href="${surveyUrl}"
             style="background: linear-gradient(135deg, #0ea5e9, #0369a1); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);">
            Open questionnaire
          </a>
        </div>

        <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
          You are receiving this because you requested a free report and agreed to receive this follow-up and marketing email from SEO CheckSite.
          If you no longer want marketing email, reply with &quot;unsubscribe&quot; or contact
          <a href="mailto:admin@seochecksite.net" style="color: #0ea5e9;">admin@seochecksite.net</a>.
        </p>

        <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            Thank you,<br/>
            <span style="color: #9ca3af; font-size: 12px;">The SEO CheckSite Team</span>
          </p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 11px; margin: 4px 0;">
          <a href="${SITE_URL}" style="color: #0ea5e9; text-decoration: none;">seochecksite.net</a>
        </p>
        <p style="color: #9ca3af; font-size: 11px; margin: 4px 0;">
          <a href="${SITE_URL}/privacy" style="color: #9ca3af; text-decoration: none; margin: 0 8px;">Privacy Policy</a> |
          <a href="${SITE_URL}/terms" style="color: #9ca3af; text-decoration: none; margin: 0 8px;">Terms of Service</a>
        </p>
      </div>
    </div>
  `
}

export async function sendFreeReportFollowUpEmail(
  to: string,
  auditId: string,
  siteUrl: string
): Promise<void> {
  const domain = domainFromUrl(siteUrl)
  const html = buildFreeReportFollowUpEmailHtml({ auditId, url: siteUrl })
  await sendEmail({
    to,
    subject: `How was your free report for ${domain}?`,
    html,
  })
}

type AuditFollowUpRow = {
  id: string
  url: string
  email_sent_at: string | null
  customers: { email: string; marketing_consent_at: string | null } | { email: string; marketing_consent_at: string | null }[]
}

export async function processFreeReportFollowUpBatch(
  db: SupabaseClient,
  requestId: string,
  options?: { maxSend?: number }
): Promise<{ checked: number; sent: number; errors: string[] }> {
  const maxSend = options?.maxSend ?? 5
  const delayMs = getFreeReportFollowUpDelayMs()
  const cutoff = new Date(Date.now() - delayMs).toISOString()
  const errors: string[] = []
  let sent = 0

  const { data: rows, error } = await db
    .from('audits')
    .select(
      `
      id,
      url,
      email_sent_at,
      customers!inner (
        email,
        marketing_consent_at
      )
    `
    )
    .eq('total_price_cents', 0)
    .eq('status', 'completed')
    .is('free_report_follow_up_sent_at', null)
    .not('email_sent_at', 'is', null)
    .lt('email_sent_at', cutoff)
    .limit(25)

  if (error) {
    console.error(`[${requestId}] [follow-up] query error:`, error.message)
    return { checked: 0, sent: 0, errors: [error.message] }
  }

  const list = (rows || []) as AuditFollowUpRow[]
  const due = list.filter((row) => {
    const c = Array.isArray(row.customers) ? row.customers[0] : row.customers
    if (!c?.email || !c.marketing_consent_at) return false
    if (!isEmailSent(row.email_sent_at)) return false
    return true
  })

  for (const row of due) {
    if (sent >= maxSend) break
    const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers
    const email = customer?.email
    if (!email) continue

    try {
      await sendFreeReportFollowUpEmail(email, row.id, row.url)
      const { error: upErr } = await db
        .from('audits')
        .update({ free_report_follow_up_sent_at: new Date().toISOString() })
        .eq('id', row.id)
        .is('free_report_follow_up_sent_at', null)

      if (upErr) {
        errors.push(`${row.id}: ${upErr.message}`)
        continue
      }
      sent += 1
      console.log(`[${requestId}] [follow-up] sent for audit ${row.id} to ${email}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${row.id}: ${msg}`)
      console.error(`[${requestId}] [follow-up] send failed audit ${row.id}:`, msg)
    }
  }

  return { checked: due.length, sent, errors }
}
