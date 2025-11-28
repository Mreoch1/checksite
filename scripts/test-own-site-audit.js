/**
 * Full audit test for seochecksite.netlify.app with all modules and competitor
 * Monitors from start to finish
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const { URL } = require('url')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const adminSecret = process.env.ADMIN_SECRET
// Always use the deployed site URL for API calls
const siteUrl = 'https://seochecksite.netlify.app'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test configuration - YOUR SITE
const TEST_URL = 'https://seochecksite.netlify.app'
// Competitor: SEOptimer (similar SEO audit tool)
const COMPETITOR_URL = 'https://www.seoptimer.com'
const TEST_EMAIL = 'Mreoch82@hotmail.com'
// All available modules
const ALL_MODULES = [
  'performance',
  'crawl_health',
  'on_page',
  'mobile',
  'local',
  'accessibility',
  'security',
  'schema',
  'social',
  'competitor_overview'
]

let auditId = null
let emailSendTimes = []

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve({ status: res.statusCode, data: json })
        } catch (e) {
          resolve({ status: res.statusCode, data })
        }
      })
    })

    req.on('error', (e) => {
      console.error(`Request error for ${url}: ${e}`)
      reject(e)
    })

    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    req.end()
  })
}

async function createAuditDirect() {
  console.log('📝 Step 1: Creating test audit directly via Supabase...')
  console.log(`   URL: ${TEST_URL}`)
  console.log(`   Competitor URL: ${COMPETITOR_URL}`)
  console.log(`   Email: ${TEST_EMAIL}`)
  console.log(`   Modules: ${ALL_MODULES.join(', ')}`)

  // Get or create customer
  let { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('email', TEST_EMAIL)
    .single()

  if (customerError || !customer) {
    console.log('   Creating new customer...')
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({ email: TEST_EMAIL, name: 'Test User' })
      .select()
      .single()

    if (createError || !newCustomer) {
      throw new Error(`Failed to create customer: ${createError?.message}`)
    }
    customer = newCustomer
  }

  // Check for duplicate
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: recentAudit } = await supabase
    .from('audits')
    .select('id, created_at')
    .eq('customer_id', customer.id)
    .eq('url', TEST_URL)
    .gte('created_at', thirtyMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (recentAudit) {
    const ageMinutes = Math.round((Date.now() - new Date(recentAudit.created_at).getTime()) / 1000 / 60)
    console.warn(`⚠️  Duplicate audit detected: Created ${ageMinutes} minutes ago`)
    auditId = recentAudit.id
    console.log(`   Reusing existing audit ID: ${auditId}`)
    return auditId
  }

  // Calculate price (new pricing model: $24.99 base + add-ons)
  const basePrice = 2499 // $24.99 - includes all base modules
  const modulePrices = {
    // Base package modules (included)
    performance: 0,
    crawl_health: 0,
    on_page: 0,
    mobile: 0,
    accessibility: 0,
    security: 0,
    schema: 0,
    social: 0,
    // Add-ons
    local: 1000, // +$10.00
    competitor_overview: 1000, // +$10.00 (only charged when competitor URL provided)
  }
  const totalCents = basePrice + ALL_MODULES.reduce((sum, m) => sum + (modulePrices[m] || 0), 0)

  // Create audit
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .insert({
      customer_id: customer.id,
      url: TEST_URL,
      status: 'pending',
      total_price_cents: totalCents,
      raw_result_json: { competitorUrl: COMPETITOR_URL },
    })
    .select()
    .single()

  if (auditError || !audit) {
    throw new Error(`Failed to create audit: ${auditError?.message}`)
  }

  auditId = audit.id
  console.log(`✅ Audit created: ${auditId}`)
  console.log(`   Total price: $${(totalCents / 100).toFixed(2)}`)

  // Create audit modules
  const moduleRecords = ALL_MODULES.map(moduleKey => ({
    audit_id: audit.id,
    module_key: moduleKey,
    enabled: true,
  }))

  const { error: modulesError } = await supabase
    .from('audit_modules')
    .insert(moduleRecords)

  if (modulesError) {
    console.error('⚠️  Error creating modules:', modulesError)
  } else {
    console.log(`✅ Created ${ALL_MODULES.length} audit modules`)
  }

  // Update status to running
  await supabase
    .from('audits')
    .update({ status: 'running' })
    .eq('id', audit.id)

  // Add to queue
  console.log('   Adding to queue...')
  const { error: queueError } = await supabase
    .from('audit_queue')
    .upsert({
      audit_id: audit.id,
      status: 'pending',
      retry_count: 0,
      last_error: null,
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'audit_id',
    })

  if (queueError) {
    console.error('❌ Error adding to queue:', queueError)
    throw new Error(`Failed to add to queue: ${queueError.message}`)
  }

  console.log('✅ Audit added to queue')
  return audit.id
}

async function runTest() {
  console.log('🧪 Starting Full Audit Flow Test for YOUR SITE')
  console.log('==================================================\n')

  try {
    // Step 1: Create test audit
    auditId = await createAuditDirect()

    // Step 2: Trigger queue processing (using the test bypass endpoint)
    console.log('\n⚙️  Triggering queue processing (via test bypass endpoint)...')
    const triggerQueueResponse = await makeRequest(`${siteUrl}/api/test-process-queue`, {
      method: 'POST',
    })

    if (triggerQueueResponse.status !== 200) {
      console.warn(`⚠️  Queue response ${triggerQueueResponse.status}: ${JSON.stringify(triggerQueueResponse.data)}`)
    } else {
      console.log('✅ Queue processing triggered.')
    }

    // Step 3: Monitor audit status
    console.log('\n⏳ Monitoring audit (max 10 minutes)...')
    let currentStatus = 'N/A'
    let hasReport = false
    let emailSent = 'No'
    let startTime = Date.now()
    const maxMonitorTime = 10 * 60 * 1000 // 10 minutes

    while (Date.now() - startTime < maxMonitorTime) {
      const { data: auditStatus, error } = await supabase
        .from('audits')
        .select('status, formatted_report_html, email_sent_at')
        .eq('id', auditId)
        .single()

      if (error) {
        console.error('Error fetching audit status:', error)
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds before retrying
        continue
      }

      const newStatus = auditStatus.status
      const newHasReport = !!auditStatus.formatted_report_html
      const newEmailSent = auditStatus.email_sent_at ? new Date(auditStatus.email_sent_at).toLocaleString() : 'No'

      if (newStatus !== currentStatus || newHasReport !== hasReport || newEmailSent !== emailSent) {
        currentStatus = newStatus
        hasReport = newHasReport
        emailSent = newEmailSent
        console.log(`   [${Math.round((Date.now() - startTime) / 1000)}s] Status: ${currentStatus} | Report: ${hasReport ? 'Yes' : 'No'} | Email: ${emailSent}`)
      } else {
        process.stdout.write('.') // Indicate activity
      }

      if (currentStatus === 'completed' && hasReport && emailSent !== 'No') {
        console.log('\n✅ Audit completed, report generated, and email sent!')
        break
      }

      // Trigger queue every 30 seconds
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      if (elapsed > 0 && elapsed % 30 === 0) {
        await makeRequest(`${siteUrl}/api/test-process-queue`, { method: 'GET' })
      }

      await new Promise(resolve => setTimeout(resolve, 5000)) // Check every 5 seconds
    }

    if (currentStatus !== 'completed' || !hasReport || emailSent === 'No') {
      console.log('\n⏱️  Timeout or audit not fully completed within time limit.')
    }

    // Step 4: Verify results
    console.log('\n🔍 Verifying results...')
    const { data: finalAudit, error: finalAuditError } = await supabase
      .from('audits')
      .select('*, customers(email)')
      .eq('id', auditId)
      .single()

    if (finalAuditError || !finalAudit) {
      throw new Error(`Failed to fetch final audit details: ${finalAuditError?.message}`)
    }

    let testPassed = true

    if (finalAudit.status !== 'completed') {
      console.error(`❌ Status is ${finalAudit.status}, expected 'completed'`)
      testPassed = false
    } else {
      console.log(`✅ Status is 'completed'`)
    }

    if (!finalAudit.formatted_report_html) {
      console.error('❌ Report not generated')
      testPassed = false
    } else {
      console.log(`✅ Report generated (${finalAudit.formatted_report_html.length} characters)`)
    }

    if (!finalAudit.email_sent_at) {
      console.error('❌ Email not sent')
      testPassed = false
    } else {
      console.log(`✅ Email sent at ${new Date(finalAudit.email_sent_at).toLocaleString()}`)
    }

    // Check for duplicate emails for this audit ID
    const { data: emailHistory, error: emailHistoryError } = await supabase
      .from('audits')
      .select('id, email_sent_at')
      .eq('customer_id', finalAudit.customer_id)
      .eq('url', finalAudit.url)
      .not('email_sent_at', 'is', null)
      .order('email_sent_at', { ascending: false })

    if (emailHistoryError) {
      console.error('Error fetching email history:', emailHistoryError)
    } else {
      const sentEmails = emailHistory.filter(e => e.id === auditId)
      if (sentEmails.length > 1) {
        console.error(`❌ Duplicate emails detected for audit ${auditId}: ${sentEmails.length} emails sent.`)
        testPassed = false
      } else {
        console.log('✅ No duplicate emails detected for this audit.')
      }
    }

    // Basic report content check
    if (finalAudit.formatted_report_html) {
      console.log('\nReport Content Check:')
      const report = finalAudit.formatted_report_html
      const checks = {
        'Performance': report.includes('Performance Score'),
        'On-Page': report.includes('On-Page SEO'),
        'Mobile': report.includes('Mobile Optimization'),
        'Crawl Health': report.includes('Crawl Health'),
        'Local SEO': report.includes('Local SEO'),
        'Accessibility': report.includes('Accessibility'),
        'Security': report.includes('Security'),
        'Schema Markup': report.includes('Schema Markup'),
        'Social Metadata': report.includes('Social Metadata'),
        'Competitor Overview': report.includes('Competitor Overview'),
        'Overall Score': report.includes('Overall Score'),
        'Top Priority Actions': report.includes('Top Priority Actions'),
      }
      for (const [key, value] of Object.entries(checks)) {
        console.log(`  Has ${key}: ${value ? '✅' : '❌'}`)
        if (!value && ['Performance', 'On-Page', 'Mobile', 'Crawl Health', 'Overall Score', 'Top Priority Actions'].includes(key)) {
          testPassed = false
        }
      }
    } else {
      console.error('❌ Cannot check report content: Report HTML is empty.')
      testPassed = false
    }

    console.log('\n==================================================')
    console.log('📊 Summary:')
    console.log(`   Audit ID: ${auditId}`)
    console.log(`   URL: ${TEST_URL}`)
    console.log(`   Competitor: ${COMPETITOR_URL}`)
    console.log(`   Status: ${finalAudit.status}`)
    console.log(`   Emails: ${finalAudit.email_sent_at ? '1' : '0'}`)
    console.log(`   Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}`)
    console.log('==================================================')

    if (!testPassed) {
      process.exit(1)
    }

  } catch (error) {
    console.error('\n❌ Test error:', error)
    process.exit(1)
  }
}

runTest()

