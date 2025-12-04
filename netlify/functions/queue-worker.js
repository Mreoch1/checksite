/**
 * Standalone Netlify Function for queue processing
 * This completely bypasses Next.js to avoid all caching issues
 * 
 * This is a direct port of the Next.js API route logic
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
  const requestTimestamp = new Date().toISOString();
  
  console.log(`[${requestId}] Standalone Netlify function called at ${requestTimestamp}`);
  console.log(`[${requestId}] [ENTRY] This is a fresh execution - no Next.js involved`);
  
  try {
    // Auth check
    const expectedSecret = process.env.QUEUE_SECRET;
    const querySecret = event.queryStringParameters?.secret;
    
    if (expectedSecret && querySecret !== expectedSecret) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log(`[${requestId}] [atomic-claim] Attempting to claim queue item via RPC...`);
    
    // Claim oldest pending queue item
    const { data: claimedRows, error: claimError } = await supabase
      .rpc('claim_oldest_audit_queue');
    
    if (claimError) {
      console.error(`[${requestId}] [atomic-claim] ❌ RPC error:`, claimError);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        },
        body: JSON.stringify({
          success: false,
          message: 'Failed to claim queue item',
          error: claimError.message
        })
      };
    }
    
    if (!claimedRows || claimedRows.length === 0) {
      console.log(`[${requestId}] [atomic-claim] No pending queue items`);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        },
        body: JSON.stringify({
          success: true,
          message: 'No pending audits in queue',
          processed: false
        })
      };
    }
    
    const queueItem = claimedRows[0];
    const auditId = queueItem.audit_id;
    
    console.log(`[${requestId}] [atomic-claim] ✅ Claimed queue item: id=${queueItem.id.substring(0, 8)}, audit_id=${auditId.substring(0, 8)}`);
    
    // Now call the Next.js API route to do the actual processing
    // We pass the queueId so it processes the specific item we claimed
    console.log(`[${requestId}] [processing] Calling Next.js endpoint to process audit...`);
    
    const https = require('https');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.net';
    const hostname = siteUrl.replace('https://', '').replace('http://', '');
    
    const processResult = await new Promise((resolve) => {
      const opts = {
        hostname: hostname,
        path: `/api/process-queue-v2?secret=${process.env.QUEUE_SECRET}&_claimed=${queueItem.id}`,
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Queue-Item-Id': queueItem.id,
          'X-Audit-Id': auditId
        }
      };
      
      https.get(opts, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({error: 'parse', raw: data});
          }
        });
      }).on('error', (e) => {
        console.error(`[${requestId}] [processing] Error calling Next.js:`, e);
        resolve({error: e.message});
      });
    });
    
    console.log(`[${requestId}] [processing] Next.js processing completed`);
    
    const responseBody = {
      success: true,
      message: 'Audit processing initiated',
      processed: true,
      auditId: auditId,
      queueId: queueItem.id,
      requestId: requestId,
      requestTimestamp: requestTimestamp,
      _cacheBust: Date.now(),
      processingResult: processResult
    };
    
    console.log(`[${requestId}] [response] Returning auditId=${auditId.substring(0, 8)}`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Request-Id': requestId,
        'X-Audit-Id': auditId
      },
      body: JSON.stringify(responseBody)
    };
    
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

