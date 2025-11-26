/**
 * Admin endpoint to manually mark an audit as completed
 * Use when audit has a report but status is wrong
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

    // Get audit
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

    // Update to completed
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

    // Send email if not sent yet
    let emailSent = false
    if (!audit.email_sent_at && audit.formatted_report_html) {
      try {
        const { sendAuditReportEmail } = await import('@/lib/email-unified')
        const customer = audit.customers as any
        if (customer?.email) {
          await sendAuditReportEmail(
            customer.email,
            audit.url,
            auditId,
            audit.formatted_report_html
          )
          
          await supabase
            .from('audits')
            .update({ email_sent_at: new Date().toISOString() })
            .eq('id', auditId)
          
          emailSent = true
        }
      } catch (emailError) {
        console.error(`[${requestId}] Email error:`, emailError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Audit marked as completed',
      auditId,
      emailSent,
    })
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json(
      {
        error: 'Failed to complete audit',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

