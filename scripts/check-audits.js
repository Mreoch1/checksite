/**
 * Script to check audit status in Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Try to load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAudits() {
  console.log('Checking recent audits...\n')

  // Get recent audits, ordered by created_at descending
  const { data: audits, error } = await supabase
    .from('audits')
    .select(`
      id,
      url,
      status,
      created_at,
      completed_at,
      customers (
        email,
        name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching audits:', error)
    return
  }

  if (!audits || audits.length === 0) {
    console.log('No audits found')
    return
  }

  console.log(`Found ${audits.length} recent audit(s):\n`)

  audits.forEach((audit, index) => {
    const customer = audit.customers
    console.log(`${index + 1}. Audit ID: ${audit.id}`)
    console.log(`   URL: ${audit.url}`)
    console.log(`   Status: ${audit.status}`)
    console.log(`   Created: ${new Date(audit.created_at).toLocaleString()}`)
    if (audit.completed_at) {
      console.log(`   Completed: ${new Date(audit.completed_at).toLocaleString()}`)
      const duration = Math.round((new Date(audit.completed_at) - new Date(audit.created_at)) / 1000 / 60)
      console.log(`   Duration: ${duration} minutes`)
    } else if (audit.status === 'running') {
      const elapsed = Math.round((Date.now() - new Date(audit.created_at)) / 1000 / 60)
      console.log(`   Running for: ${elapsed} minutes`)
    }
    if (customer) {
      console.log(`   Customer: ${customer.email}${customer.name ? ` (${customer.name})` : ''}`)
    }
    console.log('')
  })

  // Check for any failed audits
  const failedAudits = audits.filter(a => a.status === 'failed')
  if (failedAudits.length > 0) {
    console.log(`\n⚠️  ${failedAudits.length} audit(s) failed:`)
    failedAudits.forEach(audit => {
      console.log(`   - ${audit.id} (${audit.url})`)
    })
  }

  // Check for running audits
  const runningAudits = audits.filter(a => a.status === 'running')
  if (runningAudits.length > 0) {
    console.log(`\n⏳ ${runningAudits.length} audit(s) still running:`)
    runningAudits.forEach(audit => {
      const elapsed = Math.round((Date.now() - new Date(audit.created_at)) / 1000 / 60)
      console.log(`   - ${audit.id} (${audit.url}) - Running for ${elapsed} minutes`)
    })
  }

  // Check for completed audits
  const completedAudits = audits.filter(a => a.status === 'completed')
  if (completedAudits.length > 0) {
    console.log(`\n✅ ${completedAudits.length} audit(s) completed:`)
    completedAudits.forEach(audit => {
      const customer = audit.customers
      console.log(`   - ${audit.id} (${audit.url})`)
      if (customer) {
        console.log(`     Email: ${customer.email}`)
      }
    })
  }
}

checkAudits().catch(console.error)

