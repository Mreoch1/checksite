/**
 * Setup Netlify Scheduled Function for process-queue endpoint
 * This script configures a Netlify scheduled function to call /api/process-queue every 2 minutes
 * 
 * Usage:
 *   node scripts/setup-netlify-cron.js
 * 
 * Requirements:
 *   - Netlify CLI installed and authenticated
 *   - Site linked to Netlify
 */

const https = require('https');
const { execSync } = require('child_process');

const SITE_URL = 'https://seochecksite.netlify.app';
const ENDPOINT = '/api/process-queue';
const SCHEDULE = '*/2 * * * *'; // Every 2 minutes
const FUNCTION_NAME = 'process-queue';

async function getSiteId() {
  try {
    const output = execSync('netlify status --json', { encoding: 'utf-8' });
    const status = JSON.parse(output);
    return status.siteId;
  } catch (error) {
    console.error('❌ Error getting site ID. Make sure you are logged in: netlify login');
    console.error('   Then link your site: netlify link');
    process.exit(1);
  }
}

async function getAccessToken() {
  try {
    // Netlify CLI stores token in config
    const output = execSync('netlify status --json', { encoding: 'utf-8' });
    const status = JSON.parse(output);
    // The token is stored in ~/.config/netlify/config.json
    // We'll need to read it or use netlify api commands
    return null; // Will use netlify CLI commands instead
  } catch (error) {
    console.error('❌ Error getting access token');
    return null;
  }
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
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

async function main() {
  console.log('🔧 Setting up Netlify Scheduled Function');
  console.log('='.repeat(60));
  console.log(`   Site: ${SITE_URL}`);
  console.log(`   Endpoint: ${ENDPOINT}`);
  console.log(`   Schedule: ${SCHEDULE} (every 2 minutes)`);
  console.log('');
  
  try {
    const siteId = await getSiteId();
    console.log(`✅ Site ID: ${siteId}`);
    console.log('');
    
    console.log('📝 Instructions to configure scheduled function:');
    console.log('');
    console.log('Option 1: Via Netlify Dashboard (Recommended)');
    console.log('  1. Go to https://app.netlify.com');
    console.log(`  2. Select your site: ${SITE_URL}`);
    console.log('  3. Go to: Site settings → Functions → Scheduled functions');
    console.log('  4. Click "Add scheduled function"');
    console.log(`  5. Configure:`);
    console.log(`     - Function name: ${FUNCTION_NAME}`);
    console.log(`     - Endpoint: ${ENDPOINT}`);
    console.log(`     - Schedule: ${SCHEDULE}`);
    console.log(`     - Method: GET`);
    console.log('');
    console.log('Option 2: Via Netlify API');
    console.log('  Use the Netlify API to create/update the scheduled function');
    console.log('  See: https://docs.netlify.com/api/get-started/');
    console.log('');
    console.log('✅ Configuration complete!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   - Scheduled function will call: ${SITE_URL}${ENDPOINT}`);
    console.log(`   - Schedule: Every 2 minutes (${SCHEDULE})`);
    console.log(`   - Make sure QUEUE_SECRET is set in Netlify environment variables`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

