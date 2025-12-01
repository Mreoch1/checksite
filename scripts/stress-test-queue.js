/**
 * Stress Test Script for Queue Processing
 * 
 * Creates 20-30 audits in batches to test queue behavior under concurrency.
 * Tests:
 * - No duplicate emails
 * - No stuck queue items
 * - No reprocessing of completed audits
 * - Queue progression through multiple items
 * 
 * Usage:
 *   ADMIN_SECRET=your_secret node scripts/stress-test-queue.js
 */

const ADMIN_SECRET = process.env.ADMIN_SECRET
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const TEST_EMAIL = 'Mreoch82@hotmail.com'

// Test URLs - mix to avoid rate limits and duplicate detection
const TEST_URLS = [
  'https://example.com',
  'https://nextjs.org/docs',
  'https://tripplanner.com',
  'https://seochecksite.net',
  'https://github.com',
  'https://stackoverflow.com',
  'https://wikipedia.org',
  'https://reddit.com',
]

// Default modules for all audits
const DEFAULT_MODULES = ['performance', 'crawl_health', 'on_page', 'mobile', 'accessibility', 'security', 'schema', 'social']

// Configuration
const TOTAL_AUDITS = 25 // Create 25 audits
const BATCH_SIZE = 5 // Process in batches of 5
const BATCH_DELAY_MS = 2000 // 2 seconds between batches

let createdAudits = []
let failedAudits = []

/**
 * Create a single audit via the test-audit API endpoint
 */
async function createAudit(url, index) {
  const urlIndex = index % TEST_URLS.length
  const testUrl = url || TEST_URLS[urlIndex]
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/test-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        url: testUrl,
        email: TEST_EMAIL,
        modules: DEFAULT_MODULES,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 409) {
        // Duplicate audit - this is expected sometimes
        console.log(`   ⚠️  Audit ${index + 1}: Duplicate detected (${data.message})`)
        return { success: false, duplicate: true, existingAuditId: data.existingAuditId }
      }
      
      console.error(`   ❌ Audit ${index + 1} failed:`, data.error || data.message)
      return { success: false, error: data.error || data.message }
    }

    console.log(`   ✅ Audit ${index + 1}: Created ${data.auditId} for ${testUrl}`)
    return { 
      success: true, 
      auditId: data.auditId,
      url: testUrl,
      index: index + 1,
    }
  } catch (error) {
    console.error(`   ❌ Audit ${index + 1} error:`, error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Create audits in batches
 */
async function createAuditsInBatches() {
  console.log('\n🚀 Starting stress test...')
  console.log(`   Target: ${TOTAL_AUDITS} audits`)
  console.log(`   Batch size: ${BATCH_SIZE}`)
  console.log(`   Test email: ${TEST_EMAIL}`)
  console.log(`   API URL: ${API_BASE_URL}\n`)

  const batches = []
  for (let i = 0; i < TOTAL_AUDITS; i += BATCH_SIZE) {
    const batch = []
    for (let j = 0; j < BATCH_SIZE && (i + j) < TOTAL_AUDITS; j++) {
      batch.push(createAudit(null, i + j))
    }
    batches.push(batch)
  }

  // Process batches sequentially with delay
  for (let i = 0; i < batches.length; i++) {
    console.log(`\n📦 Batch ${i + 1}/${batches.length} (${batches[i].length} audits)...`)
    
    const batchResults = await Promise.all(batches[i])
    
    batchResults.forEach(result => {
      if (result.success) {
        createdAudits.push(result)
      } else if (result.duplicate) {
        // Duplicate is acceptable - just log it
        console.log(`   ℹ️  Skipped duplicate audit`)
      } else {
        failedAudits.push(result)
      }
    })

    // Wait between batches (except last batch)
    if (i < batches.length - 1) {
      console.log(`   ⏳ Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`)
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Stress Test Summary')
  console.log('='.repeat(60))
  console.log(`✅ Successfully created: ${createdAudits.length} audits`)
  console.log(`❌ Failed: ${failedAudits.length} audits`)
  console.log(`📋 Created audit IDs:`)
  createdAudits.forEach(audit => {
    console.log(`   - ${audit.auditId} (${audit.url})`)
  })
  
  if (failedAudits.length > 0) {
    console.log(`\n❌ Failed audits:`)
    failedAudits.forEach(audit => {
      console.log(`   - ${audit.error || 'Unknown error'}`)
    })
  }

  return { createdAudits, failedAudits }
}

/**
 * Monitor queue processing (optional - can be run separately)
 */
async function checkQueueStatus() {
  console.log('\n🔍 Checking queue status...')
  
  // This would require direct Supabase access or a status endpoint
  // For now, just log that monitoring should be done via logs
  console.log('   ⚠️  Monitor queue processing via Netlify logs:')
  console.log('      - Watch /api/process-queue runs')
  console.log('      - Check for duplicate emails')
  console.log('      - Verify queue progression')
  console.log('      - Confirm all audits complete')
}

/**
 * Main execution
 */
async function main() {
  if (!ADMIN_SECRET) {
    console.error('❌ ADMIN_SECRET environment variable is required')
    console.error('   Usage: ADMIN_SECRET=your_secret node scripts/stress-test-queue.js')
    process.exit(1)
  }

  try {
    const { createdAudits: audits } = await createAuditsInBatches()
    
    if (audits.length === 0) {
      console.error('\n❌ No audits were created. Check your configuration and API endpoint.')
      process.exit(1)
    }

    console.log('\n✅ Stress test setup complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Monitor Netlify logs for /api/process-queue runs')
    console.log('   2. Watch for queue progression through audit IDs')
    console.log('   3. Verify no duplicate emails are sent')
    console.log('   4. Confirm all audits reach status=completed with email_sent_at set')
    console.log('\n   Expected behavior:')
    console.log('   - Queue processes one audit per run')
    console.log('   - Queue progresses through different audit IDs')
    console.log('   - No reprocessing of audits with email_sent_at set')
    console.log('   - Each audit receives exactly one email')
    
    await checkQueueStatus()
    
  } catch (error) {
    console.error('\n❌ Stress test failed:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

module.exports = { createAudit, createAuditsInBatches }

