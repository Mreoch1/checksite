import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { processAudit } from '@/lib/process-audit'
import { rateLimit, getClientId } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VERIFY_TOKEN = process.env.VERIFY_AUDIT_TOKEN || ''

function requireTokenAuth(request: NextRequest): NextResponse | null {
  if (!VERIFY_TOKEN) {
    return NextResponse.json(
      { error: 'VERIFY_AUDIT_TOKEN not configured on server' },
      { status: 503 }
    )
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized — Bearer token required' },
      { status: 401 }
    )
  }

  const provided = authHeader.slice('Bearer '.length)

  // Constant-time comparison
  const providedBuf = Buffer.from(provided, 'utf8')
  const expectedBuf = Buffer.from(VERIFY_TOKEN, 'utf8')

  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return NextResponse.json(
      { error: 'Unauthorized — invalid token' },
      { status: 401 }
    )
  }

  return null
}

export async function POST(request: NextRequest) {
  const authError = requireTokenAuth(request)
  if (authError) return authError

  // Rate limit: 3 requests per minute per IP
  const clientId = getClientId(request)
  const rateLimitResult = rateLimit(`verify-audit:${clientId}`, 3, 60000)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  const db = getSupabaseServiceClient()

  try {
    const { url = 'https://seochecksite.net', email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      )
    }

    // Get or create customer
    let { data: customer, error: customerError } = await db
      .from('customers')
      .select('*')
      .eq('email', email)
      .single()

    if (customerError || !customer) {
      const { data: newCustomer, error: createError } = await db
        .from('customers')
        .insert({ email, name: 'Internal Verify' })
        .select()
        .single()

      if (createError || !newCustomer) {
        return NextResponse.json(
          { error: 'Failed to create customer', details: createError?.message },
          { status: 500 }
        )
      }
      customer = newCustomer
    }

    // Check for recent duplicate audit (same URL + email within last 30 min)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: recentAudit } = await db
      .from('audits')
      .select('id, created_at, status')
      .eq('customer_id', customer.id)
      .eq('url', url)
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (recentAudit) {
      return NextResponse.json({
        error: 'Duplicate audit',
        message: 'An audit for this URL was created less than 30 minutes ago.',
        existingAuditId: recentAudit.id,
        reportUrl: `${request.nextUrl.origin}/report/${recentAudit.id}`,
      }, { status: 409 })
    }

    // Create audit record (same pipeline as paid path)
    const { data: audit, error: auditError } = await db
      .from('audits')
      .insert({
        customer_id: customer.id,
        url,
        status: 'pending',
        total_price_cents: 1499, // matches test-audit price — non-zero avoids teaser path
      })
      .select()
      .single()

    if (auditError || !audit) {
      return NextResponse.json(
        { error: 'Failed to create audit', details: auditError?.message },
        { status: 500 }
      )
    }

    // Create audit modules (same default set as paid path)
    const defaultModules = [
      'performance', 'crawl_health', 'on_page', 'mobile',
      'accessibility', 'security', 'schema', 'social', 'llm_readiness',
    ]
    const moduleRecords = defaultModules.map((moduleKey: string) => ({
      audit_id: audit.id,
      module_key: moduleKey,
      enabled: true,
    }))
    try {
      await db.from('audit_modules').insert(moduleRecords)
    } catch (err) {
      console.warn('Error inserting audit modules:', err)
    }

    // Update status to running
    await db.from('audits').update({ status: 'running' }).eq('id', audit.id)

    // Add to queue (same path real audits use)
    console.log(`[verify-audit] Adding audit ${audit.id} to queue`)
    const { error: queueError } = await db
      .from('audit_queue')
      .upsert({
        audit_id: audit.id,
        status: 'pending',
        retry_count: 0,
        last_error: null,
        created_at: new Date().toISOString(),
      }, { onConflict: 'audit_id' })

    if (queueError) {
      console.warn('[verify-audit] Queue insert failed, falling back to direct processing:', queueError)
      processAudit(audit.id).catch(err => {
        console.error('[verify-audit] Direct processing fallback failed:', err)
      })
    }

    return NextResponse.json({
      success: true,
      auditId: audit.id,
      reportUrl: `${request.nextUrl.origin}/report/${audit.id}`,
      url,
      email,
      modules: defaultModules,
      message: 'Verification audit created and processing started',
    })
  } catch (error) {
    console.error('[verify-audit] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
