/**
 * Full end-to-end audit test
 * Creates an audit, monitors queue processing, checks email delivery, and verifies report
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const adminSecret = process.env.ADMIN_SECRET
// Use production URL for API calls
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test configuration
const TEST_URL = 'https://seoauditpro.net'
const TEST_EMAIL = 'Mreoch82@hotmail.com'
const TEST_MODULES = ['performance', 'crawl_health', 'on_page', 'mobile']

// Track email sends
let emailSendTimes = []
let auditId = null

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }
    
    // Use https for all requests
    const req = https.request(reqOptions, (res) => {
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
    req.on('error', (err) => {
      console.error(`Request error for ${url}:`, err.message)
      reject(err)
    })
    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    req.end()
  })
}

async function createTestAudit() {
  console.log('\n📝 Step 1: Creating test audit...')
  console.log(`   URL: ${TEST_URL}`)
  console.log(`   Email: ${TEST_EMAIL}`)
  console.log(`   Modules: ${TEST_MODULES.join(', ')}`)

  const authHeader = adminSecret ? `Bearer ${adminSecret}` : null
  const response = await makeRequest(`${siteUrl}/api/test-audit`, {
    method: 'POST',
    headers: authHeader ? { Authorization: authHeader } : {},
    body: {
      url: TEST_URL,
      email: TEST_EMAIL,
      modules: TEST_MODULES,
    },
  })

  if (response.status !== 200) {
    console.error(`❌ Failed to create audit: ${response.status}`)
    console.error('   Response:', response.data)
    return null
  }

  auditId = response.data.auditId
  console.log(`✅ Audit created: ${auditId}`)
  return auditId
}

async function checkAuditStatus() {
  if (!auditId) return null

  const { data: audit, error } = await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .single()

  if (error || !audit) {
    console.error('❌ Error fetching audit:', error)
    return null
  }

  return audit
}

async function checkQueueStatus() {
  if (!auditId) return null

  const { data: queueItem, error } = await supabase
    .from('audit_queue')
    .select('*')
    .eq('audit_id', auditId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('❌ Error fetching queue item:', error)
    return null
  }

  return queueItem
}

async function triggerQueueProcessing() {
  console.log('\n⚙️  Triggering queue processing...')
  const response = await makeRequest(`${siteUrl}/api/process-queue`, {
    method: 'POST',
  })
  
  if (response.status === 200) {
    console.log('✅ Queue processing triggered')
    if (response.data.processed) {
      console.log(`   Processed: ${response.data.processed} items`)
    }
  } else {
    console.log(`⚠️  Queue processing response: ${response.status}`)
  }
}

async function monitorAudit(maxWaitMinutes = 10) {
  console.log(`\n⏳ Monitoring audit (max ${maxWaitMinutes} minutes)...`)
  
  const startTime = Date.now()
  const maxWait = maxWaitMinutes * 60 * 1000
  let lastStatus = null
  let lastEmailSentAt = null

  while (Date.now() - startTime < maxWait) {
    const audit = await checkAuditStatus()
    if (!audit) {
      await new Promise(resolve => setTimeout(resolve, 5000))
      continue
    }

    const queueItem = await checkQueueStatus()

    // Check for status changes
    if (audit.status !== lastStatus) {
      console.log(`\n📊 Status changed: ${lastStatus || 'N/A'} → ${audit.status}`)
      lastStatus = audit.status
    }

    // Check for email sends
    if (audit.email_sent_at && audit.email_sent_at !== lastEmailSentAt) {
      const emailTime = new Date(audit.email_sent_at)
      emailSendTimes.push(emailTime)
      console.log(`\n📧 Email sent at: ${emailTime.toISOString()}`)
      console.log(`   Total emails sent: ${emailSendTimes.length}`)
      lastEmailSentAt = audit.email_sent_at
    }

    // Display current state
    process.stdout.write(`\r   Status: ${audit.status} | Has Report: ${audit.formatted_report_html ? 'Yes' : 'No'} | Email: ${audit.email_sent_at ? 'Sent' : 'Not sent'} | Queue: ${queueItem?.status || 'N/A'}`)

    // Check if complete
    if (audit.status === 'completed' && audit.formatted_report_html && audit.email_sent_at) {
      console.log('\n\n✅ Audit completed successfully!')
      return audit
    }

    // Trigger queue processing every 30 seconds
    if ((Date.now() - startTime) % 30000 < 5000) {
      await triggerQueueProcessing()
    }

    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  console.log('\n\n⏱️  Timeout reached')
  return await checkAuditStatus()
}

async function verifyEmailDelivery() {
  console.log('\n📧 Verifying email delivery...')
  
  const audit = await checkAuditStatus()
  if (!audit) {
    console.error('❌ Cannot verify - audit not found')
    return false
  }

  if (!audit.email_sent_at) {
    console.error('❌ Email was not sent')
    return false
  }

  if (emailSendTimes.length > 1) {
    console.error(`❌ Multiple emails detected! (${emailSendTimes.length} sends)`)
    emailSendTimes.forEach((time, i) => {
      console.error(`   Email ${i + 1}: ${time.toISOString()}`)
    })
    return false
  }

  console.log(`✅ Email sent once at: ${new Date(audit.email_sent_at).toISOString()}`)
  return true
}

async function verifyReport() {
  console.log('\n📄 Verifying report...')
  
  const audit = await checkAuditStatus()
  if (!audit) {
    console.error('❌ Cannot verify - audit not found')
    return false
  }

  if (!audit.formatted_report_html) {
    console.error('❌ Report not generated')
    return false
  }

  // Check report content
  const reportLength = audit.formatted_report_html.length
  console.log(`   Report length: ${reportLength} characters`)
  
  if (reportLength < 1000) {
    console.error('❌ Report seems too short')
    return false
  }

  // Check for key sections
  const hasModules = TEST_MODULES.some(module => 
    audit.formatted_report_html.toLowerCase().includes(module.toLowerCase())
  )

  if (!hasModules) {
    console.warn('⚠️  Report may be missing module content')
  }

  console.log('✅ Report appears valid')
  return true
}

async function checkForDuplicateEmails() {
  console.log('\n🔍 Checking for duplicate emails in last 30 minutes...')
  
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  
  const { data: recentAudits, error } = await supabase
    .from('audits')
    .select('id, url, email_sent_at, status')
    .eq('url', TEST_URL)
    .eq('customer_id', (await supabase.from('customers').select('id').eq('email', TEST_EMAIL).single()).data?.id)
    .gte('email_sent_at', thirtyMinutesAgo)
    .order('email_sent_at', { ascending: false })

  if (error) {
    console.error('❌ Error checking for duplicates:', error)
    return false
  }

  if (recentAudits && recentAudits.length > 1) {
    console.error(`❌ Found ${recentAudits.length} audits with emails sent in last 30 minutes:`)
    recentAudits.forEach(audit => {
      console.error(`   Audit ${audit.id}: ${audit.email_sent_at} (${audit.status})`)
    })
    return false
  }

  console.log('✅ No duplicate emails detected')
  return true
}

async function runFullTest() {
  console.log('🧪 Starting Full Audit Flow Test')
  console.log('=' .repeat(50))

  try {
    // Step 1: Create audit
    const createdAuditId = await createTestAudit()
    if (!createdAuditId) {
      console.error('\n❌ Test failed at audit creation')
      process.exit(1)
    }

    // Step 2: Trigger initial queue processing
    await triggerQueueProcessing()

    // Step 3: Monitor until completion
    const finalAudit = await monitorAudit(10)
    
    if (!finalAudit) {
      console.error('\n❌ Test failed - audit not found')
      process.exit(1)
    }

    // Step 4: Verify email delivery
    const emailOk = await verifyEmailDelivery()
    
    // Step 5: Verify report
    const reportOk = await verifyReport()
    
    // Step 6: Check for duplicates
    const noDuplicates = await checkForDuplicateEmails()

    // Final summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 Test Summary:')
    console.log(`   Audit ID: ${auditId}`)
    console.log(`   Status: ${finalAudit.status}`)
    console.log(`   Email Sent: ${emailOk ? '✅' : '❌'}`)
    console.log(`   Report Generated: ${reportOk ? '✅' : '❌'}`)
    console.log(`   No Duplicates: ${noDuplicates ? '✅' : '❌'}`)
    console.log(`   Total Emails: ${emailSendTimes.length}`)

    if (emailOk && reportOk && noDuplicates && emailSendTimes.length === 1) {
      console.log('\n✅ All tests passed!')
      process.exit(0)
    } else {
      console.log('\n❌ Some tests failed')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ Test error:', error)
    process.exit(1)
  }
}

runFullTest()

