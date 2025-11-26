#!/usr/bin/env node
/**
 * Send email for a completed audit
 * Usage: node scripts/send-audit-email.js <audit-id> [admin-secret]
 */

const auditId = process.argv[2]
const adminSecret = process.argv[3] || process.env.ADMIN_SECRET

if (!auditId) {
  console.error('Usage: node scripts/send-audit-email.js <audit-id> [admin-secret]')
  console.error('Or set ADMIN_SECRET environment variable')
  process.exit(1)
}

if (!adminSecret) {
  console.error('Error: ADMIN_SECRET is required')
  console.error('Either pass it as second argument or set ADMIN_SECRET environment variable')
  process.exit(1)
}

const url = 'https://seochecksite.netlify.app/api/admin/send-report-email'

console.log(`Sending email for audit: ${auditId}`)
console.log(`Using endpoint: ${url}`)
console.log('')

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminSecret}`,
  },
  body: JSON.stringify({
    auditId,
    force: true, // Force resend even if already sent
  }),
})
  .then(async (response) => {
    const data = await response.json()
    if (response.ok) {
      console.log('✅ Success!')
      console.log(JSON.stringify(data, null, 2))
    } else {
      console.error('❌ Error:', response.status, response.statusText)
      console.error(JSON.stringify(data, null, 2))
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('❌ Request failed:', error.message)
    process.exit(1)
  })

