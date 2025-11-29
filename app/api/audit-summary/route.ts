/**
 * Public endpoint to get basic audit summary (URL and modules) for success page
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const auditId = searchParams.get('id')
  
  if (!auditId) {
    return NextResponse.json(
      { error: 'Audit ID parameter is required' },
      { status: 400 }
    )
  }

  try {
    // Get audit with only URL and selected_modules (public info)
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('url, selected_modules')
      .eq('id', auditId)
      .single()

    if (auditError || !audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      )
    }

    // Parse selected_modules if it's a string
    let modules = []
    if (audit.selected_modules) {
      try {
        modules = typeof audit.selected_modules === 'string' 
          ? JSON.parse(audit.selected_modules)
          : audit.selected_modules
      } catch (e) {
        // If parsing fails, return empty array
        modules = []
      }
    }

    return NextResponse.json({
      url: audit.url,
      modules: modules || [],
    })
  } catch (error) {
    console.error('Error fetching audit summary:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch audit summary',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

