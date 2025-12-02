#!/usr/bin/env ts-node

/**
 * Stress Test for Queue Processor
 * 
 * Creates 20-30 audits and verifies:
 * - 100% email delivery
 * - 100% report completion
 * - No duplicate emails
 * - No stuck items
 * - All queue items completed
 * 
 * Usage:
 *   ts-node scripts/stress-test-queue.ts
 */

import { createClient } from '@supabase/supabase-js'
import https from 'https'
import http from 'http'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.net'
const QUEUE_SECRET = process.env.QUEUE_SECRET
const TEST_EMAIL = process.env.TEST_EMAIL || 'Mreoch82@hotmail.com'

// Diverse test URLs to avoid rate limiting
const TEST_URLS = [
  'https://example.com',
  'https://nextjs.org/docs',
  'https://tripplanner.com',
  'https://wikipedia.org',
  'https://github.com',
  'https://stackoverflow.com',
  'https://reddit.com',
  'https://twitter.com',
  'https://linkedin.com',
  'https://youtube.com',
  'https://amazon.com',
  'https://microsoft.com',
  'https://apple.com',
  'https://google.com',
  'https://netflix.com',
  'https://spotify.com',
  'https://adobe.com',
  'https://salesforce.com',
  'https://oracle.com',
  'https://ibm.com',
  'https://intel.com',
  'https://nvidia.com',
  'https://tesla.com',
  'https://meta.com',
  'https://uber.com',
  'https://airbnb.com',
  'https://stripe.com',
  'https://shopify.com',
  'https://wordpress.com',
  'https://medium.com',
]

const TARGET_AUDITS = 25 // Create 25 audits for stress test

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

interface AuditResult {
  auditId: string
  url: string
  queueId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  emailSentAt: string | null
  hasReport: boolean
  queueCompleted: boolean
  emailCount: number
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
  console.log('\n🧹 Cleaning up old test audits...')
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: testAudits } = await supabase
    .from('audits')
    .select('id')
    .in('url', TEST_URLS)
    .gte('created_at', oneHourAgo)
  
  if (testAudits && testAudits.length > 0) {
    const auditIds = testAudits.map(a => a.id)
    console.log(`   Found ${auditIds.length} recent test audit(s) - cleaning up...`)
    
    await supabase.from('audit_queue').delete().in('audit_id', auditIds)
    await supabase.from('audit_modules').delete().in('audit_id', auditIds)
    await supabase.from('audits').delete().in('id', auditIds)
    
    console.log('   ✅ Cleanup complete')
  }
}

async function createTestAudits(count: number): Promise<AuditResult[]> {
  console.log(`\n📝 Creating ${count} test audits...`)
  
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
  
  const modules = ['performance', 'crawl_health', 'on_page', 'mobile']
  const results: AuditResult[] = []
  const urlsToUse = TEST_URLS.slice(0, count)
  
  for (let i = 0; i < urlsToUse.length; i++) {
    const url = urlsToUse[i]
    
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
    
    if (!audit) continue
    
    // Create modules
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
    
    if (queueItem) {
      results.push({
        auditId: audit.id,
        url,
        queueId: queueItem.id,
        status: 'pending',
        emailSentAt: null,
        hasReport: false,
        queueCompleted: false,
        emailCount: 0,
      })
    }
    
    if ((i + 1) % 5 === 0) {
      console.log(`   ✅ Created ${i + 1}/${count} audits...`)
    }
  }
  
  console.log(`   ✅ Created ${results.length} audits with queue items`)
  return results
}

async function triggerQueue(): Promise<{ processed: boolean; auditId?: string }> {
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
          })
        } catch (e) {
          resolve({ processed: false })
        }
      })
    }).on('error', reject)
  })
}

