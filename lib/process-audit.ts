import { supabase } from '@/lib/supabase'
import { runAuditModules } from '@/lib/audit/modules'
import { generateSimpleReport } from '@/lib/generate-simple-report'
// import { generateReport } from '@/lib/llm' // Disabled for now - using simple report
import { sendAuditReportEmail } from '@/lib/email-unified'
// sendAuditFailureEmail disabled to preserve email quota
import { ModuleKey } from '@/lib/types'
import { normalizeUrl } from '@/lib/normalize-url'
import { isEmailSent, isEmailSending, isEmailReservationAbandoned, getEmailSentAtAge } from '@/lib/email-status'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Process an audit - runs modules, generates report, sends email
 * This function is used by both webhooks and Inngest
 * 
 * @param auditId - The audit ID to process
 * @param serviceClient - Optional service role client for fresh reads from primary database
 *                        If not provided, uses anon client (may have replication lag)
 */
export async function processAudit(auditId: string, serviceClient?: SupabaseClient) {
  // Use service client if provided, otherwise fall back to anon client
  // CRITICAL: Service client reads from primary DB, avoiding replication lag
  const db = serviceClient || supabase
  // Store audit data at function scope for error handling
  let audit: any = null
  let auditResult: any = null
  
  try {
    console.log(`[processAudit] Starting audit ${auditId} at ${new Date().toISOString()}`)
    
    // CRITICAL: Early check - if email was already sent AND report exists, skip processing entirely
    // This prevents duplicate processing and duplicate emails
    // BUT: If report exists but email wasn't sent, we should still send the email
    // Use service client for fresh read from primary database
    const { data: earlyCheck } = await db
      .from('audits')
      .select('email_sent_at, status, formatted_report_html')
      .eq('id', auditId)
      .single()
    
    // Check if email was sent (not a reservation)
    const emailSent = isEmailSent(earlyCheck?.email_sent_at)
    
    // Only skip if BOTH email was sent AND report exists
    // If report exists but email wasn't sent, we need to continue to send the email
    if (emailSent && earlyCheck?.formatted_report_html) {
      console.log(`⛔ [processAudit] SKIPPING audit ${auditId} - email already sent at ${earlyCheck.email_sent_at} and report exists`)
      return {
        success: true,
        auditId,
        message: 'Audit skipped - email already sent and report exists',
        email_sent_at: earlyCheck.email_sent_at,
      }
    }
    
    // Get audit details
    const { data: auditData, error: auditError } = await db
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
    const { data: modules, error: modulesError } = await db
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
      // Update the database with the normalized URL to prevent future issues
      await supabase
        .from('audits')
        .update({ url: normalizedAuditUrl })
        .eq('id', auditId)
      console.log(`✅ Updated audit URL in database to normalized version`)
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
      const { error: updateError } = await db
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
        const { error: moduleUpdateError } = await db
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
      
      const { error: reportUpdateError } = await db
        .from('audits')
        .update(updateData)
        .eq('id', auditId)
      
      if (reportUpdateError) {
        console.error('❌ Error saving report to database:', reportUpdateError)
        throw new Error(`Failed to save report to database: ${reportUpdateError.message}`)
      }
      console.log('✅ Report saved to database - report URL is now accessible')
      
      // Verify report was saved (double-check)
      const { data: savedAudit } = await db
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
    
    // Validate email format before attempting to send
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customer.email)) {
      console.error(`Invalid email address for audit ${auditId}: ${customer.email}`)
      throw new Error(`Invalid email address: ${customer.email}. Email must be a valid format (e.g., user@example.com).`)
    }
    
    // CRITICAL: Use atomic reservation pattern to prevent duplicate emails
    // Step 1: Check for hard timeout (30 minutes) - force clear abandoned reservations
    const reservationAttemptId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    console.log(`[${reservationAttemptId}] Starting email reservation for audit ${auditId}`)
    
    // First, check current state and handle hard timeout
    // Use service client for fresh read from primary database
    const { data: currentState } = await db
      .from('audits')
      .select('email_sent_at')
      .eq('id', auditId)
      .single()
    
    if (currentState?.email_sent_at) {
      const age = getEmailSentAtAge(currentState.email_sent_at)
      const ageMinutes = age ? Math.round(age / 1000 / 60) : null
      
      console.log(`[${reservationAttemptId}] Current email_sent_at: ${currentState.email_sent_at}, age: ${ageMinutes !== null ? `${ageMinutes}m` : 'unknown'}`)
      
      // Hard timeout: If reservation is >30 minutes old, force clear it (abandoned)
      if (isEmailReservationAbandoned(currentState.email_sent_at)) {
        console.warn(`[${reservationAttemptId}] ⚠️  Abandoned reservation detected (${ageMinutes}m old) - forcing clear with atomic update`)
        const oldTimestamp = currentState.email_sent_at
        // CRITICAL: Atomic clear - only clear if it still has the old value (prevents race condition)
        const { data: clearResult, error: clearError } = await db
          .from('audits')
          .update({ email_sent_at: null })
          .eq('id', auditId)
          .eq('email_sent_at', oldTimestamp) // Atomic: only clear if still has old value
          .select('email_sent_at')
        
        if (clearError) {
          console.error(`[${reservationAttemptId}] ❌ Failed to clear abandoned reservation:`, clearError)
        } else if (!clearResult || clearResult.length === 0) {
          console.warn(`[${reservationAttemptId}] ⚠️  Clear returned no rows - another process may have cleared it`)
        } else {
          console.log(`[${reservationAttemptId}] ✅ Cleared abandoned reservation (old: ${oldTimestamp})`)
        }
      } else if (isEmailSent(currentState.email_sent_at)) {
        // Email was already sent (timestamp is >5 minutes old)
        console.log(`[${reservationAttemptId}] ⛔ SKIPPING email send for audit ${auditId} - email already sent at ${currentState.email_sent_at} (${ageMinutes}m old)`)
        return {
          success: true,
          auditId,
          message: 'Audit completed successfully (email was already sent by another process)',
          emailSent: true,
        }
      } else if (isEmailSending(currentState.email_sent_at)) {
        // Another process is currently sending (reservation is <5 minutes old)
        console.log(`[${reservationAttemptId}] ⛔ SKIPPING email send for audit ${auditId} - another process is currently sending (reserved ${ageMinutes}m ago)`)
        return {
          success: true,
          auditId,
          message: 'Audit skipped - another process is sending the email',
          emailSent: false,
        }
      }
    }
    
    // Step 2: Try to atomically reserve the email sending
    // We use a timestamp slightly in the past to mark as "sending" (will update to actual time after success)
    const reservationTimestamp = new Date(Date.now() - 1000).toISOString() // 1 second ago
    
    // CRITICAL: Use a more reliable atomic update pattern
    // First, verify the audit exists and email_sent_at is null
    // Use service client for fresh read from primary database
    const { data: preCheck, error: preCheckError } = await db
      .from('audits')
      .select('id, email_sent_at')
      .eq('id', auditId)
      .single()
    
    if (preCheckError || !preCheck) {
      console.error(`[${reservationAttemptId}] ❌ Audit not found during reservation:`, preCheckError)
      throw new Error(`Audit ${auditId} not found - cannot reserve email slot`)
    }
    
    if (preCheck.email_sent_at) {
      // Already has email_sent_at - check if it's a reservation or real sent
      const age = getEmailSentAtAge(preCheck.email_sent_at)
      const ageMinutes = age ? Math.round(age / 1000 / 60) : null
      console.log(`[${reservationAttemptId}] ⚠️  email_sent_at already set: ${preCheck.email_sent_at} (${ageMinutes}m old)`)
      
      // CRITICAL: Check for any valid email_sent_at timestamp, not just ones >5 minutes old
      // This prevents duplicate emails when email was just sent (<5 minutes ago)
      if (preCheck.email_sent_at && 
          !preCheck.email_sent_at.startsWith('sending_') && 
          preCheck.email_sent_at.length > 10) {
        // Valid timestamp exists - email was sent (regardless of age)
        console.log(`[${reservationAttemptId}] ⛔ Email already sent - skipping (timestamp: ${preCheck.email_sent_at})`)
        return {
          success: true,
          auditId,
          message: 'Audit completed successfully (email was already sent)',
          emailSent: true,
        }
      } else if (preCheck.email_sent_at && preCheck.email_sent_at.startsWith('sending_')) {
        // It's a reservation - another process is sending
        console.log(`[${reservationAttemptId}] ⛔ Another process is sending - skipping (reservation: ${preCheck.email_sent_at})`)
        return {
          success: true,
          auditId,
          message: 'Audit skipped - another process is sending the email',
          emailSent: false,
        }
      }
      // If it's a stale reservation, we'll handle it below
    }
    
    // Now try the atomic update
    // CRITICAL: This query ONLY updates the specific audit_id - no joins, no customer_id, no URL filters
    // This is the CORRECT pattern: UPDATE audits SET email_sent_at = ? WHERE id = ? AND email_sent_at IS NULL
    // Use service client for atomic update on primary database
    console.log(`[${reservationAttemptId}] 🔒 Attempting atomic reservation for audit_id=${auditId} only (no customer/URL filters)`)
    const { data: reservationResult, error: reservationError } = await db
      .from('audits')
      .update({ email_sent_at: reservationTimestamp })
      .eq('id', auditId) // ONLY filter by audit_id - nothing else (no customer_id, no URL, no joins)
      .is('email_sent_at', null) // Only update if email_sent_at is NULL (atomic check)
      .select('id, email_sent_at, customer_id, url') // Include id and other fields to verify we got the right row
    
    // Track if we successfully reserved after retry
    let reservationSuccessful = reservationResult && reservationResult.length > 0 && !reservationError
    
    if (reservationSuccessful && reservationResult && reservationResult.length > 0) {
      // CRITICAL: Verify we got the correct audit row and only one row
      if (reservationResult.length > 1) {
        console.error(`[${reservationAttemptId}] ❌ CRITICAL BUG: Reservation returned ${reservationResult.length} rows! Expected exactly 1 row for audit_id=${auditId}`)
        console.error(`[${reservationAttemptId}] Returned audit IDs: ${reservationResult.map(r => r.id).join(', ')}`)
        throw new Error(`Atomic update returned multiple rows - expected 1, got ${reservationResult.length}`)
      }
      
      const reservedAudit = reservationResult[0]
      if (reservedAudit.id !== auditId) {
        console.error(`[${reservationAttemptId}] ❌ CRITICAL BUG: Reservation returned wrong audit! Expected ${auditId}, got ${reservedAudit.id}`)
        throw new Error(`Database query returned wrong audit row - expected ${auditId}, got ${reservedAudit.id}`)
      }
      console.log(`[${reservationAttemptId}] ✅ Initial reservation succeeded for audit_id=${auditId} (customer_id=${reservedAudit.customer_id}, url=${reservedAudit.url}): ${reservedAudit.email_sent_at}`)
    } else {
      console.warn(`[${reservationAttemptId}] ⚠️  Initial reservation failed: error=${reservationError?.message || 'null'}, result=${reservationResult?.length || 0} rows`)
      if (reservationError) {
        console.error(`[${reservationAttemptId}] Reservation error details:`, reservationError)
      }
      
      // If reservation failed with 0 rows, verify the audit still exists and check email_sent_at
      // Use service client for fresh read from primary database
      if (!reservationError && (!reservationResult || reservationResult.length === 0)) {
        const { data: verifyAfterFail } = await db
          .from('audits')
          .select('id, email_sent_at, status, customer_id, url')
          .eq('id', auditId)
          .single()
        
        if (!verifyAfterFail) {
          console.error(`[${reservationAttemptId}] ❌ Audit ${auditId} does not exist - cannot proceed with email`)
        } else {
          // CRITICAL: Verify we got the correct audit row (safety check)
          if (verifyAfterFail.id !== auditId) {
            console.error(`[${reservationAttemptId}] ❌ CRITICAL BUG: Verification query returned wrong audit! Expected ${auditId}, got ${verifyAfterFail.id}`)
            throw new Error(`Database query returned wrong audit row - expected ${auditId}, got ${verifyAfterFail.id}`)
          }
          
          console.log(`[${reservationAttemptId}] 🔍 Verification check: audit_id=${verifyAfterFail.id}, customer_id=${verifyAfterFail.customer_id}, url=${verifyAfterFail.url}, email_sent_at=${verifyAfterFail.email_sent_at || 'null'}`)
          
          if (verifyAfterFail.email_sent_at) {
            const age = getEmailSentAtAge(verifyAfterFail.email_sent_at)
            const ageMinutes = age ? Math.round(age / 1000 / 60) : null
            console.warn(`[${reservationAttemptId}] ⚠️  Reservation failed because email_sent_at was set for THIS audit (${auditId}): ${verifyAfterFail.email_sent_at} (${ageMinutes}m old)`)
            // Another process set it - check if it's a valid timestamp (not a reservation)
            // CRITICAL: Check for any valid email_sent_at timestamp, not just ones >5 minutes old
            // This prevents duplicate emails when email was just sent (<5 minutes ago)
            if (verifyAfterFail.email_sent_at && 
                !verifyAfterFail.email_sent_at.startsWith('sending_') && 
                verifyAfterFail.email_sent_at.length > 10) {
              // Valid timestamp exists - email was sent (regardless of age)
              console.log(`[${reservationAttemptId}] ⛔ Email already sent for THIS audit ${auditId} by another process (timestamp: ${verifyAfterFail.email_sent_at})`)
              return {
                success: true,
                auditId,
                message: 'Audit completed successfully (email was already sent by another process)',
                emailSent: true,
              }
            } else if (verifyAfterFail.email_sent_at && verifyAfterFail.email_sent_at.startsWith('sending_')) {
              // It's a reservation - another process is sending
              console.log(`[${reservationAttemptId}] ⛔ Another process is sending email for THIS audit ${auditId} (reservation: ${verifyAfterFail.email_sent_at})`)
              return {
                success: true,
                auditId,
                message: 'Audit skipped - another process is sending the email',
                emailSent: false,
              }
            }
          } else {
            console.warn(`[${reservationAttemptId}] ⚠️  Reservation failed but email_sent_at is still null for THIS audit ${auditId} - will try fallback`)
          }
        }
      }
    }
    
    // If reservation failed, check what happened and handle stale reservations
    if (!reservationSuccessful) {
      // Re-check current state after failed reservation
      // Use service client for fresh read from primary database
      const { data: doubleCheck } = await db
        .from('audits')
        .select('email_sent_at')
        .eq('id', auditId)
        .single()
      
      if (doubleCheck?.email_sent_at) {
        const age = getEmailSentAtAge(doubleCheck.email_sent_at)
        const ageMinutes = age ? Math.round(age / 1000 / 60) : null
        
        console.log(`[${reservationAttemptId}] Double-check: email_sent_at=${doubleCheck.email_sent_at}, age=${ageMinutes !== null ? `${ageMinutes}m` : 'unknown'}`)
        
        // Stale reservation (5-30 minutes old, not considered "sent" but not abandoned yet)
        // Clear it atomically and retry
        if (!isEmailSent(doubleCheck.email_sent_at) && !isEmailSending(doubleCheck.email_sent_at) && !isEmailReservationAbandoned(doubleCheck.email_sent_at)) {
          const oldTimestamp = doubleCheck.email_sent_at
          console.warn(`[${reservationAttemptId}] ⚠️  Stale reservation detected (${ageMinutes}m old) - clearing atomically and retrying`)
          
          // CRITICAL: Atomic clear - only clear if it still has the old value (prevents race condition)
          const { data: clearResult, error: clearError } = await db
            .from('audits')
            .update({ email_sent_at: null })
            .eq('id', auditId)
            .eq('email_sent_at', oldTimestamp) // Atomic: only clear if still has old value
            .select('email_sent_at')
          
          if (clearError) {
            console.error(`[${reservationAttemptId}] ❌ Failed to clear stale reservation:`, clearError)
            console.error(`[${reservationAttemptId}]   Old timestamp: ${oldTimestamp}`)
          } else if (!clearResult || clearResult.length === 0) {
            console.warn(`[${reservationAttemptId}] ⚠️  Clear returned no rows - another process may have cleared it (old: ${oldTimestamp})`)
          } else {
            console.log(`[${reservationAttemptId}] ✅ Cleared stale reservation (old: ${oldTimestamp}), retrying...`)
            
            // Retry the reservation (idempotent - uses IS NULL guard)
            const retryTimestamp = new Date(Date.now() - 1000).toISOString()
            const { data: retryResult, error: retryError } = await db
              .from('audits')
              .update({ email_sent_at: retryTimestamp })
              .eq('id', auditId)
              .is('email_sent_at', null) // Atomic: only update if NULL
              .select('email_sent_at')
            
            if (retryError) {
              console.error(`[${reservationAttemptId}] ❌ Retry reservation failed:`, retryError)
            } else if (!retryResult || retryResult.length === 0) {
              console.warn(`[${reservationAttemptId}] ⚠️  Retry reservation returned no rows - another process may have reserved it`)
            } else {
              console.log(`[${reservationAttemptId}] ✅ Retry reservation succeeded: ${retryResult[0].email_sent_at}`)
              reservationSuccessful = true
            }
          }
        } else {
          // Should not happen - we already checked these cases above
          console.error(`[${reservationAttemptId}] ❌ Unexpected state: email_sent_at=${doubleCheck.email_sent_at}, isSent=${isEmailSent(doubleCheck.email_sent_at)}, isSending=${isEmailSending(doubleCheck.email_sent_at)}, isAbandoned=${isEmailReservationAbandoned(doubleCheck.email_sent_at)}`)
        }
      } else {
        // email_sent_at is null but reservation failed - try direct update as fallback
        console.warn(`[${reservationAttemptId}] ⚠️  Reservation failed but email_sent_at is null - trying direct update as fallback`)
        
        // First, verify the audit still exists
        const { data: verifyAuditExists, error: verifyError } = await db
          .from('audits')
          .select('id, email_sent_at, status')
          .eq('id', auditId)
          .single()
        
        if (verifyError || !verifyAuditExists) {
          console.error(`[${reservationAttemptId}] ❌ Audit verification failed:`, verifyError)
          console.error(`[${reservationAttemptId}] ⚠️  Audit may have been deleted or doesn't exist. Skipping email send.`)
        } else if (verifyAuditExists.email_sent_at) {
          // Another process set it between our checks
          const age = getEmailSentAtAge(verifyAuditExists.email_sent_at)
          const ageMinutes = age ? Math.round(age / 1000 / 60) : null
          console.warn(`[${reservationAttemptId}] ⚠️  email_sent_at was set by another process: ${verifyAuditExists.email_sent_at} (${ageMinutes}m old)`)
          
          // CRITICAL: Check for any valid email_sent_at timestamp, not just ones >5 minutes old
          // This prevents duplicate emails when email was just sent (<5 minutes ago)
          if (verifyAuditExists.email_sent_at && 
              !verifyAuditExists.email_sent_at.startsWith('sending_') && 
              verifyAuditExists.email_sent_at.length > 10) {
            // Valid timestamp exists - email was sent (regardless of age)
            console.log(`[${reservationAttemptId}] ⛔ Email already sent by another process (timestamp: ${verifyAuditExists.email_sent_at})`)
            reservationSuccessful = true // Mark as successful since email was sent
          } else if (verifyAuditExists.email_sent_at && verifyAuditExists.email_sent_at.startsWith('sending_')) {
            // It's a reservation - another process is sending, we should skip
            console.log(`[${reservationAttemptId}] ⛔ Another process is sending email (reservation: ${verifyAuditExists.email_sent_at})`)
            return {
              success: true,
              auditId,
              message: 'Audit skipped - another process is sending the email',
              emailSent: false,
            }
          } else {
            // Invalid or unexpected format - don't proceed
            console.warn(`[${reservationAttemptId}] ⚠️  Unexpected email_sent_at format: ${verifyAuditExists.email_sent_at} - skipping email send`)
            reservationSuccessful = false
          }
        } else {
          // Audit exists and email_sent_at is still null - try direct update
          const fallbackTimestamp = new Date(Date.now() - 1000).toISOString()
          const { data: fallbackResult, error: fallbackError } = await db
            .from('audits')
            .update({ email_sent_at: fallbackTimestamp })
            .eq('id', auditId)
            .select('email_sent_at')
          
          if (fallbackError) {
            console.error(`[${reservationAttemptId}] ❌ Fallback update failed:`, fallbackError)
            console.error(`[${reservationAttemptId}] ⚠️  Skipping email send to prevent duplicates. Audit report is saved and accessible.`)
          } else if (!fallbackResult || fallbackResult.length === 0) {
            console.error(`[${reservationAttemptId}] ❌ Fallback update returned no rows - this should not happen if audit exists`)
            console.error(`[${reservationAttemptId}] ⚠️  Skipping email send. Audit report is saved and accessible.`)
          } else {
            // Verify the update actually set email_sent_at to our timestamp
            const updatedValue = fallbackResult[0]?.email_sent_at
            if (updatedValue && updatedValue === fallbackTimestamp) {
              console.log(`[${reservationAttemptId}] ✅ Fallback reservation succeeded: ${updatedValue}`)
              reservationSuccessful = true
            } else {
              console.warn(`[${reservationAttemptId}] ⚠️  Fallback update returned different value: expected ${fallbackTimestamp}, got ${updatedValue}`)
              // Check if another process set it
              if (updatedValue && updatedValue !== fallbackTimestamp) {
                const age = getEmailSentAtAge(updatedValue)
                const ageMinutes = age ? Math.round(age / 1000 / 60) : null
                console.warn(`[${reservationAttemptId}] ⚠️  Another process may have set email_sent_at: ${updatedValue} (${ageMinutes}m old)`)
                
                // CRITICAL: Check for any valid email_sent_at timestamp, not just ones >5 minutes old
                if (updatedValue && 
                    !updatedValue.startsWith('sending_') && 
                    updatedValue.length > 10) {
                  // Valid timestamp exists - email was sent (regardless of age)
                  console.log(`[${reservationAttemptId}] ⛔ Email already sent by another process (timestamp: ${updatedValue})`)
                  reservationSuccessful = true // Mark as successful since email was sent
                } else if (updatedValue && updatedValue.startsWith('sending_')) {
                  // It's a reservation - another process is sending, we should skip
                  console.log(`[${reservationAttemptId}] ⛔ Another process is sending email (reservation: ${updatedValue})`)
                  return {
                    success: true,
                    auditId,
                    message: 'Audit skipped - another process is sending the email',
                    emailSent: false,
                  }
                } else {
                  // Invalid or unexpected format - don't proceed
                  console.warn(`[${reservationAttemptId}] ⚠️  Unexpected email_sent_at format: ${updatedValue} - skipping email send`)
                  reservationSuccessful = false
                }
              }
            }
          }
        }
      }
      
      // If reservation still failed (no retry success), handle error
      if (!reservationSuccessful) {
        // CRITICAL: Ensure status is set to completed even if email reservation failed
        // The report is already saved, so the audit is complete
        const { error: statusError } = await db
          .from('audits')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', auditId)
        
        if (statusError) {
          console.error(`[${reservationAttemptId}] ⚠️  Failed to update audit status to completed:`, statusError)
        } else {
          console.log(`[${reservationAttemptId}] ✅ Audit status updated to completed (email reservation failed but report is saved)`)
        }
        
        return {
          success: true,
          auditId,
          message: 'Audit completed successfully but email reservation failed - report is saved',
          hasReport: !!html,
          emailSent: false,
        }
      }
    }
    
    // If we get here, reservation was successful (either initial or after retry)
    console.log(`[${reservationAttemptId}] ✅ Reservation successful, proceeding with email send`)
    
    // CRITICAL: Final verification - ensure report is fully saved and ready before sending email
    // This prevents sending emails before the report is accessible
    // Use service client for fresh read from primary database
    const { data: finalVerification, error: verifyError } = await db
      .from('audits')
      .select('status, formatted_report_html, completed_at')
      .eq('id', auditId)
      .single()
    
    if (verifyError || !finalVerification) {
      console.error(`[${reservationAttemptId}] ❌ Final verification failed:`, verifyError)
      throw new Error(`Cannot send email - audit verification failed: ${verifyError?.message || 'Audit not found'}`)
    }
    
    if (finalVerification.status !== 'completed') {
      console.error(`[${reservationAttemptId}] ❌ Final verification failed: status is ${finalVerification.status}, not 'completed'`)
      throw new Error(`Cannot send email - audit status is ${finalVerification.status}, not 'completed'`)
    }
    
    if (!finalVerification.formatted_report_html || finalVerification.formatted_report_html.trim().length === 0) {
      console.error(`[${reservationAttemptId}] ❌ Final verification failed: report HTML is missing or empty`)
      throw new Error('Cannot send email - report HTML is missing or empty')
    }
    
    console.log(`[${reservationAttemptId}] ✅ Final verification passed: status=completed, has_report=true, completed_at=${finalVerification.completed_at}`)
    
    // Step 2: Send email ONLY if we successfully reserved the slot AND report is verified
    let emailSentAt: string | null = null
    let emailError: Error | null = null
    
    console.log(`[${reservationAttemptId}] 📧 Sending email to ${customer.email} for audit ${auditId}...`)
    console.log(`[${reservationAttemptId}] 📧 Email provider check: SENDGRID_API_KEY=${!!process.env.SENDGRID_API_KEY}, SMTP_PASSWORD=${!!process.env.SMTP_PASSWORD}, EMAIL_PROVIDER=${process.env.EMAIL_PROVIDER || 'not set'}`)
    try {
      await sendAuditReportEmail(
        customer.email,
        audit.url,
        auditId,
        reportHtml
      )
      // Step 3: Update email_sent_at to actual timestamp after successful send
      // CRITICAL: Use a timestamp that's clearly in the past (not a reservation)
      // This ensures isEmailSent() will return true after 5 minutes
      emailSentAt = new Date().toISOString()
      
      // Update email_sent_at and verify it was actually saved
      const { data: updateResult, error: emailUpdateError } = await db
        .from('audits')
        .update({ email_sent_at: emailSentAt })
        .eq('id', auditId)
        .select('email_sent_at')
      
      if (emailUpdateError) {
        console.error(`[${reservationAttemptId}] ⚠️  Email sent but failed to update email_sent_at:`, emailUpdateError)
        throw new Error(`Email sent but failed to update timestamp: ${emailUpdateError.message}`)
      } else if (!updateResult || updateResult.length === 0 || !updateResult[0]?.email_sent_at) {
        console.error(`[${reservationAttemptId}] ⚠️  Email sent but email_sent_at was not saved (update returned no data)`)
        throw new Error('Email sent but timestamp was not saved to database')
      } else {
        const finalTimestamp = updateResult[0].email_sent_at
        console.log(`[${reservationAttemptId}] ✅ Email sent successfully to ${customer.email} and timestamp updated to ${finalTimestamp}`)
        // Verify the timestamp matches what we set (allowing for format differences like Z vs +00:00)
        const expectedTime = new Date(emailSentAt).getTime()
        const actualTime = new Date(finalTimestamp).getTime()
        const timeDiff = Math.abs(expectedTime - actualTime)
        if (timeDiff > 1000) { // Allow up to 1 second difference (format differences are fine)
          console.warn(`[${reservationAttemptId}] ⚠️  Timestamp mismatch: expected ${emailSentAt}, got ${finalTimestamp} (difference: ${timeDiff}ms)`)
        }
        console.log(`[${reservationAttemptId}] 📊 Final state: email_sent_at=${finalTimestamp}, status=completed, has_report=true`)
      }
    } catch (err) {
        emailError = err instanceof Error ? err : new Error(String(err))
        console.error(`[${reservationAttemptId}] ❌ Email sending failed:`, emailError)
        console.error(`[${reservationAttemptId}] Email error details:`, emailError.message)
        console.error(`[${reservationAttemptId}] Email error stack:`, emailError.stack)
        
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
        const { error: resetError } = await db
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
      
      await db
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
      const { error: updateError } = await db
        .from('audits')
        .update({ 
          status: 'failed',
          error_log: errorLog,
        } as any) // Type assertion since column might not exist yet
        .eq('id', auditId)
      
      if (updateError) {
        console.error('Could not store error_log (column may not exist):', updateError)
        // Try without error_log if column doesn't exist
        const { error: statusError } = await db
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
        const { error: statusError } = await db
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

