/**
 * Script to check queue status and find specific audits
 * Usage: node scripts/check-queue.js
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
  console.error('   Or load from .env.local file manually')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkQueue() {
  console.log('🔍 Checking queue and audits...\n')

  // First, check all audits for the test email
  console.log('📧 Checking all audits for mreoch82@hotmail.com:')
  const { data: customerAudits } = await supabase
    .from('customers')
    .select('*, audits(*)')
    .eq('email', 'mreoch82@hotmail.com')
    .single()
  
  if (customerAudits) {
    const audits = Array.isArray(customerAudits.audits) ? customerAudits.audits : (customerAudits.audits ? [customerAudits.audits] : [])
    console.log(`   Found ${audits.length} audit(s) for this customer:\n`)
    
    for (const audit of audits) {
      console.log(`   🆔 Audit ID: ${audit.id}`)
      console.log(`   🔗 URL: ${audit.url}`)
      console.log(`   📊 Status: ${audit.status}`)
      console.log(`   📅 Created: ${audit.created_at}`)
      console.log(`   ✅ Completed: ${audit.completed_at || 'Not completed'}`)
      console.log(`   📨 Email Sent: ${audit.email_sent_at || 'Not sent'}`)
      console.log(`   📄 Has Report: ${audit.formatted_report_html ? 'Yes' : 'No'}`)
      console.log('')
    }
  } else {
    console.log('   No customer found with that email')
  }

  // Search for audits by URL
  const searchUrls = ['seoauditpro', 'rcbiin.com', 'rcbiinc.com']
  
  for (const url of searchUrls) {
    console.log(`\n📋 Searching for audits with URL containing: ${url}`)
    
    // Find audits matching this URL
    const { data: audits, error: auditError } = await supabase
      .from('audits')
      .select('*, customers(*)')
      .ilike('url', `%${url}%`)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (auditError) {
      console.error(`❌ Error fetching audits:`, auditError)
      continue
    }
    
    if (!audits || audits.length === 0) {
      console.log(`   No audits found for ${url}`)
      continue
    }
    
    console.log(`   Found ${audits.length} audit(s):`)
    
    for (const audit of audits) {
      const customer = Array.isArray(audit.customers) ? audit.customers[0] : audit.customers
      
      console.log(`\n   🆔 Audit ID: ${audit.id}`)
      console.log(`   🔗 URL: ${audit.url}`)
      console.log(`   📧 Customer: ${customer?.email || 'Unknown'}`)
      console.log(`   📊 Status: ${audit.status}`)
      console.log(`   📅 Created: ${audit.created_at}`)
      console.log(`   ✅ Completed: ${audit.completed_at || 'Not completed'}`)
      console.log(`   📨 Email Sent: ${audit.email_sent_at || 'Not sent'}`)
      console.log(`   📄 Has Report: ${audit.formatted_report_html ? 'Yes' : 'No'}`)
      
      // Check queue status
      const { data: queueItem } = await supabase
        .from('audit_queue')
        .select('*')
        .eq('audit_id', audit.id)
        .single()
      
      if (queueItem) {
        console.log(`   📦 Queue Status: ${queueItem.status}`)
        console.log(`   🔄 Retry Count: ${queueItem.retry_count}`)
        console.log(`   ⏰ Queue Created: ${queueItem.created_at}`)
        
        // Check if it should be processable
        const queueCreated = new Date(queueItem.created_at).getTime()
        const now = Date.now()
        const ageMinutes = Math.round((now - queueCreated) / 1000 / 60)
        const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString()
        const isOldEnough = queueItem.created_at < fiveMinutesAgo
        
        console.log(`   ⏱️  Queue Age: ${ageMinutes} minutes`)
        console.log(`   ✅ Old Enough (5 min): ${isOldEnough ? 'Yes' : 'No'}`)
        console.log(`   📧 Email Sent At: ${audit.email_sent_at || 'null'}`)
        console.log(`   🔍 Should Process: ${queueItem.status === 'pending' && isOldEnough && !audit.email_sent_at ? 'YES' : 'NO'}`)
        
        if (queueItem.started_at) {
          console.log(`   🚀 Started: ${queueItem.started_at}`)
        }
        if (queueItem.completed_at) {
          console.log(`   ✅ Queue Completed: ${queueItem.completed_at}`)
        }
        if (queueItem.last_error) {
          console.log(`   ⚠️  Last Error: ${queueItem.last_error.substring(0, 100)}`)
        }
      } else {
        console.log(`   📦 Queue: Not in queue`)
      }
    }
  }
  
  // Get all pending/processing queue items
  console.log('\n\n📦 Current Queue Status:')
  const { data: queueItems, error: queueError } = await supabase
    .from('audit_queue')
    .select('*, audits(*)')
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: true })
    .limit(20)
  
  if (queueError) {
    console.error(`❌ Error fetching queue:`, queueError)
    return
  }
  
  if (!queueItems || queueItems.length === 0) {
    console.log('   No pending or processing items in queue')
  } else {
    console.log(`   Found ${queueItems.length} item(s) in queue:\n`)
    
    for (const item of queueItems) {
      const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits
      const ageMinutes = Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000 / 60)
      
      console.log(`   📦 Queue ID: ${item.id}`)
      console.log(`   🔗 URL: ${audit?.url || 'Unknown'}`)
      console.log(`   📊 Status: ${item.status}`)
      console.log(`   ⏰ Age: ${ageMinutes} minutes`)
      console.log(`   🔄 Retries: ${item.retry_count}`)
      if (item.started_at) {
        const processingMinutes = Math.round((Date.now() - new Date(item.started_at).getTime()) / 1000 / 60)
        console.log(`   🚀 Processing for: ${processingMinutes} minutes`)
      }
      console.log('')
    }
  }
  
  // Get recent completed audits (last 24 hours)
  console.log('\n\n📧 Recent Completed Audits (Last 24 Hours):')
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentAudits } = await supabase
    .from('audits')
    .select('*, customers(*)')
    .not('email_sent_at', 'is', null)
    .gte('email_sent_at', yesterday)
    .order('email_sent_at', { ascending: false })
    .limit(20)
  
  if (recentAudits && recentAudits.length > 0) {
    console.log(`   Found ${recentAudits.length} audit(s) with emails sent:\n`)
    for (const audit of recentAudits) {
      const customer = Array.isArray(audit.customers) ? audit.customers[0] : audit.customers
      console.log(`   🔗 URL: ${audit.url}`)
      console.log(`   📧 Customer: ${customer?.email || 'Unknown'}`)
      console.log(`   📨 Email Sent: ${audit.email_sent_at}`)
      console.log(`   📊 Status: ${audit.status}`)
      console.log('')
    }
  } else {
    console.log('   No audits with emails sent in the last 24 hours')
  }
  
  // Summary
  console.log('\n\n📊 Summary:')
  const { data: allQueueItems } = await supabase
    .from('audit_queue')
    .select('status')
  
  if (allQueueItems) {
    const statusCounts = allQueueItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {})
    
    console.log('   Queue items by status:')
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`)
    })
  }
}

checkQueue()
  .then(() => {
    console.log('\n✅ Check complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })

