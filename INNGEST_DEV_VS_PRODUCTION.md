# Inngest: Dev Server vs Production Dashboard

## The Two Environments

### Dev Server (localhost:8288)
- **Purpose**: Local development and testing
- **Endpoints**: `http://localhost:3000/api/inngest`
- **Mode**: `dev`
- **Use Case**: Testing functions locally before deployment

### Production Dashboard (app.inngest.com)
- **Purpose**: Production deployments
- **Endpoints**: `https://seochecksite.netlify.app/api/inngest`
- **Mode**: `cloud`
- **Use Case**: Real production functions

## The Error You're Seeing

```
Error: Expected server kind cloud, got dev
```

This happens when:
- You try to sync a **production endpoint** in the **Dev Server**
- OR the endpoint is returning the wrong mode

## Solution

### For Local Development

1. **Remove production endpoint from Dev Server**
   - In Dev Server, delete/remove the production app entry
   - Only keep the local endpoint (`http://localhost:3000/api/inngest`)

2. **Let Dev Server auto-detect**
   - The Dev Server should automatically discover your local endpoint
   - No manual syncing needed for local dev

3. **If local endpoint still fails:**
   - Make sure Next.js is running: `npm run dev`
   - Check endpoint: `curl http://localhost:3000/api/inngest`
   - Restart Dev Server: `npx inngest-cli@latest dev`

### For Production

1. **Use Production Dashboard**
   - Go to: **https://www.inngest.com** (NOT localhost:8288)
   - Make sure you're in **Production** environment

2. **Sync Production Endpoint**
   - Go to **Apps** → Your app
   - Set sync endpoint: `https://seochecksite.netlify.app/api/inngest`
   - Save

3. **Verify**
   - Go to **Functions** tab
   - Should see `process-audit` function
   - Status: "Synced" or "Active"

## Quick Fix Steps

### Step 1: Clean Up Dev Server

1. In Dev Server (localhost:8288):
   - Remove the production app entry (the one with `https://seochecksite.netlify.app`)
   - Keep only the local endpoint

### Step 2: Use Production Dashboard

1. Go to: **https://www.inngest.com**
2. Switch to **Production** environment (if needed)
3. Go to **Apps** → Create or select your app
4. Set sync endpoint: `https://seochecksite.netlify.app/api/inngest`
5. Save

### Step 3: Verify

**Local (Dev Server):**
- Should auto-detect `http://localhost:3000/api/inngest`
- Shows "1 function found"
- Works for local testing

**Production (Dashboard):**
- Shows `https://seochecksite.netlify.app/api/inngest`
- Shows "1 function found"
- Works for production audits

## Why This Matters

- **Dev Server**: For testing and development only
- **Production Dashboard**: For real production functions
- **Don't mix them**: Production endpoints don't belong in Dev Server

## Summary

✅ **Local endpoint**: Use Dev Server (auto-detects)
✅ **Production endpoint**: Use Production Dashboard (manual sync)
❌ **Don't sync production in Dev Server**: Causes the error you're seeing

