# Queue Processing Monitoring Guide

## Quick Status Check

### 1. Check Queue Status (Local)
```bash
# Requires .env.local with Supabase credentials
node scripts/check-queue-status.js
```

### 2. Test Queue Processing Endpoint
```bash
# Test manually (replace YOUR_QUEUE_SECRET with actual secret)
curl -X GET "https://seochecksite.netlify.app/api/process-queue?secret=YOUR_QUEUE_SECRET"

# Or use the test script
./scripts/test-queue-processing.sh
```

### 3. Check Netlify Function Logs

1. **Go to Netlify Dashboard**:
   - Your Site → Functions → Scheduled functions
   - Click on `process-queue` function
   - Check "Execution logs" tab

2. **Look for these log patterns**:
   - `[process-queue-scheduled] Calling...` - Scheduled function triggered
   - `[/api/process-queue called]` - API route received request
   - `Found X pending queue items` - Queue items found
   - `Processing audit...` - Audit being processed
   - `Email sent successfully` - Email sent

3. **Check for errors**:
   - `401 Unauthorized` - QUEUE_SECRET mismatch
   - `500 Internal Server Error` - Processing error
   - `Error finding queue items` - Database error

### 4. Check Database Queue Status

Run in Supabase SQL Editor:
```sql
-- Check queue status
SELECT 
  aq.id,
  aq.audit_id,
  aq.status,
  aq.created_at,
  aq.started_at,
  aq.completed_at,
  a.status as audit_status,
  a.email_sent_at,
  CASE 
    WHEN a.formatted_report_html IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_report
FROM audit_queue aq
LEFT JOIN audits a ON aq.audit_id = a.id
ORDER BY aq.created_at DESC
LIMIT 20;
```

### 5. Monitor in Real-Time

**Option A: Watch Netlify Logs**
```bash
# If you have Netlify CLI
netlify functions:log process-queue --tail
```

**Option B: Check Every 2 Minutes**
```bash
# Run this in a loop to monitor
while true; do
  echo "=== $(date) ==="
  curl -s "https://seochecksite.netlify.app/api/process-queue?secret=YOUR_QUEUE_SECRET" | jq '.'
  sleep 120  # Wait 2 minutes
done
```

## Expected Behavior

### When Working Correctly:
1. **Scheduled Function**: Runs every 2 minutes
2. **Logs**: Show `[process-queue-scheduled] Calling...` every 2 minutes
3. **Queue Processing**: Pending items move to "processing" then "completed"
4. **Audits**: Status changes from "pending" to "running" to "completed"
5. **Emails**: `email_sent_at` is set after successful send

### When NOT Working:
1. **No scheduled function logs**: Function not running
2. **Queue items stuck in "pending"**: Not being processed
3. **No `/api/process-queue` logs**: Endpoint not being called
4. **401 errors**: Authentication issue (QUEUE_SECRET)

## Troubleshooting

### Issue: No Scheduled Function Logs
- Check Netlify dashboard → Functions → Scheduled functions
- Verify function appears in list
- Check if function is enabled
- Redeploy if function not visible

### Issue: 401 Unauthorized
- Verify `QUEUE_SECRET` is set in Netlify environment variables
- Check secret matches in scheduled function and API route
- Test with: `curl "https://seochecksite.netlify.app/api/process-queue?secret=YOUR_SECRET"`

### Issue: Queue Items Not Processing
- Check if items are in "pending" status
- Verify audit exists and is not already completed
- Check for email_sent_at blocking (should not block if null)
- Look for errors in function logs

### Issue: Audits Complete But No Emails
- Check `email_sent_at` in database (should be set)
- Check `error_log` column for email errors
- Verify email environment variables (SENDGRID_API_KEY or SMTP_PASSWORD)
- Run `node scripts/diagnose-email-issue.js`

## Manual Queue Processing

If scheduled function is not working, manually trigger processing:

```bash
# Single trigger
curl -X GET "https://seochecksite.netlify.app/api/process-queue?secret=YOUR_QUEUE_SECRET"

# Or use admin endpoint (if available)
curl -X POST "https://seochecksite.netlify.app/api/admin/retry-audit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -d '{"auditId": "AUDIT_ID"}'
```

