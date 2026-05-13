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
    .select('id, url, status, created_at, completed_at, email_sent_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Get the actual score from the latest audit's modules
  let auditScore: number | null = null
  if (latestAudit?.id) {
    const { data: modules } = await supabase
      .from('audit_modules')
      .select('module_key, score')
      .eq('audit_id', latestAudit.id)
    // Compute weighted average matching moduleWeights in process-audit.ts
    const weights: Record<string, number> = {
      crawl_health: 2, on_page: 2, performance: 1.5,
      schema: 1.5, accessibility: 1.5, mobile: 1.5,
      social: 1, security: 1, local: 1.5, competitor_overview: 1, llm_readiness: 1,
    }
    if (modules && modules.length > 0) {
      let totalWeighted = 0, totalW = 0
      for (const m of modules) {
        const w = weights[m.module_key as string] || 1
        totalWeighted += (m.score ?? 0) * w
        totalW += w
      }
      if (totalW > 0) auditScore = Math.round(totalWeighted / totalW)
    }
  }

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

  // Urgent alerts — unresolved count + latest 5
  const { count: urgentCount, error: ucError } = await supabase
    .from('urgent_alerts')
    .select('id', { count: 'exact', head: true })
    .is('resolved_at', null)

  const { data: latestAlerts } = await supabase
    .from('urgent_alerts')
    .select('id, created_at, severity, source, category, message, resolved_at')
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

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
    urgent_alerts: {
      unresolved_count: urgentCount || 0,
      latest: latestAlerts || [],
    },
    overall_score: auditScore,
    report_url: latestAudit?.id
      ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.net'}/report/${latestAudit.id}`
      : null,
  })
}
