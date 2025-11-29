# System Health Check Sequence

This document provides a concrete, step-by-step sequence to get the system healthy, following the guide in `RECURRING_ISSUES.md`.

## Quick Start

Run the automated health check script:

```bash
node scripts/health-check.js
```

This will check all steps and provide SQL queries and commands to fix issues.

## Manual Sequence

### Step 1: Confirm Production Deploy and Environment

1. **Build Check**:
   ```bash
   npm run build
   ```
   Fix any TypeScript or build errors before redeploying.

2. **Environment Variables** (verify in Netlify dashboard):
   - `QUEUE_SECRET`
   - `SENDGRID_API_KEY`
   - `FROM_EMAIL`
   - `FROM_NAME`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - Any `NEXT_PUBLIC_*` vars used in the client

3. **Deploy**: Trigger a production deploy (not preview) after fixing any issues.

---

### Step 2: Get the Queue Processor / Cron Actually Running

1. **Confirm Function Location**:
   - File: `netlify/functions/process-queue.js`
   - Structure:
     ```javascript
     const { schedule } = require('@netlify/functions');
     const handler = async (event, context) => { /* ... */ };
     exports.handler = schedule('*/2 * * * *', handler);
     ```

2. **Verify Package**:
   ```bash
   npm list @netlify/functions
   ```
   If missing: `npm install @netlify/functions`

3. **Check netlify.toml**:
   ```toml
   [functions]
     directory = "netlify/functions"
   ```

4. **Deploy and Verify**:
   - Deploy to Netlify
   - Go to Netlify dashboard → Functions → Scheduled functions
   - Verify `process-queue` appears
   - Check it has recent executions

5. **Manual Test**:
   ```bash
   netlify dev
   netlify functions:invoke process-queue
   ```

---

### Step 3: Unstick Audits and Repair the Queue

Run these SQL queries in Supabase SQL editor:

1. **Find Stuck Audits**:
   ```sql
   SELECT a.id, a.status, a.created_at, aq.status AS queue_status
   FROM audits a
   LEFT JOIN audit_queue aq ON a.id = aq.audit_id
   WHERE a.status IN ('pending', 'running')
     AND (aq.id IS NULL OR aq.status = 'pending');
   ```

2. **Add Orphaned Audits to Queue**:
   ```sql
   INSERT INTO audit_queue (audit_id, status, created_at)
   VALUES ('AUDIT_ID', 'pending', NOW())
   ON CONFLICT (audit_id) DO NOTHING;
   ```

3. **Add Unique Constraint** (if missing):
   ```sql
   ALTER TABLE audit_queue
   ADD CONSTRAINT audit_queue_audit_id_unique UNIQUE (audit_id);
   ```

4. **Clean Up Duplicates**:
   ```sql
   DELETE FROM audit_queue aq1
   USING audit_queue aq2
   WHERE aq1.audit_id = aq2.audit_id
     AND aq1.id > aq2.id;
   ```

5. **Test Queue Processing**:
   ```bash
   curl -X GET "https://seochecksite.netlify.app/api/process-queue?secret=YOUR_QUEUE_SECRET"
   ```

---

### Step 4: Fix Email Sending

1. **Verify Email Environment Variables** (in Netlify):
   - `SENDGRID_API_KEY`
   - `FROM_EMAIL`
   - `FROM_NAME`
   - `SMTP_HOST` (if using Zoho fallback)
   - `SMTP_USER` (if using Zoho fallback)
   - `SMTP_PASSWORD` (if using Zoho fallback)

2. **Verify Email Logic**:
   - Code checks `email_sent_at` before sending ✓
   - Uses atomic update/reservation ✓
   - See `lib/process-audit.ts` for implementation

3. **Check Provider Configuration**:
   - SendGrid: Verify API key and domain authentication
   - Zoho: Verify SMTP credentials

4. **Manually Resend Email** (for completed audits without emails):
   ```bash
   curl -X POST https://seochecksite.netlify.app/api/admin/send-report-email \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
     -d '{"auditId": "AUDIT_ID", "force": true}'
   ```

---

### Step 5: Address Timeouts

The `process-queue` route already implements timeout handling:
- Uses `MAX_PROCESSING_TIME_MS = 20 * 1000` (20 seconds)
- Uses `Promise.race()` to handle timeouts
- Processing continues in background after function returns

**Verify**: Check that long audits don't cause 503 errors.

---

### Step 6: Verify Pricing, UI, and Build Stability

1. **Pricing Display**:
   - ✓ Prices divide cents by 100: `(totalCents / 100).toFixed(2)`
   - ✓ Base price: $24.99 (2499 cents)
   - ✓ Competitor overview only charged when URL provided

2. **TypeScript/Build**:
   ```bash
   npm run build
   npx tsc --noEmit
   ```
   Fix any errors.

3. **Module Selection**:
   - ✓ Competitor overview auto-unchecks when URL cleared
   - ✓ Local SEO and Competitor Overview start unchecked

---

### Step 7: Ongoing Prevention

1. **Before Every Push**:
   ```bash
   npm run build
   npx tsc --noEmit
   ```

2. **After Each Deploy**:
   - Check Scheduled functions in Netlify
   - Confirm queue executions and logs
   - Create a test audit and verify:
     - It enters `audit_queue`
     - It progresses from pending to completed
     - An email is sent and `email_sent_at` is set

3. **Periodic Checks**:
   - The queue processor already auto-detects orphaned audits
   - Monitor queue for duplicates
   - Check email sending success rate

---

## Current Status

✅ **Completed**:
- Build passes without errors
- Function structure is correct
- `@netlify/functions` is installed
- `netlify.toml` has `functions.directory` configured
- Email sending logic has proper checks
- Timeout handling is implemented
- Pricing display correctly converts cents to dollars

⚠️ **Needs Verification** (after deploy):
- Scheduled function appears in Netlify dashboard
- Queue processor is running every 2 minutes
- No stuck audits in database
- Email environment variables are set in Netlify

---

## Troubleshooting

If scheduled function doesn't appear:
1. Check `netlify/functions/process-queue.js` exists
2. Verify `netlify.toml` has `functions.directory = "netlify/functions"`
3. Redeploy to Netlify
4. Check Netlify dashboard → Functions → Scheduled functions

If audits are stuck:
1. Run Step 3 SQL queries to find and fix orphaned audits
2. Manually trigger queue processing
3. Check Netlify function logs for errors

If emails aren't sending:
1. Verify all email environment variables in Netlify
2. Check SendGrid/Zoho configuration
3. Use admin endpoint to manually resend

---

## Related Documentation

- `RECURRING_ISSUES.md` - Detailed documentation of recurring issues
- `CRON_JOB_FIX.md` - Cron job setup and fixes
- `QUEUE_SETUP.md` - Queue system setup
- `EMAIL_TROUBLESHOOTING.md` - Email sending troubleshooting


