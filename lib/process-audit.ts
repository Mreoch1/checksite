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
    let results, siteData
    try {
      const moduleResult = await runAuditModules(audit.url, enabledModules)
      results = moduleResult.results
      siteData = moduleResult.siteData
      console.log(`Audit modules completed. Results: ${results.length} modules`)
    } catch (moduleError) {
      console.error('❌ Error running audit modules:', moduleError)
      console.error('Module error details:', moduleError instanceof Error ? moduleError.message : String(moduleError))
      throw new Error(`Failed to run audit modules: ${moduleError instanceof Error ? moduleError.message : String(moduleError)}`)
    }

    // Calculate overall score
    if (!results || results.length === 0) {
      throw new Error('No audit results returned from modules')
    }
    const overallScore = Math.round(
      results.reduce((sum, r) => sum + r.score, 0) / results.length
    )
    console.log(`Overall score calculated: ${overallScore}`)

    // Collect detailed page-level analysis
    const h1Text = siteData.$('h1').first().text().trim() || null
    const h1Count = siteData.$('h1').length
    const h2Count = siteData.$('h2').length
    const textContent = siteData.$('body').text().replace(/\s+/g, ' ').trim()
    const wordCount = textContent.split(' ').filter(w => w.length > 0).length
    const images = siteData.$('img')
    let missingAltCount = 0
    images.each((_, el) => {
      const alt = siteData.$(el).attr('alt')
      const src = siteData.$(el).attr('src')
      if (src && !src.startsWith('data:') && alt === undefined) {
        missingAltCount++
      }
    })
    const totalImages = images.length
    const internalLinks = siteData.$('a[href^="/"], a[href*="' + new URL(siteData.url).hostname + '"]').length
    const externalLinks = siteData.$('a[href^="http"]').not(`a[href*="${new URL(siteData.url).hostname}"]`).length

    const pageAnalysis = {
      url: audit.url,
      finalUrl: siteData.finalUrl || audit.url,
      httpStatus: siteData.httpStatus || 200,
      contentType: siteData.contentType || 'unknown',
      pageSize: siteData.contentLength ? `${(siteData.contentLength / 1024).toFixed(1)} KB` : null,
      hasRedirect: siteData.finalUrl !== audit.url && !!siteData.finalUrl ? true : false,
      isHttps: audit.url.startsWith('https://'),
      title: siteData.title || null,
      metaDescription: siteData.description || null,
      h1Text: h1Text,
      h1Count: h1Count,
      h2Count: h2Count,
      wordCount: wordCount,
      totalImages: totalImages,
      missingAltText: missingAltCount,
      internalLinks: internalLinks,
      externalLinks: externalLinks,
      isIndexable: true, // Default to true, can be enhanced with robots meta check
    }

    // Store raw results
    const auditResult = {
      url: audit.url,
      pageAnalysis,
      modules: results,
      overallScore,
    }

    console.log(`Storing raw results for audit ${auditId}...`)
    try {
      const { error: updateError } = await supabase
        .from('audits')
        .update({
          raw_result_json: auditResult,
        })
        .eq('id', auditId)
      
      if (updateError) {
        console.error('Error storing raw results:', updateError)
        throw new Error(`Failed to store raw results: ${updateError.message}`)
      }
      console.log('✅ Raw results stored successfully')
    } catch (storeError) {
      console.error('❌ Error storing raw results:', storeError)
      throw storeError
    }

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
      errorStack: errorStack ? errorStack.substring(0, 5000) : 'No stack trace', // Limit stack trace size
      timestamp: new Date().toISOString(),
    }, null, 2)

    // Mark audit as failed and store error log
    // Try to include error_log - will work once migration is applied
    try {
      await supabase
        .from('audits')
        .update({ 
          status: 'failed',
          error_log: errorLog,
        } as any) // Type assertion since column might not exist yet
        .eq('id', auditId)
    } catch (updateError) {
      // If error_log column doesn't exist, just update status
      console.error('Could not store error_log (column may not exist):', updateError)
      await supabase
        .from('audits')
        .update({ status: 'failed' })
        .eq('id', auditId)
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

