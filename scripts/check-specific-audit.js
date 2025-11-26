/**
 * Check status of a specific audit
 * Usage: node scripts/check-specific-audit.js <auditId>
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

const auditId = process.argv[2] || 'cff95d0c-32a1-4a27-9893-c3b362e1f222'

async function checkAudit() {
  console.log(`🔍 Checking audit: ${auditId}\n`)

  // Get audit details
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('*, customers(*)')
    .eq('id', auditId)
    .single()

  if (auditError || !audit) {
    console.error('❌ Audit not found:', auditError?.message)
    process.exit(1)
  }

  const customer = Array.isArray(audit.customers) ? audit.customers[0] : audit.customers

  console.log('📊 Audit Details:')
  console.log(`   ID: ${audit.id}`)
  console.log(`   URL: ${audit.url}`)
  console.log(`   Status: ${audit.status}`)
  console.log(`   Created: ${new Date(audit.created_at).toLocaleString()}`)
  console.log(`   Customer: ${customer?.email || 'Unknown'}`)
  console.log(`   Email Sent: ${audit.email_sent_at || 'NOT SENT'}`)
  console.log(`   Has Report: ${audit.formatted_report_html ? 'YES' : 'NO'}`)
  if (audit.error_log) {
    console.log(`   Error Log: ${audit.error_log.substring(0, 200)}...`)
  }
  console.log('')

  // Check queue entry
  const { data: queueItem, error: queueError } = await supabase
    .from('audit_queue')
    .select('*')
    .eq('audit_id', auditId)
    .single()

  if (queueError && queueError.code !== 'PGRST116') { // PGRST116 = not found
    console.error('❌ Error checking queue:', queueError)
  } else if (queueItem) {
    console.log('📦 Queue Entry:')
    console.log(`   Queue ID: ${queueItem.id}`)
    console.log(`   Status: ${queueItem.status}`)
    console.log(`   Created: ${new Date(queueItem.created_at).toLocaleString()}`)
    console.log(`   Retry Count: ${queueItem.retry_count}`)
    if (queueItem.last_error) {
      console.log(`   Last Error: ${queueItem.last_error.substring(0, 200)}...`)
    }
    console.log('')
  } else {
    console.log('⚠️  No queue entry found for this audit!')
    console.log('   This means the audit was never added to the queue or was removed.')
    console.log('')

    // Check if we should add it to the queue
    if (audit.status === 'pending' || audit.status === 'running') {
      console.log('💡 Suggestion: This audit should be in the queue. Adding it now...')
      const { error: addError } = await supabase
        .from('audit_queue')
        .upsert({
          audit_id: auditId,
          status: 'pending',
          retry_count: 0,
          last_error: null,
        }, {
          onConflict: 'audit_id',
        })

      if (addError) {
        console.error('❌ Failed to add to queue:', addError)
      } else {
        console.log('✅ Added audit to queue')
      }
    }
  }

  // Check audit modules
  const { data: modules } = await supabase
    .from('audit_modules')
    .select('*')
    .eq('audit_id', auditId)

  console.log(`\n📋 Audit Modules: ${modules?.length || 0}`)
  if (modules && modules.length > 0) {
    modules.forEach(m => {
      console.log(`   - ${m.module_key}: ${m.enabled ? 'enabled' : 'disabled'}, score: ${m.raw_score || 'N/A'}`)
    })
  }

  console.log('\n✅ Check complete!')
}

checkAudit().catch(console.error)

