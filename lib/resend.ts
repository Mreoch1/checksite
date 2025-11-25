/**
 * Resend email integration
 */

import { Resend } from 'resend'

let resendInstance: Resend | null = null

function getResend(): Resend {
  if (!resendInstance) {
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is required')
    }
    resendInstance = new Resend(resendApiKey)
  }
  return resendInstance
}

export const resend = getResend()

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@sitecheck.com'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

/**
 * Send audit report email to customer
 */
export async function sendAuditReportEmail(
  email: string,
  url: string,
  auditId: string,
  reportHtml: string
): Promise<void> {
  const domain = new URL(url).hostname

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Your website report for ${domain}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0369a1;">Your Website Report is Ready!</h1>
        <p>Hi there,</p>
        <p>Your website report for <strong>${domain}</strong> is complete and ready to view.</p>
        <div style="margin: 30px 0;">
          <a href="${SITE_URL}/report/${auditId}" 
             style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            View Your Report
          </a>
        </div>
        <p style="color: #6b7280; font-size: 0.9em; margin-top: 30px;">
          This report contains actionable insights to improve your website's performance and visibility.
        </p>
      </div>
    `,
  })
}

/**
 * Send audit failure notification
 */
export async function sendAuditFailureEmail(
  email: string,
  url: string
): Promise<void> {
  const domain = new URL(url).hostname

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Issue with your website report for ${domain}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">Report Generation Issue</h1>
        <p>Hi there,</p>
        <p>We encountered an issue while generating your website report for <strong>${domain}</strong>.</p>
        <p>Our team has been notified and will either re-run the audit or issue a refund. We'll be in touch shortly.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p style="color: #6b7280; font-size: 0.9em; margin-top: 30px;">
          We apologize for the inconvenience.
        </p>
      </div>
    `,
  })
}

