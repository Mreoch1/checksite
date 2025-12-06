# Screenshot Service

Standalone screenshot service using Playwright. Deploy this separately from Netlify.

## Why Separate Service?

Netlify Functions cannot reliably run Playwright because:
- Browser binaries are not available in Netlify Functions runtime
- Playwright + Chromium bundle is too large (~160MB) for serverless limits
- Execution timeouts are too short for browser automation

## Deployment Options

### Render

1. Create new Web Service
2. Connect GitHub repo
3. Build command: `npm install && npx playwright install chromium`
4. Start command: `node services/screenshot-service/index.js`
5. Set environment variables

### Railway

1. Create new project
2. Deploy from GitHub
3. Add build command: `npx playwright install chromium`
4. Set PORT environment variable

### Fly.io

```bash
fly launch
fly deploy
```

### VPS (Ubuntu/Debian)

```bash
# Install dependencies
sudo apt update
sudo apt install -y nodejs npm

# Install Playwright browsers
npm install
npx playwright install chromium

# Run with PM2
npm install -g pm2
pm2 start services/screenshot-service/index.js
pm2 save
pm2 startup
```

## Environment Variables

```bash
PORT=3000
STORAGE_TYPE=s3  # or 'supabase', 'r2', etc.
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=...
AWS_REGION=...
```

## API Endpoints

### POST /screenshot

Capture a single screenshot.

**Request:**
```json
{
  "url": "https://example.com",
  "mode": "desktop",  // or "mobile"
  "auditId": "optional-audit-id"
}
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://storage.example.com/screenshot.png",
  "mode": "desktop",
  "url": "https://example.com"
}
```

### POST /screenshots

Capture both desktop and mobile screenshots.

**Request:**
```json
{
  "url": "https://example.com",
  "auditId": "optional-audit-id"
}
```

**Response:**
```json
{
  "success": true,
  "desktop": "https://storage.example.com/desktop.png",
  "mobile": "https://storage.example.com/mobile.png",
  "auditId": "optional-audit-id"
}
```

## Integration with Netlify

Update `lib/screenshot.ts` to call this service instead of running Playwright directly:

```typescript
export async function captureWebsiteScreenshots(url: string): Promise<{
  desktop?: string
  mobile?: string
}> {
  const SCREENSHOT_SERVICE_URL = process.env.SCREENSHOT_SERVICE_URL;
  
  if (!SCREENSHOT_SERVICE_URL) {
    console.log('📸 Screenshot service not configured, skipping');
    return {};
  }

  try {
    const response = await fetch(`${SCREENSHOT_SERVICE_URL}/screenshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const result = await response.json();
    
    return {
      desktop: result.desktop,
      mobile: result.mobile,
    };
  } catch (error) {
    console.error('Screenshot service error:', error);
    return {};
  }
}
```

## Storage Implementation

Implement `uploadToStorage()` in `storage.js` for your chosen storage provider:

- **Supabase Storage**: Use `@supabase/storage-js`
- **AWS S3**: Use `@aws-sdk/client-s3`
- **Cloudflare R2**: Use `@aws-sdk/client-s3` (R2 is S3-compatible)
- **Other**: Implement your storage client

