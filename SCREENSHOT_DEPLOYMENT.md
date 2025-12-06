# Screenshot Deployment Guide

## ⚠️ CRITICAL: Playwright Cannot Run in Netlify Functions

**Netlify Functions cannot reliably run Playwright** because:
- The environment does not ship with full browser binaries
- Playwright + Chromium bundle is too large (~160MB) for serverless limits
- Browser binaries are not available in the Netlify Functions runtime

**Current Status**: Screenshots are gracefully disabled by default. The system works perfectly without screenshots.

## Recommended Architecture: Separate Screenshot Service

**Do NOT try to run Playwright directly inside Netlify Functions.** Instead, use a separate screenshot service.

### Flow

1. User starts an audit on Netlify
2. Netlify Function sends a request to a separate Screenshot Service with:
   - Target URL
   - Mode: desktop, mobile
   - Audit identifier
3. Screenshot Service (Node + Playwright) does:
   - Launches Chromium
   - Takes desktop and mobile screenshots
   - Uploads images to storage (S3, R2, Supabase storage, etc.)
   - Returns public URLs to Netlify or writes them into database
4. Report renderer uses those image URLs in the HTML

### Hosting Options for Screenshot Service

- **Render** (free or low cost)
- **Railway** (simple deployment)
- **Fly.io** (good performance)
- **Small VPS** (~$5/month)

This keeps Netlify fast and light, and gives you full control over screenshots.

### Option 2: Cloudflare Browser Rendering API (Recommended Alternative)

If Playwright doesn't work on Netlify, use Cloudflare's Browser Rendering API:

```typescript
// lib/screenshot-cloudflare.ts
export async function captureScreenshot(url: string, device: 'desktop' | 'mobile') {
  const response = await fetch('https://api.cloudflare.com/client/v4/accounts/{account_id}/browser/screenshot', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      viewport: device === 'mobile' ? { width: 375, height: 667 } : { width: 1280, height: 720 },
    }),
  })
  // ... handle response
}
```

**Benefits**:
- Free tier available
- Pay as you go
- No browser binaries needed
- Works perfectly in serverless

### Option 3: Separate Screenshot Service

Run Playwright in a separate Docker container or microservice:

1. Create screenshot service (Node.js + Playwright)
2. Deploy to Railway, Render, or Fly.io
3. Call from audit processor via HTTP

**Architecture**:
```
Audit Processor → Screenshot Service API → Playwright → Base64 → Return to Processor
```

### Option 4: Disable Screenshots (Graceful Degradation)

If screenshots cause issues, disable them:

```bash
# In Netlify environment variables
ENABLE_SCREENSHOTS=false
```

Reports will work perfectly without screenshots - they're optional.

## Current Implementation

The current code uses Playwright with:
- Desktop screenshots: 1280x720
- Mobile screenshots: 375x667 (2x device scale)
- Full page capture
- Base64 data URLs embedded in HTML

## Testing Locally

```bash
# Install Playwright browsers
npx playwright install chromium

# Test screenshot capture
node -e "
const { captureWebsiteScreenshots } = require('./lib/screenshot.ts');
captureWebsiteScreenshots('https://example.com').then(console.log);
"
```

## Deployment Checklist

- [ ] Test Playwright locally
- [ ] If Netlify deployment fails due to size, switch to Cloudflare API
- [ ] Or set up separate screenshot service
- [ ] Or disable screenshots with `ENABLE_SCREENSHOTS=false`
- [ ] Verify screenshots appear in test report

## Troubleshooting

**Error: "Browser binaries not found"**
- Run `npx playwright install chromium` locally
- For Netlify, may need to include binaries in deployment (may hit size limits)

**Error: "Function timeout"**
- Screenshots can take 10-30 seconds
- Increase Netlify function timeout if needed
- Or use Cloudflare API (faster)

**Error: "Function too large"**
- Use Cloudflare Browser Rendering API instead
- Or run screenshots in separate service
- Or disable screenshots

