#!/usr/bin/env ts-node

/**
 * Incremental Queue Test
 * 
 * Tests queue processing incrementally:
 * 1. One audit
 * 2. Two audits
 * 3. Continue if successful
 * 
 * Stops on first failure and reports details
 */

import { createClient } from '@supabase/supabase-js'
import https from 'https'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.net'
const QUEUE_SECRET = process.env.QUEUE_SECRET
const TEST_EMAIL = process.env.TEST_EMAIL || 'Mreoch82@hotmail.com'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const TEST_URLS = [
  'https://example.com',
  'https://nextjs.org/docs',
  'https://tripplanner.com',
  'https://wikipedia.org',
  'https://github.com',
]

async function makeRequest(url: string, options: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const client = urlObj.protocol === 'https:' ? https : require('http')
    
    const req = client.request(url, options, (res: any) => {
      let data = ''
      res.on('data', (chunk: any) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({ status: res.statusCode || 200, data: parsed })
        } catch (e) {
          resolve({ status: res.statusCode || 200, data: data })
        }
      })
    })
    
    req.on('error', reject)
    
    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    
    req.end()
  })
}

async function createTestAudit(url: string): Promise<{ auditId: string; queueId: string }> {
  // Get or create test customer
  let { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', TEST_EMAIL)
    .single()
  
  if (!customer) {
    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({ email: TEST_EMAIL })
      .select('id')
      .single()
    customer = newCustomer
  }
  
  // Create audit
  const { data: audit } = await supabase
    .from('audits')
    .insert({
      customer_id: customer!.id,
      url,
      status: 'running',
      total_price_cents: 0,
    })
    .select('id')
    .single()
  
  if (!audit) {
    throw new Error('Failed to create audit')
  }
  
  // Create modules
  const modules = ['performance', 'crawl_health', 'on_page', 'mobile']
  const moduleRecords = modules.map(moduleKey => ({
    audit_id: audit.id,
    module_key: moduleKey,
    enabled: true,
  }))
  await supabase.from('audit_modules').insert(moduleRecords)
  
  // Create queue item
  const { data: queueItem } = await supabase
    .from('audit_queue')
    .insert({
      audit_id: audit.id,
      status: 'pending',
      retry_count: 0,
    })
    .select('id')
    .single()
  
  if (!queueItem) {
    throw new Error('Failed to create queue item')
  }
  
  return { auditId: audit.id, queueId: queueItem.id }
}

async function triggerQueue(): Promise<{ processed: boolean; auditId?: string; message?: string }> {
  return new Promise((resolve, reject) => {
    const url = `${SITE_URL}/api/process-queue?secret=${QUEUE_SECRET || ''}`
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          resolve({
            processed: result.processed || false,
            auditId: result.auditId,
            message: result.message,
          })
        } catch (e) {
          resolve({ processed: false, message: 'Parse error' })
        }
      })
    }).on('error', reject)
  })
}

