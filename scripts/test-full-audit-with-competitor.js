/**
 * Full audit test with competitor and all modules
 * Monitors from start to finish
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const TEST_URL = 'https://www.rcbiinc.com'
const TEST_COMPETITOR = 'https://graybar.com'
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

async function createAudit() {
  console.log('\n📝 Step 1: Creating test audit with all modules...')
  console.log(`   URL: ${TEST_URL}`)
  console.log(`   Competitor: ${TEST_COMPETITOR}`)
  console.log(`   Email: ${TEST_EMAIL}`)
  console.log(`   Modules: ${ALL_MODULES.length} modules`)
  console.log(`   Modules: ${ALL_MODULES.join(', ')}`)

  // Check for duplicate first
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: recentAudit } = await supabase
    .from('audits')
    .select('id, created_at')
    .eq('customer_id', (await supabase.from('customers').select('id').eq('email', TEST_EMAIL).single()).data?.id)
    .eq('url', TEST_URL)
    .gte('created_at', thirtyMinutesAgo)
    .single()

  if (recentAudit) {
    const ageMinutes = Math.round((Date.now() - new Date(recentAudit.created_at).getTime()) / 1000 / 60)
    console.error(`❌ Duplicate audit found: Created ${ageMinutes} minutes ago`)
    console.error(`   Existing audit ID: ${recentAudit.id}`)
    return null
  }

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
      console.error('❌ Failed to create customer:', createError)
      return null
    }
    customer = newCustomer
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

  // Create audit with competitor in metadata
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .insert({
      customer_id: customer.id,
      url: TEST_URL,
      status: 'pending',
      total_price_cents: totalCents,
      raw_result_json: { competitorUrl: TEST_COMPETITOR },
    })
    .select()
    .single()

  if (auditError || !audit) {
    console.error('❌ Failed to create audit:', auditError)
    return null
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
    return null
  }

  console.log('✅ Audit added to queue')
  return audit.id
}

async function triggerQueue() {
  console.log('\n⚙️  Triggering queue processing...')
  try {
    const response = await fetch('https://seochecksite.netlify.app/api/test-process-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!response.ok) {
      const text = await response.text()
      console.log(`⚠️  Queue response ${response.status}: ${text.substring(0, 200)}`)
      return
    }
    
    const data = await response.json().catch(() => ({ processed: 'unknown' }))
    console.log(`✅ Queue triggered: ${data.processed ? 'Yes' : 'No'} - ${data.message || 'processed'}`)
    if (data.auditId) {
      console.log(`   Processing audit: ${data.auditId}`)
    }
  } catch (error) {
    console.log(`⚠️  Queue trigger error: ${error.message}`)
  }
}

async function checkStatus() {
  if (!auditId) return null

  const { data: audit, error } = await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .single()

  if (error) return null
  return audit
}

async function monitor(maxMinutes = 15) {
  console.log(`\n⏳ Monitoring audit (max ${maxMinutes} minutes)...`)
  console.log('   This may take longer with all modules and competitor analysis...')
  
  const startTime = Date.now()
  const maxWait = maxMinutes * 60 * 1000
  let lastStatus = null
  let lastEmailSentAt = null
  let triggerCount = 0
  let lastReportLength = 0

  while (Date.now() - startTime < maxWait) {
    const audit = await checkStatus()
    if (!audit) {
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
      console.log(`\n📄 Report generated: ${reportLen} characters`)
      lastReportLength = reportLen
    }

    // Email sent
    if (audit.email_sent_at && audit.email_sent_at !== lastEmailSentAt) {
      const emailTime = new Date(audit.email_sent_at)
      emailSendTimes.push(emailTime)
      console.log(`\n📧 Email sent: ${emailTime.toISOString()} (${emailSendTimes.length} total)`)
      lastEmailSentAt = audit.email_sent_at
    }

    // Progress
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    process.stdout.write(`\r   [${elapsed}s] Status: ${audit.status} | Report: ${reportLen > 0 ? reportLen + ' chars' : 'No'} | Email: ${audit.email_sent_at ? 'Sent' : 'No'}`)

    // Complete?
    if (audit.status === 'completed' && audit.formatted_report_html && audit.email_sent_at) {
      console.log('\n\n✅ Audit completed successfully!')
      return audit
    }

    // Trigger queue every 30 seconds
    if (elapsed % 30 === 0 && triggerCount < elapsed / 30) {
      await triggerQueue()
      triggerCount++
    }

    await new Promise(r => setTimeout(r, 5000))
  }

  console.log('\n\n⏱️  Timeout')
  return await checkStatus()
}

async function verifyResults() {
  console.log('\n🔍 Verifying results...')
  
  const audit = await checkStatus()
  if (!audit) {
    console.error('❌ Audit not found')
    return false
  }

  let allGood = true

  // Check email
  if (!audit.email_sent_at) {
    console.error('❌ Email not sent')
    allGood = false
  } else if (emailSendTimes.length > 1) {
    console.error(`❌ Multiple emails detected: ${emailSendTimes.length}`)
    emailSendTimes.forEach((t, i) => console.error(`   ${i + 1}: ${t.toISOString()}`))
    allGood = false
  } else {
    console.log(`✅ Email sent once: ${new Date(audit.email_sent_at).toISOString()}`)
  }

  // Check report
  if (!audit.formatted_report_html) {
    console.error('❌ Report not generated')
    allGood = false
  } else {
    const length = audit.formatted_report_html.length
    console.log(`✅ Report generated: ${length} characters`)
    
    // Check for all modules
    const moduleChecks = {
      'Performance': audit.formatted_report_html.includes('Performance') || audit.formatted_report_html.includes('performance'),
      'On-Page': audit.formatted_report_html.includes('On-Page') || audit.formatted_report_html.includes('on-page'),
      'Mobile': audit.formatted_report_html.includes('Mobile') || audit.formatted_report_html.includes('mobile'),
      'Crawl Health': audit.formatted_report_html.includes('Crawl') || audit.formatted_report_html.includes('crawl'),
      'Local': audit.formatted_report_html.includes('Local') || audit.formatted_report_html.includes('local'),
      'Accessibility': audit.formatted_report_html.includes('Accessibility') || audit.formatted_report_html.includes('accessibility'),
      'Security': audit.formatted_report_html.includes('Security') || audit.formatted_report_html.includes('security'),
      'Schema': audit.formatted_report_html.includes('Schema') || audit.formatted_report_html.includes('schema'),
      'Social': audit.formatted_report_html.includes('Social') || audit.formatted_report_html.includes('social'),
      'Competitor': audit.formatted_report_html.includes('Competitor') || audit.formatted_report_html.includes('competitor') || audit.formatted_report_html.includes('graybar'),
    }
    
    console.log('\n   Module Content Check:')
    Object.entries(moduleChecks).forEach(([module, found]) => {
      console.log(`   ${module}: ${found ? '✅' : '❌'}`)
      if (!found) allGood = false
    })
    
    // Check for competitor data
    if (audit.formatted_report_html.includes('graybar') || audit.formatted_report_html.includes('Graybar')) {
      console.log('   Competitor Data: ✅ (graybar.com found)')
    } else {
      console.log('   Competitor Data: ⚠️  (graybar.com not found in report)')
    }
  }

  // Check status
  if (audit.status !== 'completed') {
    console.error(`❌ Status is ${audit.status}, expected 'completed'`)
    allGood = false
  } else {
    console.log('✅ Status: completed')
  }

  // Check for duplicates in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from('audits')
    .select('id, email_sent_at')
    .eq('url', TEST_URL)
    .eq('customer_id', audit.customer_id)
    .gte('email_sent_at', oneHourAgo)

  if (recent && recent.length > 1) {
    console.error(`❌ Found ${recent.length} audits with emails in last hour`)
    allGood = false
  } else {
    console.log('✅ No duplicate emails detected')
  }

  return allGood
}

async function run() {
  console.log('🧪 Full Audit Test with Competitor & All Modules')
  console.log('='.repeat(60))

  try {
    const id = await createAudit()
    if (!id) {
      console.error('\n❌ Failed to create audit')
      process.exit(1)
    }

    await triggerQueue()
    const final = await monitor(15)

    if (!final) {
      console.error('\n❌ Audit not found')
      process.exit(1)
    }

    const success = await verifyResults()

    console.log('\n' + '='.repeat(60))
    console.log('📊 Final Summary:')
    console.log(`   Audit ID: ${auditId}`)
    console.log(`   URL: ${TEST_URL}`)
    console.log(`   Competitor: ${TEST_COMPETITOR}`)
    console.log(`   Modules: ${ALL_MODULES.length}`)
    console.log(`   Status: ${final.status}`)
    console.log(`   Emails: ${emailSendTimes.length}`)
    console.log(`   Report: ${final.formatted_report_html?.length || 0} characters`)
    console.log(`   Result: ${success ? '✅ PASS' : '❌ FAIL'}`)

    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

run()

