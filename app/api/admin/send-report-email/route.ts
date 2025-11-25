import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendAuditReportEmail } from '@/lib/email-unified'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { auditId } = await request.json()

    if (!auditId) {
      return NextResponse.json(
        { error: 'Audit ID is required' },
        { status: 400 }
      )
    }

    // Get audit details
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('*, customers(*)')
      .eq('id', auditId)
      .single()

    if (auditError || !audit) {
      return NextResponse.json(
        { error: 'Audit not found', details: auditError?.message },
        { status: 404 }
      )
    }

    // Check if report exists
    if (!audit.formatted_report_html) {
      return NextResponse.json(
        { error: 'Report not yet generated. Audit status: ' + audit.status },
        { status: 400 }
      )
    }

    const customer = audit.customers as any
    if (!customer?.email) {
      return NextResponse.json(
        { error: 'Customer email not found' },
        { status: 400 }
      )
    }

    // Send email
    try {
      await sendAuditReportEmail(
        customer.email,
        audit.url,
        auditId,
        audit.formatted_report_html
      )

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        auditId,
        email: customer.email,
      })
    } catch (emailError) {
      return NextResponse.json(
        {
          error: 'Failed to send email',
          details: emailError instanceof Error ? emailError.message : String(emailError),
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in send-report-email:', error)
    return NextResponse.json(
      {
        error: 'Failed to send report email',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

