# Queue Processor Test Scripts

This directory contains test scripts to verify the audit queue processor works correctly end-to-end.

## Prerequisites

1. Environment variables (set in `.env.local` or Netlify):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (deployed Netlify URL, e.g., `https://seochecksite.net`)
   - `QUEUE_SECRET` (for queue endpoint authentication)
   - `TEST_EMAIL` (optional, defaults to `Mreoch82@hotmail.com`)
   - `TEST_URL` (optional, defaults to `https://example.com`)

2. Supabase RPC function must be deployed:
   ```sql
   -- Run this in Supabase SQL Editor:
   -- See supabase-claim-function.sql for the full function definition
   ```

3. TypeScript/Node.js dependencies installed:
   ```bash
   npm install
   ```

## Test Scripts

### 1. Single Audit Test (`test-queue-single.ts`)

Tests the complete flow for a single audit:
- Creates one test audit
- Inserts it into `audit_queue`
- Triggers queue processing
- Verifies exactly one email was sent
- Verifies queue item is marked `completed`

**Usage:**
```bash
ts-node scripts/test-queue-single.ts
```

**Expected Output:**
```
✅ PASS: All checks passed
```

### 2. Multi-Audit Test (`test-queue-multi.ts`)

Tests the queue processor with 5 audits in parallel:
- Creates 5 test audits with distinct URLs
- Inserts them into `audit_queue`
- Triggers queue processing multiple times (one per tick)
- Verifies each audit is processed exactly once
- Verifies no duplicates, no stuck items, no skipped audits

**Usage:**
```bash
ts-node scripts/test-queue-multi.ts
```

**Expected Output:**
```
✅ PASSED - All checks successful
```

## Test Flow

Both scripts follow this pattern:

1. **Reset Test State**: Cleans up any existing test audits from the last hour
2. **Create Test Audits**: Creates audit records with `status='running'` and inserts into `audit_queue` with `status='pending'`
3. **Trigger Queue**: Calls `/api/process-queue?secret=...` endpoint
4. **Wait for Completion**: Polls database until audits are completed
5. **Verify Results**: Checks all invariants:
   - Audit status = `completed`
   - `email_sent_at` is set (real timestamp, not reservation)
   - `formatted_report_html` exists
   - Queue status = `completed`
   - No duplicate emails
   - No stuck processing items
   - No skipped audits

## Success Criteria

A test passes if:
- ✅ All audits end with `status='completed'`
- ✅ All audits have `email_sent_at` set (real timestamp)
- ✅ All audits have `formatted_report_html`
- ✅ All queue items are marked `completed`
- ✅ Exactly one email per audit (no duplicates)
- ✅ No queue items stuck in `processing` for >10 minutes
- ✅ All pending audits are eventually processed

## Troubleshooting

### Test fails with "RPC function not found"
- Run the SQL in `supabase-claim-function.sql` in Supabase SQL Editor
- Wait a few seconds for PostgREST schema cache to refresh

### Test fails with "No pending queue items"
- Check that test audits were created: `SELECT * FROM audits WHERE url = '...'`
- Check queue items: `SELECT * FROM audit_queue WHERE audit_id = '...'`
- Verify queue endpoint is accessible: `curl "${SITE_URL}/api/process-queue?secret=${QUEUE_SECRET}"`

### Test fails with "Email not sent"
- Check SendGrid API key is set: `echo $SENDGRID_API_KEY`
- Check audit logs: `SELECT error_log FROM audits WHERE id = '...'`
- Check queue logs: `SELECT last_error FROM audit_queue WHERE audit_id = '...'`

### Test times out
- Increase `maxWaitSeconds` in test script (default: 120s)
- Check for stuck processing items: `SELECT * FROM audit_queue WHERE status = 'processing' AND started_at < NOW() - INTERVAL '10 minutes'`
- Manually trigger queue: `curl "${SITE_URL}/api/process-queue?secret=${QUEUE_SECRET}"`

## Running Tests in CI/CD

These scripts can be run in CI/CD pipelines:

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="..."
export SUPABASE_SERVICE_ROLE_KEY="..."
export NEXT_PUBLIC_SITE_URL="https://seochecksite.net"
export QUEUE_SECRET="..."

# Run tests
ts-node scripts/test-queue-single.ts
ts-node scripts/test-queue-multi.ts
```

## Next Steps

After tests pass:
1. Re-enable Netlify cron schedule (if disabled for testing)
2. Monitor production logs for queue processing
3. Verify emails are being sent correctly
4. Check queue drains properly (one email per 2-minute tick)

