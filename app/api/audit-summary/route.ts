import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const auditId = searchParams.get('id')

  if (!auditId) {
    return NextResponse.json({ error: 'Missing audit id' }, { status: 400 })
  }

  const db = getSupabaseServiceClient()

  // Get audit URL
  const { data: audit } = await db
    .from('audits')
    .select('url')
    .eq('id', auditId)
    .single()

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  }

  // Get modules from audit_modules table
  const { data: modules } = await db
    .from('audit_modules')
    .select('module_key')
    .eq('audit_id', auditId)
    .eq('enabled', true)

  return NextResponse.json({
    url: audit.url,
    modules: modules?.map(m => m.module_key) || [],
  })
}
