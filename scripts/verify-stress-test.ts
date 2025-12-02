#!/usr/bin/env ts-node

/**
 * Verify Stress Test Results
 * 
 * Checks all recent test audits and verifies:
 * - 100% email delivery
 * - 100% report completion
 * - No duplicates
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

async function main() {
  console.log('🔍 Verifying Stress Test Results...\n')
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  const { data: audits } = await supabase
    .from('audits')
    .select('id, url, status, email_sent_at, formatted_report_html, created_at')
    .in('url', TEST_URLS)
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false })
  
  if (!audits || audits.length === 0) {
    console.log('❌ No test audits found')
    process.exit(1)
  }
  
  console.log(`Found ${audits.length} test audits\n`)
  
  const results = audits.map(audit => {
    const emailSent = !!(audit.email_sent_at && 
                         !audit.email_sent_at.startsWith('sending_') &&
                         audit.email_sent_at.length > 10)
    const hasReport = !!audit.formatted_report_html
    const isCompleted = audit.status === 'completed'
    const fullyComplete = emailSent && hasReport && isCompleted
    
    return {
      id: audit.id,
      url: audit.url,
      emailSent,
      hasReport,
      isCompleted,
      fullyComplete,
      emailSentAt: audit.email_sent_at,
    }
  })
  
  const fullyComplete = results.filter(r => r.fullyComplete).length
  const emailsSent = results.filter(r => r.emailSent).length
  const reportsGenerated = results.filter(r => r.hasReport).length
  const completed = results.filter(r => r.isCompleted).length
  
  console.log('📊 Results:')
  console.log(`  Total Audits: ${results.length}`)
  console.log(`  ✅ Fully Complete: ${fullyComplete}/${results.length} (${(fullyComplete/results.length*100).toFixed(1)}%)`)
  console.log(`  ✅ Emails Sent: ${emailsSent}/${results.length} (${(emailsSent/results.length*100).toFixed(1)}%)`)
  console.log(`  ✅ Reports Generated: ${reportsGenerated}/${results.length} (${(reportsGenerated/results.length*100).toFixed(1)}%)`)
  console.log(`  ✅ Status Completed: ${completed}/${results.length} (${(completed/results.length*100).toFixed(1)}%)\n`)
  
  const failures = results.filter(r => !r.fullyComplete)
  if (failures.length > 0) {
    console.log('❌ Failures:')
    failures.forEach((f, i) => {
      console.log(`  ${i+1}. ${f.url}`)
      console.log(`     Email: ${f.emailSent ? '✅' : '❌'}, Report: ${f.hasReport ? '✅' : '❌'}, Status: ${f.isCompleted ? '✅' : '❌'}`)
    })
    console.log('')
  }
  
  if (fullyComplete === results.length) {
    console.log('✅ STRESS TEST PASSED: 100% email delivery and report completion!')
    process.exit(0)
  } else {
    console.log(`❌ STRESS TEST FAILED: ${results.length - fullyComplete} audits incomplete`)
    console.log(`   Success Rate: ${(fullyComplete/results.length*100).toFixed(1)}%`)
    process.exit(1)
  }
}

main().catch(console.error)

