import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED_TABLES = ['urgent_alerts', 'audits', 'email_events', 'audit_queue', 'audit_modules', 'customers', 'app_settings', 'funnel_events']

export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}

async function handleRequest(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  const table = request.nextUrl.searchParams.get('table')
  if (!table || !ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: `Invalid or missing table. Allowed: ${ALLOWED_TABLES.join(', ')}` }, { status: 400 })
  }

  const supabase = getSupabaseServiceClient()

  try {
    const { data, error } = await supabase.rpc('to_regclass', { name: `public.${table}` })
    if (error) {
      // Fallback: try direct select
      const { error: selectError } = await supabase.from(table).select('id').limit(1)
      return NextResponse.json({
        table,
        exists: !selectError,
        method: selectError ? 'rpc_failed+select' : 'rpc_failed+select_success',
        note: selectError?.message || null,
      })
    }
    return NextResponse.json({
      table,
      exists: data !== null,
      method: 'to_regclass',
    })
  } catch (err: any) {
    // Final fallback: try a select
    const { error: selectError } = await supabase.from(table).select('id').limit(1)
    return NextResponse.json({
      table,
      exists: !selectError,
      method: 'select_fallback',
      note: selectError?.message || null,
    })
  }
}
