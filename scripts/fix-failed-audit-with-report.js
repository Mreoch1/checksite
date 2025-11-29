#!/usr/bin/env node
/**
 * Fix an audit that has a report and email but is marked as failed
 * Usage: node scripts/fix-failed-audit-with-report.js <audit_id>
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
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixFailedAudit(auditId) {
  console.log(`\n🔧 Fixing audit: ${auditId}\n`);

  // 1. Check audit status
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .single();

  if (auditError || !audit) {
    console.error(`❌ Audit not found: ${auditError?.message || 'Not found'}`);
    return;
  }

  console.log(`✓ Audit found: ${audit.url}`);
  console.log(`  Current status: ${audit.status}`);
  console.log(`  Has report: ${audit.formatted_report_html ? 'Yes' : 'No'}`);
  console.log(`  Email sent: ${audit.email_sent_at || 'No'}`);
  console.log(`  Completed at: ${audit.completed_at || 'No'}`);

  // 2. Check if it should be fixed
  const hasReport = !!audit.formatted_report_html;
  const hasEmail = audit.email_sent_at && !audit.email_sent_at.startsWith('sending_');
  const isFailed = audit.status === 'failed';
  const shouldFix = isFailed && (hasReport || hasEmail);

  if (!shouldFix) {
    console.log('\n⚠️  Audit does not need fixing:');
    console.log(`  - Status is ${audit.status} (not 'failed')`);
    console.log(`  - Has report: ${hasReport}`);
    console.log(`  - Has email: ${hasEmail}`);
    return;
  }

  console.log('\n🔧 Fixing audit status...');
  
  // 3. Update audit status to completed
  const { error: updateError } = await supabase
    .from('audits')
    .update({
      status: 'completed',
      completed_at: audit.completed_at || new Date().toISOString(),
      error_log: null, // Clear error log since it's actually successful
    })
    .eq('id', auditId);

  if (updateError) {
    console.error(`❌ Failed to update audit: ${updateError.message}`);
    return;
  }

  console.log('✓ Audit status updated to "completed"');

  // 4. Check and update queue item
  const { data: queueItem, error: queueError } = await supabase
    .from('audit_queue')
    .select('*')
    .eq('audit_id', auditId)
    .single();

  if (queueError && queueError.code !== 'PGRST116') {
    console.error(`❌ Error checking queue: ${queueError.message}`);
  } else if (queueItem && queueItem.status !== 'completed') {
    console.log(`\n🔧 Fixing queue item status...`);
    const { error: queueUpdateError } = await supabase
      .from('audit_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', queueItem.id);

    if (queueUpdateError) {
      console.error(`❌ Failed to update queue: ${queueUpdateError.message}`);
    } else {
      console.log('✓ Queue item status updated to "completed"');
    }
  } else if (queueItem) {
    console.log(`✓ Queue item already completed`);
  }

  // 5. Verify fix
  const { data: updatedAudit } = await supabase
    .from('audits')
    .select('status, formatted_report_html, email_sent_at, completed_at')
    .eq('id', auditId)
    .single();

  console.log('\n✅ Fix complete!');
  console.log(`  New status: ${updatedAudit?.status}`);
  console.log(`  Has report: ${updatedAudit?.formatted_report_html ? 'Yes' : 'No'}`);
  console.log(`  Email sent: ${updatedAudit?.email_sent_at || 'No'}`);
}

const auditId = process.argv[2];
if (!auditId) {
  console.error('Usage: node scripts/fix-failed-audit-with-report.js <audit_id>');
  process.exit(1);
}

fixFailedAudit(auditId).catch(console.error);

