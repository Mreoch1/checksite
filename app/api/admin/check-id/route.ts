/**
 * Admin endpoint to check what a specific ID refers to
 * Can check audit ID, queue ID, or customer ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'
import { getRequestId } from '@/lib/request-id'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  
  if (!id) {
    return NextResponse.json(
      { error: 'ID parameter is required. Usage: /api/admin/check-id?id=YOUR_ID' },
      { status: 400 }
    )
  }
  
  // Require admin authentication
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    const results: any = {
      id,
      found: false,
      type: null,
      data: null,
    }

    // Try as audit ID
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('*, customers(*)')
      .eq('id', id)
      .single()

    if (!auditError && audit) {
      results.found = true
      results.type = 'audit'
      results.data = {
        id: audit.id,
        url: audit.url,
        status: audit.status,
        created_at: audit.created_at,
        completed_at: audit.completed_at,
        email_sent_at: audit.email_sent_at,
        has_report: !!audit.formatted_report_html,
        report_length: audit.formatted_report_html?.length || 0,
        customer_email: (audit.customers as any)?.email,
        customer_name: (audit.customers as any)?.name,
      }
      
      // Check if there's a queue item for this audit
      const { data: queueItem } = await supabase
        .from('audit_queue')
        .select('*')
        .eq('audit_id', id)
        .single()
      
      if (queueItem) {
        results.data.queue_item = {
          id: queueItem.id,
          status: queueItem.status,
          created_at: queueItem.created_at,
          started_at: queueItem.started_at,
          completed_at: queueItem.completed_at,
          retry_count: queueItem.retry_count,
          last_error: queueItem.last_error,
        }
      }
      
      return NextResponse.json(results)
    }

    // Try as queue ID
    const { data: queueItem, error: queueError } = await supabase
      .from('audit_queue')
      .select('*, audits(*)')
      .eq('id', id)
      .single()

    if (!queueError && queueItem) {
      results.found = true
      results.type = 'queue_item'
      const audit = queueItem.audits as any
      results.data = {
        queue_id: queueItem.id,
        audit_id: queueItem.audit_id,
        status: queueItem.status,
        created_at: queueItem.created_at,
        started_at: queueItem.started_at,
        completed_at: queueItem.completed_at,
        retry_count: queueItem.retry_count,
        last_error: queueItem.last_error,
        audit: audit ? {
          id: audit.id,
          url: audit.url,
          status: audit.status,
          has_report: !!audit.formatted_report_html,
          email_sent_at: audit.email_sent_at,
        } : null,
      }
      
      return NextResponse.json(results)
    }

    // Try as customer ID
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()

    if (!customerError && customer) {
      results.found = true
      results.type = 'customer'
      results.data = {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        created_at: customer.created_at,
      }
      
      // Get audits for this customer
      const { data: audits } = await supabase
        .from('audits')
        .select('id, url, status, created_at, completed_at, email_sent_at, formatted_report_html')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (audits) {
        results.data.recent_audits = audits.map(a => ({
          id: a.id,
          url: a.url,
          status: a.status,
          has_report: !!a.formatted_report_html,
          email_sent_at: a.email_sent_at,
        }))
      }
      
      return NextResponse.json(results)
    }

    // Not found in any table
    return NextResponse.json({
      ...results,
      message: 'ID not found in audits, queue, or customers table',
      suggestions: [
        'Check if this is a valid UUID format',
        'Verify the ID hasn\'t been deleted',
        'Check if this might be a different identifier (request ID, etc.)',
      ],
    })
  } catch (error) {
    console.error(`[${requestId}] Unexpected error in check-id:`, error)
    return NextResponse.json(
      {
        error: 'Unexpected error checking ID',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

