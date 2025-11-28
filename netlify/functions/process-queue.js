/**
 * Netlify Scheduled Function wrapper for process-queue API route
 * This function is called by Netlify's scheduled functions feature
 * and then calls the Next.js API route
 * 
 * Schedule: Every 2 minutes (*/2 * * * *)
 */

const https = require('https');
const { URL } = require('url');

// For Netlify scheduled functions, we can use the schedule export
// But for simplicity, we'll use a regular function and configure schedule in netlify.toml
exports.handler = async (event, context) => {
  const siteUrl = process.env.URL || 'https://seochecksite.netlify.app';
  const endpoint = `${siteUrl}/api/process-queue`;
  const queueSecret = process.env.QUEUE_SECRET;
  
  // Build the URL with optional secret
  const url = queueSecret 
    ? `${endpoint}?secret=${queueSecret}`
    : endpoint;
  
  console.log(`[process-queue-scheduled] Calling ${endpoint}...`);
  
  try {
    const response = await new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const req = https.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Netlify-Scheduled-Function/1.0',
        },
        timeout: 25000, // 25 seconds (within Netlify's 26s limit)
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              body: JSON.parse(data),
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              body: data,
            });
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
    
    console.log(`[process-queue-scheduled] Response: ${response.statusCode}`, response.body);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Queue processing triggered',
        apiResponse: response.body,
      }),
    };
  } catch (error) {
    console.error('[process-queue-scheduled] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};

