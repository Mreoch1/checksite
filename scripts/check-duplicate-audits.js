/**
 * Script to check for duplicate audits and queue entries
 * Run with: node scripts/check-duplicate-audits.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate audits and queue entries...\n')

  // Check for audits for seochecksite.net
  console.log('📊 Audits for seochecksite.net:')
  const { data: seoauditAudits, error: seoauditError } = await supabase
    .from('audits')
    .select('id, url, status, created_at, email_sent_at, customer_id, customers(email)')
    .ilike('url', '%seochecksite.net%')
    .order('created_at', { ascending: false })

  if (seoauditError) {
    console.error('Error fetching audits:', seoauditError)
  } else {
    console.log(`   Found ${seoauditAudits?.length || 0} audit(s) for seochecksite.net\n`)
    if (seoauditAudits && seoauditAudits.length > 0) {
      seoauditAudits.forEach((audit, idx) => {
        const customer = Array.isArray(audit.customers) ? audit.customers[0] : audit.customers
        console.log(`   ${idx + 1}. ID: ${audit.id}`)
        console.log(`      URL: ${audit.url}`)
        console.log(`      Status: ${audit.status}`)
        console.log(`      Created: ${new Date(audit.created_at).toLocaleString()}`)
        console.log(`      Email Sent: ${audit.email_sent_at || 'NOT SENT'}`)
        console.log(`      Customer: ${customer?.email || 'Unknown'}`)
        console.log('')
      })
    }
  }

  // Check for duplicate queue entries
  console.log('\n📦 Queue entries for seochecksite.net audits:')
  if (seoauditAudits && seoauditAudits.length > 0) {
    const auditIds = seoauditAudits.map(a => a.id)
    const { data: queueItems, error: queueError } = await supabase
      .from('audit_queue')
      .select('id, audit_id, status, created_at, retry_count, last_error')
      .in('audit_id', auditIds)
      .order('created_at', { ascending: false })

    if (queueError) {
      console.error('Error fetching queue items:', queueError)
    } else {
      console.log(`   Found ${queueItems?.length || 0} queue entry/entries\n`)
      if (queueItems && queueItems.length > 0) {
        queueItems.forEach((item, idx) => {
          console.log(`   ${idx + 1}. Queue ID: ${item.id}`)
          console.log(`      Audit ID: ${item.audit_id}`)
          console.log(`      Status: ${item.status}`)
          console.log(`      Created: ${new Date(item.created_at).toLocaleString()}`)
          console.log(`      Retries: ${item.retry_count}`)
          if (item.last_error) {
            console.log(`      Last Error: ${item.last_error.substring(0, 100)}...`)
          }
          console.log('')
        })
      }
    }
  }

  // Check for audits with same URL and customer created within last hour
  console.log('\n🔍 Checking for recent duplicate audits (same URL + customer, last hour):')
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: recentAudits, error: recentError } = await supabase
    .from('audits')
    .select('id, url, status, created_at, email_sent_at, customer_id, customers(email)')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false })

  if (recentError) {
    console.error('Error fetching recent audits:', recentError)
  } else {
    // Group by URL + customer email
    const grouped = {}
    recentAudits?.forEach(audit => {
      const customer = Array.isArray(audit.customers) ? audit.customers[0] : audit.customers
      const key = `${audit.url}|${customer?.email || 'unknown'}`
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(audit)
    })

    // Find duplicates
    const duplicates = Object.entries(grouped).filter(([_, audits]) => audits.length > 1)
    if (duplicates.length > 0) {
      console.log(`   ⚠️  Found ${duplicates.length} duplicate audit group(s):\n`)
      duplicates.forEach(([key, audits]) => {
        const [url, email] = key.split('|')
        console.log(`   URL: ${url}, Email: ${email}`)
        console.log(`   Count: ${audits.length} audit(s)`)
        audits.forEach((audit, idx) => {
          console.log(`      ${idx + 1}. ID: ${audit.id}, Created: ${new Date(audit.created_at).toLocaleString()}, Email Sent: ${audit.email_sent_at ? 'YES' : 'NO'}`)
        })
        console.log('')
      })
    } else {
      console.log('   ✅ No duplicate audits found in the last hour')
    }
  }

  // Check for pending/processing queue items
  console.log('\n📋 All pending/processing queue items:')
  const { data: allPending, error: pendingError } = await supabase
    .from('audit_queue')
    .select('id, audit_id, status, created_at, retry_count, audits(url, status, email_sent_at, customers(email))')
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: true })

  if (pendingError) {
    console.error('Error fetching pending queue:', pendingError)
  } else {
    console.log(`   Found ${allPending?.length || 0} pending/processing item(s)\n`)
    if (allPending && allPending.length > 0) {
      allPending.forEach((item, idx) => {
        const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
        const customer = audit?.customers ? (Array.isArray(audit.customers) ? audit.customers[0] : audit.customers) : null
        console.log(`   ${idx + 1}. Queue ID: ${item.id}`)
        console.log(`      Audit ID: ${item.audit_id}`)
        console.log(`      URL: ${audit?.url || 'Unknown'}`)
        console.log(`      Status: ${item.status}`)
        console.log(`      Created: ${new Date(item.created_at).toLocaleString()}`)
        console.log(`      Retries: ${item.retry_count}`)
        console.log(`      Email Sent: ${audit?.email_sent_at ? 'YES' : 'NO'}`)
        console.log(`      Customer: ${customer?.email || 'Unknown'}`)
        console.log('')
      })
    }
  }

  console.log('\n✅ Check complete!')
}

checkDuplicates().catch(console.error)

