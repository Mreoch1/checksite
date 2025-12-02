#!/usr/bin/env ts-node

/**
 * Single Audit Queue Test
 * 
 * Tests the complete flow for a single audit:
 * 1. Creates one test audit
 * 2. Inserts it into audit_queue
 * 3. Triggers queue processing
 * 4. Verifies exactly one email was sent
 * 5. Verifies queue item is marked completed
 * 
 * Usage:
 *   ts-node scripts/test-queue-single.ts
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
const TEST_URL = process.env.TEST_URL || 'https://example.com'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'NOT SET')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? 'SET' : 'NOT SET')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

interface TestResult {
  passed: boolean
  message: string
  details?: any
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
    .eq('url', TEST_URL)
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

async function createTestAudit(): Promise<string> {
  console.log('\n📝 Step 1: Creating test audit...')
  
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
  
  // Create audit
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .insert({
      customer_id: customer.id,
      url: TEST_URL,
      status: 'running',
      total_price_cents: 0, // Test audit
    })
    .select('id')
    .single()
  
  if (auditError || !audit) {
    throw new Error(`Failed to create audit: ${auditError?.message}`)
  }
  
  console.log(`   ✅ Audit created: ${audit.id}`)
  
  // Create audit modules
  const modules = ['performance', 'crawl_health', 'on_page', 'mobile']
  const moduleRecords = modules.map(moduleKey => ({
    audit_id: audit.id,
    module_key: moduleKey,
    enabled: true,
  }))
  
  const { error: modulesError } = await supabase
    .from('audit_modules')
    .insert(moduleRecords)
  
  if (modulesError) {
    throw new Error(`Failed to create modules: ${modulesError.message}`)
  }
  
  console.log(`   ✅ Created ${modules.length} audit modules`)
  
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
    throw new Error(`Failed to create queue item: ${queueError?.message}`)
  }
  
  console.log(`   ✅ Queue item created: ${queueItem.id}`)
  
  return audit.id
}

async function triggerQueue(expectedAuditId?: string): Promise<void> {
  console.log('\n⚙️  Step 2: Triggering queue processing...')
  
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
  
  console.log(`   ✅ Queue triggered: ${data.message || 'OK'}`)
  if (data.processed && data.auditId) {
    console.log(`   ✅ Audit processed: ${data.auditId}`)
    if (expectedAuditId && data.auditId !== expectedAuditId) {
      console.log(`   ⚠️  WARNING: Expected audit ${expectedAuditId} but got ${data.auditId}`)
      console.log(`   ℹ️  This is OK - queue processes oldest pending item first`)
    }
  } else if (data.processed === false) {
    console.log(`   ℹ️  No audit processed this tick (may be processing another audit)`)
  }
}

async function waitForCompletion(auditId: string, maxWaitSeconds: number = 120): Promise<TestResult> {
  console.log(`\n⏳ Step 3: Waiting for completion (max ${maxWaitSeconds}s)...`)
  
  const startTime = Date.now()
  const maxWaitMs = maxWaitSeconds * 1000
  
  while (Date.now() - startTime < maxWaitMs) {
    // Check audit status
    const { data: audit } = await supabase
      .from('audits')
      .select('status, email_sent_at, formatted_report_html')
      .eq('id', auditId)
      .single()
    
    // Check queue status
    const { data: queueItems } = await supabase
      .from('audit_queue')
      .select('status, completed_at')
      .eq('audit_id', auditId)
    
    const queueItem = queueItems && queueItems.length > 0 ? queueItems[0] : null
    
    if (audit && audit.status === 'completed' && 
        audit.email_sent_at && 
        audit.formatted_report_html &&
        queueItem && queueItem.status === 'completed') {
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      console.log(`   ✅ Completed in ${elapsed}s`)
      return {
        passed: true,
        message: 'Audit completed successfully',
        details: {
          auditStatus: audit.status,
          emailSentAt: audit.email_sent_at,
          hasReport: !!audit.formatted_report_html,
          queueStatus: queueItem.status,
          elapsedSeconds: elapsed,
        },
      }
    }
    
    // Wait 2 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 2000))
    process.stdout.write('.')
  }
  
  // Final check
  const { data: finalAudit } = await supabase
    .from('audits')
    .select('status, email_sent_at, formatted_report_html')
    .eq('id', auditId)
    .single()
  
  const { data: finalQueue } = await supabase
    .from('audit_queue')
    .select('status, completed_at, last_error')
    .eq('audit_id', auditId)
  
  const finalQueueItem = finalQueue && finalQueue.length > 0 ? finalQueue[0] : null
  
  return {
    passed: false,
    message: 'Timeout waiting for completion',
    details: {
      audit: finalAudit,
      queue: finalQueueItem,
      elapsedSeconds: maxWaitSeconds,
    },
  }
}

async function verifyResults(auditId: string): Promise<TestResult[]> {
  console.log('\n🔍 Step 4: Verifying results...')
  
  const results: TestResult[] = []
  
  // Check audit
  const { data: audit } = await supabase
    .from('audits')
    .select('status, email_sent_at, formatted_report_html')
    .eq('id', auditId)
    .single()
  
  if (!audit) {
    results.push({
      passed: false,
      message: 'Audit not found',
    })
    return results
  }
  
  // Check queue
  const { data: queueItems } = await supabase
    .from('audit_queue')
    .select('id, status, completed_at, retry_count')
    .eq('audit_id', auditId)
  
  const queueItem = queueItems && queueItems.length > 0 ? queueItems[0] : null
  
  // Verify audit status
  results.push({
    passed: audit.status === 'completed',
    message: `Audit status: ${audit.status} (expected: completed)`,
    details: { status: audit.status },
  })
  
  // Verify email was sent
  const emailSent = !!(audit.email_sent_at && 
                    !audit.email_sent_at.startsWith('sending_') &&
                    audit.email_sent_at.length > 10)
  results.push({
    passed: emailSent,
    message: `Email sent: ${emailSent ? 'YES' : 'NO'} (${audit.email_sent_at || 'null'})`,
    details: { email_sent_at: audit.email_sent_at },
  })
  
  // Verify report exists
  results.push({
    passed: !!audit.formatted_report_html,
    message: `Report exists: ${!!audit.formatted_report_html}`,
    details: { hasReport: !!audit.formatted_report_html },
  })
  
  // Verify queue status
  if (queueItem) {
    results.push({
      passed: queueItem.status === 'completed',
      message: `Queue status: ${queueItem.status} (expected: completed)`,
      details: { 
        queueStatus: queueItem.status,
        completedAt: queueItem.completed_at,
        retryCount: queueItem.retry_count,
      },
    })
  } else {
    results.push({
      passed: false,
      message: 'Queue item not found',
    })
  }
  
  // Verify only one queue item exists
  results.push({
    passed: !!(queueItems && queueItems.length === 1),
    message: `Queue items: ${queueItems?.length || 0} (expected: 1)`,
    details: { queueItemCount: queueItems?.length || 0 },
  })
  
  return results
}

async function main() {
  console.log('🧪 Single Audit Queue Test')
  console.log('=' .repeat(60))
  console.log(`📍 Site URL: ${SITE_URL}`)
  console.log(`📧 Test Email: ${TEST_EMAIL}`)
  console.log(`🌐 Test URL: ${TEST_URL}`)
  console.log('=' .repeat(60))
  
  let auditId: string | null = null
  
  try {
    // Reset test state
    await resetTestState()
    
    // Create test audit
    auditId = await createTestAudit()
    
    // Trigger queue multiple times until our audit is processed
    // The queue processes oldest first, so we may need to wait for other audits
    let maxTicks = 10
    let tick = 0
    let ourAuditProcessed = false
    
    while (!ourAuditProcessed && tick < maxTicks) {
      tick++
      await triggerQueue(auditId)
      
      // Check if our audit was processed
      const { data: checkAudit } = await supabase
        .from('audits')
        .select('status, email_sent_at, formatted_report_html')
        .eq('id', auditId)
        .single()
      
      if (checkAudit && checkAudit.status === 'completed' && checkAudit.email_sent_at && checkAudit.formatted_report_html) {
        ourAuditProcessed = true
        console.log(`   ✅ Our audit ${auditId} was processed on tick ${tick}`)
        break
      }
      
      // Wait a bit before next tick
      if (tick < maxTicks) {
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
    
    if (!ourAuditProcessed) {
      console.log(`   ⚠️  Our audit not processed after ${maxTicks} ticks - will wait for completion`)
    }
    
    // Wait for completion
    const completionResult = await waitForCompletion(auditId)
    
    // Verify results
    const verificationResults = await verifyResults(auditId)
    
    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(60))
    
    const allPassed = completionResult.passed && verificationResults.every(r => r.passed)
    
    if (allPassed) {
      console.log('✅ PASS: All checks passed')
    } else {
      console.log('❌ FAIL: Some checks failed')
    }
    
    console.log('\nCompletion Check:')
    console.log(`  ${completionResult.passed ? '✅' : '❌'} ${completionResult.message}`)
    if (completionResult.details) {
      console.log(`     Details:`, JSON.stringify(completionResult.details, null, 2))
    }
    
    console.log('\nVerification Checks:')
    verificationResults.forEach((result, idx) => {
      console.log(`  ${result.passed ? '✅' : '❌'} [${idx + 1}] ${result.message}`)
      if (result.details) {
        console.log(`     Details:`, JSON.stringify(result.details, null, 2))
      }
    })
    
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
    
    if (auditId) {
      console.log('\n📋 Final State:')
      const { data: audit } = await supabase
        .from('audits')
        .select('*')
        .eq('id', auditId)
        .single()
      const { data: queue } = await supabase
        .from('audit_queue')
        .select('*')
        .eq('audit_id', auditId)
      console.log('Audit:', JSON.stringify(audit, null, 2))
      console.log('Queue:', JSON.stringify(queue, null, 2))
    }
    
    process.exit(1)
  }
}

main().catch(console.error)

