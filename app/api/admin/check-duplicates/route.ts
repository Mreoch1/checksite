import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'
import { getRequestId } from '@/lib/request-id'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    // Check for audits for seochecksite.net
    const { data: seoauditAudits, error: seoauditError } = await supabase
      .from('audits')
      .select('id, url, status, created_at, email_sent_at, customer_id, customers(email)')
      .ilike('url', '%seochecksite.net%')
      .order('created_at', { ascending: false })

    if (seoauditError) {
      return NextResponse.json(
        { error: 'Failed to fetch audits', details: seoauditError.message },
        { status: 500 }
      )
    }

    // Check for duplicate queue entries
    let queueItems: any[] = []
    if (seoauditAudits && seoauditAudits.length > 0) {
      const auditIds = seoauditAudits.map(a => a.id)
      const { data: queueData, error: queueError } = await supabase
        .from('audit_queue')
        .select('id, audit_id, status, created_at, retry_count, last_error')
        .in('audit_id', auditIds)
        .order('created_at', { ascending: false })

      if (!queueError) {
        queueItems = queueData || []
      }
    }

    // Check for recent duplicate audits (same URL + customer, last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentAudits, error: recentError } = await supabase
      .from('audits')
      .select('id, url, status, created_at, email_sent_at, customer_id, customers(email)')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })

    // Group by URL + customer email to find duplicates
    const duplicates: any[] = []
    if (recentAudits && !recentError) {
      const grouped: Record<string, any[]> = {}
      recentAudits.forEach(audit => {
        const customer = Array.isArray(audit.customers) ? audit.customers[0] : audit.customers
        const key = `${audit.url}|${customer?.email || 'unknown'}`
        if (!grouped[key]) {
          grouped[key] = []
        }
        grouped[key].push(audit)
      })

      Object.entries(grouped).forEach(([key, audits]) => {
        if (audits.length > 1) {
          const [url, email] = key.split('|')
          duplicates.push({
            url,
            email,
            count: audits.length,
            audits: audits.map(a => ({
              id: a.id,
              created_at: a.created_at,
              email_sent_at: a.email_sent_at,
              status: a.status,
            })),
          })
        }
      })
    }

    // Check for all pending/processing queue items
    const { data: allPending, error: pendingError } = await supabase
      .from('audit_queue')
      .select('id, audit_id, status, created_at, retry_count, audits(url, status, email_sent_at, customers(email))')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true })

    return NextResponse.json({
      success: true,
      seoauditpro_audits: {
        count: seoauditAudits?.length || 0,
        audits: seoauditAudits?.map(a => {
          const customer = Array.isArray(a.customers) ? a.customers[0] : a.customers
          return {
            id: a.id,
            url: a.url,
            status: a.status,
            created_at: a.created_at,
            email_sent_at: a.email_sent_at,
            customer_email: customer?.email,
          }
        }) || [],
      },
      queue_entries: {
        count: queueItems.length,
        items: queueItems,
      },
      recent_duplicates: duplicates,
      pending_queue: {
        count: allPending?.length || 0,
        items: allPending?.map(item => {
          const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
          const customer = audit?.customers ? (Array.isArray(audit.customers) ? audit.customers[0] : audit.customers) : null
          return {
            queue_id: item.id,
            audit_id: item.audit_id,
            url: audit?.url,
            status: item.status,
            created_at: item.created_at,
            retry_count: item.retry_count,
            email_sent: !!audit?.email_sent_at,
            customer_email: customer?.email,
          }
        }) || [],
      },
    })
  } catch (error) {
    console.error(`[${requestId}] Error checking duplicates:`, error)
    return NextResponse.json(
      {
        error: 'Failed to check duplicates',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

