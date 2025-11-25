import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'
import { runAuditModules } from '@/lib/audit/modules'
import { generateReport } from '@/lib/llm'
import { sendAuditReportEmail, sendAuditFailureEmail } from '@/lib/resend'
import { ModuleKey } from '@/lib/types'

// Force dynamic rendering - webhooks must be dynamic
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const fetchCache = 'force-no-store'
export const revalidate = 0

function getStripe(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required')
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  })
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const auditId = session.metadata?.audit_id

    if (!auditId) {
      console.error('No audit_id in session metadata')
      return NextResponse.json({ received: true })
    }

    // Update audit status to running
    await supabase
      .from('audits')
      .update({ status: 'running' })
      .eq('id', auditId)

    // Start audit in background (don't await)
    console.log(`Starting audit processing for audit_id: ${auditId}`)
    processAudit(auditId).catch((error) => {
      console.error('Error processing audit:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))
    })
  }

  return NextResponse.json({ received: true })
}

async function processAudit(auditId: string) {
  try {
    console.log(`Processing audit ${auditId}`)
    
    // Get audit details
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('*, customers(*)')
      .eq('id', auditId)
      .single()

    if (auditError || !audit) {
      console.error('Audit not found:', auditError)
      throw new Error(`Audit not found: ${auditError?.message || 'Unknown error'}`)
    }

    console.log(`Found audit for URL: ${audit.url}, Customer: ${(audit.customers as any)?.email}`)

    // Get enabled modules
    const { data: modules, error: modulesError } = await supabase
      .from('audit_modules')
      .select('*')
      .eq('audit_id', auditId)
      .eq('enabled', true)

    if (modulesError || !modules) {
      throw new Error('Failed to fetch modules')
    }

    const enabledModules = modules.map(m => m.module_key as ModuleKey)
    console.log(`Running ${enabledModules.length} audit modules:`, enabledModules)

    // Run audit modules
    console.log('Starting audit module execution...')
    const results = await runAuditModules(audit.url, enabledModules)
    console.log(`Audit modules completed. Results: ${results.length} modules`)

    // Calculate overall score
    const overallScore = Math.round(
      results.reduce((sum, r) => sum + r.score, 0) / results.length
    )

    // Store raw results
    const auditResult = {
      url: audit.url,
      modules: results,
      overallScore,
    }

    await supabase
      .from('audits')
      .update({
        raw_result_json: auditResult,
      })
      .eq('id', auditId)

    // Update module scores
    for (const result of results) {
      await supabase
        .from('audit_modules')
        .update({
          raw_score: result.score,
          raw_issues_json: result.issues,
        })
        .eq('audit_id', auditId)
        .eq('module_key', result.moduleKey)
    }

    // Generate formatted report using DeepSeek
    console.log('Generating formatted report with DeepSeek...')
    const { html, plaintext } = await generateReport(auditResult)
    console.log('Report generated successfully')

    // Update audit with formatted report
    await supabase
      .from('audits')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        formatted_report_html: html,
        formatted_report_plaintext: plaintext,
      })
      .eq('id', auditId)

    // Send email via Resend (if domain verified)
    // Note: Stripe receipt email already includes the report link, so this is optional
    const customer = audit.customers as any
    try {
      console.log(`Attempting to send email to ${customer.email} for audit ${auditId}`)
      await sendAuditReportEmail(
        customer.email,
        audit.url,
        auditId,
        html
      )
      console.log(`Email sent successfully to ${customer.email}`)
    } catch (emailError) {
      console.error('Resend email failed (Stripe receipt email includes the report link):', emailError)
      // Don't fail the whole audit if Resend email fails
      // Stripe receipt email already includes the report link in the description
    }
  } catch (error) {
    console.error('Error processing audit:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')

    // Mark audit as failed
    await supabase
      .from('audits')
      .update({ status: 'failed' })
      .eq('id', auditId)

    // Send failure email
    try {
      const { data: audit } = await supabase
        .from('audits')
        .select('*, customers(*)')
        .eq('id', auditId)
        .single()

      if (audit) {
        const customer = audit.customers as any
        await sendAuditFailureEmail(customer.email, audit.url)
      }
    } catch (failureEmailError) {
      console.error('Error sending failure email:', failureEmailError)
    }
  }
}

