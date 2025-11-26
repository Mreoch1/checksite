/**
 * Check specific audit status
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkAudit() {
  const auditId = 'b794fc7a-709c-410c-b109-c7beeb0712d9'
  
  console.log(`🔍 Checking audit: ${auditId}\n`)

  // Get audit
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
  console.log(`   Status: ${audit.status}`)
  console.log(`   URL: ${audit.url}`)
  console.log(`   Has Report: ${audit.formatted_report_html ? 'Yes' : 'No'}`)
  console.log(`   Email Sent: ${audit.email_sent_at || 'Not sent'}`)
  if (audit.error_log) {
    try {
      const errorLog = typeof audit.error_log === 'string' ? JSON.parse(audit.error_log) : audit.error_log
      console.log(`   Error Log:`, JSON.stringify(errorLog, null, 2))
    } catch (e) {
      console.log(`   Error Log: ${audit.error_log}`)
    }
  }
  console.log('')

  // Get queue item
  const { data: queueItem, error: queueError } = await supabase
    .from('audit_queue')
    .select('*')
    .eq('audit_id', auditId)
    .single()

  if (queueError || !queueItem) {
    console.log('📦 Queue: Not found')
  } else {
    console.log('📦 Queue Details:')
    console.log(`   Status: ${queueItem.status}`)
    console.log(`   Retry Count: ${queueItem.retry_count}`)
    console.log(`   Last Error: ${queueItem.last_error || 'None'}`)
    console.log(`   Started At: ${queueItem.started_at || 'Not started'}`)
  }
}

checkAudit()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

