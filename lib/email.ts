/**
 * Email integration using Zoho SMTP
 */

import nodemailer from 'nodemailer'

let transporterInstance: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporterInstance) {
    const smtpHost = process.env.SMTP_HOST || 'smtppro.zoho.com'
    const smtpPort = parseInt(process.env.SMTP_PORT || '465')
    const smtpUser = process.env.SMTP_USER || 'contact@seoauditpro.net'
    const smtpPass = process.env.SMTP_PASSWORD

    if (!smtpPass) {
      throw new Error('SMTP_PASSWORD environment variable is required')
    }

    transporterInstance = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for 587
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false, // Zoho sometimes has certificate issues
      },
    })
  }
  return transporterInstance
}

export const transporter = getTransporter()

const FROM_EMAIL = process.env.FROM_EMAIL || 'contact@seoauditpro.net'
const FROM_NAME = process.env.FROM_NAME || 'SEO CheckSite'
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

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: `Your SEO CheckSite Report for ${domain} is Ready!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0369a1; font-size: 28px; margin: 0 0 10px 0;">SEO CheckSite</h1>
            <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #0ea5e9, #0369a1); margin: 0 auto; border-radius: 2px;"></div>
          </div>
          
          <h2 style="color: #0369a1; font-size: 24px; margin-top: 0;">Your Website Report is Ready!</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi there,</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your website report for <strong style="color: #0369a1;">${domain}</strong> is complete and ready to view.
          </p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${SITE_URL}/report/${auditId}" 
               style="background: linear-gradient(135deg, #0ea5e9, #0369a1); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);">
              View Your Report
            </a>
          </div>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #0369a1; font-size: 14px; margin: 0; font-weight: 600;">What's in your report?</p>
            <p style="color: #374151; font-size: 14px; margin: 8px 0 0 0; line-height: 1.5;">
              Your report contains actionable insights in plain language to improve your website's performance, SEO, and visibility. No technical jargon - just clear recommendations you can act on.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.5;">
              Questions? Just reply to this email. We're here to help!
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 15px 0 0 0;">
              — The SEO CheckSite Team
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            <a href="${SITE_URL}" style="color: #0ea5e9; text-decoration: none;">seochecksite.netlify.app</a>
          </p>
        </div>
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

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: email,
    subject: `Issue with your SEO CheckSite report for ${domain}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0369a1; font-size: 28px; margin: 0 0 10px 0;">SEO CheckSite</h1>
            <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #0ea5e9, #0369a1); margin: 0 auto; border-radius: 2px;"></div>
          </div>
          
          <h2 style="color: #dc2626; font-size: 24px; margin-top: 0;">Report Generation Issue</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi there,</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We encountered an issue while generating your website report for <strong style="color: #0369a1;">${domain}</strong>.
          </p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #991b1b; font-size: 14px; margin: 0; font-weight: 600;">What happens next?</p>
            <p style="color: #374151; font-size: 14px; margin: 8px 0 0 0; line-height: 1.5;">
              Our team has been notified and will either re-run the audit or issue a refund. We'll be in touch shortly.
            </p>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            If you have any questions, please reply to this email and we'll help you right away.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0; line-height: 1.5;">
              We apologize for the inconvenience and appreciate your patience.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 15px 0 0 0;">
              — The SEO CheckSite Team
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            <a href="${SITE_URL}" style="color: #0ea5e9; text-decoration: none;">seochecksite.netlify.app</a>
          </p>
        </div>
      </div>
    `,
  })
}

