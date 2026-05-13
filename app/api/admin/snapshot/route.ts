import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  const supabase = getSupabaseServiceClient()
  const now = new Date().toISOString()

  // Latest audit
  const { data: latestAudit } = await supabase
    .from('audits')
    .select('id, url, status, created_at, completed_at, email_sent_at, overall_score, duration_minutes')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Queue state summary
  const { data: queueItems } = await supabase
    .from('audit_queue')
    .select('status')

  const queueCounts: Record<string, number> = {}
  if (queueItems) {
    for (const item of queueItems) {
      queueCounts[item.status] = (queueCounts[item.status] || 0) + 1
    }
  }

  // Recent email events (last 24h)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentEmails } = await supabase
    .from('email_events')
    .select('event_type, count')
    // fallback: count manually
    .gte('created_at', yesterday)

  const emailCounts: Record<string, number> = {}
  if (recentEmails) {
    for (const e of recentEmails) {
      const t = (e as any).event_type || 'unknown'
      emailCounts[t] = (emailCounts[t] || 0) + 1
    }
  }

  // Audits completed without email
  const { count: missingEmailCount } = await supabase
    .from('audits')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
    .is('email_sent_at', null)

  return NextResponse.json({
    generated_at: now,
    latest_audit: latestAudit || null,
    queue: {
      counts: queueCounts,
      total: queueItems?.length || 0,
    },
    email: {
      recent_delivery_events: emailCounts,
      completed_without_email: missingEmailCount || 0,
    },
    healthy: !!latestAudit?.email_sent_at,
    report_url: latestAudit?.id
      ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.net'}/report/${latestAudit.id}`
      : null,
  })
}
