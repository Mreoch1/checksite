#!/usr/bin/env node
/**
 * Script to resend audit report email
 * Usage: node scripts/resend-email.js <auditId> [adminSecret]
 */

const auditId = process.argv[2]
const adminSecret = process.argv[3] || process.env.ADMIN_SECRET
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app'

if (!auditId) {
  console.error('Usage: node scripts/resend-email.js <auditId> [adminSecret]')
  console.error('Or set ADMIN_SECRET environment variable')
  process.exit(1)
}

if (!adminSecret) {
  console.error('Error: ADMIN_SECRET is required')
  console.error('Either pass it as second argument or set ADMIN_SECRET environment variable')
  process.exit(1)
}

async function resendEmail() {
  try {
    console.log(`Resending email for audit: ${auditId}`)
    console.log(`Using site URL: ${siteUrl}`)
    console.log('')
    
    const response = await fetch(`${siteUrl}/api/admin/send-report-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminSecret}`,
      },
      body: JSON.stringify({
        auditId: auditId,
        force: true, // Force resend even if email_sent_at is set
      }),
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Email resent successfully!')
      console.log('Response:', JSON.stringify(data, null, 2))
    } else {
      console.error('❌ Failed to resend email')
      console.error('Status:', response.status)
      console.error('Response:', JSON.stringify(data, null, 2))
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.stack) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

resendEmail()

