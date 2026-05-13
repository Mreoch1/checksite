import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  const supabase = getSupabaseServiceClient()
  const results: string[] = []

  // Try creating the table via direct insert (triggers schema migration on Supabase)
  // First check if table already exists by trying to select from it
  try {
    const { data: check, error: checkErr } = await supabase
      .from('urgent_alerts')
      .select('id')
      .limit(1)

    if (!checkErr) {
      return NextResponse.json({ message: 'Table already exists', exists: true })
    }
    results.push(`Check error: ${checkErr.message}`)
  } catch (e: any) {
    results.push(`Check exception: ${e.message}`)
  }

  // Try creating via REST API directly using the service client's underlying fetch
  // The supabase-js client can make raw SQL calls using the service role key
  // We'll use the PostgREST API to create the table (DDL via REST not supported)
  // Fallback: Try creating via a known Supabase management API

  // Try using the database.tech API endpoint
  try {
    const mgmtUrl = `https://api.supabase.com/v1/projects/ybliuezkxrlgiydbfzqy/postgrest`
    results.push(`Mgmt API: DDL via REST not possible, need SQL editor`)
  } catch { }

  return NextResponse.json({
    error: 'Table does not exist and cannot be created via REST API',
    message: 'Use Supabase SQL editor at https://app.supabase.com/project/ybliuezkxrlgiydbfzqy/sql/new',
    sql: `CREATE TABLE IF NOT EXISTS public.urgent_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  severity text NOT NULL CHECK (severity IN ('p0', 'p1', 'p2')) DEFAULT 'p0',
  source text NOT NULL DEFAULT 'm003_delivery_monitor',
  category text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  notes text
);
CREATE INDEX IF NOT EXISTS idx_urgent_alerts_unresolved ON public.urgent_alerts (created_at DESC) WHERE resolved_at IS NULL;`,
  })
}
