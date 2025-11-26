/**
 * Admin endpoint to check database timezone and current time
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'
import { getRequestId } from '@/lib/request-id'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  
  // Require admin authentication
  const authError = requireAdminAuth(request)
  if (authError) return authError

  try {
    // Get database timezone and current time
    const { data: timeData, error: timeError } = await supabase
      .rpc('get_timezone_info')
      .single()
      .catch(async () => {
        // If RPC doesn't exist, use a simple query
        const { data, error } = await supabase
          .from('audits')
          .select('created_at')
          .limit(1)
          .single()
        return { data, error }
      })

    // Get current time from database
    const { data: currentTimeData, error: currentTimeError } = await supabase
      .from('audits')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Get server time (Node.js)
    const serverTime = new Date()
    const serverTimeISO = serverTime.toISOString()
    const serverTimeLocal = serverTime.toString()

    // Get a sample audit to see what timezone it's stored in
    const { data: sampleAudit } = await supabase
      .from('audits')
      .select('id, created_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      timezone_info: {
        server_time_utc: serverTimeISO,
        server_time_local: serverTimeLocal,
        server_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        server_timestamp: Date.now(),
      },
      database_info: {
        latest_audit_created_at: sampleAudit?.created_at || null,
        latest_audit_completed_at: sampleAudit?.completed_at || null,
        current_time_query: currentTimeData?.created_at || null,
      },
      analysis: {
        note: 'TIMESTAMPTZ columns store times in UTC. The display in Supabase dashboard may show times in your local timezone.',
        recommendation: 'If dates appear in the future, check: 1) Supabase project timezone settings, 2) Database server clock, 3) Your browser timezone',
      },
    })
  } catch (error) {
    console.error(`[${requestId}] Error checking timezone:`, error)
    return NextResponse.json(
      {
        error: 'Unexpected error checking timezone',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

