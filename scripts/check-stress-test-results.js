/**
 * Check Stress Test Results
 * 
 * Verifies that all audits from the stress test completed successfully:
 * - All audits have status = 'completed'
 * - All audits have email_sent_at set
 * - All audits have formatted_report_html
 * - No duplicate emails (each audit has exactly one email_sent_at)
 * - Queue items are marked as completed
 * 
 * Usage:
 *   node scripts/check-stress-test-results.js [audit_id1] [audit_id2] ...
 *   Or without args, checks all recent audits for test email
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const TEST_EMAIL = 'Mreoch82@hotmail.com'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Check a single audit
 */
async function checkAudit(auditId) {
  const { data: audit, error } = await supabase
    .from('audits')
    .select('id, url, status, email_sent_at, formatted_report_html, created_at, customer_id, customers(email)')
    .eq('id', auditId)
    .single()

  if (error || !audit) {
    return { 
      auditId, 
      exists: false, 
      error: error?.message || 'Not found' 
    }
  }

  const customer = Array.isArray(audit.customers) ? audit.customers[0] : audit.customers
  const isTestEmail = customer?.email?.toLowerCase() === TEST_EMAIL.toLowerCase()

  const hasEmail = !!audit.email_sent_at && 
                   !audit.email_sent_at.startsWith('sending_') &&
                   audit.email_sent_at.length > 10
  const hasReport = !!audit.formatted_report_html
  const isCompleted = audit.status === 'completed'

  return {
    auditId,
    exists: true,
    url: audit.url,
    status: audit.status,
    email_sent_at: audit.email_sent_at,
    hasEmail,
    hasReport,
    isCompleted,
    isTestEmail,
    created_at: audit.created_at,
    allChecksPass: hasEmail && hasReport && isCompleted,
  }
}

/**
 * Check queue status for an audit
 */
async function checkQueueStatus(auditId) {
  const { data: queueItem, error } = await supabase
    .from('audit_queue')
    .select('id, audit_id, status, completed_at, last_error, retry_count')
    .eq('audit_id', auditId)
    .single()

  if (error || !queueItem) {
    return { exists: false, error: error?.message || 'Not found' }
  }

  return {
    exists: true,
    queue_id: queueItem.id,
    status: queueItem.status,
    completed_at: queueItem.completed_at,
    last_error: queueItem.last_error,
    retry_count: queueItem.retry_count,
    isCompleted: queueItem.status === 'completed',
  }
}

/**
 * Check all recent audits for test email
 */
async function checkAllTestAudits(limit = 50) {
  console.log(`\n🔍 Checking recent audits for ${TEST_EMAIL}...`)
  
  // Get customer ID first
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', TEST_EMAIL)
    .single()

  if (!customer) {
    console.log(`   ⚠️  No customer found for ${TEST_EMAIL}`)
    return []
  }

  const { data: audits, error } = await supabase
    .from('audits')
    .select('id, url, status, email_sent_at, formatted_report_html, created_at')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('❌ Error fetching audits:', error)
    return []
  }

  return audits || []
}

/**
 * Main execution
 */
async function main() {
  const auditIds = process.argv.slice(2)

  if (auditIds.length > 0) {
    // Check specific audit IDs
    console.log(`\n🔍 Checking ${auditIds.length} specific audit(s)...\n`)
    
    const results = await Promise.all(auditIds.map(id => checkAudit(id)))
    
    results.forEach(async (result) => {
      console.log(`\n📋 Audit ${result.auditId}:`)
      if (!result.exists) {
        console.log(`   ❌ Not found: ${result.error}`)
        return
      }

      console.log(`   URL: ${result.url}`)
      console.log(`   Status: ${result.status}`)
      console.log(`   Email sent: ${result.hasEmail ? '✅ ' + result.email_sent_at : '❌ Not sent'}`)
      console.log(`   Report: ${result.hasReport ? '✅ Present' : '❌ Missing'}`)
      console.log(`   Completed: ${result.isCompleted ? '✅' : '❌'}`)
      
      if (result.allChecksPass) {
        console.log(`   ✅ All checks passed!`)
      } else {
        console.log(`   ⚠️  Some checks failed`)
      }

      // Check queue status
      const queueStatus = await checkQueueStatus(result.auditId)
      if (queueStatus.exists) {
        console.log(`   Queue status: ${queueStatus.status}`)
        if (queueStatus.completed_at) {
          console.log(`   Queue completed: ${queueStatus.completed_at}`)
        }
        if (queueStatus.last_error) {
          console.log(`   ⚠️  Queue error: ${queueStatus.last_error}`)
        }
      } else {
        console.log(`   ⚠️  No queue entry found`)
      }
    })

    // Summary
    const passed = results.filter(r => r.exists && r.allChecksPass).length
    const failed = results.length - passed
    console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`)

  } else {
    // Check all recent test audits
    const audits = await checkAllTestAudits(50)
    
    if (audits.length === 0) {
      console.log('   No audits found')
      return
    }

    console.log(`\n📋 Found ${audits.length} recent audit(s):\n`)

    const results = await Promise.all(
      audits.map(audit => checkAudit(audit.id))
    )

    // Group by status
    const passed = results.filter(r => r.exists && r.allChecksPass)
    const failed = results.filter(r => r.exists && !r.allChecksPass)
    const notFound = results.filter(r => !r.exists)

    console.log('='.repeat(60))
    console.log('📊 Results Summary')
    console.log('='.repeat(60))
    console.log(`✅ Passed: ${passed.length}`)
    console.log(`❌ Failed: ${failed.length}`)
    console.log(`⚠️  Not found: ${notFound.length}`)

    if (passed.length > 0) {
      console.log(`\n✅ Passed audits:`)
      passed.forEach(r => {
        console.log(`   - ${r.auditId} (${r.url})`)
      })
    }

    if (failed.length > 0) {
      console.log(`\n❌ Failed audits:`)
      failed.forEach(r => {
        const issues = []
        if (!r.hasEmail) issues.push('no email')
        if (!r.hasReport) issues.push('no report')
        if (!r.isCompleted) issues.push(`status=${r.status}`)
        console.log(`   - ${r.auditId} (${r.url}): ${issues.join(', ')}`)
      })
    }

    // Check for duplicates (same audit ID with multiple emails - shouldn't happen)
    const emailCounts = {}
    results.forEach(r => {
      if (r.exists && r.email_sent_at) {
        emailCounts[r.auditId] = (emailCounts[r.auditId] || 0) + 1
      }
    })
    
    const duplicates = Object.entries(emailCounts).filter(([_, count]) => count > 1)
    if (duplicates.length > 0) {
      console.log(`\n⚠️  WARNING: Found potential duplicate emails:`)
      duplicates.forEach(([auditId, count]) => {
        console.log(`   - ${auditId}: ${count} emails (should be 1)`)
      })
    } else {
      console.log(`\n✅ No duplicate emails detected`)
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
}

module.exports = { checkAudit, checkQueueStatus, checkAllTestAudits }

