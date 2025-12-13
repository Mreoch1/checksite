# Netlify Subdomain Redirect Fix - Action Checklist

## Problem
Google is choosing `seochecksite.netlify.app` as canonical instead of `seochecksite.net`, causing indexing issues.

## Root Cause
Netlify is serving cached content (HTTP 200) from "Netlify Durable" cache instead of applying the 301 redirect.

## Solution Steps (Do in Order)

### Step 1: Verify netlify.toml Location
✅ **DONE** - `netlify.toml` is in repo root (`/Users/michaelreoch/sitecheck/netlify.toml`)

**Check in Netlify Dashboard:**
- Site settings → Build & deploy → Build settings
- Check "Base directory" field
- If Base directory is set (e.g., `sitecheck/`), move `netlify.toml` to that folder
- If Base directory is empty/root, current location is correct

### Step 2: Clear Cache and Redeploy
**In Netlify Dashboard:**
1. Go to **Deploys** tab
2. Click **"Clear cache and deploy site"** button
3. Wait for deploy to complete
4. Verify the latest deploy includes commit `d944fa7` (redirect commit)

### Step 3: Configure Dashboard Redirect (MOST RELIABLE)
**In Netlify Dashboard:**
1. Go to **Site settings** → **Domain management**
2. Set `seochecksite.net` as **Primary domain**
3. Find `seochecksite.netlify.app` in the domain list
4. Enable **"Redirect to primary domain"** option (if available)
   - This forces Netlify to 301 everything to the primary domain, including the *.netlify.app hostname

**Alternative if option not available:**
- Look for "Add domain redirect" or "Redirect rules"
- Add: `seochecksite.netlify.app` → `seochecksite.net` (301)

### Step 4: Test Redirect After Deploy
**Test with curl:**
```bash
curl -I https://seochecksite.netlify.app/
```

**Expected result:**
```
HTTP/2 301
Location: https://seochecksite.net/
```

**Also test:**
```bash
curl -I https://seochecksite.netlify.app/sitemap.xml
curl -I https://seochecksite.netlify.app/robots.txt
```

Both should return 301 redirects.

### Step 5: Re-request Indexing in Google Search Console
**After redirect is confirmed working:**
1. Go to Google Search Console
2. URL Inspection → Inspect `https://seochecksite.net/`
3. Click **"Request indexing"**
4. Also inspect `https://seochecksite.netlify.app/` and confirm it shows as redirected

## Current netlify.toml Configuration

```toml
[[redirects]]
  from = "/*"
  to = "https://seochecksite.net/:splat"
  status = 301
  force = true
  conditions = {Host = ["seochecksite.netlify.app"]}
```

This configuration is correct. The issue is that:
1. Netlify cache needs to be cleared
2. Dashboard redirect should be enabled as backup

## Expected Timeline After Fix
- **Immediate:** Redirect returns 301
- **24-72 hours:** Google updates canonical
- **3-7 days:** Page becomes indexed
- **After indexing:** Impressions and analytics start showing data

## Verification Checklist
- [ ] Base directory checked (should be empty/root)
- [ ] Cache cleared and site redeployed
- [ ] Primary domain set to `seochecksite.net` in Dashboard
- [ ] "Redirect to primary domain" enabled (if available)
- [ ] `curl -I https://seochecksite.netlify.app/` returns 301
- [ ] `curl -I https://seochecksite.netlify.app/sitemap.xml` returns 301
- [ ] Re-requested indexing in Search Console

