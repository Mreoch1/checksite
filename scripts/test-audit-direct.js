/**
 * Direct audit test using Supabase
 * Creates audit, monitors processing, checks email delivery
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const TEST_URL = 'https://seoauditpro.net'
const TEST_EMAIL = 'Mreoch82@hotmail.com'
const TEST_MODULES = ['performance', 'crawl_health', 'on_page', 'mobile']

let auditId = null
let emailSendTimes = []

async function createAudit() {
  console.log('\n📝 Step 1: Creating test audit...')
  console.log(`   URL: ${TEST_URL}`)
  console.log(`   Email: ${TEST_EMAIL}`)
  console.log(`   Modules: ${TEST_MODULES.join(', ')}`)

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

  // Create audit
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .insert({
      customer_id: customer.id,
      url: TEST_URL,
      status: 'pending',
      total_price_cents: 1999,
    })
    .select()
    .single()

  if (auditError || !audit) {
    console.error('❌ Failed to create audit:', auditError)
    return null
  }

  auditId = audit.id
  console.log(`✅ Audit created: ${auditId}`)

  // Create audit modules
  const moduleRecords = TEST_MODULES.map(moduleKey => ({
    audit_id: audit.id,
    module_key: moduleKey,
    enabled: true,
  }))

  const { error: modulesError } = await supabase
    .from('audit_modules')
    .insert(moduleRecords)

  if (modulesError) {
    console.error('⚠️  Error creating modules:', modulesError)
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
    // Use test endpoint that doesn't require authentication
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

async function monitor(maxMinutes = 10) {
  console.log(`\n⏳ Monitoring audit (max ${maxMinutes} minutes)...`)
  
  const startTime = Date.now()
  const maxWait = maxMinutes * 60 * 1000
  let lastStatus = null
  let lastEmailSentAt = null
  let triggerCount = 0

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

    // Email sent
    if (audit.email_sent_at && audit.email_sent_at !== lastEmailSentAt) {
      const emailTime = new Date(audit.email_sent_at)
      emailSendTimes.push(emailTime)
      console.log(`\n📧 Email sent: ${emailTime.toISOString()} (${emailSendTimes.length} total)`)
      lastEmailSentAt = audit.email_sent_at
    }

    // Progress
    const elapsed = Math.floor((Date.now() - startTime) / 1000)
    process.stdout.write(`\r   [${elapsed}s] Status: ${audit.status} | Report: ${audit.formatted_report_html ? 'Yes' : 'No'} | Email: ${audit.email_sent_at ? 'Sent' : 'No'}`)

    // Complete?
    if (audit.status === 'completed' && audit.formatted_report_html && audit.email_sent_at) {
      console.log('\n\n✅ Audit completed!')
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
    if (length < 1000) {
      console.warn('⚠️  Report seems short')
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
    .eq('customer_id', (await supabase.from('customers').select('id').eq('email', TEST_EMAIL).single()).data?.id)
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
  console.log('🧪 Full Audit Flow Test')
  console.log('='.repeat(50))

  try {
    const id = await createAudit()
    if (!id) {
      console.error('\n❌ Failed to create audit')
      process.exit(1)
    }

    await triggerQueue()
    const final = await monitor(10)

    if (!final) {
      console.error('\n❌ Audit not found')
      process.exit(1)
    }

    const success = await verifyResults()

    console.log('\n' + '='.repeat(50))
    console.log('📊 Summary:')
    console.log(`   Audit ID: ${auditId}`)
    console.log(`   Status: ${final.status}`)
    console.log(`   Emails: ${emailSendTimes.length}`)
    console.log(`   Result: ${success ? '✅ PASS' : '❌ FAIL'}`)

    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

run()

