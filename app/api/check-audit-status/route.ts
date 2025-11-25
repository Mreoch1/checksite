import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const auditId = searchParams.get('id')

    if (!auditId) {
      return NextResponse.json(
        { error: 'Audit ID is required' },
        { status: 400 }
      )
    }

    const { data: audit, error } = await supabase
      .from('audits')
      .select('status, created_at')
      .eq('id', auditId)
      .single()

    if (error || !audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      status: audit.status,
      created_at: audit.created_at,
    })
  } catch (error) {
    console.error('Error checking audit status:', error)
    return NextResponse.json(
      { error: 'Failed to check audit status' },
      { status: 500 }
    )
  }
}