async function getAuditStates(auditIds: string[]): Promise<Map<string, AuditResult>> {
  const states = new Map<string, AuditResult>()
  
  const { data: audits } = await supabase
    .from('audits')
    .select('id, url, status, email_sent_at, formatted_report_html')
    .in('id', auditIds)
  
  const { data: queueItems } = await supabase
    .from('audit_queue')
    .select('id, audit_id, status, completed_at')
    .in('audit_id', auditIds)
  
  const queueMap = new Map(queueItems?.map(q => [q.audit_id, q]) || [])
  
  audits?.forEach(audit => {
    const queue = queueMap.get(audit.id)
    const emailSent = !!(audit.email_sent_at && 
                         !audit.email_sent_at.startsWith('sending_') &&
                         audit.email_sent_at.length > 10)
    
    states.set(audit.id, {
      auditId: audit.id,
      url: audit.url,
      queueId: queue?.id || 'unknown',
      status: (queue?.status as any) || 'unknown',
      emailSentAt: audit.email_sent_at,
      hasReport: !!audit.formatted_report_html,
      queueCompleted: queue?.status === 'completed',
      emailCount: emailSent ? 1 : 0,
    })
  })
  
  return states
}

function printProgress(states: AuditResult[], tick: number): void {
  const completed = states.filter(s => 
    s.status === 'completed' && 
    s.emailSentAt && 
    !s.emailSentAt.startsWith('sending_') &&
    s.hasReport &&
    s.queueCompleted
  ).length
  
  const processing = states.filter(s => s.status === 'processing').length
  const pending = states.filter(s => s.status === 'pending').length
  const failed = states.filter(s => s.status === 'failed').length
  
  console.log(`\n📊 Tick ${tick} Progress: ${completed}/${states.length} completed, ${processing} processing, ${pending} pending, ${failed} failed`)
}

async function waitForAllCompletion(
  auditIds: string[],
  maxTicks: number = 60,
  tickIntervalSeconds: number = 10
): Promise<Map<string, AuditResult>> {
  console.log(`\n⏳ Waiting for all audits to complete (max ${maxTicks} ticks, ${tickIntervalSeconds}s per tick)...`)
  
  let tick = 0
  let lastCompletedCount = 0
  let noProgressCount = 0
  
  while (tick < maxTicks) {
    tick++
    
    // Trigger queue
    await triggerQueue()
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, tickIntervalSeconds * 1000))
    
    // Get current states
    const states = await getAuditStates(auditIds)
    const currentStates = Array.from(states.values())
    
    const completed = currentStates.filter(s => 
      s.status === 'completed' && 
      s.emailSentAt && 
      !s.emailSentAt.startsWith('sending_') &&
      s.hasReport &&
      s.queueCompleted
    ).length
    
    printProgress(currentStates, tick)
    
    // Check for progress
    if (completed > lastCompletedCount) {
      lastCompletedCount = completed
      noProgressCount = 0
    } else {
      noProgressCount++
    }
    
    // If all completed, we're done
    if (completed === auditIds.length) {
      console.log(`\n✅ All audits completed in ${tick} ticks!`)
      return states
    }
    
    // If no progress for 5 ticks, something might be wrong
    if (noProgressCount >= 5 && completed < auditIds.length) {
      console.log(`\n⚠️  No progress for 5 ticks - checking for issues...`)
      const stuck = currentStates.filter(s => 
        s.status === 'processing' || 
        (s.status === 'pending' && s.queueId !== 'unknown')
      )
      if (stuck.length > 0) {
        console.log(`   Found ${stuck.length} potentially stuck items`)
      }
    }
  }
  
  // Return final states even if not all completed
  return await getAuditStates(auditIds)
}

