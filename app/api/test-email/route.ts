import { NextRequest, NextResponse } from 'next/server'
import { sendAuditReportEmail } from '@/lib/email'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { email, auditId, url } = await request.json()

    if (!email || !auditId || !url) {
      return NextResponse.json(
        { error: 'Missing required fields: email, auditId, url' },
        { status: 400 }
      )
    }

    // Test email with sample HTML
    const sampleHtml = '<h1>Test Report</h1><p>This is a test email from SEO CheckSite.</p>'

    console.log(`Sending test email to ${email}`)
    await sendAuditReportEmail(email, url, auditId, sampleHtml)
    console.log(`Test email sent successfully to ${email}`)

    return NextResponse.json({ 
      success: true, 
      message: `Test email sent to ${email}` 
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

