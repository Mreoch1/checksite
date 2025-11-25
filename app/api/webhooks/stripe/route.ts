import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { runAuditModules } from '@/lib/audit/modules'
import { generateReport } from '@/lib/llm'
import { sendAuditReportEmail, sendAuditFailureEmail } from '@/lib/resend'
import { ModuleKey } from '@/lib/types'

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
    processAudit(auditId).catch((error) => {
      console.error('Error processing audit:', error)
    })
  }

  return NextResponse.json({ received: true })
}

async function processAudit(auditId: string) {
  try {
    // Get audit details
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .select('*, customers(*)')
      .eq('id', auditId)
      .single()

    if (auditError || !audit) {
      throw new Error('Audit not found')
    }

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

    // Run audit modules
    const results = await runAuditModules(audit.url, enabledModules)

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
    const { html, plaintext } = await generateReport(auditResult)

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

    // Send email
    const customer = audit.customers as any
    await sendAuditReportEmail(
      customer.email,
      audit.url,
      auditId,
      html
    )
  } catch (error) {
    console.error('Error processing audit:', error)

    // Mark audit as failed
    await supabase
      .from('audits')
      .update({ status: 'failed' })
      .eq('id', auditId)

    // Send failure email
    const { data: audit } = await supabase
      .from('audits')
      .select('*, customers(*)')
      .eq('id', auditId)
      .single()

    if (audit) {
      const customer = audit.customers as any
      await sendAuditFailureEmail(customer.email, audit.url)
    }
  }
}

