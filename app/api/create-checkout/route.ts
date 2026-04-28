import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'
import { getSupabaseServiceClient } from '@/lib/supabase'
import { PRICING_CONFIG, ModuleKey } from '@/lib/types'
import { createAuditSchema } from '@/lib/validate-input'
import { rateLimit, getClientId } from '@/lib/rate-limit'
import { normalizeUrl } from '@/lib/normalize-url'
import { checkUrlReachable } from '@/lib/check-url-reachable'

// Force dynamic rendering - this route cannot be statically analyzed
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 requests per minute per IP
    const clientId = getClientId(request)
    const rateLimitResult = rateLimit(`checkout:${clientId}`, 10, 60000)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests',
          message: 'Please wait a moment before trying again',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      )
    }
    
    const body = await request.json()
    
    // Validate input with Zod
    const validationResult = createAuditSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input',
          details: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }
    
    const { url, email, name, modules, competitorUrl, marketingConsent } = validationResult.data

    // Normalize main URL - add https:// and lowercase domain
    const normalizedUrl = normalizeUrl(url)

    // Normalize competitor URL if provided
    let normalizedCompetitorUrl: string | undefined = undefined
    if (competitorUrl && competitorUrl.trim()) {
      normalizedCompetitorUrl = normalizeUrl(competitorUrl)
    }

    // Check that we can reach the site (try normalized URL and www / non-www variant)
    const reachable = await checkUrlReachable(normalizedUrl)
    if (!reachable.ok) {
      return NextResponse.json(
        { error: 'URL not reachable', message: reachable.message },
        { status: 400 }
      )
    }
    // Use the URL that worked (e.g. www vs non-www) for the audit
    const urlForAudit = reachable.url

    let db
    try {
      db = getSupabaseServiceClient()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('create-checkout: Supabase service client init failed:', msg)
      return NextResponse.json(
        { error: 'Server configuration error', message: 'Database is not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 503 }
      )
    }

    // Resolve customer and whether this checkout is the first (free) report for this email
    const { data: existingCustomer } = await db
      .from('customers')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    let priorAuditCount = 0
    if (existingCustomer?.id) {
      const { count } = await db
        .from('audits')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', existingCustomer.id)
      priorAuditCount = count ?? 0
    }

    const isFirstReport = priorAuditCount === 0

    if (isFirstReport && marketingConsent !== true) {
      return NextResponse.json(
        {
          error: 'Marketing consent required',
          message:
            'To receive your free report you must agree to receive a short follow-up email about your report and optional marketing email from SEO CheckSite.',
        },
        { status: 400 }
      )
    }

    const customerUpsert: Record<string, unknown> = {
      email,
      name: name || null,
    }
    if (isFirstReport && marketingConsent === true) {
      customerUpsert.marketing_consent_at = new Date().toISOString()
    }

    const { data: customer, error: customerError } = await db
      .from('customers')
      .upsert(customerUpsert, { onConflict: 'email', ignoreDuplicates: false })
      .select()
      .single()

    if (customerError || !customer) {
      console.error('create-checkout: Failed to create/get customer:', customerError?.message, customerError?.code)
      const detail = process.env.NODE_ENV === 'development' ? customerError?.message : undefined
      return NextResponse.json(
        { error: 'Failed to create customer', ...(detail && { details: detail }) },
        { status: 500 }
      )
    }

    // Calculate total price: $0 for first (teaser) report, else $14.99 base + add-ons
    let totalCents = isFirstReport ? 0 : PRICING_CONFIG.basePrice
    if (!isFirstReport) {
      modules.forEach((module: ModuleKey) => {
        if (module === 'competitor_overview') {
          if (normalizedCompetitorUrl && normalizedCompetitorUrl.trim()) {
            totalCents += PRICING_CONFIG.modules[module] || 0
          }
        } else {
          totalCents += PRICING_CONFIG.modules[module] || 0
        }
      })
    }

    // Check for recent duplicate audit (same URL + customer within last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: recentAudit } = await db
      .from('audits')
      .select('id, created_at, status')
      .eq('customer_id', customer.id)
      .eq('url', urlForAudit)
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (recentAudit) {
      const ageMinutes = Math.round((Date.now() - new Date(recentAudit.created_at).getTime()) / 1000 / 60)
      return NextResponse.json(
        { 
          error: 'Duplicate audit',
          message: `An audit for this URL was created ${ageMinutes} minute(s) ago. Please wait before creating another audit.`,
          existingAuditId: recentAudit.id,
        },
        { status: 409 } // Conflict
      )
    }

    // Create audit record
    // Store competitor URL in raw_result_json as metadata for now
    const auditMetadata = normalizedCompetitorUrl ? { competitorUrl: normalizedCompetitorUrl } : {}
    
    const { data: audit, error: auditError } = await db
      .from('audits')
      .insert({
        customer_id: customer.id,
        url: urlForAudit,
        status: 'pending',
        total_price_cents: totalCents,
        raw_result_json: Object.keys(auditMetadata).length > 0 ? auditMetadata : null,
      })
      .select()
      .single()

    if (auditError || !audit) {
      return NextResponse.json(
        { error: 'Failed to create audit' },
        { status: 500 }
      )
    }

    // Create audit module records
    const moduleRecords = modules.map((moduleKey: ModuleKey) => ({
      audit_id: audit.id,
      module_key: moduleKey,
      enabled: true,
    }))

    const { error: modulesError } = await db
      .from('audit_modules')
      .insert(moduleRecords)

    if (modulesError) {
      console.error('Error creating audit modules:', modulesError)
      // Continue anyway - modules can be added later
    }

    // Bypass payment: first free report per email, or test email
    const TEST_EMAILS = ['mreoch82@hotmail.com']
    const isTestEmail = TEST_EMAILS.includes(email.toLowerCase())
    const isFreeFirstReport = totalCents === 0

    if (isTestEmail || isFreeFirstReport) {
      if (isFreeFirstReport) console.log(`First free report for ${email} – adding to queue`)
      else console.log(`TEST MODE: Bypassing payment for ${email}`)
      
      // Update audit status to running
      await db
        .from('audits')
        .update({ status: 'running' })
        .eq('id', audit.id)
      
      // Add to queue instead of processing directly (avoids Netlify timeout)
      // CRITICAL: When upserting, we need to reset created_at if the entry already existed
      // Otherwise, old entries will be reused with old timestamps
      const { data: queueResult, error: queueError } = await db
        .from('audit_queue')
        .upsert({
          audit_id: audit.id,
          status: 'pending',
          retry_count: 0,
          last_error: null,
          created_at: new Date().toISOString(), // Reset created_at to now when upserting
        }, {
          onConflict: 'audit_id',
        })
        .select()
      
      if (queueError) {
        console.error(`❌ Error adding audit ${audit.id} to queue:`, queueError)
        console.error('Queue error details:', JSON.stringify(queueError, null, 2))
      } else {
        console.log(`✅ Test audit ${audit.id} added to queue - will be processed by queue worker`)
        if (queueResult && queueResult.length > 0) {
          console.log(`   Queue entry ID: ${queueResult[0].id}, Status: ${queueResult[0].status}`)
        }
        
        // Verify the queue entry was actually created
        const { data: verifyQueue, error: verifyError } = await db
          .from('audit_queue')
          .select('id, status, created_at')
          .eq('audit_id', audit.id)
          .single()
        
        if (verifyError || !verifyQueue) {
          console.error(`⚠️  WARNING: Queue entry verification failed for audit ${audit.id}:`, verifyError)
        } else {
          console.log(`   ✅ Verified queue entry exists: ID=${verifyQueue.id}, Status=${verifyQueue.status}, Created=${verifyQueue.created_at}`)
        }
      }
      
      // Return success URL directly (bypassing Stripe)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      return NextResponse.json({
        checkoutUrl: `${siteUrl}/success?audit_id=${audit.id}`,
        ...(isTestEmail && { testMode: true }),
      })
    }

    // Create Stripe checkout session
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const session = await createCheckoutSession(
      {
        auditId: audit.id,
        url: urlForAudit,
        email,
        selectedModules: modules,
        totalPriceCents: totalCents,
      },
      `${siteUrl}/success?audit_id=${audit.id}`,
      `${siteUrl}/recommend`
    )

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('create-checkout: Error', errorMessage, errorStack)
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage }),
      },
      { status: 500 }
    )
  }
}

