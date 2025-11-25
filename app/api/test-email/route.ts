import { NextRequest, NextResponse } from 'next/server'
import { sendAuditReportEmail } from '@/lib/resend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Use a test audit ID and URL
    const testAuditId = 'test-' + Date.now()
    const testUrl = 'https://seoauditpro.net'
    const testHtml = `
      <h1>Test Email from SEO CheckSite</h1>
      <p>This is a test email to verify email delivery is working.</p>
      <p>If you received this, your email configuration is correct!</p>
      <p><a href="https://seochecksite.netlify.app/report/${testAuditId}">View Test Report</a></p>
    `

    console.log(`Sending test email to ${email}`)
    await sendAuditReportEmail(email, testUrl, testAuditId, testHtml)
    console.log(`Test email sent successfully to ${email}`)

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${email}`,
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
