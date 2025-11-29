#!/usr/bin/env node
/**
 * Comprehensive Email Diagnostic
 * 
 * Checks all possible reasons why emails aren't being sent:
 * 1. Queue processing status
 * 2. Completed audits without emails
 * 3. Email configuration
 * 4. Stale/abandoned reservations
 * 5. Email sending errors
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load environment variables from multiple locations
const envFiles = ['.env.local', '.env', '.env.production'];
let envLoaded = false;

for (const envFile of envFiles) {
  const envPath = path.join(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    try {
      // Try to require dotenv, but don't fail if it's not installed
      let dotenv;
      try {
        dotenv = require('dotenv');
      } catch (e) {
        // dotenv not installed, try to parse manually
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').replace(/^["']|["']$/g, '');
              process.env[key.trim()] = value.trim();
            }
          }
        });
        envLoaded = true;
        console.log(`✓ Loaded environment from ${envFile} (manual parse)`);
        break;
      }
      
      if (dotenv) {
        dotenv.config({ path: envPath });
        envLoaded = true;
        console.log(`✓ Loaded environment from ${envFile}`);
        break;
      }
    } catch (e) {
      // Continue to next file
    }
  }
}

// Also try loading from process.env (may already be set)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  console.error('\n💡 Tips:');
  console.error('   - Check if .env.local exists in project root');
  console.error('   - Verify variables are set in your shell environment');
  console.error('   - For production, check Netlify dashboard → Environment Variables');
  console.error('\n📋 Required variables:');
  console.error('   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function checkEmailConfig() {
  logSection('1. Email Configuration Check');
  
  const emailVars = {
    'SENDGRID_API_KEY': process.env.SENDGRID_API_KEY,
    'SMTP_PASSWORD': process.env.SMTP_PASSWORD,
    'FROM_EMAIL': process.env.FROM_EMAIL,
    'FROM_NAME': process.env.FROM_NAME,
  };
  
  let hasProvider = false;
  for (const [key, value] of Object.entries(emailVars)) {
    if (key === 'SENDGRID_API_KEY' || key === 'SMTP_PASSWORD') {
      if (value) {
        log(`  ✓ ${key}`, 'green');
        hasProvider = true;
      } else {
        log(`  ✗ ${key} - NOT SET`, 'red');
      }
    } else {
      if (value) {
        log(`  ✓ ${key} = ${value}`, 'green');
      } else {
        log(`  ⚠️  ${key} - not set (using default)`, 'yellow');
      }
    }
  }
  
  if (!hasProvider) {
    log('\n  ❌ CRITICAL: No email provider configured!', 'red');
    log('     Set either SENDGRID_API_KEY or SMTP_PASSWORD in Netlify environment variables', 'yellow');
    return false;
  }
  
  return true;
}

async function checkQueueStatus() {
  logSection('2. Queue Processing Status');
  
  // Check pending items
  const { data: pendingItems, error: pendingError } = await supabase
    .from('audit_queue')
    .select('*, audits(id, status, email_sent_at, formatted_report_html, created_at)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);
  
  if (pendingError) {
    log(`  ✗ Error: ${pendingError.message}`, 'red');
    return;
  }
  
  if (!pendingItems || pendingItems.length === 0) {
    log('  ✓ No pending queue items', 'green');
  } else {
    log(`  ⚠️  Found ${pendingItems.length} pending queue items (not being processed)`, 'yellow');
    pendingItems.forEach((item) => {
      const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits;
      const age = Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000 / 60);
      log(`    - ${item.audit_id} (${age}m old, status: ${audit?.status || 'unknown'})`, 'yellow');
    });
    log('\n  ⚠️  ROOT CAUSE: Queue not being processed!', 'red');
    log('     Check Netlify dashboard → Functions → Scheduled functions', 'yellow');
    log('     Verify process-queue function is running every 2 minutes', 'yellow');
  }
  
  // Check processing items
  const { data: processingItems, error: processingError } = await supabase
    .from('audit_queue')
    .select('*, audits(id, status)')
    .eq('status', 'processing')
    .order('started_at', { ascending: true })
    .limit(10);
  
  if (!processingError && processingItems && processingItems.length > 0) {
    log(`\n  ⚠️  Found ${processingItems.length} items currently processing:`, 'yellow');
    processingItems.forEach((item) => {
      const age = Math.round((Date.now() - new Date(item.started_at || item.created_at).getTime()) / 1000 / 60);
      log(`    - ${item.audit_id} (processing for ${age}m)`, age > 10 ? 'red' : 'yellow');
    });
  }
}

async function checkCompletedWithoutEmails() {
  logSection('3. Completed Audits Without Emails');
  
  const { data: audits, error } = await supabase
    .from('audits')
    .select('id, status, created_at, email_sent_at, formatted_report_html, error_log, customers(email)')
    .eq('status', 'completed')
    .is('email_sent_at', null)
    .not('formatted_report_html', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    log(`  ✗ Error: ${error.message}`, 'red');
    return [];
  }
  
  if (!audits || audits.length === 0) {
    log('  ✓ No completed audits without emails', 'green');
    return [];
  }
  
  log(`  ⚠️  Found ${audits.length} completed audits without emails:`, 'yellow');
  
  audits.forEach((audit) => {
    const age = Math.round((Date.now() - new Date(audit.created_at).getTime()) / 1000 / 60);
    const customer = audit.customers || {};
    const email = customer.email || 'unknown';
    
    log(`\n    Audit: ${audit.id}`, 'blue');
    log(`      Customer: ${email}`, 'yellow');
    log(`      Age: ${age}m`, 'yellow');
    log(`      Has Report: ✓`, 'green');
    
    // Check for email errors
    if (audit.error_log) {
      try {
        const errorLog = JSON.parse(audit.error_log);
        if (errorLog.type === 'email_send_failure') {
          log(`      Email Error: ${errorLog.error}`, 'red');
        }
      } catch (e) {
        // Not JSON
      }
    }
    
    log(`\n    To manually resend:`, 'blue');
    console.log(`      curl -X POST https://seochecksite.netlify.app/api/admin/send-report-email \\`);
    console.log(`        -H "Content-Type: application/json" \\`);
    console.log(`        -H "Authorization: Bearer YOUR_ADMIN_SECRET" \\`);
    console.log(`        -d '{"auditId": "${audit.id}", "force": true}'`);
  });
  
  return audits;
}

async function checkStaleReservations() {
  logSection('4. Stale/Abandoned Email Reservations');
  
  // Check for stale reservations (5-30 minutes old)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  const { data: stale, error: staleError } = await supabase
    .from('audits')
    .select('id, status, created_at, email_sent_at, customers(email)')
    .not('email_sent_at', 'is', null)
    .gte('email_sent_at', thirtyMinutesAgo)
    .lte('email_sent_at', fiveMinutesAgo)
    .order('email_sent_at', { ascending: false })
    .limit(10);
  
  if (!staleError && stale && stale.length > 0) {
    log(`  ⚠️  Found ${stale.length} stale reservations (5-30 minutes old):`, 'yellow');
    stale.forEach((audit) => {
      const age = Math.round((Date.now() - new Date(audit.email_sent_at).getTime()) / 1000 / 60);
      log(`    - ${audit.id} (reservation ${age}m old)`, 'yellow');
    });
    log('\n  These may be blocking email sends. Clear them:', 'blue');
    stale.slice(0, 3).forEach((audit) => {
      console.log(`    UPDATE audits SET email_sent_at = NULL WHERE id = '${audit.id}';`);
    });
  } else {
    log('  ✓ No stale reservations found', 'green');
  }
  
  // Check for abandoned reservations (>30 minutes)
  const { data: abandoned, error: abandonedError } = await supabase
    .from('audits')
    .select('id, status, email_sent_at, customers(email)')
    .not('email_sent_at', 'is', null)
    .lt('email_sent_at', thirtyMinutesAgo)
    .order('email_sent_at', { ascending: false })
    .limit(10);
  
  if (!abandonedError && abandoned && abandoned.length > 0) {
    log(`\n  ⚠️  Found ${abandoned.length} abandoned reservations (>30 minutes old):`, 'red');
    abandoned.forEach((audit) => {
      const age = Math.round((Date.now() - new Date(audit.email_sent_at).getTime()) / 1000 / 60);
      log(`    - ${audit.id} (ABANDONED, ${age}m old)`, 'red');
    });
    log('\n  Clear abandoned reservations:', 'blue');
    abandoned.slice(0, 3).forEach((audit) => {
      console.log(`    UPDATE audits SET email_sent_at = NULL WHERE id = '${audit.id}';`);
    });
  } else {
    log('  ✓ No abandoned reservations found', 'green');
  }
}

async function checkRecentEmailActivity() {
  logSection('5. Recent Email Activity');
  
  const { data: recent, error } = await supabase
    .from('audits')
    .select('id, email_sent_at, customers(email)')
    .not('email_sent_at', 'is', null)
    .order('email_sent_at', { ascending: false })
    .limit(10);
  
  if (error) {
    log(`  ✗ Error: ${error.message}`, 'red');
    return;
  }
  
  if (!recent || recent.length === 0) {
    log('  ⚠️  No emails sent recently', 'yellow');
    log('     This suggests emails are not being sent at all', 'yellow');
    return;
  }
  
  log(`  Found ${recent.length} recent emails:`, 'blue');
  recent.forEach((audit) => {
    const age = Math.round((Date.now() - new Date(audit.email_sent_at).getTime()) / 1000 / 60);
    const customer = audit.customers || {};
    log(`    ${audit.id}: ${customer.email || 'unknown'} (${age}m ago)`, age < 60 ? 'green' : 'yellow');
  });
}

async function main() {
  log('\n🔍 Comprehensive Email Diagnostic', 'cyan');
  log('Checking all possible reasons why emails aren\'t being sent...\n', 'blue');
  
  try {
    const configOk = await checkEmailConfig();
    
    await checkQueueStatus();
    await checkCompletedWithoutEmails();
    await checkStaleReservations();
    await checkRecentEmailActivity();
    
    logSection('Summary & Recommendations');
    
    if (!configOk) {
      log('❌ CRITICAL: Email provider not configured', 'red');
      log('   Action: Set SENDGRID_API_KEY or SMTP_PASSWORD in Netlify environment variables', 'yellow');
    }
    
    log('\n📋 Next Steps:', 'blue');
    log('  1. Check Netlify dashboard → Functions → Scheduled functions', 'yellow');
    log('     Verify process-queue function is running every 2 minutes', 'yellow');
    log('  2. Check Netlify function logs for email sending errors', 'yellow');
    log('  3. Verify email environment variables in Netlify dashboard', 'yellow');
    log('  4. Manually trigger queue processing if scheduled function not working', 'yellow');
    log('  5. Use admin endpoint to manually resend emails for completed audits', 'yellow');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();

