#!/usr/bin/env node
/**
 * Verify email configuration for SEO CheckSite
 * Checks environment variables and tests email sending
 */

const https = require('https')
const { URL } = require('url')

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app'
const ADMIN_SECRET = process.env.ADMIN_SECRET

if (!ADMIN_SECRET) {
  console.error('❌ ADMIN_SECRET environment variable is required')
  console.error('   Set it in .env.local or Netlify environment variables')
  process.exit(1)
}

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }

    const req = https.request(requestOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({ status: res.statusCode, data: parsed })
        } catch (e) {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })

    req.on('error', reject)

    if (options.body) {
      req.write(JSON.stringify(options.body))
    }

    req.end()
  })
}

async function verifyEmailConfig() {
  console.log('📧 Email Configuration Verification\n')
  console.log('=' .repeat(50))

  // Step 1: Check environment variables
  console.log('\n1️⃣  Checking Environment Variables...')
  const hasSendGrid = !!process.env.SENDGRID_API_KEY
  const hasSmtp = !!process.env.SMTP_PASSWORD
  const fromEmail = process.env.FROM_EMAIL || 'not set'
  const emailProvider = process.env.EMAIL_PROVIDER || 'not set'

  console.log(`   SENDGRID_API_KEY: ${hasSendGrid ? '✅ SET' : '❌ NOT SET'}`)
  console.log(`   SMTP_PASSWORD: ${hasSmtp ? '✅ SET' : '❌ NOT SET'}`)
  console.log(`   FROM_EMAIL: ${fromEmail}`)
  console.log(`   EMAIL_PROVIDER: ${emailProvider}`)

  if (!hasSendGrid && !hasSmtp) {
    console.error('\n❌ ERROR: No email provider configured!')
    console.error('   You must set either SENDGRID_API_KEY or SMTP_PASSWORD')
    console.error('   in Netlify environment variables.')
    process.exit(1)
  }

  // Step 2: Test email sending
  console.log('\n2️⃣  Testing Email Sending...')
  const testEmail = process.argv[2] || 'Mreoch82@hotmail.com'
  console.log(`   Test email: ${testEmail}`)

  try {
    const response = await makeRequest(`${SITE_URL}/api/test-email-detailed`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: {
        email: testEmail,
      },
    })

    if (response.status === 200) {
      console.log('   ✅ Email test successful!')
      console.log('   Check your inbox (and spam folder) for the test email.')
    } else {
      console.error(`   ❌ Email test failed: ${response.status}`)
      console.error('   Error:', JSON.stringify(response.data, null, 2))
      
      if (response.data?.error) {
        console.error('\n   Error details:', response.data.error)
        if (response.data.details) {
          console.error('   Details:', response.data.details)
        }
      }
    }
  } catch (error) {
    console.error('   ❌ Failed to test email:', error.message)
  }

  // Step 3: Check recent audits
  console.log('\n3️⃣  Checking Recent Audits Email Status...')
  try {
    const response = await makeRequest(`${SITE_URL}/api/admin/check-audits`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
    })

    if (response.status === 200 && response.data.audits) {
      const audits = response.data.audits.slice(0, 3)
      console.log(`   Found ${audits.length} recent audits:`)
      audits.forEach((audit, i) => {
        const emailStatus = audit.email_sent_at ? '✅ Sent' : '❌ Not sent'
        console.log(`   ${i + 1}. ${audit.url} - ${emailStatus}`)
        if (audit.error_log) {
          try {
            const errorData = typeof audit.error_log === 'string' 
              ? JSON.parse(audit.error_log) 
              : audit.error_log
            if (errorData.type === 'email_send_failure') {
              console.log(`      Error: ${errorData.error}`)
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      })
    }
  } catch (error) {
    console.error('   ⚠️  Could not check audits:', error.message)
  }

  console.log('\n' + '='.repeat(50))
  console.log('\n✅ Email configuration verification complete!')
  console.log('\nIf emails are not being sent:')
  console.log('1. Verify environment variables in Netlify Dashboard')
  console.log('2. Check Netlify function logs for detailed errors')
  console.log('3. See EMAIL_TROUBLESHOOTING.md for detailed troubleshooting')
}

verifyEmailConfig().catch((error) => {
  console.error('❌ Verification failed:', error)
  process.exit(1)
})

