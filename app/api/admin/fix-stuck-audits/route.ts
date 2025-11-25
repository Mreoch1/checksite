import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Get all stuck audits (running for more than 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    const { data: stuckAudits, error } = await supabase
      .from('audits')
      .select('id, url, status, created_at, customers(email)')
      .in('status', ['running', 'pending'])
      .lt('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch stuck audits', details: error.message },
        { status: 500 }
      )
    }

    if (!stuckAudits || stuckAudits.length === 0) {
      return NextResponse.json({
        message: 'No stuck audits found',
        count: 0,
        audits: [],
      })
    }

    // Mark them as failed
    const auditIds = stuckAudits.map(a => a.id)
    const { error: updateError } = await supabase
      .from('audits')
      .update({ status: 'failed' })
      .in('id', auditIds)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update audits', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Marked ${stuckAudits.length} stuck audit(s) as failed`,
      count: stuckAudits.length,
      audits: stuckAudits.map(a => ({
        id: a.id,
        url: a.url,
        status: 'failed',
        created_at: a.created_at,
        customer_email: (a.customers as any)?.email || null,
      })),
    })
  } catch (error) {
    console.error('Error fixing stuck audits:', error)
    return NextResponse.json(
      {
        error: 'Failed to fix stuck audits',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

