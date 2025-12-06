/**
 * End-to-End Test with Full Monitoring
 * Creates audit, monitors queue processing, tracks email delivery
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const BASE_URL = 'https://seochecksite.net'
const TEST_EMAIL = 'mreoch82@hotmail.com'
const TEST_URL = 'https://example.com'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

let auditId = null
let customerId = null
let queueId = null
let startTime = Date.now()

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(step, message, status = 'info') {
  const timestamp = new Date().toLocaleTimeString()
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : status === 'warn' ? '⚠️' : '📊'
  const color = status === 'success' ? colors.green : status === 'error' ? colors.red : status === 'warn' ? colors.yellow : colors.cyan
  console.log(`${color}${icon} [${timestamp}] [${elapsed}s] ${step}: ${message}${colors.reset}`)
}

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const postData = options.body ? JSON.stringify(options.body) : null

    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    const req = https.request(reqOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          resolve({ status: res.statusCode, data: result })
        } catch (e) {
          resolve({ status: res.statusCode, data: data, raw: true })
        }
      })
    })

    req.on('error', reject)
    if (postData) req.write(postData)
    req.end()
  })
}

async function createAudit() {
  log('STEP 1', 'Creating audit via checkout API...')
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/create-checkout`, {
      method: 'POST',
      body: {
        url: TEST_URL,
        email: TEST_EMAIL,
        name: 'Test User',
        modules: ['performance', 'crawl_health', 'on_page', 'mobile'],
      },
    })

    if (response.status !== 200) {
      log('STEP 1', `Failed: ${JSON.stringify(response.data)}`, 'error')
      return false
    }

    // Extract audit ID from success URL
    const successUrl = response.data.url || response.data.successUrl
    if (successUrl) {
      const match = successUrl.match(/\/report\/([a-f0-9-]+)/)
      if (match) {
        auditId = match[1]
        log('STEP 1', `Audit created: ${auditId}`, 'success')
        return true
      }
    }

    // Fallback: query database for most recent audit
    const { data: audits } = await supabase
      .from('audits')
      .select('id, customer_id, status')
      .eq('url', TEST_URL)
      .order('created_at', { ascending: false })
      .limit(1)

    if (audits && audits.length > 0) {
      auditId = audits[0].id
      customerId = audits[0].customer_id
      log('STEP 1', `Found audit: ${auditId}`, 'success')
      return true
    }

    log('STEP 1', 'Could not determine audit ID', 'error')
    return false
  } catch (error) {
    log('STEP 1', `Error: ${error.message}`, 'error')
    return false
  }
}

async function checkAuditStatus() {
  const { data: audit, error } = await supabase
    .from('audits')
    .select('id, status, email_sent_at, completed_at, error_log, customers(email)')
    .eq('id', auditId)
    .single()

  if (error || !audit) {
    return null
  }

  return audit
}

async function checkQueueStatus() {
  const { data: queue, error } = await supabase
    .from('audit_queue')
    .select('id, status, retry_count, last_error, created_at')
    .eq('audit_id', auditId)
    .single()

  if (error || !queue) {
    return null
  }

  queueId = queue.id
  return queue
}

async function monitorProcessing() {
  log('STEP 2', 'Monitoring queue processing...')
  
  let lastStatus = null
  let lastQueueStatus = null
  let emailSent = false
  let checkCount = 0
  const maxChecks = 60 // 5 minutes max (5 second intervals)
  
  while (checkCount < maxChecks) {
    await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
    
    const audit = await checkAuditStatus()
    const queue = await checkQueueStatus()
    
    if (!audit) {
      log('STEP 2', 'Audit not found in database', 'error')
      break
    }
    
    // Check for status changes
    if (audit.status !== lastStatus) {
      log('STEP 2', `Status changed: ${lastStatus || 'N/A'} → ${audit.status}`, 'info')
      lastStatus = audit.status
    }
    
    // Check for queue status changes
    if (queue && queue.status !== lastQueueStatus) {
      log('STEP 2', `Queue status: ${queue.status} (retries: ${queue.retry_count})`, 'info')
      lastQueueStatus = queue.status
    }
    
    // Check for completion
    if (audit.status === 'completed') {
      log('STEP 2', 'Audit completed!', 'success')
      
      if (audit.completed_at) {
        const completedTime = new Date(audit.completed_at).toLocaleTimeString()
        log('STEP 2', `Completed at: ${completedTime}`, 'success')
      }
      
      // Check for email
      if (audit.email_sent_at) {
        emailSent = true
        const emailTime = new Date(audit.email_sent_at).toLocaleTimeString()
        log('STEP 3', `Email sent at: ${emailTime}`, 'success')
        log('STEP 3', `Recipient: ${audit.customers?.email || 'unknown'}`, 'success')
        break
      } else {
        log('STEP 3', 'Email not sent yet, waiting...', 'warn')
      }
    }
    
    // Check for errors
    if (audit.status === 'failed') {
      log('STEP 2', `Audit failed: ${audit.error_log || 'Unknown error'}`, 'error')
      break
    }
    
    if (queue && queue.last_error) {
      log('STEP 2', `Queue error: ${queue.last_error}`, 'warn')
    }
    
    checkCount++
    
    // Progress update every 30 seconds
    if (checkCount % 6 === 0) {
      log('STEP 2', `Still monitoring... (${checkCount * 5}s elapsed)`, 'info')
    }
  }
  
  // Final status check
  const finalAudit = await checkAuditStatus()
  if (finalAudit) {
    log('FINAL', `Final status: ${finalAudit.status}`, finalAudit.status === 'completed' ? 'success' : 'warn')
    
    if (finalAudit.email_sent_at) {
      log('FINAL', `Email sent: YES (${new Date(finalAudit.email_sent_at).toLocaleTimeString()})`, 'success')
    } else {
      log('FINAL', 'Email sent: NO', 'error')
    }
    
    if (finalAudit.error_log) {
      log('FINAL', `Error log: ${finalAudit.error_log}`, 'error')
    }
  }
  
  return { completed: finalAudit?.status === 'completed', emailSent: !!finalAudit?.email_sent_at }
}

async function verifyEmailDelivery() {
  log('STEP 4', 'Verifying email delivery...')
  
  const { data: audit } = await supabase
    .from('audits')
    .select('email_sent_at, customers(email)')
    .eq('id', auditId)
    .single()
  
  if (!audit) {
    log('STEP 4', 'Audit not found', 'error')
    return false
  }
  
  const customer = Array.isArray(audit.customers) ? audit.customers[0] : audit.customers
  const email = customer?.email
  
  if (audit.email_sent_at) {
    log('STEP 4', `✅ Email marked as sent in database`, 'success')
    log('STEP 4', `   Recipient: ${email}`, 'info')
    log('STEP 4', `   Sent at: ${new Date(audit.email_sent_at).toLocaleString()}`, 'info')
    log('STEP 4', `   Report URL: ${BASE_URL}/report/${auditId}`, 'info')
    log('STEP 4', '', 'info')
    log('STEP 4', '📧 EMAIL DELIVERY CHECKLIST:', 'warn')
    log('STEP 4', '   1. Check INBOX', 'info')
    log('STEP 4', '   2. Check SPAM/JUNK folder', 'info')
    log('STEP 4', '   3. Check "Focused" vs "Other" tabs (Outlook)', 'info')
    log('STEP 4', '   4. Search for: "admin@seochecksite.net"', 'info')
    log('STEP 4', '   5. Search for: "Website Audit Report"', 'info')
    return true
  } else {
    log('STEP 4', '❌ Email NOT sent (email_sent_at is null)', 'error')
    return false
  }
}

async function triggerQueueManually() {
  log('STEP 2.5', 'Triggering queue processor manually...')
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/process-queue`, {
      method: 'POST',
    })
    
    if (response.status === 200) {
      log('STEP 2.5', 'Queue processor triggered', 'success')
      return true
    } else {
      log('STEP 2.5', `Failed: ${JSON.stringify(response.data)}`, 'warn')
      return false
    }
  } catch (error) {
    log('STEP 2.5', `Error: ${error.message}`, 'warn')
    return false
  }
}

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 END-TO-END TEST WITH FULL MONITORING')
  console.log('='.repeat(60))
  console.log(`Test URL: ${TEST_URL}`)
  console.log(`Test Email: ${TEST_EMAIL}`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log('='.repeat(60) + '\n')
  
  startTime = Date.now()
  
  // Step 1: Create audit
  const created = await createAudit()
  if (!created) {
    log('MAIN', 'Failed to create audit, exiting', 'error')
    process.exit(1)
  }
  
  // Wait a moment for database to sync
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Step 2: Trigger queue manually (don't wait for cron)
  await triggerQueueManually()
  
  // Step 3: Monitor processing
  const result = await monitorProcessing()
  
  // Step 4: Verify email delivery
  await verifyEmailDelivery()
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`Audit ID: ${auditId}`)
  console.log(`Queue ID: ${queueId || 'N/A'}`)
  console.log(`Completed: ${result.completed ? '✅ YES' : '❌ NO'}`)
  console.log(`Email Sent: ${result.emailSent ? '✅ YES' : '❌ NO'}`)
  console.log(`Total Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
  console.log('='.repeat(60))
  
  if (result.completed && result.emailSent) {
    console.log('\n✅ SUCCESS: Audit completed and email sent!')
    console.log(`   Report: ${BASE_URL}/report/${auditId}`)
    console.log('   Check your email (including spam folder)')
  } else if (result.completed && !result.emailSent) {
    console.log('\n⚠️  PARTIAL: Audit completed but email not sent')
    console.log('   Check email configuration and logs')
  } else {
    console.log('\n❌ FAILED: Audit did not complete')
    console.log('   Check queue processing and error logs')
  }
  
  console.log('')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

