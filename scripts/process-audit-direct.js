/**
 * Process audit directly (bypasses queue endpoint auth)
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const auditId = process.argv[2] || '6130f18c-5cbf-47a8-a59c-dcdbf77a4150'

async function processDirectly() {
  console.log(`\n⚙️  Processing audit ${auditId} directly...`)
  
  // Update queue status to processing
  await supabase
    .from('audit_queue')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .eq('audit_id', auditId)

  // Call the process-queue endpoint via fetch (it will process this audit)
  // But actually, we need to import processAudit function
  // For now, let's just trigger it via HTTP with proper auth
  console.log('   Triggering via API...')
  
  const queueSecret = process.env.QUEUE_SECRET
  if (!queueSecret) {
    console.error('❌ QUEUE_SECRET not set - cannot authenticate')
    process.exit(1)
  }

  const https = require('https')
  const url = `https://seochecksite.netlify.app/api/process-queue?secret=${queueSecret}`
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          console.log('✅ Response:', JSON.stringify(json, null, 2))
          resolve(json)
        } catch (e) {
          console.log('Response:', data.substring(0, 500))
          resolve(data)
        }
      })
    }).on('error', reject)
  })
}

processDirectly()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err)
    process.exit(1)
  })

