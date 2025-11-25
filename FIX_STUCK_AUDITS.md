# Fix Stuck Audits

## Problem
Audits are getting stuck in "running" or "pending" status and never completing, which means emails are never sent.

## Root Causes Fixed

1. **No timeout handling** - Audits could run indefinitely
2. **No timeout on fetchSite** - Website fetching could hang
3. **Email transporter initialized at module load** - Could fail silently

## Fixes Applied

### 1. Added Timeout Handling
- Audits now timeout after 5 minutes
- Stuck audits are automatically marked as "failed"
- Failure emails are sent when audits timeout

### 2. Added Fetch Timeout
- `fetchSite` now has a 30-second timeout
- Prevents hanging on slow/unresponsive websites

### 3. Fixed Email Transporter
- Lazy initialization prevents module load errors
- Better error handling for email sending

## Manual Fix for Existing Stuck Audits

Since the admin endpoints need to deploy, you can manually fix stuck audits in Supabase:

### Option 1: Mark as Failed (Recommended)

1. Go to Supabase Dashboard → Table Editor → `audits` table
2. Filter by `status = 'running'` or `status = 'pending'`
3. Select all stuck audits (older than 10 minutes)
4. Click "Update" and set `status` to `'failed'`
5. Click "Save"

### Option 2: Retry Specific Audit

Once the admin endpoint is deployed, you can retry a specific audit:

```bash
curl -X POST "https://seochecksite.netlify.app/api/admin/retry-audit" \
  -H "Content-Type: application/json" \
  -d '{"auditId": "YOUR_AUDIT_ID_HERE"}'
```

### Option 3: Fix All Stuck Audits

Once deployed, mark all stuck audits as failed:

```bash
curl -X POST "https://seochecksite.netlify.app/api/admin/fix-stuck-audits" \
  -H "Content-Type: application/json"
```

## Check Audit Status

View all audits and their status:

```bash
curl "https://seochecksite.netlify.app/api/admin/check-audits" | python3 -m json.tool
```

## Next Steps

1. **Wait for deployment** - The fixes are being deployed now
2. **Mark stuck audits as failed** - Use Option 1 above or wait for endpoints
3. **Test with new payment** - The new code should prevent future stuck audits
4. **Monitor** - Check the `/api/admin/check-audits` endpoint regularly

## What Happens Now

- **New audits**: Will timeout after 5 minutes if they take too long
- **Stuck audits**: Need to be manually marked as failed (or use admin endpoints once deployed)
- **Email sending**: Will work once audits complete successfully

