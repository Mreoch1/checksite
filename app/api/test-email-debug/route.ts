import { NextRequest, NextResponse } from 'next/server'
import { sendAuditReportEmail } from '@/lib/email-unified'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    config: {},
    attempts: [],
    finalResult: null,
  }

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Check configuration
    debugInfo.config = {
      emailProvider: process.env.EMAIL_PROVIDER || 'resend',
      useFallback: process.env.EMAIL_USE_FALLBACK !== 'false',
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasSmtpPassword: !!process.env.SMTP_PASSWORD,
      fromEmail: process.env.FROM_EMAIL || 'contact@seochecksite.net',
      smtpHost: process.env.SMTP_HOST || 'smtppro.zoho.com',
      smtpUser: process.env.SMTP_USER || 'contact@seochecksite.net',
    }

    // Use a test audit ID and URL
    const testAuditId = 'test-' + Date.now()
    const testUrl = 'https://seoauditpro.net'

    console.log('=== EMAIL DEBUG TEST ===')
    console.log('Config:', debugInfo.config)
    console.log('Attempting to send to:', email)

    try {
      await sendAuditReportEmail(email, testUrl, testAuditId, '<h1>Test Email</h1>')
      
      debugInfo.finalResult = {
        success: true,
        message: 'Email sent successfully',
      }

      console.log('✅ Email sent successfully')
      
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${email}`,
        debug: debugInfo,
      })
    } catch (error) {
      debugInfo.finalResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }

      console.error('❌ Email sending failed:', error)
      
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send test email',
          details: error instanceof Error ? error.message : String(error),
          debug: debugInfo,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in test email debug endpoint:', error)
    return NextResponse.json(
      {
        error: 'Failed to process test email request',
        details: error instanceof Error ? error.message : String(error),
        debug: debugInfo,
      },
      { status: 500 }
    )
  }
}

