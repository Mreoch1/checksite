# Audit Queue Setup Instructions

Since Netlify's free tier has a 10-second function timeout, we use a queue system to process audits outside of that limit.

## How It Works

1. When an audit is created, it's added to the `audit_queue` table
2. A separate `/api/process-queue` endpoint processes one audit at a time
3. A free cron service calls this endpoint every minute
4. **IMPORTANT**: The endpoint only processes audits that already have reports (just need email sending - fast)
   - Full audits (that need module execution) are skipped to avoid Netlify timeout
   - Full audits should be processed via admin endpoints or scripts (see below)

## Setup Steps

### 1. Run the Migration

The migration `003_create_audit_queue.sql` creates the queue table. It should run automatically on your next deploy, or you can run it manually in Supabase.

### 2. Set Up Free Cron Service

We'll use **cron-job.org** (completely free):

1. Go to https://cron-job.org
2. Sign up for a free account
3. Click "Create cronjob"
4. Configure:
   - **Title**: SEO CheckSite Queue Processor
   - **Address (URL)**: 
     - **Option A (Easiest)**: `https://seochecksite.netlify.app/api/process-queue?secret=YOUR_SECRET_KEY`
       - Replace `YOUR_SECRET_KEY` with the value you set for `QUEUE_SECRET` in Netlify
     - **Option B (More Secure)**: `https://seochecksite.netlify.app/api/process-queue`
       - Then add a **Request header**:
         - Header name: `Authorization`
         - Header value: `Bearer YOUR_SECRET_KEY`
   - **Schedule**: Every minute (`* * * * *`) - Use "Custom" option and enter `* * * * *` in the crontab expression field
   - **Request method**: GET

### 3. Set Environment Variable (Optional but Recommended)

In Netlify:
1. Go to Site settings → Environment variables
2. Add: `QUEUE_SECRET` = (any random string, e.g., generate with `openssl rand -hex 32`)
3. Update the cron job header to use this secret

### 4. Test the Queue

1. Create a test audit via `/api/test-audit`
2. Check the queue: `SELECT * FROM audit_queue ORDER BY created_at DESC;`
3. Wait up to 1 minute for the cron job to process it
4. Check the audit status

## Alternative: Manual Processing

You can also manually trigger queue processing by calling:
```bash
curl https://seochecksite.netlify.app/api/process-queue
```

## Monitoring

Check queue status:
```sql
SELECT 
  status,
  COUNT(*) as count
FROM audit_queue
GROUP BY status;
```

Check stuck audits (processing for > 10 minutes):
```sql
SELECT *
FROM audit_queue
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '10 minutes';
```

## Processing Full Audits

The cron job endpoint skips audits that need full processing (to avoid Netlify timeout). To process these:

### Option 1: Admin Endpoint (Recommended)
```bash
curl -X POST https://seochecksite.netlify.app/api/admin/retry-audit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -d '{"auditId": "AUDIT_ID"}'
```

### Option 2: Direct Script (Local)
```bash
node scripts/process-audit-direct.js AUDIT_ID
```

### Option 3: Test Endpoint (For Testing)
```bash
curl -X POST https://seochecksite.netlify.app/api/test-process-queue \
  -H "Content-Type: application/json"
```

## Troubleshooting

- **503 Service Unavailable**: This was fixed - the endpoint now skips full audits to avoid timeout
- **Queue not processing**: Check cron job is running, check Netlify function logs
- **Audits stuck**: Check for errors in `last_error` column, manually reset status if needed
- **Full audits not processing**: Use admin endpoint or script to process them (see above)
- **Too many retries**: Increase retry limit in `app/api/process-queue/route.ts` if needed

## See Also

- `CRON_JOB_FIX.md` - Detailed explanation of the 503 error fix

