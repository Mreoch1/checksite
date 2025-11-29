#!/usr/bin/env node
/**
 * Email Issue Diagnostic Script
 * 
 * Checks for audits that completed but emails weren't sent
 * and provides actionable fixes
 */

const { createClient } = require('@supabase/supabase-js');
// Load environment variables (optional - will use process.env if dotenv not available)
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not available, use process.env directly
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Colors
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

async function checkEmailConfiguration() {
  logSection('Email Configuration Check');
  
  const emailVars = {
    'SENDGRID_API_KEY': process.env.SENDGRID_API_KEY,
    'SMTP_PASSWORD': process.env.SMTP_PASSWORD,
    'FROM_EMAIL': process.env.FROM_EMAIL,
    'FROM_NAME': process.env.FROM_NAME,
    'EMAIL_PROVIDER': process.env.EMAIL_PROVIDER,
    'EMAIL_USE_FALLBACK': process.env.EMAIL_USE_FALLBACK,
  };
  
  log('Checking email environment variables:', 'blue');
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
    log('\n❌ CRITICAL: No email provider configured!', 'red');
    log('   Set either SENDGRID_API_KEY or SMTP_PASSWORD in Netlify environment variables', 'yellow');
    return false;
  }
  
  return true;
}

async function findCompletedAuditsWithoutEmails() {
  logSection('Completed Audits Without Emails');
  
  const { data: audits, error } = await supabase
    .from('audits')
    .select('id, status, created_at, email_sent_at, formatted_report_html, error_log, customers(email)')
    .eq('status', 'completed')
    .is('email_sent_at', null)
    .not('formatted_report_html', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    log(`  ✗ Error querying audits: ${error.message}`, 'red');
    return [];
  }
  
  if (!audits || audits.length === 0) {
    log('  ✓ No completed audits without emails found', 'green');
    return [];
  }
  
  log(`  ⚠️  Found ${audits.length} completed audits without emails:`, 'yellow');
  
  audits.forEach((audit) => {
    const age = Math.round((Date.now() - new Date(audit.created_at).getTime()) / 1000 / 60);
    const customer = audit.customers || {};
    const email = customer.email || 'unknown';
    
    log(`\n    Audit ID: ${audit.id}`, 'blue');
    log(`      Created: ${age}m ago`, 'yellow');
    log(`      Customer: ${email}`, 'yellow');
    log(`      Has Report: ${audit.formatted_report_html ? '✓' : '✗'}`, audit.formatted_report_html ? 'green' : 'red');
    
    if (audit.error_log) {
      try {
        const errorLog = JSON.parse(audit.error_log);
        if (errorLog.type === 'email_send_failure') {
          log(`      Error: ${errorLog.error}`, 'red');
        }
      } catch (e) {
        // Not JSON, ignore
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

async function findStaleReservations() {
  logSection('Stale Email Reservations');
  
  // Find audits with email_sent_at that's between 5-30 minutes old (stale reservation)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  const { data: audits, error } = await supabase
    .from('audits')
    .select('id, status, created_at, email_sent_at, formatted_report_html, customers(email)')
    .not('email_sent_at', 'is', null)
    .gte('email_sent_at', thirtyMinutesAgo)
    .lte('email_sent_at', fiveMinutesAgo)
    .order('email_sent_at', { ascending: false })
    .limit(20);
  
  if (error) {
    log(`  ✗ Error querying: ${error.message}`, 'red');
    return [];
  }
  
  if (!audits || audits.length === 0) {
    log('  ✓ No stale reservations found', 'green');
    return [];
  }
  
  log(`  ⚠️  Found ${audits.length} stale reservations (5-30 minutes old):`, 'yellow');
  
  audits.forEach((audit) => {
    const age = Math.round((Date.now() - new Date(audit.email_sent_at).getTime()) / 1000 / 60);
    const customer = audit.customers || {};
    const email = customer.email || 'unknown';
    
    log(`\n    Audit ID: ${audit.id}`, 'blue');
    log(`      Reservation age: ${age}m`, 'yellow');
    log(`      Customer: ${email}`, 'yellow');
    log(`      Status: ${audit.status}`, 'yellow');
    
    log(`\n    To clear and retry:`, 'blue');
    console.log(`      # Clear reservation:`);
    console.log(`      UPDATE audits SET email_sent_at = NULL WHERE id = '${audit.id}';`);
    console.log(`      # Then manually resend:`);
    console.log(`      curl -X POST https://seochecksite.netlify.app/api/admin/send-report-email \\`);
    console.log(`        -H "Content-Type: application/json" \\`);
    console.log(`        -H "Authorization: Bearer YOUR_ADMIN_SECRET" \\`);
    console.log(`        -d '{"auditId": "${audit.id}", "force": true}'`);
  });
  
  return audits;
}

async function findAbandonedReservations() {
  logSection('Abandoned Email Reservations (>30 minutes)');
  
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  const { data: audits, error } = await supabase
    .from('audits')
    .select('id, status, created_at, email_sent_at, formatted_report_html, customers(email)')
    .not('email_sent_at', 'is', null)
    .lt('email_sent_at', thirtyMinutesAgo)
    .order('email_sent_at', { ascending: false })
    .limit(20);
  
  if (error) {
    log(`  ✗ Error querying: ${error.message}`, 'red');
    return [];
  }
  
  if (!audits || audits.length === 0) {
    log('  ✓ No abandoned reservations found', 'green');
    return [];
  }
  
  log(`  ⚠️  Found ${audits.length} abandoned reservations (>30 minutes old):`, 'yellow');
  
  audits.forEach((audit) => {
    const age = Math.round((Date.now() - new Date(audit.email_sent_at).getTime()) / 1000 / 60);
    const customer = audit.customers || {};
    const email = customer.email || 'unknown';
    
    log(`\n    Audit ID: ${audit.id}`, 'blue');
    log(`      Reservation age: ${age}m (ABANDONED)`, 'red');
    log(`      Customer: ${email}`, 'yellow');
    log(`      Status: ${audit.status}`, 'yellow');
    
    log(`\n    SQL to clear abandoned reservation:`, 'blue');
    console.log(`      UPDATE audits SET email_sent_at = NULL WHERE id = '${audit.id}';`);
  });
  
  return audits;
}

async function checkRecentEmailActivity() {
  logSection('Recent Email Activity');
  
  const { data: audits, error } = await supabase
    .from('audits')
    .select('id, status, created_at, email_sent_at, customers(email)')
    .not('email_sent_at', 'is', null)
    .order('email_sent_at', { ascending: false })
    .limit(10);
  
  if (error) {
    log(`  ✗ Error querying: ${error.message}`, 'red');
    return;
  }
  
  if (!audits || audits.length === 0) {
    log('  ⚠️  No emails sent recently', 'yellow');
    return;
  }
  
  log(`  Found ${audits.length} recent emails:`, 'blue');
  
  audits.forEach((audit) => {
    const age = Math.round((Date.now() - new Date(audit.email_sent_at).getTime()) / 1000 / 60);
    const customer = audit.customers || {};
    const email = customer.email || 'unknown';
    
    log(`    ${audit.id}: ${email} (${age}m ago)`, age < 5 ? 'green' : 'yellow');
  });
}

async function main() {
  log('\n🔍 Email Issue Diagnostic Tool', 'cyan');
  log('Checking for email sending issues...\n', 'blue');
  
  try {
    const configOk = await checkEmailConfiguration();
    
    if (!configOk) {
      log('\n❌ Email configuration is missing. Fix this first!', 'red');
      process.exit(1);
    }
    
    await checkRecentEmailActivity();
    const completedWithoutEmail = await findCompletedAuditsWithoutEmails();
    const staleReservations = await findStaleReservations();
    const abandonedReservations = await findAbandonedReservations();
    
    logSection('Summary');
    
    if (completedWithoutEmail.length > 0) {
      log(`⚠️  ${completedWithoutEmail.length} completed audits without emails`, 'yellow');
      log('   Use the curl commands above to manually resend', 'yellow');
    }
    
    if (staleReservations.length > 0) {
      log(`⚠️  ${staleReservations.length} stale reservations (5-30 minutes old)`, 'yellow');
      log('   These may need manual clearing and retry', 'yellow');
    }
    
    if (abandonedReservations.length > 0) {
      log(`⚠️  ${abandonedReservations.length} abandoned reservations (>30 minutes old)`, 'red');
      log('   Clear these using the SQL commands above', 'yellow');
    }
    
    if (completedWithoutEmail.length === 0 && staleReservations.length === 0 && abandonedReservations.length === 0) {
      log('✅ No email issues found!', 'green');
    }
    
    log('\nNext steps:', 'blue');
    log('  1. Check Netlify function logs for email sending errors', 'yellow');
    log('  2. Verify email environment variables in Netlify dashboard', 'yellow');
    log('  3. Test email sending using admin endpoint', 'yellow');
    log('  4. Check SendGrid/Zoho activity logs', 'yellow');
    
  } catch (error) {
    log(`\n❌ Error during diagnostic: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();

