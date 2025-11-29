#!/usr/bin/env node
/**
 * Diagnostic script to check why a specific queue item isn't being picked up
 * Usage: node scripts/diagnose-missing-queue-item.js <audit_id>
 */

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error(`   NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? '✓' : '✗'}`);
  console.error(`   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗'}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function diagnoseQueueItem(auditId) {
  console.log(`\n🔍 Diagnosing queue item for audit: ${auditId}\n`);

  // 1. Check if audit exists
  console.log('1. Checking audit...');
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .single();

  if (auditError) {
    console.error(`   ❌ Error fetching audit: ${auditError.message}`);
    return;
  }

  if (!audit) {
    console.error(`   ❌ Audit not found`);
    return;
  }

  console.log(`   ✓ Audit found:`);
  console.log(`     - Status: ${audit.status}`);
  console.log(`     - URL: ${audit.url}`);
  console.log(`     - Email sent at: ${audit.email_sent_at || 'null'}`);
  console.log(`     - Has report: ${audit.formatted_report_html ? 'yes' : 'no'}`);
  console.log(`     - Created: ${audit.created_at}`);

  // 2. Check if queue item exists
  console.log('\n2. Checking queue item...');
  const { data: queueItem, error: queueError } = await supabase
    .from('audit_queue')
    .select('*')
    .eq('audit_id', auditId)
    .single();

  if (queueError && queueError.code !== 'PGRST116') { // PGRST116 = not found
    console.error(`   ❌ Error fetching queue item: ${queueError.message}`);
    return;
  }

  if (!queueItem) {
    console.error(`   ❌ Queue item not found for this audit`);
    console.log(`   ⚠️  This audit is not in the queue - it may need to be added`);
    return;
  }

  console.log(`   ✓ Queue item found:`);
  console.log(`     - Queue ID: ${queueItem.id}`);
  console.log(`     - Status: ${queueItem.status}`);
  console.log(`     - Retry count: ${queueItem.retry_count}`);
  console.log(`     - Created: ${queueItem.created_at}`);
  console.log(`     - Started: ${queueItem.started_at || 'null'}`);
  console.log(`     - Completed: ${queueItem.completed_at || 'null'}`);
  console.log(`     - Last error: ${queueItem.last_error || 'null'}`);

  // 3. Check if the join query works (same as process-queue uses)
  console.log('\n3. Testing join query (same as process-queue uses)...');
  const { data: joinedItems, error: joinError } = await supabase
    .from('audit_queue')
    .select('*, audits(*)')
    .eq('status', 'pending')
    .eq('audit_id', auditId);

  if (joinError) {
    console.error(`   ❌ Join query error: ${joinError.message}`);
    return;
  }

  if (!joinedItems || joinedItems.length === 0) {
    console.log(`   ⚠️  Join query returned 0 items`);
    console.log(`   📊 This means the queue item won't be picked up by process-queue`);
    
    // Check why it's not being returned
    if (queueItem.status !== 'pending') {
      console.log(`   ❌ Reason: Queue item status is "${queueItem.status}", not "pending"`);
    } else {
      console.log(`   ⚠️  Queue item status is "pending" but join query didn't return it`);
      console.log(`   🔍 Possible causes:`);
      console.log(`      - Foreign key relationship issue`);
      console.log(`      - Audit data not accessible in join`);
      console.log(`      - Database constraint issue`);
    }
  } else {
    console.log(`   ✓ Join query returned ${joinedItems.length} item(s)`);
    const item = joinedItems[0];
    const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits;
    console.log(`     - Queue ID: ${item.id}`);
    console.log(`     - Audit data in join: ${audit ? 'present' : 'MISSING'}`);
    if (audit) {
      console.log(`     - Audit status: ${audit.status}`);
      console.log(`     - Audit email_sent_at: ${audit.email_sent_at || 'null'}`);
    }
  }

  // 4. Check all pending queue items to see if this one is in the list
  console.log('\n4. Checking all pending queue items...');
  const { data: allPending, error: allPendingError } = await supabase
    .from('audit_queue')
    .select('id, audit_id, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  if (allPendingError) {
    console.error(`   ❌ Error: ${allPendingError.message}`);
    return;
  }

  console.log(`   📊 Found ${allPending?.length || 0} pending queue items total`);
  const foundInList = allPending?.some(item => item.audit_id === auditId);
  console.log(`   ${foundInList ? '✓' : '✗'} This audit is ${foundInList ? 'in' : 'NOT in'} the pending list`);

  if (allPending && allPending.length > 0) {
    console.log(`   📋 Recent pending items (showing 10 most recent):`);
    allPending.slice(0, 10).forEach((item, idx) => {
      const isThisOne = item.audit_id === auditId;
      const age = Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000 / 60);
      console.log(`      ${idx + 1}. ${item.audit_id} (${age}m old)${isThisOne ? ' ← THIS ONE' : ''}`);
    });
  }

  // 5. Check if email status functions would filter it out
  console.log('\n5. Checking email status filters...');
  const emailSentAt = audit.email_sent_at;
  const isEmailSent = emailSentAt && !emailSentAt.startsWith('sending_');
  const isEmailSending = emailSentAt && emailSentAt.startsWith('sending_');
  
  console.log(`   - email_sent_at: ${emailSentAt || 'null'}`);
  console.log(`   - isEmailSent(): ${isEmailSent}`);
  console.log(`   - isEmailSending(): ${isEmailSending}`);
  console.log(`   - Would be filtered out: ${isEmailSent || isEmailSending ? 'YES (email already sent/sending)' : 'NO'}`);

  // 6. Summary and recommendations
  console.log('\n📋 Summary:');
  if (queueItem.status !== 'pending') {
    console.log(`   ❌ Queue item status is "${queueItem.status}" - needs to be reset to "pending"`);
  } else if (isEmailSent || isEmailSending) {
    console.log(`   ⚠️  Email already sent/sending - queue item should be marked as completed`);
  } else if (!foundInList) {
    console.log(`   ❌ Queue item exists but not returned by pending query - possible database issue`);
  } else {
    console.log(`   ✓ Queue item should be processable - check process-queue logs for why it's being skipped`);
  }
}

const auditId = process.argv[2];
if (!auditId) {
  console.error('Usage: node scripts/diagnose-missing-queue-item.js <audit_id>');
  process.exit(1);
}

diagnoseQueueItem(auditId).catch(console.error);

