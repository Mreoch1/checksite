# How to Verify Netlify Scheduled Function is Running

## Quick Check

1. **Go to Netlify Dashboard**:
   - Navigate to your site
   - Click "Functions" in the left sidebar
   - Click "Scheduled functions" tab

2. **Look for `process-queue`**:
   - Should appear in the list
   - Should show recent execution times
   - Should show execution logs

## If Function is NOT Visible

### Step 1: Verify Function File Exists
```bash
ls -la netlify/functions/process-queue.js
```

Should show the file exists.

### Step 2: Check Function Structure
```bash
cat netlify/functions/process-queue.js
```

Should show:
- `const { schedule } = require('@netlify/functions');`
- `exports.handler = schedule('*/2 * * * *', handler);`

### Step 3: Check netlify.toml
```bash
cat netlify.toml | grep -A 5 "\[functions\]"
```

Should show:
```toml
[functions]
  directory = "netlify/functions"
```

### Step 4: Verify Package is Installed
```bash
npm list @netlify/functions
```

Should show the package is installed.

### Step 5: Redeploy
1. Push any changes to trigger a new deploy
2. Wait for deploy to complete
3. Check Scheduled functions again

## If Function IS Visible But Not Running

### Check Execution Logs
1. Click on the `process-queue` function in Scheduled functions
2. Check "Execution logs" tab
3. Look for errors or execution records

### Common Issues:
- **No executions**: Function may not be triggering
- **401 Unauthorized**: `QUEUE_SECRET` may not be set or incorrect
- **500 errors**: Check function logs for errors

### Manual Test
Test the endpoint directly:
```bash
curl -X GET "https://seochecksite.netlify.app/api/process-queue?secret=YOUR_QUEUE_SECRET"
```

Should return JSON response with queue processing results.

## Troubleshooting Steps

1. **Check Netlify Build Logs**:
   - Go to Deploys → Latest deploy → Build log
   - Look for errors related to functions

2. **Verify Environment Variables**:
   - Site Settings → Environment Variables
   - Ensure `QUEUE_SECRET` is set (if required)

3. **Check Function Logs**:
   - Functions → process-queue → Logs
   - Look for execution attempts or errors

4. **Test Locally** (if possible):
   ```bash
   netlify dev
   netlify functions:invoke process-queue
   ```

## Expected Behavior

When working correctly, you should see:
- Function appears in Scheduled functions list
- Executions every 2 minutes
- Logs showing `[process-queue-scheduled] Calling...`
- Logs showing `[/api/process-queue called]`
- Queue items being processed