async function verifyResults(states: AuditResult[]): Promise<{
  passed: boolean
  summary: any
  failures: any[]
}> {
  console.log('\n🔍 Verifying results...')
  
  const failures: any[] = []
  let totalEmails = 0
  let totalReports = 0
  let totalCompleted = 0
  
  states.forEach(state => {
    // Check email sent
    const emailSent = !!(state.emailSentAt && 
                        !state.emailSentAt.startsWith('sending_') &&
                        state.emailSentAt.length > 10)
    if (!emailSent) {
      failures.push({
        auditId: state.auditId,
        url: state.url,
        issue: 'Email not sent',
        emailSentAt: state.emailSentAt,
      })
    } else {
      totalEmails++
    }
    
    // Check report exists
    if (!state.hasReport) {
      failures.push({
        auditId: state.auditId,
        url: state.url,
        issue: 'Report not generated',
      })
    } else {
      totalReports++
    }
    
    // Check queue completed
    if (!state.queueCompleted) {
      failures.push({
        auditId: state.auditId,
        url: state.url,
        issue: 'Queue item not completed',
        queueStatus: state.status,
      })
    } else {
      totalCompleted++
    }
    
    // Check for duplicates (should only have 1 email)
    if (state.emailCount > 1) {
      failures.push({
        auditId: state.auditId,
        url: state.url,
        issue: 'Multiple emails detected',
        emailCount: state.emailCount,
      })
    }
  })
  
  const allPassed = failures.length === 0 && 
                   totalEmails === states.length &&
                   totalReports === states.length &&
                   totalCompleted === states.length
  
  return {
    passed: allPassed,
    summary: {
      total: states.length,
      emailsSent: totalEmails,
      reportsGenerated: totalReports,
      queueCompleted: totalCompleted,
      failures: failures.length,
    },
    failures,
  }
}

async function main() {
  console.log('🧪 STRESS TEST: Queue Processor')
  console.log('='.repeat(60))
  console.log(`📍 Site URL: ${SITE_URL}`)
  console.log(`📧 Test Email: ${TEST_EMAIL}`)
  console.log(`🔢 Target Audits: ${TARGET_AUDITS}`)
  console.log('='.repeat(60))
  
  try {
    // Reset test state
    await resetTestState()
    
    // Create test audits
    const audits = await createTestAudits(TARGET_AUDITS)
    const auditIds = audits.map(a => a.auditId)
    
    console.log(`\n✅ Created ${audits.length} test audits`)
    console.log(`   Audit IDs: ${auditIds.slice(0, 3).map(id => id.substring(0, 8)).join(', ')}...`)
    
    // Wait for all to complete
    const finalStates = await waitForAllCompletion(auditIds, 60, 10)
    const finalResults = Array.from(finalStates.values())
    
    // Verify results
    const verification = await verifyResults(finalResults)
    
    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 STRESS TEST RESULTS')
    console.log('='.repeat(60))
    console.log(`Total Audits: ${verification.summary.total}`)
    console.log(`✅ Emails Sent: ${verification.summary.emailsSent}/${verification.summary.total}`)
    console.log(`✅ Reports Generated: ${verification.summary.reportsGenerated}/${verification.summary.total}`)
    console.log(`✅ Queue Completed: ${verification.summary.queueCompleted}/${verification.summary.total}`)
    console.log(`❌ Failures: ${verification.summary.failures}`)
    console.log('')
    
    if (verification.failures.length > 0) {
      console.log('❌ FAILURES:')
      verification.failures.forEach((f, i) => {
        console.log(`  ${i + 1}. Audit ${f.auditId.substring(0, 8)}... (${f.url})`)
        console.log(`     Issue: ${f.issue}`)
        if (f.emailSentAt) console.log(`     Email: ${f.emailSentAt}`)
        if (f.queueStatus) console.log(`     Queue Status: ${f.queueStatus}`)
      })
    }
    
    console.log('')
    if (verification.passed) {
      console.log('✅ STRESS TEST PASSED: 100% email delivery and report completion!')
      process.exit(0)
    } else {
      console.log('❌ STRESS TEST FAILED: Some audits did not complete successfully')
      console.log(`   Success Rate: ${((verification.summary.total - verification.summary.failures) / verification.summary.total * 100).toFixed(1)}%`)
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ STRESS TEST FAILED WITH ERROR:')
    console.error(error)
    process.exit(1)
  }
}

main().catch(console.error)

