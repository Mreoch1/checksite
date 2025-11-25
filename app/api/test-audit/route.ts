import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { processAudit } from '@/app/api/webhooks/stripe/route'
import { inngest } from '@/lib/inngest'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { url = 'https://seoauditpro.net', email = 'Mreoch82@hotmail.com', modules } = await request.json()

    // Get or create customer
    let { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single()

    if (customerError || !customer) {
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({ email, name: 'Test User' })
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

    // Default modules if not provided
    const defaultModules = ['performance', 'crawl_health', 'on_page', 'mobile']
    const selectedModules = modules || defaultModules

    // Create audit
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .insert({
        customer_id: customer.id,
        url,
        status: 'pending',
        total_price_cents: 1999,
      })
      .select()
      .single()

    if (auditError || !audit) {
      return NextResponse.json(
        { error: 'Failed to create audit', details: auditError?.message },
        { status: 500 }
      )
    }

    // Create audit modules
    const moduleRecords = selectedModules.map((moduleKey: string) => ({
      audit_id: audit.id,
      module_key: moduleKey,
      enabled: true,
    }))

    const { error: modulesError } = await supabase
      .from('audit_modules')
      .insert(moduleRecords)

    if (modulesError) {
      console.error('Error creating audit modules:', modulesError)
    }

    // Update status to running
    await supabase
      .from('audits')
      .update({ status: 'running' })
      .eq('id', audit.id)

    // Trigger Inngest function for background processing
    console.log(`Triggering Inngest function for test audit: ${audit.id}`)
    
    try {
      await inngest.send({
        name: 'audit/process',
        data: { auditId: audit.id },
      })
      console.log(`✅ Inngest event sent for audit ${audit.id}`)
    } catch (error) {
      console.error('❌ Failed to send Inngest event:', error)
      // Fallback to direct processing if Inngest fails
      console.log('Falling back to direct processing...')
      processAudit(audit.id).catch(async (processError) => {
        console.error('Error processing test audit:', processError)
        await supabase
          .from('audits')
          .update({ status: 'failed' })
          .eq('id', audit.id)
      })
    }

    return NextResponse.json({
      success: true,
      auditId: audit.id,
      url,
      email,
      modules: selectedModules,
      message: 'Test audit created and processing started',
    })
  } catch (error) {
    console.error('Error in test-audit:', error)
    return NextResponse.json(
      {
        error: 'Failed to create test audit',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

