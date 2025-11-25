# Inngest Setup Guide

## Overview

Inngest is a background job processing service that solves the Netlify function timeout issue. Audits can now process reliably without being killed by function timeouts.

## Setup Steps

### 1. Create Inngest Account

1. Go to https://www.inngest.com
2. Sign up for a free account
3. Create a new app
4. Get your **App ID** and **Signing Key**

### 2. Configure Environment Variables

Add to Netlify environment variables:

```bash
INNGEST_EVENT_KEY=your_event_key_here
INNGEST_SIGNING_KEY=your_signing_key_here
INNGEST_APP_ID=your_app_id_here
```

**Note:** For local development, add these to `.env.local`:

```bash
INNGEST_EVENT_KEY=your_event_key_here
INNGEST_SIGNING_KEY=your_signing_key_here
INNGEST_APP_ID=your_app_id_here
```

### 3. Configure Inngest Endpoint

In your Inngest dashboard:
1. Go to **Apps** → Your App
2. Set the **Sync Endpoint** to: `https://seochecksite.netlify.app/api/inngest`
3. Save the configuration

### 4. Deploy

The code is already set up. After deploying:
1. Inngest will automatically discover your functions
2. The `/api/inngest` endpoint will handle function execution
3. Audits will process reliably in the background

## How It Works

### Before (Broken):
```
Stripe Webhook → Netlify Function (10s timeout) → Background Promise → ❌ Killed
```

### After (Fixed):
```
Stripe Webhook → Send Inngest Event → Return immediately ✅
Inngest → Process Audit (no timeout) → Complete ✅
```

## Testing

### 1. Test Inngest Connection

```bash
# Check if Inngest endpoint is accessible
curl https://seochecksite.netlify.app/api/inngest
```

### 2. Test Audit Processing

```bash
# Create test audit
curl -X POST "https://seochecksite.netlify.app/api/test-audit" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://seoauditpro.net", "email": "test@example.com"}'

# Monitor in Inngest dashboard
# Or use monitoring script
./monitor-audit-direct.sh
```

### 3. Check Inngest Dashboard

1. Go to Inngest dashboard
2. Navigate to **Runs**
3. You should see audit processing jobs
4. Check logs for any errors

## Local Development

### 1. Install Inngest CLI

```bash
npm install -g inngest
```

### 2. Run Inngest Dev Server

```bash
# In one terminal
npx inngest-cli dev

# In another terminal, run your Next.js app
npm run dev
```

### 3. Test Locally

The Inngest dev server will:
- Intercept events
- Run functions locally
- Show logs and debugging info

## Troubleshooting

### Issue: Inngest events not triggering

**Check:**
1. Environment variables are set correctly
2. Inngest endpoint URL is correct in dashboard
3. Function is registered in Inngest

**Solution:**
```bash
# Check Inngest endpoint
curl https://seochecksite.netlify.app/api/inngest

# Should return Inngest sync response
```

### Issue: Functions not appearing in dashboard

**Check:**
1. Endpoint is accessible
2. Functions are exported correctly
3. Inngest can reach your endpoint

**Solution:**
- Check Netlify function logs
- Verify endpoint is public (not behind auth)
- Check Inngest dashboard for sync errors

### Issue: Audits still timing out

**Check:**
1. Inngest is actually processing (check dashboard)
2. Function is registered correctly
3. Events are being sent

**Solution:**
- Check Inngest dashboard for failed runs
- Review function logs
- Verify event is being sent (check webhook logs)

## Monitoring

### Inngest Dashboard
- View all function runs
- See execution times
- Check for errors
- View logs

### Application Logs
- Check Netlify function logs
- Look for Inngest event sends
- Monitor audit completion

## Benefits

✅ **No Timeout Issues** - Inngest handles long-running jobs
✅ **Reliable Processing** - Jobs won't be killed mid-execution
✅ **Better Monitoring** - Inngest dashboard shows all runs
✅ **Retry Logic** - Automatic retries on failure
✅ **Free Tier** - Sufficient for most use cases

## Migration Notes

- Old audits will continue to use direct processing (fallback)
- New audits will use Inngest
- Both methods work, but Inngest is preferred
- No breaking changes - graceful fallback if Inngest unavailable

