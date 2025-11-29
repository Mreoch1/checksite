#!/usr/bin/env node
/**
 * Check Queue Status
 * 
 * Shows current queue status and recent activity
 */

const { createClient } = require('@supabase/supabase-js');
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

async function checkQueueStatus() {
  log('\n🔍 Queue Status Check', 'cyan');
  console.log('='.repeat(60));
  
  // Get all queue items
  const { data: allItems, error } = await supabase
    .from('audit_queue')
    .select('*, audits(id, status, email_sent_at, formatted_report_html, created_at)')
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return;
  }
  
  if (!allItems || allItems.length === 0) {
    log('✅ No queue items found', 'green');
    return;
  }
  
  // Group by status
  const byStatus = {
    pending: [],
    processing: [],
    completed: [],
    failed: [],
  };
  
  allItems.forEach((item) => {
    const status = item.status || 'unknown';
    if (byStatus[status]) {
      byStatus[status].push(item);
    }
  });
  
  log(`\n📊 Queue Summary (showing ${allItems.length} most recent):`, 'blue');
  log(`   Pending: ${byStatus.pending.length}`, byStatus.pending.length > 0 ? 'yellow' : 'green');
  log(`   Processing: ${byStatus.processing.length}`, byStatus.processing.length > 0 ? 'yellow' : 'green');
  log(`   Completed: ${byStatus.completed.length}`, 'green');
  log(`   Failed: ${byStatus.failed.length}`, byStatus.failed.length > 0 ? 'red' : 'green');
  
  // Show pending items
  if (byStatus.pending.length > 0) {
    log(`\n⏳ Pending Items (${byStatus.pending.length}):`, 'yellow');
    byStatus.pending.forEach((item) => {
      const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits;
      const age = Math.round((Date.now() - new Date(item.created_at).getTime()) / 1000 / 60);
      const auditStatus = audit?.status || 'unknown';
      const hasReport = !!audit?.formatted_report_html;
      const emailSent = audit?.email_sent_at ? '✓' : '✗';
      
      log(`   ${item.audit_id}`, 'blue');
      log(`      Queue ID: ${item.id}`, 'yellow');
      log(`      Age: ${age}m`, 'yellow');
      log(`      Audit Status: ${auditStatus}`, auditStatus === 'completed' ? 'green' : 'yellow');
      log(`      Has Report: ${hasReport ? '✓' : '✗'}`, hasReport ? 'green' : 'red');
      log(`      Email Sent: ${emailSent}`, emailSent === '✓' ? 'green' : 'red');
      console.log('');
    });
  }
  
  // Show processing items
  if (byStatus.processing.length > 0) {
    log(`\n⚙️  Processing Items (${byStatus.processing.length}):`, 'yellow');
    byStatus.processing.forEach((item) => {
      const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits;
      const age = Math.round((Date.now() - new Date(item.started_at || item.created_at).getTime()) / 1000 / 60);
      const auditStatus = audit?.status || 'unknown';
      
      log(`   ${item.audit_id}`, 'blue');
      log(`      Queue ID: ${item.id}`, 'yellow');
      log(`      Processing for: ${age}m`, age > 10 ? 'red' : 'yellow');
      log(`      Audit Status: ${auditStatus}`, 'yellow');
      console.log('');
    });
  }
  
  // Show recent completed
  if (byStatus.completed.length > 0) {
    log(`\n✅ Recently Completed (showing 5):`, 'green');
    byStatus.completed.slice(0, 5).forEach((item) => {
      const audit = Array.isArray(item.audits) ? item.audits[0] : item.audits;
      const completedAge = item.completed_at 
        ? Math.round((Date.now() - new Date(item.completed_at).getTime()) / 1000 / 60)
        : null;
      
      log(`   ${item.audit_id}`, 'blue');
      if (completedAge !== null) {
        log(`      Completed: ${completedAge}m ago`, 'green');
      }
      console.log('');
    });
  }
  
  // Check for stuck items
  const stuckProcessing = byStatus.processing.filter((item) => {
    const startedAt = item.started_at || item.created_at;
    const age = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000 / 60);
    return age > 10; // Processing for more than 10 minutes
  });
  
  if (stuckProcessing.length > 0) {
    log(`\n⚠️  Stuck Processing Items (${stuckProcessing.length}):`, 'red');
    stuckProcessing.forEach((item) => {
      const age = Math.round((Date.now() - new Date(item.started_at || item.created_at).getTime()) / 1000 / 60);
      log(`   ${item.audit_id} - Processing for ${age}m`, 'red');
    });
  }
}

checkQueueStatus().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

