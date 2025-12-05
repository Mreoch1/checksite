# External Cron Setup for Queue Processing

## Problem
Netlify's scheduled functions are not triggering automatically. This is a known issue with Netlify's platform.

## Solution
Use an external cron service to call your queue processor every 2 minutes.

## Setup Instructions

### Option 1: cron-job.org (Recommended - Free)

1. **Go to**: https://cron-job.org/en/
2. **Sign up** for a free account
3. **Create a new cron job**:
   - **Title**: SEO CheckSite Queue Processor
   - **URL**: `https://seochecksite.net/api/process-queue?secret=YOUR_QUEUE_SECRET`
   - **Schedule**: Every 2 minutes
     - Pattern: `*/2 * * * *`
   - **Request method**: GET
   - **Execution schedule**: Choose "Every 2 minutes"

4. **Save** and **Enable** the cron job

**Your Queue Secret**: 
```
2b4f94699571b6e2f7e41607b796b8a6970a9044e9dfd0ffff0ae446ad6bb131
```

**Full URL to use**:
```
https://seochecksite.net/api/process-queue?secret=2b4f94699571b6e2f7e41607b796b8a6970a9044e9dfd0ffff0ae446ad6bb131
```

### Option 2: EasyCron.com (Alternative)

1. **Go to**: https://www.easycron.com/
2. **Sign up** for a free account (50 executions/month free)
3. **Create a new cron job**:
   - **URL**: `https://seochecksite.net/api/process-queue?secret=2b4f94699571b6e2f7e41607b796b8a6970a9044e9dfd0ffff0ae446ad6bb131`
   - **Cron Expression**: `*/2 * * * *` (every 2 minutes)
   - **HTTP Method**: GET
   - **Enable**: Yes

### Option 3: GitHub Actions (Free for public repos)

Create `.github/workflows/process-queue.yml`:

```yaml
name: Process Audit Queue
on:
  schedule:
    - cron: '*/2 * * * *'  # Every 2 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Queue Processing
        run: |
          curl -X GET "https://seochecksite.net/api/process-queue?secret=${{ secrets.QUEUE_SECRET }}"
```

Then add `QUEUE_SECRET` to your GitHub repo secrets.

## Verification

After setting up the cron job:

1. Wait 2-4 minutes
2. Check your email for new audit reports
3. Run: `node scripts/check-stress-test-results.js`
4. Verify audits are completing automatically

## Why This Is Better

- ✅ **More reliable** than Netlify's scheduled functions
- ✅ **Industry standard** approach
- ✅ **Free** for most use cases
- ✅ **Easy to monitor** and debug
- ✅ **Works with any hosting platform**

## Current Status

- **Manual processing**: ✅ Working
- **Automatic processing**: ❌ Not working (Netlify scheduled functions unreliable)
- **After cron setup**: Should be ✅ Working automatically

## Monitoring

Check cron-job.org dashboard to see:
- Execution history
- Success/failure status
- Response times
- Logs


