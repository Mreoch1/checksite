import { supabase } from '@/lib/supabase'
import { runAuditModules } from '@/lib/audit/modules'
import { generateReport } from '@/lib/llm'
import { sendAuditReportEmail, sendAuditFailureEmail } from '@/lib/email-unified'
import { ModuleKey } from '@/lib/types'

/**
 * Process an audit - runs modules, generates report, sends email
 * This function is used by both webhooks and Inngest
 */
export async function processAudit(auditId: string) {
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

    // Generate formatted report using DeepSeek with timeout protection
    console.log('Generating formatted report with DeepSeek...')
    const reportPromise = generateReport(auditResult)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Report generation timeout: Took longer than 4 minutes'))
      }, 240000) // 4 minutes total timeout
    })
    
    const { html, plaintext } = await Promise.race([reportPromise, timeoutPromise])
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

    // Send email - REQUIRED for customer to receive report
    const customer = audit.customers as any
    if (!customer?.email) {
      console.error('No customer email found for audit', auditId)
      throw new Error('Customer email is required to send report')
    }
    
    console.log(`📧 Attempting to send email to ${customer.email} for audit ${auditId}`)
    try {
      await sendAuditReportEmail(
        customer.email,
        audit.url,
        auditId,
        html
      )
      console.log(`✅ Email sent successfully to ${customer.email}`)
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError)
      console.error('Email error details:', emailError instanceof Error ? emailError.message : String(emailError))
      // Email is required - mark audit as failed if email fails
      throw new Error(`Failed to send email: ${emailError instanceof Error ? emailError.message : String(emailError)}`)
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

