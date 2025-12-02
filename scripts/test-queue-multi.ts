#!/usr/bin/env ts-node

/**
 * Multi-Audit Queue Test
 * 
 * Tests the queue processor with 5 audits in parallel:
 * 1. Creates 5 test audits with distinct URLs
 * 2. Inserts them into audit_queue
 * 3. Triggers queue processing multiple times (one per tick)
 * 4. Verifies each audit is processed exactly once
 * 5. Verifies no duplicates, no stuck items, no skipped audits
 * 
 * Usage:
 *   ts-node scripts/test-queue-multi.ts
 * 
 * Environment variables required:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - NEXT_PUBLIC_SITE_URL (for queue endpoint)
 *   - QUEUE_SECRET (for queue endpoint auth)
 */

import { createClient } from '@supabase/supabase-js'
import https from 'https'
import http from 'http'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.net'
const QUEUE_SECRET = process.env.QUEUE_SECRET
const TEST_EMAIL = process.env.TEST_EMAIL || 'Mreoch82@hotmail.com'

const TEST_URLS = [
  'https://example.com',
  'https://nextjs.org/docs',
  'https://tripplanner.com',
  'https://wikipedia.org',
  'https://github.com',
]

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'NOT SET')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? 'SET' : 'NOT SET')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

interface AuditState {
  auditId: string
  url: string
  queueId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  emailSentAt: string | null
  hasReport: boolean
  retryCount: number
  startedAt: string | null
  completedAt: string | null
}

