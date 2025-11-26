/**
 * Admin endpoint to fix a specific stuck audit
 * If audit has a report but status is wrong, fix it
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'
import { getRequestId } from '@/lib/request-id'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  const authError = requireAdminAuth(request)
  if (authError) return authError

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
      .select('*')
      .eq('id', auditId)
      .single()

    if (auditError || !audit) {
      return NextResponse.json(
        { error: 'Audit not found', details: auditError?.message },
        { status: 404 }
      )
    }

    // Check if audit has a report but wrong status
    const hasReport = !!audit.formatted_report_html
    const isStuck = audit.status === 'running' && hasReport

    if (!isStuck) {
      return NextResponse.json({
        message: 'Audit is not stuck',
        status: audit.status,
        hasReport,
        action: 'none',
      })
    }

    // Fix: Update status to completed
    const { error: updateError } = await supabase
      .from('audits')
      .update({
        status: 'completed',
        completed_at: audit.completed_at || new Date().toISOString(),
      })
      .eq('id', auditId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update audit', details: updateError.message },
        { status: 500 }
      )
    }

    // Also check if email needs to be sent
    let emailAction = 'none'
    if (!audit.email_sent_at) {
      // Try to send email if report exists but email wasn't sent
      try {
        const { sendAuditReportEmail } = await import('@/lib/email-unified')
        const { data: auditWithCustomer } = await supabase
          .from('audits')
          .select('*, customers(*)')
          .eq('id', auditId)
          .single()

        if (auditWithCustomer) {
          const customer = auditWithCustomer.customers as any
          if (customer?.email && auditWithCustomer.formatted_report_html) {
            await sendAuditReportEmail(
              customer.email,
              auditWithCustomer.url,
              auditId,
              auditWithCustomer.formatted_report_html
            )
            
            // Update email_sent_at
            await supabase
              .from('audits')
              .update({ email_sent_at: new Date().toISOString() })
              .eq('id', auditId)
            
            emailAction = 'sent'
          }
        }
      } catch (emailError) {
        console.error(`[${requestId}] Error sending email:`, emailError)
        emailAction = 'failed'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Audit fixed successfully',
      auditId,
      previousStatus: audit.status,
      newStatus: 'completed',
      emailAction,
    })
  } catch (error) {
    console.error(`[${requestId}] Error fixing stuck audit:`, error)
    return NextResponse.json(
      {
        error: 'Failed to fix stuck audit',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

