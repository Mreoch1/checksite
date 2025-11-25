import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { PRICING_CONFIG, ModuleKey } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { url, email, name, modules } = await request.json()

    if (!url || !email || !Array.isArray(modules)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

