#!/usr/bin/env node

/**
 * Small controlled test for queue processing
 * Creates exactly 3-5 audits to validate the system before stress testing
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.net';
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const TEST_EMAIL = 'Mreoch82@hotmail.com';

// Small batch of 5 diverse URLs for controlled testing
const TEST_URLS = [
  'https://example.com',
  'https://nextjs.org/docs',
  'https://tripplanner.com',
  'https://wikipedia.org',
  'https://github.com',
];

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function createAudit(url, email) {
  const testAuditUrl = `${BASE_URL}/api/test-audit`;
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Add admin authentication if available
  if (ADMIN_SECRET) {
    headers['Authorization'] = `Bearer ${ADMIN_SECRET}`;
  }
  
  try {
    const response = await makeRequest(testAuditUrl, {
      method: 'POST',
      headers: headers,
      body: {
        url: url,
        email: email,
      },
    });
    
    if (response.status === 200 && response.data.success) {
      return {
        success: true,
        auditId: response.data.auditId,
        url: url,
      };
    } else {
      return {
        success: false,
        url: url,
        error: response.data.error || `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      url: url,
      error: error.message,
    };
  }
}

async function main() {
  if (!ADMIN_SECRET) {
    console.warn('⚠️  ADMIN_SECRET not set - authentication may fail');
    console.warn('   Set ADMIN_SECRET environment variable for admin access');
  }
  
  console.log('🧪 Starting small controlled test (3-5 audits)...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📧 Test Email: ${TEST_EMAIL}`);
  console.log(`🔢 Creating ${TEST_URLS.length} audits...\n`);
  
  const startTime = Date.now();
  const results = [];
  
  // Create audits sequentially with small delays to avoid overwhelming
  for (let i = 0; i < TEST_URLS.length; i++) {
    const url = TEST_URLS[i];
    console.log(`📝 Creating audit ${i + 1}/${TEST_URLS.length} for ${url}...`);
    
    const result = await createAudit(url, TEST_EMAIL);
    results.push(result);
    
    if (result.success) {
      console.log(`   ✅ Audit created: ${result.auditId}`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
    
    // Small delay between requests (except for last one)
    if (i < TEST_URLS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const endTime = Date.now();
  
  // Summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`⏱️  Total time: ${Math.round((endTime - startTime) / 1000)}s`);
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Created Audit IDs:');
    successful.forEach((r, idx) => {
      console.log(`   ${idx + 1}. ${r.auditId} (${r.url})`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed URLs:');
    failed.forEach(r => {
      console.log(`   - ${r.url}: ${r.error}`);
    });
  }
  
  console.log('\n💡 Next steps:');
  console.log('   1. Verify database state in Supabase:');
  console.log('      SELECT count(*) FROM audit_queue;');
  console.log('      SELECT count(*) FROM audits;');
  console.log('      SELECT id, status, created_at FROM audit_queue ORDER BY created_at;');
  console.log('   2. Trigger manual queue run:');
  console.log(`      ${BASE_URL}/api/process-queue?secret=${process.env.QUEUE_SECRET || 'YOUR_SECRET'}`);
  console.log('   3. Verify results:');
  console.log('      SELECT id, status, completed_at FROM audit_queue;');
  console.log('      SELECT id, status, email_sent_at FROM audits;');
  console.log('   4. Wait for next 2-minute cron cycle');
  console.log('   5. Confirm cadence: 1 email every 2 minutes\n');
}

main().catch(console.error);

