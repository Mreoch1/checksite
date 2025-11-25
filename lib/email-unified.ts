/**
 * Unified email service with Resend and Zoho SMTP fallback
 */

import nodemailer from 'nodemailer'
import { Resend } from 'resend'

// Configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend' // 'resend' or 'smtp'
const USE_FALLBACK = process.env.EMAIL_USE_FALLBACK !== 'false' // Default: true

// Zoho SMTP Configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtppro.zoho.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10)
const SMTP_USER = process.env.SMTP_USER || 'contact@seoauditpro.net'
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || ''
const SMTP_FROM = process.env.FROM_EMAIL || 'contact@seoauditpro.net'

// Resend Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
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
 * Uses free tier with onboarding@resend.dev (no custom domain needed)
 */
async function sendViaResend(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<void> {
  const resend = getResendClient()
  
  // Always use Resend free tier domain (no custom domain verification needed)
  const from = 'onboarding@resend.dev'
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
    
    if (!result?.id) {
      console.warn('Resend returned no message ID:', result)
      throw new Error('Resend API returned no message ID')
    }
    
    console.log('Email sent successfully via Resend (free tier):', {
      messageId: result.id,
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
  const from = SMTP_FROM
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
 */
export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<void> {
  const useResend = EMAIL_PROVIDER === 'resend' || (!EMAIL_PROVIDER && RESEND_API_KEY)
  
  if (useResend) {
    try {
      console.log('Attempting to send via Resend...')
      await sendViaResend(options)
      console.log('✅ Email sent successfully via Resend')
      return
    } catch (error) {
      console.error('❌ Resend failed:', error)
      console.warn('Falling back to Zoho SMTP...')
      if (!USE_FALLBACK) {
        throw error // Don't fallback if disabled
      }
      // Fall through to Zoho
    }
  }
  
  // Use Zoho SMTP (either as primary or fallback)
  console.log('Attempting to send via Zoho SMTP...')
  try {
    await sendViaZoho(options)
    console.log('✅ Email sent successfully via Zoho SMTP')
  } catch (error) {
    console.error('❌ Zoho SMTP also failed:', error)
    throw error
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
  const domain = new URL(url).hostname
  
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
      
      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          <a href="${SITE_URL}" style="color: #0ea5e9; text-decoration: none;">seochecksite.netlify.app</a>
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

