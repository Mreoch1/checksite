import { NextRequest, NextResponse } from 'next/server'
import { sendAuditReportEmail } from '@/lib/email-unified'
import { requireAdminAuth } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Require admin authentication to prevent unauthorized test emails
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Check environment variables
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtppro.zoho.com',
      port: process.env.SMTP_PORT || '465',
      user: process.env.SMTP_USER || 'admin@seochecksite.net',
      password: process.env.SMTP_PASSWORD ? '***SET***' : 'NOT SET',
      fromEmail: process.env.FROM_EMAIL || 'admin@seochecksite.net',
      fromName: process.env.FROM_NAME || 'SEO CheckSite',
    }

    console.log('SMTP Config:', {
      ...smtpConfig,
      password: smtpConfig.password,
    })

    // Use a test audit ID and URL
    const testAuditId = 'test-' + Date.now()
    const testUrl = 'https://seochecksite.net'
    const testHtml = `
      <h1>Test Email from SEO CheckSite</h1>
      <p>This is a test email to verify email delivery is working.</p>
      <p>If you received this, your email configuration is correct!</p>
      <p><a href="https://seochecksite.netlify.app/report/${testAuditId}">View Test Report</a></p>
    `

    console.log(`Attempting to send test email to ${email}`)
    
    try {
      await sendAuditReportEmail(email, testUrl, testAuditId, testHtml)
      console.log(`Test email sent successfully to ${email}`)

      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${email}`,
        config: smtpConfig,
      })
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          details: emailError instanceof Error ? emailError.message : String(emailError),
          stack: emailError instanceof Error ? emailError.stack : undefined,
          config: smtpConfig,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in test email endpoint:', error)
    return NextResponse.json(
      {
        error: 'Failed to process test email request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

