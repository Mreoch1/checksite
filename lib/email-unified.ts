/**
 * Unified email service with SendGrid (primary) and Zoho SMTP fallback
 */

import nodemailer from 'nodemailer'
import sgMail from '@sendgrid/mail'

// Configuration
// SendGrid is primary, Zoho SMTP as fallback
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || ''
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || ''
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || (SENDGRID_API_KEY ? 'sendgrid' : (SMTP_PASSWORD ? 'smtp' : 'sendgrid')) // 'sendgrid' or 'smtp'
const USE_FALLBACK = process.env.EMAIL_USE_FALLBACK !== 'false' // Default: true (enable fallback)

// Zoho SMTP Configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtppro.zoho.com'
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10)
const SMTP_USER = process.env.SMTP_USER || 'contact@seoauditpro.net'
const SMTP_FROM = process.env.FROM_EMAIL || 'contact@seoauditpro.net'

// SendGrid Configuration
const SENDGRID_FROM = process.env.FROM_EMAIL || 'contact@seoauditpro.net'
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

// SendGrid Client (lazy initialization)
function initializeSendGrid(): void {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY environment variable is required for SendGrid')
  }
  sgMail.setApiKey(SENDGRID_API_KEY)
  // Note: SendGrid library automatically sets Content-Type: application/json
  // The 415 error might be due to message format - ensure we're using the correct API
}

/**
 * Send email via SendGrid API
 */
