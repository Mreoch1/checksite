/**
 * Monitor a specific audit from start to finish
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')
const fs = require('fs')
const path = require('path')

// Load environment variables
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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const auditId = process.argv[2] || '03138975-d150-4965-81fb-60d89be58ed5'

let lastStatus = null
let lastQueueStatus = null
let checkCount = 0

async function checkStatus() {
  const { data: audit } = await supabase
    .from('audits')
    .select('id, status, email_sent_at, completed_at, error_log, customers(email)')
    .eq('id', auditId)
    .single()
  
  const { data: queue } = await supabase
    .from('audit_queue')
    .select('id, status, retry_count, last_error')
    .eq('audit_id', auditId)
    .single()
  
  return { audit, queue }
}

async function triggerQueue() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'seochecksite.net',
      path: '/api/process-queue',
      method: 'GET',
      timeout: 30000,
    }
    
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        resolve({ status: res.statusCode })
      })
    })
    
    req.on('error', () => resolve({ error: true }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ timeout: true })
    })
    
    req.end()
  })
}

async function monitor() {
  console.log(`\n🔍 Monitoring Audit: ${auditId}\n`)
  console.log('Press Ctrl+C to stop\n')
  
  while (true) {
    const { audit, queue } = await checkStatus()
    
    if (!audit) {
      console.log('❌ Audit not found')
      break
    }
    
    // Status changes
    if (audit.status !== lastStatus) {
      const timestamp = new Date().toLocaleTimeString()
      console.log(`[${timestamp}] 📊 Status: ${lastStatus || 'N/A'} → ${audit.status}`)
      lastStatus = audit.status
    }
    
    // Queue status changes
    if (queue && queue.status !== lastQueueStatus) {
      const timestamp = new Date().toLocaleTimeString()
      console.log(`[${timestamp}] 📋 Queue: ${queue.status} (retries: ${queue.retry_count})`)
      lastQueueStatus = queue.status
    }
    
    // Completion
    if (audit.status === 'completed') {
      const timestamp = new Date().toLocaleTimeString()
      console.log(`\n[${timestamp}] ✅ AUDIT COMPLETED!`)
      
      if (audit.completed_at) {
        console.log(`   Completed at: ${new Date(audit.completed_at).toLocaleString()}`)
      }
      
      if (audit.email_sent_at) {
        const customer = Array.isArray(audit.customers) ? audit.customers[0] : audit.customers
        console.log(`   ✅ Email sent to: ${customer?.email || 'unknown'}`)
        console.log(`   Email sent at: ${new Date(audit.email_sent_at).toLocaleString()}`)
        console.log(`   Report: https://seochecksite.net/report/${auditId}`)
        console.log('\n📧 Check your email (including spam folder)!')
        break
      } else {
        console.log(`   ⚠️  Email NOT sent yet`)
      }
    }
    
    // Errors
    if (audit.status === 'failed') {
      console.log(`\n❌ Audit failed: ${audit.error_log || 'Unknown error'}`)
      break
    }
    
    if (queue && queue.last_error) {
      console.log(`⚠️  Queue error: ${queue.last_error}`)
    }
    
    // Trigger queue every 30 seconds if still pending
    checkCount++
    if (checkCount % 6 === 0 && audit.status === 'pending') {
      console.log(`\n🔄 Triggering queue processor...`)
      await triggerQueue()
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000)) // 5 second intervals
  }
}

monitor().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})

