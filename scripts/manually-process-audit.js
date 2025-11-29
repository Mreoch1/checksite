#!/usr/bin/env node
/**
 * Manually trigger processing for a specific audit
 * Usage: node scripts/manually-process-audit.js <audit_id>
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

async function manuallyProcessAudit(auditId) {
  console.log(`\n🔧 Manually processing audit: ${auditId}\n`);

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
  console.log(`  Status: ${audit.status}`);
  console.log(`  Email sent: ${audit.email_sent_at || 'No'}`);
  console.log(`  Has report: ${audit.formatted_report_html ? 'Yes' : 'No'}`);

  // 2. Check/update queue item
  const { data: queueItem, error: queueError } = await supabase
    .from('audit_queue')
    .select('*')
    .eq('audit_id', auditId)
    .single();

  if (queueError && queueError.code !== 'PGRST116') {
    console.error(`❌ Error checking queue: ${queueError.message}`);
    return;
  }

  if (!queueItem) {
    console.log('⚠️  No queue item found - creating one...');
    const { error: insertError } = await supabase
      .from('audit_queue')
      .insert({
        audit_id: auditId,
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error(`❌ Failed to create queue item: ${insertError.message}`);
      return;
    }
    console.log('✓ Queue item created');
  } else {
    console.log(`✓ Queue item found: ${queueItem.id}`);
    console.log(`  Status: ${queueItem.status}`);
    
    // Reset to pending if it's stuck
    if (queueItem.status !== 'pending') {
      console.log(`⚠️  Queue item is ${queueItem.status} - resetting to pending...`);
      const { error: updateError } = await supabase
        .from('audit_queue')
        .update({
          status: 'pending',
          started_at: null,
          last_error: null,
        })
        .eq('id', queueItem.id);

      if (updateError) {
        console.error(`❌ Failed to reset queue item: ${updateError.message}`);
        return;
      }
      console.log('✓ Queue item reset to pending');
    }
  }

  // 3. Call the process-queue endpoint
  console.log('\n📞 Calling /api/process-queue endpoint...');
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app';
  const queueSecret = process.env.QUEUE_SECRET;
  
  const url = new URL('/api/process-queue', baseUrl);
  if (queueSecret) {
    url.searchParams.set('secret', queueSecret);
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✓ Process-queue endpoint called successfully');
      console.log(`  Message: ${result.message}`);
      console.log(`  Processed: ${result.processed ? 'Yes' : 'No'}`);
      if (result.auditId) {
        console.log(`  Audit ID: ${result.auditId}`);
      }
      if (result.email_sent_at) {
        console.log(`  Email sent at: ${result.email_sent_at}`);
      }
    } else {
      console.error(`❌ Process-queue endpoint error: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`❌ Failed to call process-queue endpoint: ${error.message}`);
    console.log('\n💡 Alternative: The queue processor will pick this up on the next scheduled run (every 2 minutes)');
  }

  // 4. Wait a moment and check status
  console.log('\n⏳ Waiting 3 seconds, then checking status...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const { data: updatedAudit } = await supabase
    .from('audits')
    .select('status, email_sent_at, formatted_report_html')
    .eq('id', auditId)
    .single();

  if (updatedAudit) {
    console.log('\n📊 Updated audit status:');
    console.log(`  Status: ${updatedAudit.status}`);
    console.log(`  Email sent: ${updatedAudit.email_sent_at || 'No'}`);
    console.log(`  Has report: ${updatedAudit.formatted_report_html ? 'Yes' : 'No'}`);
  }
}

const auditId = process.argv[2];
if (!auditId) {
  console.error('Usage: node scripts/manually-process-audit.js <audit_id>');
  process.exit(1);
}

manuallyProcessAudit(auditId).catch(console.error);

