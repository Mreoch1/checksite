import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  const supabase = getSupabaseServiceClient()

  const sql = `
    CREATE TABLE IF NOT EXISTS urgent_alerts (
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
    CREATE INDEX IF NOT EXISTS idx_urgent_alerts_unresolved
      ON urgent_alerts (created_at DESC) WHERE resolved_at IS NULL;
  `

  try {
    const { error } = await supabase.rpc('exec_sql', { query: sql })
    if (error) {
      // RPC might not exist — try raw SQL query
      const { error: sqlError } = await supabase.from('urgent_alerts').select('id').limit(1)
      if (sqlError && sqlError.message?.includes('does not exist')) {
        return NextResponse.json({ error: 'Table does not exist and exec_sql RPC not available. Run migration manually.', sqlError: sqlError.message })
      }
      return NextResponse.json({ error: error.message })
    }
    return NextResponse.json({ success: true, message: 'Migration applied' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message })
  }
}
