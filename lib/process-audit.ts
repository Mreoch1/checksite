import { supabase } from '@/lib/supabase'
import { runAuditModules } from '@/lib/audit/modules'
import { generateSimpleReport } from '@/lib/generate-simple-report'
// import { generateReport } from '@/lib/llm' // Disabled for now - using simple report
import { sendAuditReportEmail } from '@/lib/email-unified'
// sendAuditFailureEmail disabled to preserve Resend quota
import { ModuleKey } from '@/lib/types'

/**
 * Process an audit - runs modules, generates report, sends email
 * This function is used by both webhooks and Inngest
 */
export async function processAudit(auditId: string) {
  // Store audit data at function scope for error handling
  let audit: any = null
  let auditResult: any = null
  
  try {
    console.log(`[processAudit] Starting audit ${auditId} at ${new Date().toISOString()}`)
    
    // Get audit details
    const { data: auditData, error: auditError } = await supabase
      .from('audits')
      .select('*, customers(*)')
      .eq('id', auditId)
      .single()

    if (auditError || !auditData) {
      console.error('Audit not found:', auditError)
      throw new Error(`Audit not found: ${auditError?.message || 'Unknown error'}`)
    }

    audit = auditData
    console.log(`Found audit for URL: ${audit.url}, Customer: ${(audit.customers as any)?.email}`)

    // Get enabled modules
    const { data: modules, error: modulesError } = await supabase
      .from('audit_modules')
      .select('*')
      .eq('audit_id', auditId)
      .eq('enabled', true)

    if (modulesError) {
      console.error('Error fetching modules:', modulesError)
      throw new Error(`Failed to fetch modules: ${modulesError.message}`)
    }

    if (!modules || modules.length === 0) {
      console.error('No modules found for audit:', auditId)
      throw new Error('No enabled modules found for this audit')
    }

    const enabledModules = modules.map(m => m.module_key as ModuleKey)
    console.log(`Running ${enabledModules.length} audit modules:`, enabledModules)
    
    if (enabledModules.length === 0) {
      throw new Error('No enabled modules to run')
    }

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
    // Get H1 text - handle multiple H1s by joining with space
    const h1Elements = siteData.$('h1')
    let h1Text: string | null = null
    if (h1Elements.length > 0) {
      const h1Texts: string[] = []
      h1Elements.each((_, el) => {
        const text = siteData.$(el).text().trim()
        if (text) h1Texts.push(text)
      })
      h1Text = h1Texts.join(' ') || null
    }
    const h1Count = siteData.$('h1').length
    const h2Count = siteData.$('h2').length
    const textContent = siteData.$('body').text().replace(/\s+/g, ' ').trim()
    const wordCount = textContent.split(' ').filter(w => w.length > 0).length
    // Count images - include both img tags and Next.js Image components (which may use different attributes)
    const images = siteData.$('img')
    const nextImages = siteData.$('[data-next-image], [class*="next-image"]') // Next.js Image components
    const allImageElements = images.length + nextImages.length
    let missingAltCount = 0
    images.each((_, el) => {
      const alt = siteData.$(el).attr('alt')
      const src = siteData.$(el).attr('src')
      // Also check for Next.js Image alt attribute
      const nextAlt = siteData.$(el).attr('data-alt') || siteData.$(el).attr('aria-label')
      if (src && !src.startsWith('data:') && alt === undefined && !nextAlt) {
        missingAltCount++
      }
    })
    // Check Next.js images too
    nextImages.each((_, el) => {
      const alt = siteData.$(el).attr('alt') || siteData.$(el).attr('data-alt') || siteData.$(el).attr('aria-label')
      if (!alt) {
        missingAltCount++
      }
    })
    const totalImages = allImageElements || images.length // Use combined count or fallback to img tags
    
    // Safely extract hostname for link counting
    let hostname = ''
    try {
      hostname = new URL(siteData.url).hostname
    } catch (urlError) {
      console.warn('Invalid URL for link counting:', siteData.url, urlError)
      hostname = ''
    }
    
    const internalLinks = hostname 
      ? siteData.$('a[href^="/"], a[href*="' + hostname + '"]').length
      : siteData.$('a[href^="/"]').length
    const externalLinks = hostname
      ? siteData.$('a[href^="http"]').not(`a[href*="${hostname}"]`).length
      : siteData.$('a[href^="http"]').length

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
    auditResult = {
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
    console.log(`Updating module scores for ${results.length} modules...`)
    for (const result of results) {
      try {
        const { error: moduleUpdateError } = await supabase
          .from('audit_modules')
          .update({
            raw_score: result.score,
            raw_issues_json: result.issues,
          })
          .eq('audit_id', auditId)
          .eq('module_key', result.moduleKey)
        
        if (moduleUpdateError) {
          console.error(`Error updating module ${result.moduleKey}:`, moduleUpdateError)
          // Continue with other modules, but log the error
        }
      } catch (moduleError) {
        console.error(`Exception updating module ${result.moduleKey}:`, moduleError)
        // Continue with other modules
      }
    }
    console.log('✅ Module scores updated')

          // Keep status as 'running' while generating report
          // (Database constraint only allows: pending, running, completed, failed)
          console.log('Generating report (status remains: running)...')
    
    // Generate formatted report using simple script-based generator (no LLM for now)
    console.log('Generating formatted report (simple script-based)...')
    console.log(`Audit result has ${auditResult.modules.length} modules`)
    
    let html: string, plaintext: string
    try {
      const result = generateSimpleReport({
        url: audit.url,
        pageAnalysis,
        modules: results,
        overallScore,
      })
      html = result.html
      plaintext = result.plaintext
      console.log('✅ Report generated successfully')
    } catch (reportError) {
      console.error('❌ Report generation failed:', reportError)
      console.error('Error details:', reportError instanceof Error ? reportError.message : String(reportError))
      throw new Error(`Report generation failed: ${reportError instanceof Error ? reportError.message : String(reportError)}`)
    }

    // Update audit with formatted report
    console.log('Updating audit with formatted report...')
    const { error: reportUpdateError } = await supabase
      .from('audits')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        formatted_report_html: html,
        formatted_report_plaintext: plaintext,
      })
      .eq('id', auditId)
    
    if (reportUpdateError) {
      console.error('Error updating audit with report:', reportUpdateError)
      throw new Error(`Failed to update audit with report: ${reportUpdateError.message}`)
    }
    console.log('✅ Audit updated with formatted report')

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
      // Log email failure but don't fail the audit - report is still available via URL
      // The audit is marked as completed, customer can access report via link
      console.warn('⚠️  Audit completed but email failed. Report is available at /report/' + auditId)
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
    // Include full error details to help diagnose issues
    const errorLog = JSON.stringify({
      errorName,
      errorMessage,
      errorStack: errorStack ? errorStack.substring(0, 5000) : 'No stack trace', // Limit stack trace size
      timestamp: new Date().toISOString(),
      auditId,
      url: audit?.url,
      stage: 'processAudit',
      // Include additional context
      hasRawResults: !!audit?.raw_result_json,
      hasFormattedReport: !!audit?.formatted_report_html,
      moduleCount: auditResult?.modules?.length || 0,
    }, null, 2)

    // Mark audit as failed and store error log
    // Try to include error_log - will work once migration is applied
    try {
      const { error: updateError } = await supabase
        .from('audits')
        .update({ 
          status: 'failed',
          error_log: errorLog,
        } as any) // Type assertion since column might not exist yet
        .eq('id', auditId)
      
      if (updateError) {
        console.error('Could not store error_log (column may not exist):', updateError)
        // Try without error_log if column doesn't exist
        const { error: statusError } = await supabase
          .from('audits')
          .update({ status: 'failed' })
          .eq('id', auditId)
        
        if (statusError) {
          console.error('Could not update audit status at all:', statusError)
        }
      } else {
        console.log('✅ Audit marked as failed with error log')
      }
    } catch (updateError) {
      // If error_log column doesn't exist, just update status
      console.error('Exception updating audit status:', updateError)
      try {
        const { error: statusError } = await supabase
          .from('audits')
          .update({ status: 'failed' })
          .eq('id', auditId)
        
        if (statusError) {
          console.error('Could not update audit status:', statusError)
        }
      } catch (statusException) {
        console.error('Exception updating audit status:', statusException)
      }
    }

          // Send failure email - DISABLED to preserve Resend quota
          // Uncomment below to re-enable failure emails
          /*
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
          */
          console.log('⚠️  Failure email disabled to preserve Resend quota')
  }
}

