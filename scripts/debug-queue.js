/**
 * Debug script to check why a specific audit isn't being processed
 * 
 * Make sure to set environment variables:
 * export NEXT_PUBLIC_SUPABASE_URL="your-url"
 * export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-key"
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugQueue() {
  console.log('🔍 Debugging queue processing...\n')

  // Get the specific audit
  const auditId = 'b794fc7a-709c-410c-b109-c7beeb0712d9'
  
  console.log(`📋 Checking audit: ${auditId}\n`)

  // Get audit details
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .single()

  if (auditError || !audit) {
    console.error('❌ Audit not found:', auditError)
    return
  }

  console.log('📊 Audit Details:')
  console.log(`   ID: ${audit.id}`)
  console.log(`   URL: ${audit.url}`)
  console.log(`   Status: ${audit.status}`)
  console.log(`   Created: ${audit.created_at}`)
  console.log(`   Email Sent At: ${audit.email_sent_at || 'null'}`)
  console.log(`   Has Report: ${audit.formatted_report_html ? 'Yes' : 'No'}`)
  console.log('')

  // Get queue item
  const { data: queueItem, error: queueError } = await supabase
    .from('audit_queue')
    .select('*')
    .eq('audit_id', auditId)
    .single()

  if (queueError || !queueItem) {
    console.error('❌ Queue item not found:', queueError)
    return
  }

  console.log('📦 Queue Item Details:')
  console.log(`   ID: ${queueItem.id}`)
  console.log(`   Status: ${queueItem.status}`)
  console.log(`   Created: ${queueItem.created_at}`)
  console.log(`   Started: ${queueItem.started_at || 'null'}`)
  console.log(`   Completed: ${queueItem.completed_at || 'null'}`)
  console.log(`   Retry Count: ${queueItem.retry_count}`)
  console.log(`   Last Error: ${queueItem.last_error || 'null'}`)
  console.log('')

  // Simulate queue processor logic
  console.log('🔍 Simulating Queue Processor Logic:\n')

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const queueCreated = new Date(queueItem.created_at).getTime()
  const ageMinutes = Math.round((Date.now() - queueCreated) / 1000 / 60)

  console.log(`1. 5-minute delay check:`)
  console.log(`   Queue created: ${queueItem.created_at}`)
  console.log(`   5 minutes ago: ${fiveMinutesAgo}`)
  console.log(`   Age: ${ageMinutes} minutes`)
  console.log(`   Passes 5-min check: ${queueItem.created_at < fiveMinutesAgo ? '✅ YES' : '❌ NO'}`)
  console.log('')

  console.log(`2. Email sent check:`)
  console.log(`   email_sent_at: ${audit.email_sent_at || 'null'}`)
  console.log(`   Starts with "sending_": ${audit.email_sent_at?.startsWith('sending_') ? 'Yes' : 'No'}`)
  console.log(`   Passes email check: ${!audit.email_sent_at || audit.email_sent_at.startsWith('sending_') ? '✅ YES' : '❌ NO'}`)
  console.log('')

  console.log(`3. Queue status check:`)
  console.log(`   Queue status: ${queueItem.status}`)
  console.log(`   Passes status check: ${queueItem.status === 'pending' ? '✅ YES' : '❌ NO'}`)
  console.log('')

  // Check what the queue processor query would return
  console.log('🔍 Testing Queue Processor Query:\n')
  
  const { data: queueItems, error: findError } = await supabase
    .from('audit_queue')
    .select('*, audits(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10)

  if (findError) {
    console.error('❌ Error fetching queue items:', findError)
    return
  }

  console.log(`   Found ${queueItems?.length || 0} pending queue items`)
  
  if (queueItems && queueItems.length > 0) {
    console.log('\n   Queue items:')
    queueItems.forEach((item, idx) => {
      const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
      console.log(`   ${idx + 1}. Queue ID: ${item.id}`)
      console.log(`      Audit ID: ${item.audit_id}`)
      console.log(`      URL: ${audit?.url || 'Unknown'}`)
      console.log(`      Created: ${item.created_at}`)
      console.log(`      Email Sent: ${audit?.email_sent_at || 'null'}`)
      console.log(`      Age: ${Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000 / 60)} minutes`)
      
      // Check if this item would pass filters
      const passesDelay = item.created_at < fiveMinutesAgo
      const passesEmail = !audit?.email_sent_at || audit.email_sent_at.startsWith('sending_')
      const passesStatus = item.status === 'pending'
      
      console.log(`      Would Process: ${passesDelay && passesEmail && passesStatus ? '✅ YES' : '❌ NO'}`)
      if (!passesDelay) console.log(`         - Fails 5-min delay check`)
      if (!passesEmail) console.log(`         - Fails email check`)
      if (!passesStatus) console.log(`         - Fails status check`)
      console.log('')
    })
  }

  // Final verdict
  console.log('\n📋 Final Verdict:')
  const shouldProcess = 
    queueItem.status === 'pending' &&
    queueItem.created_at < fiveMinutesAgo &&
    (!audit.email_sent_at || audit.email_sent_at.startsWith('sending_'))

  if (shouldProcess) {
    console.log('   ✅ This audit SHOULD be processed but isn\'t being picked up')
    console.log('   🔍 Possible causes:')
    console.log('      - Database query issue (audits join)')
    console.log('      - Queue processor not finding it in the query results')
    console.log('      - Race condition or timing issue')
  } else {
    console.log('   ❌ This audit is being correctly filtered out')
    if (queueItem.status !== 'pending') {
      console.log(`      Reason: Queue status is "${queueItem.status}", not "pending"`)
    }
    if (queueItem.created_at >= fiveMinutesAgo) {
      console.log(`      Reason: Created less than 5 minutes ago (${ageMinutes} minutes)`)
    }
    if (audit.email_sent_at && !audit.email_sent_at.startsWith('sending_')) {
      console.log(`      Reason: Email already sent at ${audit.email_sent_at}`)
    }
  }
}

debugQueue()
  .then(() => {
    console.log('\n✅ Debug complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

