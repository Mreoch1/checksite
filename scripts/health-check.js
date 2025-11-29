#!/usr/bin/env node
/**
 * System Health Check Script
 * 
 * Follows the concrete sequence to get the system healthy:
 * 1. Confirm production deploy and environment
 * 2. Get the queue processor / cron actually running
 * 3. Unstick audits and repair the queue
 * 4. Fix email sending so completed audits actually notify customers
 * 5. Address timeouts so long audits do not fail silently
 * 6. Verify pricing, UI, and build stability
 * 7. Ongoing prevention
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const { URL } = require('url');

// Load environment variables (optional - will use process.env if dotenv not available)
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not available, use process.env directly
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QUEUE_SECRET = process.env.QUEUE_SECRET;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;
const FROM_NAME = process.env.FROM_NAME;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Colors for output
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

async function checkBuild() {
  logSection('Step 1: Build Check');
  log('Running: npm run build', 'blue');
  // Note: This would need to be run separately as it's a build process
  log('⚠️  Please run: npm run build', 'yellow');
  log('   Fix any TypeScript or build errors before continuing', 'yellow');
}

async function checkEnvironmentVariables() {
  logSection('Step 1: Environment Variables Check');
  
  const required = {
    'QUEUE_SECRET': QUEUE_SECRET,
    'SENDGRID_API_KEY': SENDGRID_API_KEY,
    'FROM_EMAIL': FROM_EMAIL,
    'FROM_NAME': FROM_NAME,
    'SUPABASE_URL': SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': SUPABASE_SERVICE_ROLE_KEY ? '***' : null,
  };
  
  log('Checking required environment variables:', 'blue');
  let allPresent = true;
  
  for (const [key, value] of Object.entries(required)) {
    const present = value !== null && value !== undefined && value !== '';
    if (present) {
      log(`  ✓ ${key}`, 'green');
    } else {
      log(`  ✗ ${key} - MISSING`, 'red');
      allPresent = false;
    }
  }
  
  if (!allPresent) {
    log('\n⚠️  Missing environment variables!', 'yellow');
    log('   Set these in Netlify dashboard: Site settings → Environment variables', 'yellow');
  }
  
  return allPresent;
}

async function checkScheduledFunction() {
  logSection('Step 2: Scheduled Function Check');
  
  log('Checking function file: netlify/functions/process-queue.js', 'blue');
  const fs = require('fs');
  const path = require('path');
  
  const functionPath = path.join(process.cwd(), 'netlify', 'functions', 'process-queue.js');
  
  if (!fs.existsSync(functionPath)) {
    log('  ✗ Function file not found!', 'red');
    return false;
  }
  
  log('  ✓ Function file exists', 'green');
  
  const functionContent = fs.readFileSync(functionPath, 'utf8');
  
  // Check for required patterns
  const hasSchedule = functionContent.includes('schedule(');
  const hasExports = functionContent.includes('exports.handler');
  const hasRequire = functionContent.includes("require('@netlify/functions')");
  
  if (hasSchedule && hasExports && hasRequire) {
    log('  ✓ Function structure looks correct', 'green');
  } else {
    log('  ✗ Function structure issues:', 'red');
    if (!hasSchedule) log('    - Missing schedule() call', 'red');
    if (!hasExports) log('    - Missing exports.handler', 'red');
    if (!hasRequire) log('    - Missing @netlify/functions require', 'red');
    return false;
  }
  
  // Check netlify.toml
  const tomlPath = path.join(process.cwd(), 'netlify.toml');
  if (fs.existsSync(tomlPath)) {
    const tomlContent = fs.readFileSync(tomlPath, 'utf8');
    if (tomlContent.includes('directory = "netlify/functions"')) {
      log('  ✓ netlify.toml has functions.directory configured', 'green');
    } else {
      log('  ⚠️  netlify.toml missing functions.directory', 'yellow');
    }
  }
  
  log('\n⚠️  Next steps:', 'yellow');
  log('   1. Deploy to Netlify', 'yellow');
  log('   2. Check Netlify dashboard → Functions → Scheduled functions', 'yellow');
  log('   3. Verify process-queue appears and has recent executions', 'yellow');
  
  return true;
}

async function checkQueueAndStuckAudits() {
  logSection('Step 3: Queue and Stuck Audits Check');
  
  // Find stuck audits
  log('Finding stuck audits...', 'blue');
  
  const { data: stuckAudits, error: stuckError } = await supabase
    .from('audits')
    .select(`
      id,
      status,
      created_at,
      email_sent_at,
      formatted_report_html,
      audit_queue (
        id,
        status,
        created_at
      )
    `)
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (stuckError) {
    log(`  ✗ Error querying audits: ${stuckError.message}`, 'red');
    return;
  }
  
  if (!stuckAudits || stuckAudits.length === 0) {
    log('  ✓ No stuck audits found', 'green');
    return;
  }
  
  log(`  Found ${stuckAudits.length} audits in pending/running status`, 'yellow');
  
  const orphaned = [];
  const stuckInQueue = [];
  
  for (const audit of stuckAudits) {
    const queueItems = audit.audit_queue || [];
    const hasQueueEntry = queueItems.length > 0;
    const hasPendingQueue = queueItems.some((q) => q.status === 'pending');
    
    if (!hasQueueEntry) {
      orphaned.push(audit);
    } else if (hasPendingQueue) {
      stuckInQueue.push(audit);
    }
  }
  
  if (orphaned.length > 0) {
    log(`\n  ⚠️  Found ${orphaned.length} orphaned audits (not in queue):`, 'yellow');
    orphaned.slice(0, 10).forEach((audit) => {
      const age = Math.round((Date.now() - new Date(audit.created_at).getTime()) / 1000 / 60);
      log(`    - ${audit.id} (${age}m old, status: ${audit.status})`, 'yellow');
    });
    
    log('\n  SQL to add orphaned audits to queue:', 'blue');
    orphaned.slice(0, 5).forEach((audit) => {
      console.log(`    INSERT INTO audit_queue (audit_id, status, created_at)`);
      console.log(`    VALUES ('${audit.id}', 'pending', NOW())`);
      console.log(`    ON CONFLICT (audit_id) DO NOTHING;`);
      console.log('');
    });
  }
  
  if (stuckInQueue.length > 0) {
    log(`\n  ⚠️  Found ${stuckInQueue.length} audits stuck in queue:`, 'yellow');
    stuckInQueue.slice(0, 10).forEach((audit) => {
      const age = Math.round((Date.now() - new Date(audit.created_at).getTime()) / 1000 / 60);
      log(`    - ${audit.id} (${age}m old)`, 'yellow');
    });
  }
  
  // Check for duplicate queue entries
  const { data: queueItems, error: queueError } = await supabase
    .from('audit_queue')
    .select('audit_id, id, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (!queueError && queueItems) {
    const auditIdCounts = {};
    queueItems.forEach((item) => {
      auditIdCounts[item.audit_id] = (auditIdCounts[item.audit_id] || 0) + 1;
    });
    
    const duplicates = Object.entries(auditIdCounts).filter(([_, count]) => count > 1);
    
    if (duplicates.length > 0) {
      log(`\n  ⚠️  Found ${duplicates.length} audit_ids with duplicate queue entries:`, 'yellow');
      duplicates.slice(0, 10).forEach(([auditId, count]) => {
        log(`    - ${auditId} (${count} entries)`, 'yellow');
      });
      
      log('\n  SQL to clean up duplicates:', 'blue');
      console.log(`    DELETE FROM audit_queue aq1`);
      console.log(`    USING audit_queue aq2`);
      console.log(`    WHERE aq1.audit_id = aq2.audit_id`);
      console.log(`      AND aq1.id > aq2.id;`);
    } else {
      log('  ✓ No duplicate queue entries found', 'green');
    }
  }
  
  // Check for unique constraint
  log('\n  Checking for unique constraint on audit_queue.audit_id...', 'blue');
  log('  ⚠️  Run this SQL to add unique constraint if missing:', 'yellow');
  console.log(`    ALTER TABLE audit_queue`);
  console.log(`    ADD CONSTRAINT audit_queue_audit_id_unique UNIQUE (audit_id);`);
}

async function checkEmailConfiguration() {
  logSection('Step 4: Email Configuration Check');
  
  const emailVars = {
    'SENDGRID_API_KEY': SENDGRID_API_KEY,
    'FROM_EMAIL': FROM_EMAIL,
    'FROM_NAME': FROM_NAME,
  };
  
  log('Checking email environment variables:', 'blue');
  let allPresent = true;
  
  for (const [key, value] of Object.entries(emailVars)) {
    if (value) {
      log(`  ✓ ${key}`, 'green');
    } else {
      log(`  ✗ ${key} - MISSING`, 'red');
      allPresent = false;
    }
  }
  
  // Check for completed audits without emails
  log('\nChecking for completed audits without emails...', 'blue');
  
  const { data: completedWithoutEmail, error } = await supabase
    .from('audits')
    .select('id, status, created_at, email_sent_at, formatted_report_html')
    .eq('status', 'completed')
    .is('email_sent_at', null)
    .not('formatted_report_html', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    log(`  ✗ Error querying: ${error.message}`, 'red');
  } else if (completedWithoutEmail && completedWithoutEmail.length > 0) {
    log(`  ⚠️  Found ${completedWithoutEmail.length} completed audits without emails:`, 'yellow');
    completedWithoutEmail.forEach((audit) => {
      const age = Math.round((Date.now() - new Date(audit.created_at).getTime()) / 1000 / 60);
      log(`    - ${audit.id} (${age}m old)`, 'yellow');
    });
    
    log('\n  To manually resend email:', 'blue');
    console.log(`    curl -X POST https://seochecksite.netlify.app/api/admin/send-report-email \\`);
    console.log(`      -H "Content-Type: application/json" \\`);
    console.log(`      -H "Authorization: Bearer YOUR_ADMIN_SECRET" \\`);
    console.log(`      -d '{"auditId": "${completedWithoutEmail[0].id}", "force": true}'`);
  } else {
    log('  ✓ No completed audits without emails found', 'green');
  }
  
  return allPresent;
}

async function checkTimeoutHandling() {
  logSection('Step 5: Timeout Handling Check');
  
  const fs = require('fs');
  const path = require('path');
  
  const routePath = path.join(process.cwd(), 'app', 'api', 'process-queue', 'route.ts');
  
  if (!fs.existsSync(routePath)) {
    log('  ✗ process-queue route not found', 'red');
    return false;
  }
  
  const routeContent = fs.readFileSync(routePath, 'utf8');
  
  const hasTimeout = routeContent.includes('MAX_PROCESSING_TIME_MS') || 
                     routeContent.includes('TIMEOUT_SAFETY_MARGIN') ||
                     routeContent.includes('Promise.race');
  
  if (hasTimeout) {
    log('  ✓ Timeout handling detected in process-queue route', 'green');
  } else {
    log('  ⚠️  No explicit timeout handling found', 'yellow');
    log('     Consider adding early return pattern for long operations', 'yellow');
  }
  
  return true;
}

async function checkPricingAndUI() {
  logSection('Step 6: Pricing and UI Check');
  
  const fs = require('fs');
  const path = require('path');
  
  // Check pricing config
  const typesPath = path.join(process.cwd(), 'lib', 'types.ts');
  if (fs.existsSync(typesPath)) {
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    
    if (typesContent.includes('basePrice: 2499')) {
      log('  ✓ Base price is $24.99 (2499 cents)', 'green');
    } else {
      log('  ⚠️  Base price may not be correct', 'yellow');
    }
  }
  
  // Check recommend page for price display
  const recommendPath = path.join(process.cwd(), 'app', 'recommend', 'page.tsx');
  if (fs.existsSync(recommendPath)) {
    const recommendContent = fs.readFileSync(recommendPath, 'utf8');
    
    if (recommendContent.includes('/ 100') || recommendContent.includes('/100')) {
      log('  ✓ Price display divides cents by 100', 'green');
    } else {
      log('  ⚠️  Price display may not convert cents to dollars', 'yellow');
    }
  }
  
  return true;
}

async function main() {
  log('\n🔍 SEO CheckSite Health Check', 'cyan');
  log('Following the concrete sequence to get the system healthy\n', 'blue');
  
  try {
    await checkBuild();
    const envOk = await checkEnvironmentVariables();
    const functionOk = await checkScheduledFunction();
    
    if (envOk && functionOk) {
      await checkQueueAndStuckAudits();
      await checkEmailConfiguration();
      await checkTimeoutHandling();
      await checkPricingAndUI();
    }
    
    logSection('Summary');
    log('Health check complete!', 'green');
    log('\nNext steps:', 'blue');
    log('  1. Fix any issues identified above', 'yellow');
    log('  2. Run: npm run build', 'yellow');
    log('  3. Deploy to Netlify', 'yellow');
    log('  4. Verify scheduled function is running in Netlify dashboard', 'yellow');
    log('  5. Create a test audit and monitor its progress', 'yellow');
    
  } catch (error) {
    log(`\n❌ Error during health check: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();

