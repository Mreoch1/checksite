#!/usr/bin/env node
/**
 * Fix stuck queue items using Supabase JS client
 * This script resets items stuck in "processing" status back to "pending"
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

async function fixStuckQueue() {
  console.log('\n🔧 Fixing Stuck Queue Items\n');

  // 1. Check current status
  console.log('1. Checking current queue status...');
  const { data: queueStatus, error: statusError } = await supabase
    .from('audit_queue')
    .select('status')
    .order('created_at', { ascending: false })
    .limit(100);

  if (statusError) {
    console.error(`❌ Error: ${statusError.message}`);
    return;
  }

  const statusCounts = {};
  queueStatus?.forEach(item => {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
  });

  console.log('   Current queue status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`     ${status}: ${count}`);
  });

  // 2. Find stuck processing items
  console.log('\n2. Finding stuck "processing" items (>10 minutes)...');
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { data: stuckItems, error: stuckError } = await supabase
    .from('audit_queue')
    .select('id, audit_id, started_at, retry_count')
    .eq('status', 'processing')
    .lt('started_at', tenMinutesAgo);

  if (stuckError) {
    console.error(`❌ Error: ${stuckError.message}`);
    return;
  }

  if (!stuckItems || stuckItems.length === 0) {
    console.log('   ✓ No stuck processing items found');
  } else {
    console.log(`   ⚠️  Found ${stuckItems.length} stuck item(s):`);
    stuckItems.forEach(item => {
      const age = Math.round((Date.now() - new Date(item.started_at).getTime()) / 1000 / 60);
      console.log(`     - ${item.audit_id} (stuck for ${age}m, retry: ${item.retry_count})`);
    });

    // 3. Reset stuck items
    console.log('\n3. Resetting stuck items to "pending"...');
    const stuckIds = stuckItems.map(item => item.id);
    
    const { error: resetError } = await supabase
      .from('audit_queue')
      .update({
        status: 'pending',
        started_at: null,
        last_error: 'Reset from stuck processing state',
      })
      .in('id', stuckIds);

    if (resetError) {
      console.error(`❌ Error resetting items: ${resetError.message}`);
      return;
    }

    console.log(`   ✓ Reset ${stuckItems.length} stuck item(s)`);
  }

  // 4. Check for the specific audit
  const targetAuditId = process.argv[2];
  if (targetAuditId) {
    console.log(`\n4. Checking specific audit: ${targetAuditId}...`);
    const { data: queueItem, error: itemError } = await supabase
      .from('audit_queue')
      .select('*')
      .eq('audit_id', targetAuditId)
      .single();

    if (itemError && itemError.code !== 'PGRST116') {
      console.error(`❌ Error: ${itemError.message}`);
    } else if (!queueItem) {
      console.log('   ⚠️  No queue item found for this audit');
    } else {
      console.log(`   Queue item status: ${queueItem.status}`);
      if (queueItem.status !== 'pending') {
        console.log('   Resetting to pending...');
        const { error: fixError } = await supabase
          .from('audit_queue')
          .update({
            status: 'pending',
            started_at: null,
            last_error: null,
          })
          .eq('id', queueItem.id);

        if (fixError) {
          console.error(`❌ Error: ${fixError.message}`);
        } else {
          console.log('   ✓ Reset to pending');
        }
      }
    }
  }

  console.log('\n✅ Done!');
  console.log('\n📋 Next Steps:');
  console.log('   - The queue processor will pick up pending items on the next run (every 2 minutes)');
  console.log('   - Monitor: node scripts/check-queue-status.js');
}

fixStuckQueue().catch(console.error);

