# Fix: "Expected server kind cloud, got dev" Error

## The Problem

You're seeing this error in the Inngest Dev Server:
```
Error: Expected server kind cloud, got dev
```

## Why This Happens

The **Inngest Dev Server** (localhost:8288) is designed for **local development only**. It expects endpoints to be in "dev" mode.

When you try to sync a **production endpoint** (like `https://seochecksite.netlify.app/api/inngest`) from the Dev Server, it fails because:
- Production endpoints return `mode: "cloud"`
- Dev Server expects `mode: "dev"`

## The Solution

**Don't use the Dev Server to sync production endpoints!**

Instead, use the **Production Inngest Dashboard**:

### Step 1: Go to Production Dashboard

1. **Open Production Dashboard**
   - Go to: **https://www.inngest.com** (NOT localhost:8288)
   - Make sure you're logged in
   - You should see "Production" environment (not "Development")

2. **Navigate to Apps**
   - Click **"Apps"** in the left sidebar
   - You should see your app or need to create one

### Step 2: Sync Production Endpoint

1. **Create or Select App**
   - If no app exists, click **"+ Create App"**
   - Name it: `seo-checksite`
   - Click **"Create"**

2. **Set Sync Endpoint**
   - Go to app **Settings** or **Configuration**
   - Find **"Sync Endpoint"** or **"App URL"**
   - Enter: `https://seochecksite.netlify.app/api/inngest`
   - Click **"Save"** or **"Update"**

3. **Verify Sync**
   - Go to **"Functions"** tab
   - You should see `process-audit` function
   - Status should be "Synced" or "Active"

## Understanding the Two Environments

### Dev Server (localhost:8288)
- **Purpose**: Local development and testing
- **Endpoints**: `http://localhost:3000/api/inngest`
- **Mode**: `dev`
- **Use**: Testing functions locally

### Production Dashboard (app.inngest.com)
- **Purpose**: Production deployments
- **Endpoints**: `https://seochecksite.netlify.app/api/inngest`
- **Mode**: `cloud`
- **Use**: Real production functions

## Current Status

✅ **Endpoint is working correctly**
- Returns `mode: "cloud"` ✓
- Function count: 1 ✓
- Has event key and signing key ✓

❌ **Wrong place to sync**
- Using Dev Server instead of Production Dashboard

## Quick Fix

1. **Close the Dev Server** (or ignore the error there)
2. **Go to**: https://www.inngest.com
3. **Switch to Production** environment (if needed)
4. **Sync your app** with: `https://seochecksite.netlify.app/api/inngest`
5. **Done!**

## Verification

After syncing in Production Dashboard:

```bash
# Test endpoint
curl https://seochecksite.netlify.app/api/inngest

# Should return:
# {
#   "mode": "cloud",
#   "function_count": 1,
#   ...
# }
```

Then create a test audit and monitor in the Production Dashboard → Runs tab.

## Summary

- ✅ Endpoint is correct and working
- ✅ Code is deployed
- ❌ Just using the wrong dashboard to sync
- ✅ Use Production Dashboard (app.inngest.com) instead of Dev Server

