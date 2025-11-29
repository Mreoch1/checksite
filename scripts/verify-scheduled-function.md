# Verify Scheduled Function Configuration

## Current Configuration

The `process-queue` function is configured in **two ways** (for redundancy):

### Method 1: In Function File
```javascript
// netlify/functions/process-queue.js
export const config = {
  schedule: "*/2 * * * *", // every 2 minutes
};
```

### Method 2: In netlify.toml
```toml
[functions."process-queue"]
  schedule = "*/2 * * * *"  # Every 2 minutes
```

## Verification Steps

### 1. Check Netlify Dashboard

**Navigate to:**
- Netlify Dashboard → Your Site → **Logs** → **Functions**
- Or: **Functions** → **Scheduled functions** (if tab exists)

**What to Look For:**
- ✅ Function `process-queue` appears in list
- ✅ Function shows "Running in production" status
- ✅ "Scheduled" badge or indicator (if available)
- ✅ Next execution time (if shown)
- ✅ Execution history/logs

### 2. Check Function Logs

**Wait 2-4 minutes**, then check the function log page:
- Look for log entries every ~2 minutes
- Expected log messages:
  - `[process-queue-scheduled] Scheduled run. Next run: ...`
  - `[process-queue-scheduled] Calling /api/process-queue...`
  - `[process-queue-scheduled] Response: 200 ...`

**If logs appear automatically:** ✅ Scheduled function is working!

**If no logs appear:** The function may not be executing on schedule.

### 3. Manual Testing

**Option A: Via Dashboard**
1. Go to Functions → `process-queue`
2. Click **"Run now"** button (if available)
3. Check logs immediately after

**Option B: Via CLI**
```bash
# Test the function endpoint directly
curl https://seochecksite.netlify.app/.netlify/functions/process-queue

# Or with secret (if configured)
curl "https://seochecksite.netlify.app/.netlify/functions/process-queue?secret=YOUR_SECRET"
```

**Option C: Via API Route**
```bash
curl https://seochecksite.netlify.app/api/process-queue
```

### 4. Check Queue Processing

After waiting 2-4 minutes, verify that audits are being processed:
```bash
# Check queue status
node scripts/check-queue-status.js

# Or check in Supabase
# SELECT * FROM audit_queue ORDER BY created_at DESC LIMIT 5;
```

## Troubleshooting

### Function Not Executing on Schedule

**Possible Causes:**
1. Schedule not recognized by Netlify
2. Function only runs on production deploys (not previews)
3. Netlify Pro tier required for scheduled functions
4. Configuration conflict between function file and netlify.toml

**Solutions:**
1. ✅ Both configurations are in place (function file + netlify.toml)
2. ✅ Function is deployed to production
3. ✅ Site is on Netlify Pro tier
4. If still not working, try removing schedule from one location:
   - Keep only `netlify.toml` configuration, OR
   - Keep only function file configuration

### No "Scheduled Functions" Tab

**If the "Scheduled Functions" tab doesn't exist:**
- This is normal - not all Netlify dashboards show this tab
- The function may still be scheduled
- Check function logs instead to verify execution

### Function Logs Empty

**If logs are empty after 4+ minutes:**
1. Manually invoke the function to test it works
2. Check if there are any errors in the function code
3. Verify the function endpoint is accessible
4. Check Netlify status page for incidents

## Expected Behavior

**Every 2 minutes:**
1. Netlify triggers `process-queue` function
2. Function calls `/api/process-queue` endpoint
3. Endpoint processes one audit from queue
4. Logs show execution details

**If working correctly:**
- Logs appear every ~2 minutes automatically
- Queue items get processed
- Audits complete and emails are sent

