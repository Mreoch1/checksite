/**
 * Direct queue processor - bypasses Next.js entirely
 * This is called directly by cron-job.org
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

exports.handler = async (event) => {
  const timestamp = Date.now();
  console.log(`[direct-process-${timestamp}] Called at ${new Date().toISOString()}`);
  
  // Auth check
  const expectedSecret = process.env.QUEUE_SECRET;
  const querySecret = event.queryStringParameters?.secret;
  
  if (expectedSecret && querySecret !== expectedSecret) {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({ error: 'Unauthorized', timestamp })
    };
  }
  
  // Call Next.js API with unique cache-bust parameter
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.net';
  const apiUrl = `${siteUrl}/api/process-queue?secret=${expectedSecret}&_cb=${timestamp}`;
  
  console.log(`[direct-process-${timestamp}] Calling ${apiUrl}`);
  
  return new Promise((resolve) => {
    const url = new URL(apiUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      }
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`[direct-process-${timestamp}] Response ${res.statusCode}: ${data.substring(0, 200)}`);
        resolve({
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          },
          body: JSON.stringify({
            success: true,
            timestamp,
            apiResponse: JSON.parse(data),
          })
        });
      });
    }).on('error', (err) => {
      console.error(`[direct-process-${timestamp}] Error:`, err.message);
      resolve({
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ error: err.message, timestamp })
      });
    });
  });
};

