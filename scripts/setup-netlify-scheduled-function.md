# Netlify Scheduled Function Setup Guide

## Step-by-Step Instructions

### 1. Navigate to Scheduled Functions
1. Go to https://app.netlify.com
2. Select your site: **seochecksite**
3. In the left sidebar, click **"Build & deploy"**
4. Scroll down and click **"Functions"**
5. Click the **"Scheduled functions"** tab

### 2. Add Scheduled Function
1. Click **"Add scheduled function"** button
2. Fill in the form:

   **Function name:**
   ```
   process-queue
   ```

   **Endpoint URL:**
   ```
   /api/process-queue
   ```

   **Schedule (Cron expression):**
   ```
   */2 * * * *
   ```
   (This runs every 2 minutes)

   **HTTP Method:**
   ```
   GET
   ```

   **Headers (Optional - if you set QUEUE_SECRET):**
   - Header name: `Authorization`
   - Header value: `Bearer YOUR_QUEUE_SECRET_VALUE`
   
   (Replace `YOUR_QUEUE_SECRET_VALUE` with the actual value from your Netlify environment variables)

### 3. Save and Verify
1. Click **"Save"** or **"Create"**
2. The scheduled function should now appear in the list
3. It will start running automatically every 2 minutes

### 4. Test It
1. Create a test audit
2. Wait up to 2 minutes
3. Check if the audit gets processed automatically

## Alternative: Using Query Parameter (Easier)

If you prefer not to use headers, you can configure the endpoint with a query parameter:

**Endpoint URL:**
```
/api/process-queue?secret=YOUR_QUEUE_SECRET_VALUE
```

This is simpler but less secure (the secret appears in logs).

## Verification

After setup, you can verify it's working by:
1. Checking the Functions → Scheduled functions page - you should see execution logs
2. Creating a test audit and monitoring it
3. Checking Netlify function logs for `/api/process-queue` calls

## Troubleshooting

- **Function not running?** Check that it's enabled in the Scheduled functions list
- **Getting 401 errors?** Make sure `QUEUE_SECRET` is set in Netlify environment variables and matches what you configured
- **Not processing audits?** Check the function logs to see if there are any errors

