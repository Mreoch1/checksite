#!/usr/bin/env node

/**
 * Stress test script for queue processing
 * Creates 20-30 audits in quick succession with a mix of:
 * - Normal, fetchable URLs
 * - Known 403/404/garbage domains to exercise permanent-error handling
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = 'https://seochecksite.net'; // Always use production for stress test
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const TEST_EMAIL = 'Mreoch82@hotmail.com';
const BATCH_SIZE = 5; // Create audits in batches to avoid overwhelming the system
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds between batches

// Mix of URLs: mostly normal, some that will fail
const TEST_URLS = [
  // Normal, fetchable URLs (majority)
  'https://example.com',
  'https://nextjs.org/docs',
  'https://tripplanner.com',
  'https://wikipedia.org',
  'https://github.com',
  'https://stackoverflow.com',
  'https://google.com',
  'https://microsoft.com',
  'https://apple.com',
  'https://amazon.com',
  'https://netflix.com',
  'https://twitter.com',
  'https://linkedin.com',
  'https://reddit.com',
  'https://youtube.com',
  'https://facebook.com',
  'https://instagram.com',
  'https://pinterest.com',
  'https://tumblr.com',
  'https://wordpress.com',
  
  // Known permanent failures (403/404/garbage)
  'https://this-domain-definitely-does-not-exist-12345.com',
  'https://httpstat.us/403', // Returns 403
  'https://httpstat.us/404', // Returns 404
  'https://httpstat.us/401', // Returns 401
  'https://invalid-tld-xyz.xyz123', // Invalid domain
];

// Select 20-30 URLs (mix of normal and failures)
const SELECTED_URLS = [
  ...TEST_URLS.slice(0, 20), // First 20 are mostly normal
  ...TEST_URLS.slice(20), // Last few are failures
].slice(0, 25); // Take 25 total

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

async function createAuditsInBatches(urls, email, batchSize, delayMs) {
  const results = [];
  const batches = [];
  
  // Split URLs into batches
  for (let i = 0; i < urls.length; i += batchSize) {
    batches.push(urls.slice(i, i + batchSize));
  }
  
  console.log(`\n📊 Creating ${urls.length} audits in ${batches.length} batches of ${batchSize}...\n`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n🔄 Batch ${i + 1}/${batches.length} (${batch.length} audits)...`);
    
    // Create all audits in this batch in parallel
    const batchPromises = batch.map(url => createAudit(url, email));
    const batchResults = await Promise.all(batchPromises);
    
    // Log results
    batchResults.forEach((result, idx) => {
      if (result.success) {
        console.log(`  ✅ ${batch[idx]} → Audit ID: ${result.auditId}`);
      } else {
        console.log(`  ❌ ${batch[idx]} → Error: ${result.error}`);
      }
    });
    
    results.push(...batchResults);
    
    // Wait before next batch (except for last batch)
    if (i < batches.length - 1) {
      console.log(`  ⏳ Waiting ${delayMs}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

async function main() {
  if (!ADMIN_SECRET) {
    console.warn('⚠️  ADMIN_SECRET not set - authentication may fail');
    console.warn('   Set ADMIN_SECRET environment variable for admin access');
  }
  
  console.log('🚀 Starting queue stress test...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📧 Test Email: ${TEST_EMAIL}`);
  console.log(`🔢 Total URLs: ${SELECTED_URLS.length}`);
  console.log(`   - Normal URLs: ~${SELECTED_URLS.length - 5}`);
  console.log(`   - Failure URLs: ~5`);
  
  const startTime = Date.now();
  const results = await createAuditsInBatches(
    SELECTED_URLS,
    TEST_EMAIL,
    BATCH_SIZE,
    DELAY_BETWEEN_BATCHES
  );
  const endTime = Date.now();
  
  // Summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 STRESS TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`⏱️  Total time: ${Math.round((endTime - startTime) / 1000)}s`);
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Successful Audit IDs:');
    successful.forEach(r => {
      console.log(`   - ${r.auditId} (${r.url})`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed URLs:');
    failed.forEach(r => {
      console.log(`   - ${r.url}: ${r.error}`);
    });
  }
  
  console.log('\n💡 Next steps:');
  console.log('   1. Wait for /api/process-queue to run (every 2 minutes)');
  console.log('   2. Monitor logs for queue processing');
  console.log('   3. Run: node scripts/check-stress-test-results.js');
  console.log('      to verify all audits completed successfully');
  console.log('\n');
}

main().catch(console.error);
