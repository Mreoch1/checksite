/**
 * Unified email service with Resend and Zoho SMTP fallback
 */

import nodemailer from 'nodemailer'
import { Resend } from 'resend'

// Configuration
// Default to Zoho SMTP if password is set (better deliverability, especially for Hotmail/Outlook)
// Use Resend as fallback if configured
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || ''
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || (SMTP_PASSWORD ? 'smtp' : (RESEND_API_KEY ? 'resend' : 'smtp')) // 'resend' or 'smtp'
const USE_FALLBACK = process.env.EMAIL_USE_FALLBACK !== 'false' // Default: true (enable fallback)

// Zoho SMTP Configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtppro.zoho.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10)
const SMTP_USER = process.env.SMTP_USER || 'contact@seoauditpro.net'
const SMTP_FROM = process.env.FROM_EMAIL || 'contact@seoauditpro.net'

// Resend Configuration (RESEND_API_KEY moved up)
const RESEND_FROM = process.env.FROM_EMAIL || 'contact@seoauditpro.net'
const FROM_NAME = process.env.FROM_NAME || 'SEO CheckSite'

// Shared
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// Zoho SMTP Transporter (lazy initialization)
let zohoTransporter: nodemailer.Transporter | null = null

function getZohoTransporter(): nodemailer.Transporter {
  if (!zohoTransporter) {
    if (!SMTP_PASSWORD) {
      throw new Error('SMTP_PASSWORD environment variable is required for Zoho SMTP')
    }

    zohoTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for 587
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Zoho sometimes has certificate issues
        ciphers: 'SSLv3',
      },
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000,
      socketTimeout: 30000,
      pool: true,
      maxConnections: 1,
      maxMessages: 10,
    })
  }
  return zohoTransporter
}

// Resend Client (lazy initialization)
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required for Resend')
    }
    resendClient = new Resend(RESEND_API_KEY)
  }
  return resendClient
}

/**
 * Send email via Resend API
 * Uses FROM_EMAIL if set, otherwise falls back to onboarding@resend.dev
 */
