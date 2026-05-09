#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
});

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('=== AUDIT HEALTH SCAN ===\n');

  const { data: allFailed, error } = await supabase
    .from('audits')
    .select(`
      id, url, status, error_log, email_sent_at, created_at, total_price_cents,
      customer:customer_id (id, email, marketing_consent_at)
    `)
    .eq('status', 'failed')
    .order('created_at', { ascending: false });

  if (error) { console.error('Query error:', error); return; }
  if (!allFailed || allFailed.length === 0) {
    console.log('No failed audits found.');
    return;
  }

  const realFailures = allFailed.filter(a => {
    const err = (a.error_log || '').toLowerCase();
    const url = (a.url || '').toLowerCase();
    if (err.includes('cleanup:') || err.includes('test submission')) return false;
    if (url.includes('example.com') || url === '' || url === null) return false;
    return true;
  });

  const filteredOut = allFailed.length - realFailures.length;

  console.log(`Total failed audits: ${allFailed.length}`);
  console.log(`Filtered out (test/cleanup): ${filteredOut}`);
  console.log(`Real failed audits: ${realFailures.length}\n`);

  if (realFailures.length === 0) {
    console.log('✅ No real failed audits found. Everything clean.');
    return;
  }

  // List details
  for (const a of realFailures) {
    const notified = a.email_sent_at ? '✅ NOTIFIED' : '❌ NOT NOTIFIED';
    const consent = a.customer?.marketing_consent_at ? '✅ consented' : '❌ no consent';
    const email = a.customer?.email || 'unknown';
    const errPreview = (a.error_log || '').slice(0, 150).replace(/\n/g, ' ');
    console.log(`[${notified}] ${a.url} (${email})`);
    console.log(`   Created: ${a.created_at}`);
    console.log(`   Consent: ${consent}`);
    console.log(`   Error: ${errPreview}`);
    console.log();
  }

  const notified = realFailures.filter(a => a.email_sent_at);
  const notNotified = realFailures.filter(a => !a.email_sent_at);

  console.log('=== SUMMARY ===');
  console.log(`Real failures total: ${realFailures.length}`);
  console.log(`Notified: ${notified.length}`);
  console.log(`Not notified: ${notNotified.length}`);

  if (notNotified.length > 0) {
    const needEmail = notNotified.filter(a => a.customer?.marketing_consent_at);
    if (needEmail.length > 0) {
      console.log(`⚠️  ${needEmail.length} failed audits with marketing consent but NO failure email sent`);
    }
  }

  // Output a machine-readable JSON summary at the end
  console.log('---JSON---');
  console.log(JSON.stringify({
    totalFailed: allFailed.length,
    realFailures: realFailures.length,
    filteredOut,
    notified: notified.length,
    notNotified: notNotified.length,
    details: realFailures.map(a => ({
      url: a.url,
      email: a.customer?.email,
      notified: !!a.email_sent_at,
      hasConsent: !!a.customer?.marketing_consent_at,
      created_at: a.created_at,
      error_log: (a.error_log || '').slice(0, 200)
    }))
  }));
}

main().catch(console.error);
