# External Cron Job Setup (cron-job.org)

Since Netlify scheduled functions aren't available, we'll use a free external cron service.

## Setup Steps

### 1. Go to cron-job.org
1. Visit https://cron-job.org
2. Sign up for a free account (or log in if you have one)

### 2. Create a New Cron Job
1. Click **"Create cronjob"** or **"Add cronjob"**
2. Fill in the form:

   **Title:**
   ```
   SEO CheckSite Queue Processor
   ```

   **Address (URL):**
   ```
   https://seochecksite.netlify.app/api/process-queue?secret=2b4f94699571b6e2f7e41607b796b8a6970a9044e9dfd0ffff0ae446ad6bb131
   ```

   **Schedule:**
   - Select **"Custom"**
   - Enter: `*/2 * * * *` (every 2 minutes)

   **Request method:**
   ```
   GET
   ```

   **Status:**
   ```
   Active
   ```

3. Click **"Create cronjob"** or **"Save"**

### 3. Verify It's Working
1. After creating, you should see the cron job in your dashboard
2. Wait a few minutes and check the execution logs
3. Create a test audit and verify it gets processed within 2 minutes

## Alternative: Using Header Authentication (More Secure)

If you prefer not to put the secret in the URL:

1. In the cron job form, use this URL:
   ```
   https://seochecksite.netlify.app/api/process-queue
   ```

2. Add a **Request header**:
   - Header name: `Authorization`
   - Header value: `Bearer 2b4f94699571b6e2f7e41607b796b8a6970a9044e9dfd0ffff0ae446ad6bb131`

## Monitoring

- Check cron-job.org dashboard for execution logs
- Check Netlify function logs for `/api/process-queue` calls
- Monitor audit processing in your database

## Troubleshooting

- **Cron job not running?** Check that it's enabled in cron-job.org dashboard
- **Getting 401 errors?** Verify the secret matches `QUEUE_SECRET` in Netlify
- **Not processing audits?** Check Netlify function logs for errors

