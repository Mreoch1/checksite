/**
 * End-to-end audit test using proper API endpoints with authentication
 * This is the CORRECT way to test the full audit flow
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const { URL } = require('url')

// Required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const adminSecret = process.env.ADMIN_SECRET
// Always use deployed site URL for API calls (not localhost)
const siteUrl = 'https://seochecksite.netlify.app'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

if (!adminSecret) {
  console.error('❌ Missing ADMIN_SECRET')
  console.error('   Required: ADMIN_SECRET (for /api/test-audit endpoint)')
  console.error('   Add it to your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Configuration
const TEST_URL = process.argv[2] || 'https://seochecksite.netlify.app'
const COMPETITOR_URL = process.argv[3] || 'https://www.seoptimer.com'
const TEST_EMAIL = process.argv[4] || 'Mreoch82@hotmail.com'

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

async function step1_createAudit() {
  console.log('\n📝 Step 1: Creating audit via API (with admin auth)...')
  console.log(`   URL: ${TEST_URL}`)
  console.log(`   Competitor: ${COMPETITOR_URL}`)
  console.log(`   Email: ${TEST_EMAIL}`)
  console.log(`   Modules: ${ALL_MODULES.length} modules`)

  const response = await makeRequest(`${siteUrl}/api/test-audit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminSecret}`,
    },
    body: {
      url: TEST_URL,
      email: TEST_EMAIL,
      modules: ALL_MODULES,
      competitorUrl: COMPETITOR_URL,
    },
  })

  if (response.status === 409) {
    console.warn(`⚠️  Duplicate audit detected: ${response.data.message}`)
    auditId = response.data.auditId || response.data.existingAuditId
    console.log(`   Using existing audit ID: ${auditId}`)
    return true
  } else if (response.status === 401) {
    console.error('❌ Authentication failed - check ADMIN_SECRET')
    return false
  } else if (response.status !== 200) {
    console.error(`❌ Failed to create audit: ${response.status}`)
    console.error(`   Response: ${JSON.stringify(response.data)}`)
    return false
  }

  auditId = response.data.auditId
  console.log(`✅ Audit created: ${auditId}`)
  return true
}

async function step2_triggerQueue() {
  console.log('\n⚙️  Step 2: Triggering queue processing...')
  
  const response = await makeRequest(`${siteUrl}/api/test-process-queue`, {
    method: 'POST',
  })

  if (response.status === 200) {
    if (response.data.processed) {
      console.log(`✅ Queue processing triggered - audit ${response.data.auditId} is being processed`)
    } else {
      console.log(`ℹ️  ${response.data.message || 'No audits ready to process'}`)
    }
    return true
  } else {
    console.warn(`⚠️  Queue response ${response.status}: ${JSON.stringify(response.data)}`)
    return false
  }
}

async function step3_monitorAudit(maxMinutes = 10) {
  console.log(`\n⏳ Step 3: Monitoring audit (max ${maxMinutes} minutes)...`)
  
  const startTime = Date.now()
  const maxWait = maxMinutes * 60 * 1000
  let lastStatus = null
  let lastReportLength = 0
  let lastEmailSent = null
  let triggerCount = 0

  while (Date.now() - startTime < maxWait) {
    const { data: audit, error } = await supabase
      .from('audits')
      .select('status, formatted_report_html, email_sent_at')
      .eq('id', auditId)
      .single()

    if (error) {
      console.error('Error fetching audit:', error)
      await new Promise(r => setTimeout(r, 5000))
      continue
    }

    // Status change
    if (audit.status !== lastStatus) {
      console.log(`\n📊 Status: ${lastStatus || 'N/A'} → ${audit.status}`)
      lastStatus = audit.status
    }

    // Report progress
    const reportLen = audit.formatted_report_html?.length || 0
    if (reportLen > lastReportLength) {
      console.log(`📄 Report generated: ${reportLen} characters`)
      lastReportLength = reportLen
    }

    // Email sent
    if (audit.email_sent_at && audit.email_sent_at !== lastEmailSent) {
      console.log(`📧 Email sent: ${new Date(audit.email_sent_at).toLocaleString()}`)
      lastEmailSent = audit.email_sent_at
    }

    // Progress indicator
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    process.stdout.write(`\r   [${elapsed}s] Status: ${audit.status} | Report: ${reportLen > 0 ? reportLen + ' chars' : 'No'} | Email: ${audit.email_sent_at ? 'Sent' : 'No'}`)

    // Complete?
    if (audit.status === 'completed' && audit.formatted_report_html && audit.email_sent_at) {
      console.log('\n\n✅ Audit completed successfully!')
      return audit
    }

    // Trigger queue every 30 seconds
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
    if (elapsedSeconds > 0 && elapsedSeconds % 30 === 0 && triggerCount < elapsedSeconds / 30) {
      await step2_triggerQueue()
      triggerCount++
    }

    await new Promise(r => setTimeout(r, 5000))
  }

  console.log('\n\n⏱️  Timeout reached')
  return await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .single()
    .then(({ data }) => data)
}

async function step4_verifyResults() {
  console.log('\n🔍 Step 4: Verifying results...')
  
  const { data: audit, error } = await supabase
    .from('audits')
    .select('*, customers(email)')
    .eq('id', auditId)
    .single()

  if (error || !audit) {
    console.error(`❌ Failed to fetch audit: ${error?.message}`)
    return false
  }

  let allPassed = true

  // Check status
  if (audit.status !== 'completed') {
    console.error(`❌ Status is '${audit.status}', expected 'completed'`)
    allPassed = false
  } else {
    console.log(`✅ Status: completed`)
  }

  // Check report
  if (!audit.formatted_report_html) {
    console.error('❌ Report not generated')
    allPassed = false
  } else {
    console.log(`✅ Report generated: ${audit.formatted_report_html.length} characters`)
  }

  // Check email
  if (!audit.email_sent_at) {
    console.error('❌ Email not sent')
    allPassed = false
  } else {
    console.log(`✅ Email sent: ${new Date(audit.email_sent_at).toLocaleString()}`)
  }

  // Check modules in report
  if (audit.formatted_report_html) {
    const report = audit.formatted_report_html.toLowerCase()
    const modules = {
      'Performance': report.includes('performance'),
      'On-Page SEO': report.includes('on-page') || report.includes('on page'),
      'Mobile': report.includes('mobile'),
      'Crawl Health': report.includes('crawl'),
      'Local SEO': report.includes('local'),
      'Accessibility': report.includes('accessibility'),
      'Security': report.includes('security'),
      'Schema': report.includes('schema'),
      'Social': report.includes('social'),
      'Competitor': report.includes('competitor') || report.includes('seoptimer'),
    }
    
    console.log('\n   Module Check:')
    for (const [name, found] of Object.entries(modules)) {
      console.log(`   ${name}: ${found ? '✅' : '❌'}`)
      if (!found && ['Performance', 'On-Page SEO', 'Mobile', 'Crawl Health'].includes(name)) {
        allPassed = false
      }
    }
  }

  // Check for duplicate emails
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from('audits')
    .select('id, email_sent_at')
    .eq('customer_id', audit.customer_id)
    .eq('url', audit.url)
    .gte('email_sent_at', oneHourAgo)

  if (recent && recent.length > 1) {
    console.error(`❌ Found ${recent.length} emails sent in last hour (duplicate detected)`)
    allPassed = false
  } else {
    console.log('✅ No duplicate emails detected')
  }

  return allPassed
}

async function run() {
  console.log('🧪 End-to-End Audit Test (Using Proper API Endpoints)')
  console.log('='.repeat(60))
  console.log(`\nRequired Secrets Check:`)
  console.log(`  ✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'Set' : '❌ Missing'}`)
  console.log(`  ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Set' : '❌ Missing'}`)
  console.log(`  ${adminSecret ? '✅' : '❌'} ADMIN_SECRET: ${adminSecret ? 'Set' : 'Missing (REQUIRED)'}`)
  
  if (!adminSecret) {
    console.log('\n❌ ADMIN_SECRET is required for /api/test-audit endpoint')
    console.log('   Add it to your .env.local file:')
    console.log('   ADMIN_SECRET=your-secret-here')
    process.exit(1)
  }

  try {
    // Step 1: Create audit
    if (!await step1_createAudit()) {
      process.exit(1)
    }

    // Step 2: Trigger queue
    await step2_triggerQueue()

    // Step 3: Monitor
    const final = await step3_monitorAudit(10)

    // Step 4: Verify
    const success = await step4_verifyResults()

    console.log('\n' + '='.repeat(60))
    console.log('📊 Final Summary:')
    console.log(`   Audit ID: ${auditId}`)
    console.log(`   URL: ${TEST_URL}`)
    console.log(`   Competitor: ${COMPETITOR_URL}`)
    console.log(`   Status: ${final?.status || 'unknown'}`)
    console.log(`   Report: ${final?.formatted_report_html?.length || 0} characters`)
    console.log(`   Email: ${final?.email_sent_at ? 'Sent' : 'Not sent'}`)
    console.log(`   Result: ${success ? '✅ PASS' : '❌ FAIL'}`)
    console.log('='.repeat(60))

    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('\n❌ Test error:', error)
    process.exit(1)
  }
}

run()

