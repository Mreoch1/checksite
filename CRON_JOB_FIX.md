# Cron Job 503 Error Fix

## Problem

The cron job at `https://seochecksite.netlify.app/api/process-queue` was failing with **503 Service Unavailable** errors.

### Root Cause

1. **Netlify Function Timeout Limits:**
   - Free tier: 10 seconds
   - Pro tier: 26 seconds (with Netlify Pro)
   - Enterprise: up to 26 seconds

2. **Audit Processing Time:**
   - Full audit processing (running all modules) can take **1-3 minutes**
   - The endpoint was trying to process audits synchronously
   - This exceeded Netlify's timeout, causing 503 errors

3. **Netlify Pro Benefits:**
   - 26-second timeout (vs 10 seconds on free tier)
   - Background processing continues after function returns
   - Can attempt full audit processing with early return pattern

## Solution

The `/api/process-queue` endpoint has been optimized for **Netlify Pro** to handle full audits:

### What It Does Now

1. **Attempts Full Processing:**
   - With Netlify Pro (26s timeout), attempts to process full audits
   - Returns early if processing takes too long (20s safety margin)
   - Processing continues in background after function returns

2. **Fast Operations:**
   - Email-only operations complete within timeout
   - Full audits may timeout but continue processing in background
   - No more 503 errors - function always returns successfully

### Processing Full Audits

Full audits (that need module execution) should be processed via:

1. **Admin Endpoint** (recommended):
   ```bash
   curl -X POST https://seochecksite.netlify.app/api/admin/retry-audit \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
     -d '{"auditId": "AUDIT_ID"}'
   ```

2. **Direct Script** (local):
   ```bash
   node scripts/process-audit-direct.js AUDIT_ID
   ```

3. **Test Process Queue Endpoint** (for testing):
   ```bash
   curl -X POST https://seochecksite.netlify.app/api/test-process-queue \
     -H "Content-Type: application/json"
   ```

## Cron Job Status

The cron job will now:
- ✅ Return 200 OK (no more 503 errors)
- ✅ Process email sending for completed audits
- ✅ Attempt full audit processing (with Netlify Pro)
- 🔄 Continue processing in background if timeout occurs
- 📝 Log processing status for monitoring

## Monitoring

Check cron job status at: `https://console.cron-job.org/dashboard`

The endpoint will return:
- `success: true` - Operation completed
- `processed: true/false` - Whether an audit was processed
- `reason: 'needs_full_processing'` - If audit was skipped

## Future Improvements

For production, consider:
1. **Netlify Background Functions** (if available on your plan)
2. **External Queue Service** (e.g., Inngest, Trigger.dev)
3. **Separate Processing Service** (e.g., Railway, Render)
4. **Netlify Edge Functions** (for faster processing)

For now, the cron job handles email sending reliably, and full audits can be processed manually via admin endpoints.

