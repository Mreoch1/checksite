#!/usr/bin/env node
/**
 * Quick script to check audit status
 * Usage: node scripts/check-audit.js <audit-id>
 */

const auditId = process.argv[2]

if (!auditId) {
  console.error('Usage: node scripts/check-audit.js <audit-id>')
  process.exit(1)
}

const url = `https://seochecksite.netlify.app/api/admin/diagnose-audit?id=${auditId}`

console.log(`Checking audit: ${auditId}`)
console.log(`URL: ${url}`)
console.log('\nTo check this audit, you need to:')
console.log('1. Get your ADMIN_SECRET from Netlify environment variables')
console.log('2. Run:')
console.log(`   curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" "${url}"`)
console.log('\nOr visit:')
console.log(`   https://seochecksite.netlify.app/report/${auditId}`)
console.log('\nOr check in Supabase:')
console.log(`   SELECT * FROM audits WHERE id = '${auditId}';`)
console.log(`   SELECT * FROM audit_queue WHERE audit_id = '${auditId}';`)

