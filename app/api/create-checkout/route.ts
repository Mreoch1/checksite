import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { PRICING_CONFIG, ModuleKey } from '@/lib/types'
import { createAuditSchema } from '@/lib/validate-input'
import { rateLimit, getClientId } from '@/lib/rate-limit'

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
    
    const { url, email, name, modules } = validationResult.data

    // Validate URL
    let normalizedUrl = url
    if (!url.startsWith('http')) {
      normalizedUrl = `https://${url}`
    }

    // Calculate total price
    let totalCents = PRICING_CONFIG.basePrice
    modules.forEach((module: ModuleKey) => {
      totalCents += PRICING_CONFIG.modules[module] || 0
    })

    // Create or get customer
    let { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single()

    if (customerError || !customer) {
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          email,
          name: name || null,
        })
        .select()
        .single()

      if (createError || !newCustomer) {
        return NextResponse.json(
          { error: 'Failed to create customer' },
          { status: 500 }
        )
      }
      customer = newCustomer
    }

    // Create audit record
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .insert({
        customer_id: customer.id,
        url: normalizedUrl,
        status: 'pending',
        total_price_cents: totalCents,
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

    const { error: modulesError } = await supabase
      .from('audit_modules')
      .insert(moduleRecords)

    if (modulesError) {
      console.error('Error creating audit modules:', modulesError)
      // Continue anyway - modules can be added later
    }

    // Create Stripe checkout session
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const session = await createCheckoutSession(
      {
        auditId: audit.id,
        url: normalizedUrl,
        email,
        selectedModules: modules,
        totalPriceCents: totalCents,
      },
      `${siteUrl}/success?audit_id=${audit.id}`,
      `${siteUrl}/recommend`
    )

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    console.error('Error in create-checkout:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error details:', { errorMessage, errorStack })
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

