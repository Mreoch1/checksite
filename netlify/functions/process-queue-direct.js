/**
 * Direct Netlify Function for queue processing
 * This bypasses Next.js entirely to avoid caching issues
 */

const https = require('https');

exports.handler = async (event, context) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36);
  console.log(`[${requestId}] Direct Netlify function called`);
  
  // Forward to Next.js API route
  const secret = process.env.QUEUE_SECRET;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.net';
  
  return new Promise((resolve) => {
    const opts = {
      hostname: siteUrl.replace('https://', '').replace('http://', ''),
      path: `/api/process-queue?secret=${secret}&_direct=${Date.now()}`,
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Netlify-Direct': 'true'
      }
    };
    
    https.get(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[${requestId}] Got response from Next.js API`);
        resolve({
          statusCode: res.statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          body: data
        });
      });
    }).on('error', (e) => {
      console.error(`[${requestId}] Error:`, e);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: e.message })
      });
    });
  });
};

