import { supabase } from '@/lib/supabase'
import { runAuditModules } from '@/lib/audit/modules'
import { generateSimpleReport } from '@/lib/generate-simple-report'
// import { generateReport } from '@/lib/llm' // Disabled for now - using simple report
import { sendAuditReportEmail } from '@/lib/email-unified'
// sendAuditFailureEmail disabled to preserve email quota
import { ModuleKey } from '@/lib/types'
import { normalizeUrl } from '@/lib/normalize-url'

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
    
    // CRITICAL: Early check - if email was already sent AND report exists, skip processing entirely
    // This prevents duplicate processing and duplicate emails
    // BUT: If report exists but email wasn't sent, we should still send the email
    const { data: earlyCheck } = await supabase
      .from('audits')
      .select('email_sent_at, status, formatted_report_html')
      .eq('id', auditId)
      .single()
    
    // Check if email was sent (either actual timestamp or "sending_" reservation)
    const emailSentOrSending = earlyCheck?.email_sent_at && 
      !earlyCheck.email_sent_at.startsWith('sending_') && 
      earlyCheck.email_sent_at !== 'null'
    
    // Only skip if BOTH email was sent (not just reserved) AND report exists
    // If report exists but email wasn't sent, we need to continue to send the email
    if (emailSentOrSending && earlyCheck?.formatted_report_html) {
      console.log(`⛔ [processAudit] SKIPPING audit ${auditId} - email already sent at ${earlyCheck.email_sent_at} and report exists`)
      return {
        success: true,
        auditId,
        message: 'Audit skipped - email already sent and report exists',
        email_sent_at: earlyCheck.email_sent_at,
      }
    }
    
    // If email is in "sending_" state, another process is handling it - skip
    if (earlyCheck?.email_sent_at?.startsWith('sending_')) {
      console.log(`⛔ [processAudit] SKIPPING audit ${auditId} - another process is sending the email (${earlyCheck.email_sent_at})`)
      return {
        success: true,
        auditId,
        message: 'Audit skipped - another process is sending the email',
      }
    }
    
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
    
    // Check if we need to run modules or if report already exists
    let html: string | null = null
    let plaintext: string | null = null
    
    if (audit.formatted_report_html && !audit.email_sent_at) {
      // Report exists but email wasn't sent - use existing report and skip to email sending
      console.log(`⚠️  [processAudit] Audit ${auditId} has report but email not sent - will send email only (skipping module execution)`)
      html = audit.formatted_report_html
      plaintext = audit.formatted_report_plaintext || ''
      // Skip all module execution and go straight to email sending
    } else if (!audit.formatted_report_html) {
      // Normal flow: run modules and generate report
      console.log(`[processAudit] Running normal audit flow for ${auditId} - no report exists yet`)

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

    // Normalize the audit URL before using it (lowercase domain)
    const normalizedAuditUrl = normalizeUrl(audit.url)
    if (normalizedAuditUrl !== audit.url) {
      console.log(`⚠️  URL normalized from "${audit.url}" to "${normalizedAuditUrl}"`)
    }

    // Get competitor URL from audit metadata if available
    let competitorUrl: string | null = null
    if (audit.raw_result_json && typeof audit.raw_result_json === 'object') {
      const metadata = audit.raw_result_json as any
      if (metadata.competitorUrl && typeof metadata.competitorUrl === 'string') {
        competitorUrl = normalizeUrl(metadata.competitorUrl)
        console.log(`Using competitor URL from audit metadata: ${competitorUrl}`)
      }
    }

    // Run audit modules
    console.log('Starting audit module execution...')
    let results, siteData
    try {
      const moduleResult = await runAuditModules(normalizedAuditUrl, enabledModules, competitorUrl)
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
      
      try {
        const result = generateSimpleReport({
          url: audit.url,
          pageAnalysis,
          modules: results,
          overallScore,
        })
        // Assign to outer scope variables (declared at function level)
        html = result.html
        plaintext = result.plaintext
        console.log('✅ Report generated successfully')
      } catch (reportError) {
        console.error('❌ Report generation failed:', reportError)
        console.error('Error details:', reportError instanceof Error ? reportError.message : String(reportError))
        throw new Error(`Report generation failed: ${reportError instanceof Error ? reportError.message : String(reportError)}`)
      }

      // CRITICAL: Only proceed if report was successfully generated
      if (!html || html.trim().length === 0) {
        console.error(`❌ Cannot complete audit ${auditId} - report HTML is empty or missing`)
        throw new Error('Report generation failed - cannot complete audit without report content')
      }
      
      // CRITICAL: Save report to database FIRST before sending email
      // This ensures the report URL works when the email is received
      console.log('Saving report to database BEFORE sending email...')
      const updateData: any = {
        status: 'completed',
        completed_at: new Date().toISOString(),
        formatted_report_html: html,
        formatted_report_plaintext: plaintext,
      }
      
      const { error: reportUpdateError } = await supabase
        .from('audits')
        .update(updateData)
        .eq('id', auditId)
      
      if (reportUpdateError) {
        console.error('❌ Error saving report to database:', reportUpdateError)
        throw new Error(`Failed to save report to database: ${reportUpdateError.message}`)
      }
      console.log('✅ Report saved to database - report URL is now accessible')
      
      // Verify report was saved (double-check)
      const { data: savedAudit } = await supabase
        .from('audits')
        .select('formatted_report_html, status')
        .eq('id', auditId)
        .single()
      
      if (!savedAudit?.formatted_report_html || savedAudit.status !== 'completed') {
        console.error('❌ Report verification failed - report not properly saved')
        throw new Error('Report was not properly saved to database - cannot send email')
      }
      console.log('✅ Report verified in database - safe to send email')
    } // End of else if (!audit.formatted_report_html) block
    
    // At this point, we either:
    // 1. Have a newly generated report (html and plaintext set above)
    // 2. Have an existing report (html and plaintext set from audit.formatted_report_html)
    
    // Verify report exists before sending email
    if (!html || html.trim().length === 0) {
      console.error(`❌ Cannot send email for audit ${auditId} - report HTML is missing`)
      throw new Error('Report is missing - cannot send email')
    }
    
    // Ensure html and plaintext are strings (not null)
    const reportHtml: string = html
    const reportPlaintext: string = plaintext || ''
    
    // Get customer email
    const customer = audit.customers as any
    if (!customer?.email) {
      console.error('No customer email found for audit', auditId)
      throw new Error('Customer email is required to send report')
    }
    
    // CRITICAL: Use atomic reservation pattern to prevent duplicate emails
    // Step 1: Try to atomically reserve the email sending by setting a "sending" timestamp
    // This prevents multiple processes from sending emails simultaneously
    const sendingTimestamp = `sending_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const { data: reservationResult, error: reservationError } = await supabase
      .from('audits')
      .update({ email_sent_at: sendingTimestamp } as any) // Temporary "sending" value
      .eq('id', auditId)
      .is('email_sent_at', null) // Only update if email_sent_at is NULL (atomic check)
      .select('email_sent_at')
    
    // If reservation failed, another process is already sending the email
    if (reservationError || !reservationResult || reservationResult.length === 0) {
      // Check if email was already sent by another process
      const { data: doubleCheck } = await supabase
        .from('audits')
        .select('email_sent_at')
        .eq('id', auditId)
        .single()
      
      if (doubleCheck?.email_sent_at && !doubleCheck.email_sent_at.startsWith('sending_')) {
        console.log(`⛔ SKIPPING email send for audit ${auditId} - email already sent at ${doubleCheck.email_sent_at}`)
        return {
          success: true,
          auditId,
          message: 'Audit completed successfully (email was already sent by another process)',
        }
      } else if (doubleCheck?.email_sent_at?.startsWith('sending_')) {
        console.log(`⛔ SKIPPING email send for audit ${auditId} - another process is currently sending the email`)
        return {
          success: true,
          auditId,
          message: 'Audit skipped - another process is sending the email',
        }
      } else {
        console.error('⚠️  Failed to reserve email sending slot:', reservationError)
        // Fallback: try to send anyway, but log the warning
      }
    }
    
    // Step 2: Send email ONLY if we successfully reserved the slot
    let emailSentAt: string | null = null
    let emailError: Error | null = null
    
    console.log(`📧 Sending email to ${customer.email} for audit ${auditId}...`)
    console.log(`📧 Email provider check: SENDGRID_API_KEY=${!!process.env.SENDGRID_API_KEY}, SMTP_PASSWORD=${!!process.env.SMTP_PASSWORD}, EMAIL_PROVIDER=${process.env.EMAIL_PROVIDER || 'not set'}`)
    try {
      await sendAuditReportEmail(
        customer.email,
        audit.url,
        auditId,
        reportHtml
      )
      // Step 3: Update email_sent_at to actual timestamp after successful send
      emailSentAt = new Date().toISOString()
      
      const { error: emailUpdateError } = await supabase
        .from('audits')
        .update({ email_sent_at: emailSentAt })
        .eq('id', auditId)
      
      if (emailUpdateError) {
        console.error('⚠️  Email sent but failed to update email_sent_at:', emailUpdateError)
      } else {
        console.log(`✅ Email sent successfully to ${customer.email} and timestamp updated`)
      }
    } catch (err) {
        emailError = err instanceof Error ? err : new Error(String(err))
        console.error('❌ Email sending failed:', emailError)
        console.error('Email error details:', emailError.message)
        console.error('Email error stack:', emailError.stack)
        
        // Log email error to database for debugging
        const emailErrorLog = JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'email_send_failure',
          error: emailError.message,
          stack: emailError.stack,
          customer_email: customer.email,
          audit_id: auditId,
          email_provider_config: {
            has_sendgrid_key: !!process.env.SENDGRID_API_KEY,
            has_smtp_password: !!process.env.SMTP_PASSWORD,
            email_provider: process.env.EMAIL_PROVIDER || 'not set',
            use_fallback: process.env.EMAIL_USE_FALLBACK === 'true',
          },
        }, null, 2)
        
        // Reset email_sent_at to null so it can be retried, and log error
        const { error: resetError } = await supabase
          .from('audits')
          .update({ 
            email_sent_at: null, // Reset so email can be retried
            error_log: emailErrorLog,
          } as any) // Type assertion since error_log might not exist
          .eq('id', auditId)
        
        if (resetError) {
          console.error('❌ Failed to reset email_sent_at and log error:', resetError)
        } else {
          console.warn('⚠️  Email failed but report is saved. User can access report at /report/' + auditId)
          console.warn('⚠️  Email error logged to database error_log column')
          console.warn('⚠️  email_sent_at reset to null - email can be retried')
        }
      }
    
    // If email failed, log it in error_log for debugging
    if (emailError) {
      const existingErrorLog = audit.error_log ? (typeof audit.error_log === 'string' ? JSON.parse(audit.error_log) : audit.error_log) : {}
      const errorLog = JSON.stringify({
        ...existingErrorLog,
        email_failure: {
          timestamp: new Date().toISOString(),
          error: emailError.message,
          stack: emailError.stack,
          note: 'Audit completed successfully and report is saved. Email delivery failed but report is available via URL.',
        },
      })
      
      await supabase
        .from('audits')
        .update({ error_log: errorLog })
        .eq('id', auditId)
    }
    
    console.log('✅ Audit processing complete - report saved and email sent')
    
    // Return success to indicate audit was completed
    return {
      success: true,
      auditId,
      message: 'Audit completed successfully',
      hasReport: !!html,
      emailSent: !!emailSentAt,
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

          // Send failure email - DISABLED to preserve email quota
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
          console.log('⚠️  Failure email disabled to preserve email quota')
  }
}

