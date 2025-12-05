/**
 * Netlify Scheduled Function for processing audit queue
 * This function runs automatically every 2 minutes
 * Schedule is defined in netlify.toml
 */

export default async function handler(req) {
  const timestamp = new Date().toISOString();
  console.log(`[process-queue-scheduled] Started at ${timestamp}`);
  
  // Get next_run from scheduled function payload
  try {
    const body = await req.json().catch(() => ({}));
    if (body.next_run) {
      console.log(`[process-queue-scheduled] Next run: ${body.next_run}`);
    }
  } catch (e) {
    // Ignore JSON parse errors
  }

  // Call the Next.js API route directly with cache-busting
  const siteUrl = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.net';
  const queueSecret = process.env.QUEUE_SECRET;
  const cacheBust = Date.now();
  const apiUrl = `${siteUrl}/api/process-queue?_t=${cacheBust}${queueSecret ? `&secret=${queueSecret}` : ''}`;
  
  console.log(`[process-queue-scheduled] Calling ${siteUrl}/api/process-queue with cache-bust=${cacheBust}...`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Netlify-Scheduled-Function',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { raw: text };
    }
    
    console.log(`[process-queue-scheduled] Response ${response.status}:`, data);
    
    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: `API returned ${response.status}`,
        details: data,
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Queue processing completed',
      result: data,
      timestamp,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[process-queue-scheduled] Error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
