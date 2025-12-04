/**
 * Netlify Scheduled Function for processing audit queue
 * Schedule is defined in netlify.toml: every 1 minute (reduced for testing)
 */

export default async function handler(req) {
  // For scheduled functions, Netlify sends a Request whose body contains JSON:
  // { "next_run": "<ISO string>" }
  try {
    const body = await req.json().catch(() => ({}));
    const { next_run } = body;
    console.log(`[process-queue-scheduled] Scheduled run. Next run: ${next_run || 'unknown'}`);
  } catch (e) {
    // If body is empty for some reason, just continue
    console.log(`[process-queue-scheduled] Scheduled run. No next_run in body`);
  }

  const siteUrl = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.netlify.app';
  // Use standalone Netlify function instead of Next.js API route to avoid caching issues
  const endpoint = `${siteUrl}/.netlify/functions/queue-worker`;
  const queueSecret = process.env.QUEUE_SECRET;
  
  // Build the URL with optional secret
  const url = queueSecret 
    ? `${endpoint}?secret=${queueSecret}`
    : endpoint;
  
  console.log(`[process-queue-scheduled] Calling ${endpoint}...`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Netlify-Scheduled-Function/1.0',
      },
      // Note: fetch doesn't have a direct timeout option, but Netlify functions have a 26s limit
      // The API route should handle its own timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[process-queue-scheduled] Call failed: ${response.status} ${errorText}`);
      return new Response(JSON.stringify({
        success: false,
        error: `API returned ${response.status}: ${errorText}`,
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const data = await response.json().catch(() => ({}));
    console.log(`[process-queue-scheduled] Response: ${response.status}`, data);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Queue processing triggered',
      apiResponse: data,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[process-queue-scheduled] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Schedule is defined in netlify.toml instead of here
// This avoids potential parsing conflicts with the cron expression
