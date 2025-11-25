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
    console.log(`[processAudit] Starting audit ${auditId} at ${new Date().toISOString()}`)
    
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

    // Update status to generating_report
    await supabase
      .from('audits')
      .update({ status: 'generating_report' })
      .eq('id', auditId)
    
    // Generate formatted report using DeepSeek with timeout protection
    console.log('Generating formatted report with DeepSeek...')
    console.log(`Audit result has ${auditResult.modules.length} modules`)
    
    let html: string, plaintext: string
    try {
      const reportPromise = generateReport(auditResult)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Report generation timeout: Took longer than 4 minutes'))
        }, 240000) // 4 minutes total timeout
      })
      
      const result = await Promise.race([reportPromise, timeoutPromise])
      html = result.html
      plaintext = result.plaintext
      console.log('✅ Report generated successfully')
    } catch (reportError) {
      console.error('❌ Report generation failed:', reportError)
      console.error('Error details:', reportError instanceof Error ? reportError.message : String(reportError))
      throw new Error(`Report generation failed: ${reportError instanceof Error ? reportError.message : String(reportError)}`)
    }

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
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : 'No stack trace'
    const errorName = error instanceof Error ? error.name : 'Unknown'
    
    console.error(`[processAudit] ❌ Error processing audit ${auditId}:`)
    console.error(`[processAudit] Error name: ${errorName}`)
    console.error(`[processAudit] Error message: ${errorMessage}`)
    console.error(`[processAudit] Stack trace: ${errorStack}`)
    
    // Log full error details for debugging
    try {
      console.error(`[processAudit] Full error:`, JSON.stringify(error, Object.getOwnPropertyNames(error)))
    } catch (jsonError) {
      console.error(`[processAudit] Could not stringify error:`, jsonError)
    }

    // Store error details in database for retrieval
    const errorLog = JSON.stringify({
      errorName,
      errorMessage,
      errorStack: errorStack.substring(0, 5000), // Limit stack trace size
      timestamp: new Date().toISOString(),
    }, null, 2)

    // Mark audit as failed and store error log
    await supabase
      .from('audits')
      .update({ 
        status: 'failed',
        // Store error log (will work once migration is applied)
        // For now, we'll try to store it even if column doesn't exist
      })
      .eq('id', auditId)
    
    // Try to update error_log if column exists (graceful if it doesn't)
    try {
      await supabase.rpc('update_audit_error', {
        audit_id: auditId,
        error_log_text: errorLog
      }).catch(() => {
        // RPC doesn't exist, that's okay - we'll add migration
      })
    } catch {
      // Column doesn't exist yet, that's okay
    }

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

