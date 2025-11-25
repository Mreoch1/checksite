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
        ciphers: 'SSLv3',
      },
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000,
      socketTimeout: 30000,
      debug: true, // Enable debug logging
      logger: true, // Enable logger
    })
  }
  return transporterInstance
}

// Lazy initialization - don't create transporter at module load
// This prevents errors if SMTP config is missing
export function getEmailTransporter(): nodemailer.Transporter {
  return getTransporter()
}

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
  const transporter = getEmailTransporter()

  console.log(`Attempting to send email to ${email} via ${process.env.SMTP_HOST || 'smtppro.zoho.com'}`)
  console.log(`From: ${process.env.FROM_EMAIL || 'contact@seoauditpro.net'}`)

  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: `Your SEO CheckSite Report for ${domain} is Ready!`,
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; margin-bottom: 15px;">
              <svg width="180" height="54" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
                <circle cx="30" cy="30" r="25" fill="url(#gradient)" opacity="0.1"/>
                <circle cx="30" cy="30" r="20" fill="none" stroke="url(#gradient)" stroke-width="2"/>
                <path d="M 20 30 L 27 37 L 40 24" stroke="url(#gradient)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                <text x="55" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#0369a1">SEO</text>
                <text x="55" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#0ea5e9">CheckSite</text>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#0ea5e9;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#0369a1;stop-opacity:1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
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
  const transporter = getEmailTransporter()

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: email,
      subject: `Issue with your SEO CheckSite report for ${domain}`,
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; margin-bottom: 15px;">
              <svg width="300" height="90" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
                <circle cx="30" cy="30" r="25" fill="url(#gradient2)" opacity="0.1"/>
                <circle cx="30" cy="30" r="20" fill="none" stroke="url(#gradient2)" stroke-width="2"/>
                <path d="M 20 30 L 27 37 L 40 24" stroke="url(#gradient2)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                <text x="55" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#0369a1">SEO</text>
                <text x="55" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#0ea5e9">CheckSite</text>
                <defs>
                  <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#0ea5e9;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#0369a1;stop-opacity:1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
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

