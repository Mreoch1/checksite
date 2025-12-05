# Screenshot Deployment Guide

## Playwright Screenshot Implementation

We use **Playwright** for free, reliable screenshot generation. It's better than Puppeteer because:
- Auto wait for network
- Better mobile emulation  
- More robust error handling
- Supports multiple browsers

## Netlify Deployment Considerations

⚠️ **Important**: Playwright browser binaries (~160MB) may be too large for Netlify Functions.

### Option 1: Try Netlify (Current Implementation)

The current code embeds screenshots as base64 data URLs directly in the HTML. This works but:
- Browser binaries must be included in deployment
- May hit Netlify function size limits
- Cold starts may be slower

**If deployment fails due to size**, use one of the alternatives below.

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

