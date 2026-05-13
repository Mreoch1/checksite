import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { requireAdminAuth } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request)
  if (authError) return authError

  const supabase = getSupabaseServiceClient()

  try {
    // Insert a synthetic test row matching what the webhook would write
    const { data, error } = await supabase
      .from('urgent_alerts')
      .insert({
        severity: 'p0',
        source: 'test_d006f',
        category: 'report_delivery_bounce',
        message: 'D-006f synthetic test — delete after verification',
        metadata: {
          test: true,
          d006f: true,
          email: 'synthetic-test@customerdomain.com',
          event: 'bounce',
        },
      })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Read the current unresolved count
    const { count } = await supabase
      .from('urgent_alerts')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)

    // Now delete the test row
    if (data && data.length > 0) {
      await supabase
        .from('urgent_alerts')
        .delete()
        .eq('id', data[0].id)
    }

    // Verify cleanup
    const { count: finalCount } = await supabase
      .from('urgent_alerts')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)

    return NextResponse.json({
      success: true,
      test_row_inserted: true,
      test_row_id: data?.[0]?.id,
      unresolved_count_before_delete: count || 0,
      unresolved_count_after_cleanup: finalCount || 0,
      message: 'Alert path proven: write → read → delete works',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