async function sendViaResend(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<void> {
  const resend = getResendClient()
  
  // Use FROM_EMAIL if it's a verified domain, otherwise use Resend free tier domain
  // Check if FROM_EMAIL is set and not the default (indicates custom domain)
  const fromEmail = process.env.FROM_EMAIL || 'contact@seoauditpro.net'
  // If FROM_EMAIL contains @seoauditpro.net or another custom domain, use it
  // Otherwise fall back to onboarding@resend.dev for free tier
  const isCustomDomain = fromEmail.includes('@seoauditpro.net') || 
    (fromEmail.includes('@') && !fromEmail.includes('onboarding@resend.dev') && !fromEmail.includes('resend.dev'))
  const from = isCustomDomain ? fromEmail : 'onboarding@resend.dev'
  const fromFormatted = `"${FROM_NAME}" <${from}>`
  
  try {
    const result = await Promise.race([
      resend.emails.send({
        from: fromFormatted,
        to: options.to,
        reply_to: from,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Resend timeout')), 30000)
      )
    ]) as any
    
    if (result?.error) {
      const errorMsg = result.error.message || JSON.stringify(result.error)
      console.error('Resend API error details:', result.error)
      throw new Error(`Resend API error: ${errorMsg}`)
    }
    
    // Resend API returns { id: "...", ... } on success
    // Handle both direct id and nested data.id (if API format changes)
    const messageId = result?.id || result?.data?.id
    
    if (!messageId) {
      console.warn('Resend returned unexpected response:', JSON.stringify(result, null, 2))
      throw new Error(`Resend API returned no message ID. Response: ${JSON.stringify(result)}`)
    }
    
    console.log(`Email sent successfully via Resend (${isCustomDomain ? 'custom domain' : 'free tier'}):`, {
      messageId: messageId,
      to: options.to,
      from: from,
    })
  } catch (error) {
    console.error('Resend email failed:', error)
    throw error
  }
}

/**
 * Send email via Zoho SMTP
 */
async function sendViaZoho(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<void> {
  const transporter = getZohoTransporter()
  // Zoho requires FROM address to match the authenticated SMTP_USER
  // Use SMTP_USER as FROM to avoid "553 Sender is not allowed to relay" error
  const from = SMTP_USER
  const fromFormatted = `"${FROM_NAME}" <${from}>`
  
  const messageId = `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@seoauditpro.net>`
  
  try {
    const info = await transporter.sendMail({
      from: fromFormatted,
      to: options.to,
      replyTo: from,
      subject: options.subject,
      text: options.text,
      html: options.html,
      headers: {
        'Message-ID': messageId,
        'X-Mailer': 'SEO CheckSite',
        'X-Priority': '3',
        'Importance': 'normal',
        'Precedence': 'normal',
        'Auto-Submitted': 'auto-generated',
        'Content-Type': 'text/html; charset=UTF-8',
        'MIME-Version': '1.0',
        'X-Entity-Ref-ID': messageId,
      },
      priority: 'normal',
      encoding: 'UTF-8',
    })
    
    console.log('Email sent successfully via Zoho SMTP:', {
      messageId: info.messageId,
      response: info.response,
      to: options.to,
    })
  } catch (error) {
    console.error('Zoho SMTP email failed:', error)
    throw error
  }
}

/**
 * Main email sending function with automatic fallback
 * Defaults to Zoho SMTP for better deliverability (especially Hotmail/Outlook)
 */
export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<void> {
  // Prefer Zoho SMTP if configured (better deliverability, especially for Hotmail/Outlook)
  const useZoho = EMAIL_PROVIDER === 'smtp' || (EMAIL_PROVIDER !== 'resend' && SMTP_PASSWORD)
  
  if (useZoho) {
    if (!SMTP_PASSWORD) {
      throw new Error('SMTP_PASSWORD is required but not set. Cannot send email via Zoho SMTP.')
    }
    
    try {
      console.log('📧 Attempting to send via Zoho SMTP (primary)...')
      console.log(`From: ${SMTP_FROM}`)
      await sendViaZoho(options)
      console.log('✅ Email sent successfully via Zoho SMTP')
      return
    } catch (error) {
      console.error('❌ Zoho SMTP failed:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Zoho error details:', errorMsg)
      
      // Fallback to Resend if enabled and configured
      if (USE_FALLBACK && RESEND_API_KEY) {
        console.warn('Falling back to Resend...')
        try {
          await sendViaResend(options)
          console.log('✅ Email sent successfully via Resend (fallback)')
          return
        } catch (resendError) {
          console.error('❌ Resend fallback also failed:', resendError)
          throw new Error(`Both Zoho and Resend failed. Zoho: ${errorMsg}, Resend: ${resendError instanceof Error ? resendError.message : String(resendError)}`)
        }
      }
      
      // No fallback - throw the Zoho error
      throw new Error(`Zoho SMTP email failed: ${errorMsg}. ${USE_FALLBACK ? 'Resend fallback disabled or not configured.' : 'Fallback disabled.'}`)
    }
  }
  
  // Use Resend as primary (only if EMAIL_PROVIDER is explicitly 'resend' or no SMTP password)
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required but not set. Cannot send email via Resend.')
  }
  
  console.log('📧 Attempting to send via Resend (primary)...')
  try {
    await sendViaResend(options)
    console.log('✅ Email sent successfully via Resend')
  } catch (error) {
    console.error('❌ Resend failed:', error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    
    // Fallback to Zoho if enabled and configured
    if (USE_FALLBACK && SMTP_PASSWORD) {
      console.warn('Falling back to Zoho SMTP...')
      try {
        await sendViaZoho(options)
        console.log('✅ Email sent successfully via Zoho SMTP (fallback)')
        return
      } catch (zohoError) {
        console.error('❌ Zoho SMTP fallback also failed:', zohoError)
        throw new Error(`Both Resend and Zoho failed. Resend: ${errorMsg}, Zoho: ${zohoError instanceof Error ? zohoError.message : String(zohoError)}`)
      }
    }
    
    throw new Error(`Resend email failed: ${errorMsg}. ${USE_FALLBACK ? 'Zoho fallback disabled or not configured.' : 'Fallback disabled.'}`)
  }
}

/**
 * Send audit report email
 */
export async function sendAuditReportEmail(
  email: string,
  url: string,
  auditId: string,
  reportHtml: string
): Promise<void> {
  // Safely extract domain from URL
  let domain = url
  try {
    domain = new URL(url).hostname
  } catch (urlError) {
    console.warn('Invalid URL for email, using URL as-is:', url, urlError)
    // Try to extract domain manually
    const match = url.match(/https?:\/\/([^\/]+)/)
    if (match) {
      domain = match[1]
    }
  }
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; margin-bottom: 15px;">
            <svg width="300" height="90" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
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
            Questions? Email us at <a href="mailto:contact@seoauditpro.net" style="color: #0ea5e9; text-decoration: none;">contact@seoauditpro.net</a>. We're here to help!
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 15px 0 0 0;">
            — The SEO CheckSite Team
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 11px; margin: 4px 0;">
          <a href="${SITE_URL}" style="color: #0ea5e9; text-decoration: none;">seochecksite.netlify.app</a>
        </p>
        <p style="color: #9ca3af; font-size: 11px; margin: 4px 0;">
          <a href="${SITE_URL}/privacy" style="color: #9ca3af; text-decoration: none; margin: 0 8px;">Privacy Policy</a> |
          <a href="${SITE_URL}/terms" style="color: #9ca3af; text-decoration: none; margin: 0 8px;">Terms of Service</a> |
          <a href="${SITE_URL}/refund" style="color: #9ca3af; text-decoration: none; margin: 0 8px;">Refund Policy</a>
        </p>
      </div>
    </div>
  `
  
  await sendEmail({
    to: email,
    subject: `Your SEO CheckSite Report for ${domain} is Ready!`,
    html,
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
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; margin-bottom: 15px;">
            <svg width="300" height="90" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="25" fill="url(#gradientFail)" opacity="0.1"/>
              <circle cx="30" cy="30" r="20" fill="none" stroke="url(#gradientFail)" stroke-width="2"/>
              <path d="M 20 30 L 27 37 L 40 24" stroke="url(#gradientFail)" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <text x="55" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#0369a1">SEO</text>
              <text x="55" y="42" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#0ea5e9">CheckSite</text>
              <defs>
                <linearGradient id="gradientFail" x1="0%" y1="0%" x2="100%" y2="100%">
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
          We encountered an issue while generating your website report for <strong style="color: #dc2626;">${domain}</strong>.
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Our team has been notified and will either re-run the audit or issue a refund. We'll be in touch shortly.
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          If you have any questions, please contact our support team.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 11px; margin: 4px 0;">
          <a href="${SITE_URL}" style="color: #0ea5e9; text-decoration: none;">seochecksite.netlify.app</a>
        </p>
        <p style="color: #9ca3af; font-size: 11px; margin: 4px 0;">
          <a href="${SITE_URL}/privacy" style="color: #9ca3af; text-decoration: none; margin: 0 8px;">Privacy Policy</a> |
          <a href="${SITE_URL}/terms" style="color: #9ca3af; text-decoration: none; margin: 0 8px;">Terms of Service</a> |
          <a href="${SITE_URL}/refund" style="color: #9ca3af; text-decoration: none; margin: 0 8px;">Refund Policy</a>
        </p>
      </div>
    </div>
  `
  
  await sendEmail({
    to: email,
    subject: `Issue with your SEO CheckSite report for ${domain}`,
    html,
  })
}

