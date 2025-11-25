import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Get recent audits with customer info
    const { data: audits, error } = await supabase
      .from('audits')
      .select(`
        id,
        url,
        status,
        created_at,
        completed_at,
        customers (
          email,
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching audits:', error)
      return NextResponse.json(
        { error: 'Failed to fetch audits', details: error.message },
        { status: 500 }
      )
    }

    // Format the response
    const formattedAudits = audits?.map(audit => {
      const customer = audit.customers as any
      const created = new Date(audit.created_at)
      const completed = audit.completed_at ? new Date(audit.completed_at) : null
      
      let duration = null
      if (completed) {
        duration = Math.round((completed.getTime() - created.getTime()) / 1000 / 60)
      } else if (audit.status === 'running') {
        duration = Math.round((Date.now() - created.getTime()) / 1000 / 60)
      }

      return {
        id: audit.id,
        url: audit.url,
        status: audit.status,
        created_at: audit.created_at,
        completed_at: audit.completed_at,
        duration_minutes: duration,
        customer_email: customer?.email || null,
        customer_name: customer?.name || null,
      }
    }) || []

    return NextResponse.json({
      count: formattedAudits.length,
      audits: formattedAudits,
      summary: {
        completed: formattedAudits.filter(a => a.status === 'completed').length,
        running: formattedAudits.filter(a => a.status === 'running').length,
        pending: formattedAudits.filter(a => a.status === 'pending').length,
        failed: formattedAudits.filter(a => a.status === 'failed').length,
      }
    })
  } catch (error) {
    console.error('Error checking audits:', error)
    return NextResponse.json(
      { error: 'Failed to check audits', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

