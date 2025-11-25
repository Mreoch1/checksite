import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { auditId } = await request.json()

    if (!auditId) {
      return NextResponse.json(
        { error: 'Audit ID is required' },
        { status: 400 }
      )
    }

    // Reset audit to pending so it can be retried
    const { error } = await supabase
      .from('audits')
      .update({ 
        status: 'pending',
        completed_at: null,
        raw_result_json: null,
        formatted_report_html: null,
        formatted_report_plaintext: null,
      })
      .eq('id', auditId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to reset audit', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Audit reset to pending',
      auditId,
    })
  } catch (error) {
    console.error('Error resetting audit:', error)
    return NextResponse.json(
      {
        error: 'Failed to reset audit',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