async function sendViaSendGrid(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<void> {
  initializeSendGrid()
  
  const fromEmail = SENDGRID_FROM
  const fromFormatted = `${FROM_NAME} <${fromEmail}>`
  
  // Generate plain text version if not provided (better deliverability)
  const plainText = options.text || options.html
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
  
  try {
    // SendGrid v8.x message format - using text/html properties with type assertion
    // to work around strict TypeScript types
    const msg = {
      to: options.to,
      from: fromFormatted,
      replyTo: fromEmail,
      subject: options.subject,
      text: plainText,
      html: options.html,
      // Add headers to improve deliverability and avoid spam filters
      // NOTE: Do NOT set Content-Type in headers - SendGrid API requires application/json
      // and the library handles email content type automatically
      headers: {
        'List-Unsubscribe': `<${SITE_URL}/unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Mailer': 'SEO CheckSite',
        'X-Entity-Ref-ID': `audit-${Date.now()}`,
        // Add Message-ID for better deliverability
        'Message-ID': `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@seoauditpro.net>`,
        // Additional headers to improve deliverability
        'X-Priority': '3',
        'Importance': 'normal',
        'Auto-Submitted': 'no', // Important: indicates this is NOT an auto-reply
        'MIME-Version': '1.0',
      },
      // SendGrid-specific settings to improve deliverability
      mailSettings: {
        // CRITICAL: Disable click tracking for report links to avoid SSL certificate issues
        // The tracking domain (url5121.seoauditpro.net) has SSL cert problems
        // NOTE: If click tracking is still enabled, you must also disable it in SendGrid dashboard:
        // Settings → Tracking → Click Tracking → Disable
        clickTracking: {
          enable: false, // Disabled to prevent SSL errors on report links
          enableText: false, // Also disable for plain text links
        },
        // Enable open tracking (helps with deliverability)
        openTracking: {
          enable: true,
        },
      },
    } as any // Type assertion to bypass strict SendGrid types
    
    const result = await Promise.race([
      sgMail.send(msg),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SendGrid timeout')), 30000)
      )
    ]) as any
    
    console.log('Email sent successfully via SendGrid:', {
      to: options.to,
      from: fromEmail,
      statusCode: result?.[0]?.statusCode,
    })
  } catch (error: any) {
    console.error('SendGrid email failed:', error)
    if (error.response) {
      console.error('SendGrid error details:', error.response.body)
    }
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
  
  // Generate plain text version if not provided (better deliverability)
  const plainText = options.text || options.html
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
  
  try {
    const info = await transporter.sendMail({
      from: fromFormatted,
      to: options.to,
      replyTo: from,
      subject: options.subject,
      text: plainText, // Always include plain text version
      html: options.html,
      headers: {
        'Message-ID': messageId,
        'X-Mailer': 'SEO CheckSite',
        'List-Unsubscribe': `<${SITE_URL}/unsubscribe>`, // Helps with deliverability
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Priority': '3',
        'Importance': 'normal',
        'Auto-Submitted': 'no', // Important: indicates this is NOT an auto-reply
        'Content-Type': 'text/html; charset=UTF-8',
        'MIME-Version': '1.0',
        'X-Entity-Ref-ID': messageId,
        // Removed 'Precedence: bulk' - this can trigger spam filters
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
 * Uses SendGrid as primary, Zoho SMTP as fallback
 */
export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<void> {
  // Use SendGrid as primary if:
  // 1. Explicitly set to 'sendgrid'
  // 2. SendGrid API key is configured
  const useSendGrid = EMAIL_PROVIDER === 'sendgrid' || 
                      (SENDGRID_API_KEY && EMAIL_PROVIDER !== 'smtp')
  
  // Use Zoho as fallback if:
  // 1. Explicitly set to 'smtp'
  // 2. SendGrid is not configured
  const useZoho = EMAIL_PROVIDER === 'smtp' || 
                  (!SENDGRID_API_KEY && SMTP_PASSWORD)
  
  // Try SendGrid first (primary)
  if (useSendGrid && SENDGRID_API_KEY) {
    console.log('📧 Attempting to send via SendGrid (primary)...')
    try {
      await sendViaSendGrid(options)
      console.log('✅ Email sent successfully via SendGrid')
      return
    } catch (error) {
      console.error('❌ SendGrid failed:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      
      // Fallback to Zoho if enabled and configured
      if (USE_FALLBACK && useZoho && SMTP_PASSWORD) {
        console.warn('Falling back to Zoho SMTP...')
        try {
          await sendViaZoho(options)
          console.log('✅ Email sent successfully via Zoho SMTP (fallback)')
          return
        } catch (zohoError) {
          console.error('❌ Zoho SMTP fallback also failed:', zohoError)
          throw new Error(`Both SendGrid and Zoho failed. SendGrid: ${errorMsg}, Zoho: ${zohoError instanceof Error ? zohoError.message : String(zohoError)}`)
        }
      }
      
      throw new Error(`SendGrid email failed: ${errorMsg}. ${USE_FALLBACK && useZoho ? 'Zoho fallback disabled or not configured.' : 'Fallback disabled.'}`)
    }
  }
  
  // Try Zoho if SendGrid is not configured
  if (useZoho && SMTP_PASSWORD) {
    console.log('📧 Attempting to send via Zoho SMTP (primary)...')
    try {
      await sendViaZoho(options)
      console.log('✅ Email sent successfully via Zoho SMTP')
      return
    } catch (error) {
      console.error('❌ Zoho SMTP failed:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      
      // Fallback to SendGrid if enabled and configured
      if (USE_FALLBACK && SENDGRID_API_KEY) {
        console.warn('Falling back to SendGrid...')
        try {
          await sendViaSendGrid(options)
          console.log('✅ Email sent successfully via SendGrid (fallback)')
          return
        } catch (sendgridError) {
          console.error('❌ SendGrid fallback also failed:', sendgridError)
          throw new Error(`Both Zoho and SendGrid failed. Zoho: ${errorMsg}, SendGrid: ${sendgridError instanceof Error ? sendgridError.message : String(sendgridError)}`)
        }
      }
      
      throw new Error(`Zoho SMTP email failed: ${errorMsg}. ${USE_FALLBACK ? 'SendGrid fallback disabled or not configured.' : 'Fallback disabled.'}`)
    }
  }
  
  // If we get here, neither SendGrid nor Zoho is configured
  const errorMsg = 'No email provider configured. Set either SENDGRID_API_KEY or SMTP_PASSWORD environment variable in Netlify environment variables.'
  console.error('❌', errorMsg)
  console.error('📧 Email Configuration Check:')
  console.error('   SENDGRID_API_KEY:', SENDGRID_API_KEY ? 'SET' : 'NOT SET')
  console.error('   SMTP_PASSWORD:', SMTP_PASSWORD ? 'SET' : 'NOT SET')
  console.error('   EMAIL_PROVIDER:', EMAIL_PROVIDER || 'not set')
  console.error('   FROM_EMAIL:', SMTP_FROM || 'not set')
  throw new Error(errorMsg)
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
  // Validate email configuration before attempting to send
  if (!SENDGRID_API_KEY && !SMTP_PASSWORD) {
    const errorMsg = 'Email configuration error: Neither SENDGRID_API_KEY nor SMTP_PASSWORD is set. Please configure at least one email provider in Netlify environment variables.'
    console.error('❌', errorMsg)
    throw new Error(errorMsg)
  }
  
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
        
        <h2 style="color: #0369a1; font-size: 24px; margin-top: 0;">Your Website Analysis is Complete</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello,</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          We've completed the analysis of <strong style="color: #0369a1;">${domain}</strong>. Your detailed report is available below.
        </p>
        <p style="color: #6b7280; font-size: 13px; margin-top: 10px; padding: 10px; background-color: #f9fafb; border-radius: 4px;">
          <strong>Note:</strong> If this email appears in your junk folder, please mark it as "Not Junk" to ensure you receive future updates.
        </p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${SITE_URL}/report/${auditId}" 
             style="background: linear-gradient(135deg, #0ea5e9, #0369a1); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);">
            View Your Report
          </a>
        </div>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #0369a1; font-size: 14px; margin: 0; font-weight: 600;">What's included?</p>
          <p style="color: #374151; font-size: 14px; margin: 8px 0 0 0; line-height: 1.5;">
            Your analysis includes actionable insights to improve your website's performance and visibility. All recommendations are explained in plain language.
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
  
  // Use a more transactional subject line to avoid spam filters
  // Avoid words like "SEO", "Report", "Ready" which can trigger filters
  // Make it sound more like a service notification
  const subject = `Website Analysis Complete - ${domain}`
  
  await sendEmail({
    to: email,
    subject,
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


