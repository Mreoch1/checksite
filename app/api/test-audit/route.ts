import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { processAudit } from '@/lib/process-audit' // Used as fallback if queue fails
import { rateLimit, getClientId } from '@/lib/rate-limit'
import { requireAdminAuth } from '@/lib/middleware/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Require admin authentication to prevent unauthorized test audits
  const authError = requireAdminAuth(request)
  if (authError) return authError

  // Rate limiting: 5 requests per minute per IP (test endpoint)
  const clientId = getClientId(request)
  const rateLimitResult = rateLimit(`test-audit:${clientId}`, 5, 60000)
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: 'Too many requests',
        message: 'Please wait a moment before trying again',
      },
      { status: 429 }
    )
  }
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

    // Add to queue instead of processing directly (avoids Netlify timeout)
    // Use upsert to prevent duplicates if audit was already queued
    // CRITICAL: Reset created_at when upserting to ensure proper 5-minute delay
    console.log(`Adding audit ${audit.id} to processing queue`)
    const { error: queueError } = await supabase
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

    if (queueError) {
      console.error('Error adding audit to queue:', queueError)
      // Fallback: try direct processing if queue fails
      console.log('Falling back to direct processing...')
      processAudit(audit.id).catch(async (processError) => {
        console.error('Error processing audit:', processError)
      })
    } else {
      console.log(`✅ Audit ${audit.id} added to queue - will be processed by queue worker`)
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