async function waitForCompletion(auditId: string, maxWaitSeconds: number = 180): Promise<boolean> {
  const startTime = Date.now()
  const maxWaitMs = maxWaitSeconds * 1000
  
  while (Date.now() - startTime < maxWaitMs) {
    const { data: audit } = await supabase
      .from('audits')
      .select('status, email_sent_at, formatted_report_html')
      .eq('id', auditId)
      .single()
    
    const { data: queueItems } = await supabase
      .from('audit_queue')
      .select('status, completed_at')
      .eq('audit_id', auditId)
    
    const queueItem = queueItems && queueItems.length > 0 ? queueItems[0] : null
    
    if (audit && 
        audit.status === 'completed' && 
        audit.email_sent_at && 
        !audit.email_sent_at.startsWith('sending_') &&
        audit.email_sent_at.length > 10 &&
        audit.formatted_report_html &&
        queueItem && 
        queueItem.status === 'completed') {
      return true
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  return false
}

async function verifyAudit(auditId: string): Promise<{
  passed: boolean
  emailSent: boolean
  hasReport: boolean
  queueCompleted: boolean
  status: string
}> {
  const { data: audit } = await supabase
    .from('audits')
    .select('status, email_sent_at, formatted_report_html')
    .eq('id', auditId)
    .single()
  
  const { data: queueItems } = await supabase
    .from('audit_queue')
    .select('status, completed_at')
    .eq('audit_id', auditId)
  
  const queueItem = queueItems && queueItems.length > 0 ? queueItems[0] : null
  
  const emailSent = !!(audit?.email_sent_at && 
                       !audit.email_sent_at.startsWith('sending_') &&
                       audit.email_sent_at.length > 10)
  const hasReport = !!audit?.formatted_report_html
  const queueCompleted = queueItem?.status === 'completed'
  const status = audit?.status || 'unknown'
  
  const passed = emailSent && hasReport && queueCompleted && status === 'completed'
  
  return {
    passed,
    emailSent,
    hasReport,
    queueCompleted,
    status,
  }
}

async function testNAudits(count: number): Promise<boolean> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🧪 Testing ${count} audit(s)`)
  console.log('='.repeat(60))
  
  // Create audits
  console.log(`\n📝 Creating ${count} test audit(s)...`)
  const audits: { auditId: string; queueId: string; url: string }[] = []
  
  for (let i = 0; i < count; i++) {
    const url = TEST_URLS[i % TEST_URLS.length]
    const { auditId, queueId } = await createTestAudit(url)
    audits.push({ auditId, queueId, url })
    console.log(`   ✅ Created audit ${auditId.substring(0, 8)}... for ${url}`)
  }
  
  // Process each audit
  console.log(`\n⚙️  Processing ${count} audit(s)...`)
  for (let i = 0; i < audits.length; i++) {
    const audit = audits[i]
    console.log(`\n   Processing audit ${i + 1}/${count}: ${audit.auditId.substring(0, 8)}...`)
    
    // Trigger queue
    const result = await triggerQueue()
    console.log(`   Queue response: processed=${result.processed}, auditId=${result.auditId ? result.auditId.substring(0, 8) + '...' : 'none'}`)
    
    if (result.auditId && result.auditId !== audit.auditId) {
      console.log(`   ⚠️  WARNING: Expected audit ${audit.auditId.substring(0, 8)}... but got ${result.auditId.substring(0, 8)}...`)
    }
    
    // Wait for completion
    console.log(`   ⏳ Waiting for completion (max 180s)...`)
    const completed = await waitForCompletion(audit.auditId, 180)
    
    if (!completed) {
      console.log(`   ❌ Timeout waiting for completion`)
      const verification = await verifyAudit(audit.auditId)
      console.log(`   Status: ${verification.status}`)
      console.log(`   Email: ${verification.emailSent ? '✅' : '❌'}`)
      console.log(`   Report: ${verification.hasReport ? '✅' : '❌'}`)
      console.log(`   Queue: ${verification.queueCompleted ? '✅' : '❌'}`)
      return false
    }
    
    // Verify
    const verification = await verifyAudit(audit.auditId)
    console.log(`   ✅ Completed!`)
    console.log(`      Email: ${verification.emailSent ? '✅' : '❌'}`)
    console.log(`      Report: ${verification.hasReport ? '✅' : '❌'}`)
    console.log(`      Queue: ${verification.queueCompleted ? '✅' : '❌'}`)
    
    if (!verification.passed) {
      console.log(`   ❌ Verification failed`)
      return false
    }
    
    // Wait a bit before next audit
    if (i < audits.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
  
  console.log(`\n✅ All ${count} audit(s) completed successfully!`)
  return true
}

async function main() {
  console.log('🧪 INCREMENTAL QUEUE TEST')
  console.log('='.repeat(60))
  console.log(`📍 Site URL: ${SITE_URL}`)
  console.log(`📧 Test Email: ${TEST_EMAIL}`)
  console.log('='.repeat(60))
  
  try {
    // Test 1 audit
    console.log('\n📊 Starting with 1 audit...')
    const test1 = await testNAudits(1)
    if (!test1) {
      console.log('\n❌ TEST FAILED: 1 audit test failed')
      process.exit(1)
    }
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    // Test 2 audits
    console.log('\n📊 Testing 2 audits...')
    const test2 = await testNAudits(2)
    if (!test2) {
      console.log('\n❌ TEST FAILED: 2 audits test failed')
      process.exit(1)
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ ALL TESTS PASSED!')
    console.log('='.repeat(60))
    console.log('✅ 1 audit: PASSED')
    console.log('✅ 2 audits: PASSED')
    console.log('\n🎉 Queue processor is working correctly!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:')
    console.error(error)
    process.exit(1)
  }
}

main().catch(console.error)

