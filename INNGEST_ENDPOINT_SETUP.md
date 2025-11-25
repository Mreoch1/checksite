# Inngest Endpoint Setup - Step by Step

## Current Status (Local Dev)

✅ **App Detected**: `seo-checksite`
✅ **Local Endpoint**: `http://localhost:3000/api/inngest`
✅ **Function Found**: `process-audit`
✅ **Framework**: Next.js
✅ **SDK Version**: v3.46.0

## Setting Up Production Endpoint

### Step 1: Go to Production Inngest Dashboard

1. **Open Inngest Production Dashboard**
   - Go to: https://www.inngest.com
   - Make sure you're in **Production** environment (not Dev Server)
   - Look for environment selector in top right

2. **Navigate to Apps**
   - Click **"Apps"** in the left sidebar
   - You should see your app or need to create one

### Step 2: Create or Select Your App

**If you don't have an app yet:**
1. Click **"+ Create App"** or **"New App"**
2. Name it: `seo-checksite` (or any name you prefer)
3. Click **"Create"**

**If you already have an app:**
1. Click on your app name
2. Go to **"Settings"** or **"Configuration"**

### Step 3: Configure Sync Endpoint

1. **Find Sync Endpoint Section**
   - Look for **"Sync Endpoint"**, **"App URL"**, or **"Function URL"**
   - This is usually in Settings/Configuration

2. **Enter Production URL**
   ```
   https://seochecksite.netlify.app/api/inngest
   ```

3. **Save Configuration**
   - Click **"Save"** or **"Update"**
   - Inngest will attempt to sync with your endpoint

### Step 4: Verify Sync

1. **Check Functions Tab**
   - Go to **"Functions"** in left sidebar
   - You should see `process-audit` function listed
   - Status should show as synced/active

2. **Test Sync**
   - Inngest will try to reach your endpoint
   - If successful, you'll see the function appear
   - If it fails, check:
     - Endpoint is accessible (not behind auth)
     - Code is deployed to Netlify
     - Environment variables are set

## Alternative: Using the Dev Server Interface

If you're in the Dev Server and want to add production:

1. **Click "+ Sync new app"** button (top right)
2. **Enter Production URL**:
   ```
   https://seochecksite.netlify.app/api/inngest
   ```
3. **Click "Sync"** or **"Add"**
4. **Verify** it appears in the apps list

## Troubleshooting

### Endpoint Not Syncing

**Check:**
1. Endpoint is accessible:
   ```bash
   curl https://seochecksite.netlify.app/api/inngest
   ```
   Should return function information

2. Code is deployed:
   - Check Netlify dashboard
   - Verify latest code is deployed

3. Environment variables are set:
   ```bash
   netlify env:list | grep INNGEST
   ```

### Function Not Appearing

**If function doesn't show:**
1. Check endpoint returns function data
2. Verify function is exported correctly
3. Check Inngest logs for sync errors
4. Try manual sync again

### Sync Fails

**Common issues:**
- Endpoint requires authentication (should be public)
- Endpoint returns error (check Netlify logs)
- CORS issues (Inngest handles this)
- Network connectivity

## Verification Checklist

- [ ] Production app created in Inngest
- [ ] Sync endpoint set to: `https://seochecksite.netlify.app/api/inngest`
- [ ] Sync successful (no errors)
- [ ] Function `process-audit` appears in Functions tab
- [ ] Endpoint is accessible (curl test works)
- [ ] Environment variables set in Netlify

## Next Steps After Setup

1. **Test with a real audit:**
   ```bash
   curl -X POST "https://seochecksite.netlify.app/api/test-audit" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://seoauditpro.net", "email": "mreoch82@hotmail.com"}'
   ```

2. **Monitor in Inngest:**
   - Go to "Runs" tab
   - You should see the audit processing
   - Check logs for any errors

3. **Verify email:**
   - Check mreoch82@hotmail.com
   - Should receive report within 2-5 minutes

## Quick Reference

**Local Dev Endpoint:**
```
http://localhost:3000/api/inngest
```

**Production Endpoint:**
```
https://seochecksite.netlify.app/api/inngest
```

**App Name:**
```
seo-checksite
```

**Function Name:**
```
process-audit
```