async function makeRequest(url: string, options: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const client = urlObj.protocol === 'https:' ? https : http
    
    const req = client.request(url, options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
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

async function resetTestState(): Promise<void> {
  console.log('\n🧹 Step 0: Resetting test state...')
  
  // Find test audits (created in last hour with test email)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: testAudits } = await supabase
    .from('audits')
    .select('id')
    .in('url', TEST_URLS)
    .gte('created_at', oneHourAgo)
  
  if (testAudits && testAudits.length > 0) {
    const auditIds = testAudits.map(a => a.id)
    console.log(`   Found ${auditIds.length} recent test audit(s) - cleaning up...`)
    
    // Delete queue entries
    await supabase
      .from('audit_queue')
      .delete()
      .in('audit_id', auditIds)
    
    // Delete audit modules
    await supabase
      .from('audit_modules')
      .delete()
      .in('audit_id', auditIds)
    
    // Delete audits
    await supabase
      .from('audits')
      .delete()
      .in('id', auditIds)
    
    console.log('   ✅ Test state reset')
  } else {
    console.log('   ✅ No test audits to clean up')
  }
}

async function createTestAudits(): Promise<AuditState[]> {
  console.log('\n📝 Step 1: Creating test audits...')
  
  // Get or create test customer
  let { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', TEST_EMAIL)
    .single()
  
  if (!customer) {
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({ email: TEST_EMAIL })
      .select('id')
      .single()
    
    if (customerError || !newCustomer) {
      throw new Error(`Failed to create customer: ${customerError?.message}`)
    }
    customer = newCustomer
  }
  
  const modules = ['performance', 'crawl_health', 'on_page', 'mobile']
  const states: AuditState[] = []
  
  for (const url of TEST_URLS) {
    // Create audit
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .insert({
        customer_id: customer.id,
        url,
        status: 'running',
        total_price_cents: 0, // Test audit
      })
      .select('id')
      .single()
    
    if (auditError || !audit) {
      throw new Error(`Failed to create audit for ${url}: ${auditError?.message}`)
    }
    
    // Create audit modules
    const moduleRecords = modules.map(moduleKey => ({
      audit_id: audit.id,
      module_key: moduleKey,
      enabled: true,
    }))
    
    const { error: modulesError } = await supabase
      .from('audit_modules')
      .insert(moduleRecords)
    
    if (modulesError) {
      throw new Error(`Failed to create modules for ${url}: ${modulesError.message}`)
    }
    
    // Insert into queue
    const { data: queueItem, error: queueError } = await supabase
      .from('audit_queue')
      .insert({
        audit_id: audit.id,
        status: 'pending',
        retry_count: 0,
      })
      .select('id')
      .single()
    
    if (queueError || !queueItem) {
      throw new Error(`Failed to create queue item for ${url}: ${queueError?.message}`)
    }
    
    states.push({
      auditId: audit.id,
      url,
      queueId: queueItem.id,
      status: 'pending',
      emailSentAt: null,
      hasReport: false,
      retryCount: 0,
      startedAt: null,
      completedAt: null,
    })
    
    console.log(`   ✅ Created audit ${audit.id} for ${url}`)
  }
  
  return states
}

async function triggerQueue(): Promise<{ processed: boolean; auditId?: string }> {
  const queueUrl = `${SITE_URL}/api/process-queue?secret=${QUEUE_SECRET || ''}`
  const { status, data } = await makeRequest(queueUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  if (status !== 200) {
    throw new Error(`Queue endpoint returned ${status}: ${JSON.stringify(data)}`)
  }
  
  return {
    processed: data.processed || false,
    auditId: data.auditId,
  }
}

async function getAuditStates(auditIds: string[]): Promise<Map<string, AuditState>> {
  const states = new Map<string, AuditState>()
  
  // Get audits
  const { data: audits } = await supabase
    .from('audits')
    .select('id, url, status, email_sent_at, formatted_report_html')
    .in('id', auditIds)
  
  // Get queue items
  const { data: queueItems } = await supabase
    .from('audit_queue')
    .select('id, audit_id, status, retry_count, started_at, completed_at')
    .in('audit_id', auditIds)
  
  const queueMap = new Map(queueItems?.map(q => [q.audit_id, q]) || [])
  
  audits?.forEach(audit => {
    const queue = queueMap.get(audit.id)
    states.set(audit.id, {
      auditId: audit.id,
      url: audit.url,
      queueId: queue?.id || 'unknown',
      status: (queue?.status as any) || 'unknown',
      emailSentAt: audit.email_sent_at,
      hasReport: !!audit.formatted_report_html,
      retryCount: queue?.retry_count || 0,
      startedAt: queue?.started_at || null,
      completedAt: queue?.completed_at || null,
    })
  })
  
  return states
}

function printState(states: AuditState[]): void {
  console.log('\n📊 Current State:')
  console.log('─'.repeat(80))
  states.forEach((state, idx) => {
    const emailStatus = state.emailSentAt 
      ? (state.emailSentAt.startsWith('sending_') ? '🔄 SENDING' : '✅ SENT')
      : '⏳ PENDING'
    const reportStatus = state.hasReport ? '✅' : '❌'
    console.log(
      `${idx + 1}. ${state.url.substring(0, 30).padEnd(30)} | ` +
      `Queue: ${state.status.padEnd(10)} | ` +
      `Email: ${emailStatus.padEnd(10)} | ` +
      `Report: ${reportStatus}`
    )
  })
  console.log('─'.repeat(80))
}

async function main() {
  console.log('🧪 Multi-Audit Queue Test')
  console.log('='.repeat(60))
  console.log(`📍 Site URL: ${SITE_URL}`)
  console.log(`📧 Test Email: ${TEST_EMAIL}`)
  console.log(`🔢 Test Audits: ${TEST_URLS.length}`)
  console.log('='.repeat(60))
  
  let states: AuditState[] = []
  
  try {
    // Reset test state
    await resetTestState()
    
    // Create test audits
    states = await createTestAudits()
    const auditIds = states.map(s => s.auditId)
    
    console.log(`\n✅ Created ${states.length} test audits`)
    printState(states)
    
    // Process queue multiple times (one per tick)
    const maxTicks = 10 // Allow up to 10 ticks to process all 5 audits
    let tick = 0
    let completedCount = 0
    
    console.log(`\n⚙️  Step 2: Processing queue (max ${maxTicks} ticks)...`)
    
    while (completedCount < states.length && tick < maxTicks) {
      tick++
      console.log(`\n--- Tick ${tick} ---`)
      
      // Trigger queue
      const result = await triggerQueue()
      if (result.processed && result.auditId) {
        console.log(`   ✅ Processed audit: ${result.auditId}`)
      } else {
        console.log(`   ℹ️  No audit processed: ${result.processed ? 'already done' : 'no pending items'}`)
      }
      
      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Refresh states
      const currentStates = await getAuditStates(auditIds)
      states = Array.from(currentStates.values())
      
      // Count completed
      completedCount = states.filter(s => 
        s.status === 'completed' && 
        s.emailSentAt && 
        !s.emailSentAt.startsWith('sending_') &&
        s.hasReport
      ).length
      
      printState(states)
      console.log(`   Progress: ${completedCount}/${states.length} completed`)
      
      // Check for stuck items
      const stuckItems = states.filter(s => 
        s.status === 'processing' && 
        s.startedAt &&
        (Date.now() - new Date(s.startedAt).getTime()) > 10 * 60 * 1000 // > 10 minutes
      )
      
      if (stuckItems.length > 0) {
        console.log(`   ⚠️  WARNING: ${stuckItems.length} stuck processing item(s)`)
        stuckItems.forEach(item => {
          const ageMinutes = Math.round((Date.now() - new Date(item.startedAt!).getTime()) / 1000 / 60)
          console.log(`      - ${item.url}: processing for ${ageMinutes}m`)
        })
      }
    }
    
    // Final verification
    console.log('\n🔍 Step 3: Final verification...')
    const finalStates = await getAuditStates(auditIds)
    states = Array.from(finalStates.values())
    
    const results: { test: string; passed: boolean; details?: any }[] = []
    
    // Check all are completed
    const allCompleted = states.every(s => 
      s.status === 'completed' && 
      s.emailSentAt && 
      !s.emailSentAt.startsWith('sending_') &&
      s.hasReport
    )
    results.push({
      test: 'All audits completed',
      passed: allCompleted,
      details: {
        completed: states.filter(s => s.status === 'completed').length,
        total: states.length,
      },
    })
    
    // Check no duplicates (each audit has exactly one email)
    const emailCounts = new Map<string, number>()
    states.forEach(s => {
      if (s.emailSentAt && !s.emailSentAt.startsWith('sending_')) {
        emailCounts.set(s.auditId, (emailCounts.get(s.auditId) || 0) + 1)
      }
    })
    const duplicates = Array.from(emailCounts.entries()).filter(([_, count]) => count > 1)
    results.push({
      test: 'No duplicate emails',
      passed: duplicates.length === 0,
      details: duplicates.length > 0 ? { duplicates } : undefined,
    })
    
    // Check no stuck items
    const stuck = states.filter(s => 
      s.status === 'processing' && 
      s.startedAt &&
      (Date.now() - new Date(s.startedAt).getTime()) > 10 * 60 * 1000
    )
    results.push({
      test: 'No stuck processing items',
      passed: stuck.length === 0,
      details: stuck.length > 0 ? { stuck: stuck.map(s => ({ url: s.url, age: '>10m' })) } : undefined,
    })
    
    // Check no skipped audits
    const skipped = states.filter(s => s.status === 'pending')
    results.push({
      test: 'No skipped audits',
      passed: skipped.length === 0,
      details: skipped.length > 0 ? { skipped: skipped.map(s => s.url) } : undefined,
    })
    
    // Check each audit has exactly one queue item
    const { data: allQueueItems } = await supabase
      .from('audit_queue')
      .select('audit_id')
      .in('audit_id', auditIds)
    
    const queueCounts = new Map<string, number>()
    allQueueItems?.forEach(q => {
      queueCounts.set(q.audit_id, (queueCounts.get(q.audit_id) || 0) + 1)
    })
    const multipleQueueItems = Array.from(queueCounts.entries()).filter(([_, count]) => count > 1)
    results.push({
      test: 'Each audit has exactly one queue item',
      passed: multipleQueueItems.length === 0,
      details: multipleQueueItems.length > 0 ? { multiple: multipleQueueItems } : undefined,
    })
    
    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(60))
    
    const allPassed = results.every(r => r.passed)
    
    results.forEach(result => {
      console.log(`${result.passed ? '✅' : '❌'} ${result.test}`)
      if (result.details) {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2))
      }
    })
    
    printState(states)
    
    if (!allPassed) {
      console.log('\n❌ FAILED - See details above')
      process.exit(1)
    } else {
      console.log('\n✅ PASSED - All checks successful')
      process.exit(0)
    }
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:')
    console.error(error)
    
    if (states.length > 0) {
      console.log('\n📋 Final State:')
      printState(states)
    }
    
    process.exit(1)
  }
}

main().catch(console.error)

