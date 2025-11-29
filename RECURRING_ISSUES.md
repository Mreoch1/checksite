# Recurring Issues and Solutions

This document tracks common issues that repeatedly occur in the SEO CheckSite project, along with their root causes and solutions.

## 1. Scheduled Functions / Cron Job Setup Issues

### Problem
Scheduled functions not running or not being detected by Netlify.

### Symptoms
- Queue not processing automatically
- No scheduled function visible in Netlify dashboard
- Audits stuck in queue
- Function logs show no execution

### Root Causes
1. **Function Location**: Functions must be in `netlify/functions/` directory
2. **Package Dependency**: `@netlify/functions` must be installed
3. **Export Format**: Must use `exports.handler = schedule(cron, handler)` for CommonJS
4. **Configuration**: `netlify.toml` must have `functions.directory = "netlify/functions"`
5. **Deployment**: Functions only run on production deploys, not previews

### Solutions
1. **Verify Function Structure**:
   ```javascript
   // netlify/functions/process-queue.js
   const { schedule } = require('@netlify/functions');
   
   const handler = async (event, context) => {
     // Your logic here
   };
   
   exports.handler = schedule('*/2 * * * *', handler);
   ```

2. **Check netlify.toml**:
   ```toml
   [functions]
     # Scheduled function configuration
     # The schedule is defined in the function file itself
   ```

3. **Verify Package Installation**:
   ```bash
   npm list @netlify/functions
   ```

4. **Check Netlify Dashboard**:
   - Go to Functions → Scheduled functions
   - Verify function appears in list
   - Check execution logs

5. **Manual Testing**:
   ```bash
   # Test locally (won't run on schedule, but can invoke manually)
   netlify dev
   netlify functions:invoke process-queue
   ```

### Prevention
- Always verify function structure matches Netlify's requirements
- Test locally before deploying
- Check Netlify dashboard after deployment
- Monitor function logs regularly

---

## 2. Email Sending Failures

### Problem
Audits complete but emails are not sent to customers.

### Symptoms
- `email_sent_at` is `null` in database
- Audit status is `completed` but no email received
- Error logs show email sending failures
- Email reservation fails

### Root Causes
1. **Missing Environment Variables**: `SENDGRID_API_KEY`, `FROM_EMAIL`, `SMTP_PASSWORD`
2. **Email Reservation Race Conditions**: Atomic reservation fails due to concurrent requests
3. **Provider Configuration**: SendGrid domain not authenticated, SMTP credentials incorrect
4. **Email Already Sent**: Pre-check fails to detect existing `email_sent_at`
5. **Error Handling**: Errors not properly logged or retried

### Solutions
1. **Verify Environment Variables**:
   ```bash
   # Check Netlify dashboard
   # Required variables:
   # - SENDGRID_API_KEY
   # - FROM_EMAIL
   # - FROM_NAME
   # - SMTP_HOST (if using Zoho fallback)
   # - SMTP_USER (if using Zoho fallback)
   # - SMTP_PASSWORD (if using Zoho fallback)
   ```

2. **Check Email Reservation Logic**:
   - Pre-check `email_sent_at` before attempting reservation
   - Use atomic database updates with proper error handling
   - Fallback to direct update if atomic reservation fails

3. **Verify Provider Configuration**:
   - SendGrid: Verify API key and domain authentication
   - Zoho: Verify SMTP credentials and app-specific password
   - Check provider activity logs

4. **Manual Email Resend**:
   ```bash
   curl -X POST https://seochecksite.netlify.app/api/admin/send-report-email \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
     -d '{"auditId": "AUDIT_ID", "force": true}'
   ```

### Prevention
- Always verify environment variables are set in Netlify
- Test email sending after each deployment
- Monitor email logs regularly
- Implement proper error logging and retry logic
- Use atomic operations for email reservation

---

## 3. Audit Processing Stuck / Orphaned Audits

### Problem
Audits remain in `pending` or `running` status and never complete.

### Symptoms
- Audits stuck in queue
- `status` is `pending` or `running` but no processing happening
- Audit not in `audit_queue` table but should be processed
- Queue processor skips audits

### Root Causes
1. **Orphaned Audits**: Audit in `pending`/`running` status but not in `audit_queue` table
2. **Queue Entry Missing**: Audit created but never added to queue
3. **Processing Timeout**: Audit processing started but timed out
4. **Error During Processing**: Error occurred but audit status not updated
5. **Duplicate Queue Entries**: Multiple queue entries for same audit causing conflicts

### Solutions
1. **Auto-Detect Orphaned Audits**:
   - Queue processor now automatically detects and adds orphaned audits
   - Checks for audits in `pending`/`running` status not in queue
   - Adds them to queue for processing

2. **Manual Queue Addition**:
   ```sql
   -- Add orphaned audit to queue
   INSERT INTO audit_queue (audit_id, status, created_at)
   VALUES ('AUDIT_ID', 'pending', NOW())
   ON CONFLICT (audit_id) DO NOTHING;
   ```

3. **Reset Stuck Audit**:
   ```bash
   curl -X POST https://seochecksite.netlify.app/api/admin/reset-audit \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
     -d '{"auditId": "AUDIT_ID"}'
   ```

4. **Check Queue Status**:
   ```sql
   -- Find stuck audits
   SELECT a.id, a.status, a.created_at, aq.status as queue_status
   FROM audits a
   LEFT JOIN audit_queue aq ON a.id = aq.audit_id
   WHERE a.status IN ('pending', 'running')
   AND (aq.id IS NULL OR aq.status = 'pending');
   ```

### Prevention
- Always add audits to queue when created
- Implement proper error handling in processing logic
- Monitor queue status regularly
- Use database transactions for audit creation
- Auto-detect and fix orphaned audits in queue processor

---

## 4. Pricing Calculation Errors

### Problem
Incorrect prices displayed in UI or calculated in checkout.

### Symptoms
- Price shows as "$3499.00" instead of "$34.99"
- Total price doesn't update when modules are toggled
- Competitor overview charged even when no URL provided
- Base price incorrect

### Root Causes
1. **Cents Not Converted**: Price in cents not divided by 100 for display
2. **State Not Reactive**: UI state not updating when modules change
3. **Module Selection Logic**: Checkbox state conflicts with URL input
4. **Calculation Logic**: Incorrect addition of base price and add-ons

### Solutions
1. **Display Price Correctly**:
   ```typescript
   // Divide cents by 100 for display
   const displayPrice = (totalCents / 100).toFixed(2);
   ```

2. **Reactive Price Updates**:
   ```typescript
   // Calculate total directly from state
   const total = calculateTotal();
   // Display updates automatically when state changes
   ```

3. **Module Selection Logic**:
   ```typescript
   // Allow unchecking competitor_overview
   // Auto-uncheck if URL is cleared
   if (module === 'competitor_overview' && !competitorUrl) {
     // Uncheck module
   }
   ```

4. **Verify Pricing Config**:
   ```typescript
   // Check lib/types.ts for correct pricing
   basePrice: 2499, // $24.99
   CORE_MODULES: [...], // Included in base
   ADD_ON_MODULES: {...} // Additional cost
   ```

### Prevention
- Always divide cents by 100 for display
- Use reactive state management
- Test price calculation with all module combinations
- Verify pricing config matches UI and API
- Test checkout flow end-to-end

---

## 5. TypeScript / Build Errors

### Problem
Netlify builds fail due to TypeScript syntax errors.

### Symptoms
- Build fails with TypeScript errors
- Missing semicolons
- Incorrect catch block structure
- Const reassignment errors
- Variable scope issues

### Root Causes
1. **Missing Semicolons**: TypeScript strict mode requires semicolons
2. **Catch Block Syntax**: Incorrect error handling structure
3. **Const Reassignment**: Attempting to reassign `const` variables
4. **Variable Scope**: Variables used outside their scope
5. **Type Errors**: Incorrect type definitions

### Solutions
1. **Add Missing Semicolons**:
   ```typescript
   // Always end statements with semicolons
   const value = getValue();
   ```

2. **Fix Catch Blocks**:
   ```typescript
   try {
     // code
   } catch (error) {
     // error handling
   }
   ```

3. **Use Let for Reassignment**:
   ```typescript
   // Use let if variable needs reassignment
   let items = [];
   items = newItems; // OK with let
   ```

4. **Check Variable Scope**:
   ```typescript
   // Declare variables in correct scope
   const value = calculateValue(); // In function scope
   console.log(value); // Use in same scope
   ```

5. **Run Type Check Locally**:
   ```bash
   npm run build
   # Or
   npx tsc --noEmit
   ```

### Prevention
- Run TypeScript compiler before committing
- Use ESLint to catch syntax errors
- Test builds locally before pushing
- Review error messages carefully
- Use proper TypeScript types

---

## 6. Environment Variable Issues

### Problem
Missing or incorrect environment variables causing failures.

### Symptoms
- Functions fail with "environment variable not found" errors
- Email sending fails
- Queue processing fails
- API endpoints return 500 errors

### Root Causes
1. **Variables Not Set in Netlify**: Only in `.env.local` but not in Netlify dashboard
2. **Variable Name Mismatch**: Typo in variable name
3. **Missing Required Variables**: New features require new variables
4. **Variable Not Available at Build Time**: `NEXT_PUBLIC_*` variables needed at build

### Solutions
1. **Set Variables in Netlify**:
   ```bash
   # Using CLI
   netlify env:set VARIABLE_NAME "value"
   
   # Or in dashboard
   # Site settings → Environment variables
   ```

2. **Verify Required Variables**:
   ```bash
   # Check .env.local for all variables
   # Ensure all are set in Netlify
   ```

3. **Required Variables Checklist**:
   - `QUEUE_SECRET` - For queue processing authentication
   - `SENDGRID_API_KEY` - For email sending
   - `FROM_EMAIL` - Email sender address
   - `FROM_NAME` - Email sender name
   - `SUPABASE_URL` - Database connection
   - `SUPABASE_SERVICE_ROLE_KEY` - Database admin access
   - `STRIPE_SECRET_KEY` - Payment processing
   - `STRIPE_WEBHOOK_SECRET` - Webhook verification
   - `NEXT_PUBLIC_*` - Public variables (available at build time)

4. **Check Variable Access**:
   ```typescript
   // Server-side only
   const value = process.env.VARIABLE_NAME;
   
   // Client-side (must be NEXT_PUBLIC_*)
   const value = process.env.NEXT_PUBLIC_VARIABLE_NAME;
   ```

### Prevention
- Document all required environment variables
- Set variables in Netlify immediately after adding to code
- Use CLI to verify variables are set
- Test with missing variables to catch issues early
- Use TypeScript types for environment variables

---

## 7. Queue Processing Duplicates

### Problem
Multiple queue entries for the same audit causing duplicate processing.

### Symptoms
- Same audit processed multiple times
- Duplicate emails sent
- Multiple queue entries with same `audit_id`
- Processing conflicts

### Root Causes
1. **Race Conditions**: Multiple requests create queue entries simultaneously
2. **Missing Unique Constraint**: Database allows duplicate `audit_id` in queue
3. **Cleanup Logic Fails**: Duplicate cleanup doesn't work correctly
4. **Orphaned Entries**: Old queue entries not cleaned up

### Solutions
1. **Database Unique Constraint**:
   ```sql
   -- Ensure audit_id is unique in queue
   ALTER TABLE audit_queue
   ADD CONSTRAINT audit_queue_audit_id_unique UNIQUE (audit_id);
   ```

2. **Cleanup Duplicates**:
   ```sql
   -- Remove duplicate queue entries, keep oldest
   DELETE FROM audit_queue aq1
   USING audit_queue aq2
   WHERE aq1.audit_id = aq2.audit_id
   AND aq1.id > aq2.id;
   ```

3. **Prevent Duplicate Processing**:
   ```typescript
   // Check email_sent_at before processing
   if (audit.email_sent_at) {
     // Skip - already processed
   }
   ```

4. **Queue Cleanup in Processor**:
   - Remove duplicates when processing
   - Keep only the oldest entry
   - Skip audits already completed

### Prevention
- Use database unique constraints
- Implement proper cleanup logic
- Check audit status before processing
- Monitor queue for duplicates
- Use transactions for queue operations

---

## 8. Netlify Timeout Issues

### Problem
Functions timeout before completing processing.

### Symptoms
- 503 Service Unavailable errors
- Functions timeout after 26 seconds
- Processing incomplete
- Background processing killed

### Root Causes
1. **Processing Takes Too Long**: Full audit processing exceeds 26-second limit
2. **Synchronous Processing**: Trying to complete everything before returning
3. **No Early Return**: Not returning early when timeout approaches
4. **Background Processing Killed**: Netlify kills background processes on timeout

### Solutions
1. **Early Return Pattern**:
   ```typescript
   // Return early if processing takes too long
   const startTime = Date.now();
   const TIMEOUT_SAFETY_MARGIN = 20000; // 20 seconds
   
   // Process with timeout check
   if (Date.now() - startTime > TIMEOUT_SAFETY_MARGIN) {
     return NextResponse.json({ message: 'Processing started' });
   }
   ```

2. **Background Processing**:
   ```typescript
   // Start processing, don't await
   processAudit(auditId).catch(console.error);
   
   // Return immediately
   return NextResponse.json({ message: 'Processing started' });
   ```

3. **Queue System**:
   - Use queue for long-running tasks
   - Process one item at a time
   - Return quickly from queue processor

4. **Netlify Pro Benefits**:
   - 26-second timeout (vs 10s free)
   - Background processing continues after return
   - Can attempt full processing with early return

### Prevention
- Always use early return pattern for long operations
- Implement queue system for async processing
- Monitor function execution times
- Test with timeout scenarios
- Use background processing when possible

---

## General Prevention Strategies

1. **Always Test Locally First**:
   - Run `npm run build` before pushing
   - Test functions locally with `netlify dev`
   - Verify environment variables are set

2. **Monitor After Deployment**:
   - Check Netlify function logs
   - Verify scheduled functions are running
   - Test critical paths (audit creation, email sending)

3. **Use TypeScript Strictly**:
   - Enable strict mode
   - Fix all type errors
   - Use proper type definitions

4. **Document Changes**:
   - Update relevant documentation when making changes
   - Note any new environment variables required
   - Document new features and their requirements

5. **Implement Proper Error Handling**:
   - Catch and log all errors
   - Provide meaningful error messages
   - Implement retry logic where appropriate

6. **Use Database Constraints**:
   - Unique constraints prevent duplicates
   - Foreign key constraints maintain data integrity
   - Check constraints validate data

7. **Regular Monitoring**:
   - Check queue status regularly
   - Monitor email sending success rate
   - Review error logs
   - Check function execution times

---

## Quick Reference: Common Fixes

| Issue | Quick Fix |
|-------|-----------|
| Scheduled function not running | Check `netlify/functions/` directory and `@netlify/functions` package |
| Email not sent | Verify `SENDGRID_API_KEY` and `FROM_EMAIL` in Netlify |
| Audit stuck | Check queue status, add orphaned audits manually |
| Price incorrect | Divide cents by 100 for display |
| Build fails | Run `npm run build` locally, fix TypeScript errors |
| Missing env var | Set in Netlify dashboard or via CLI |
| Duplicate processing | Check `email_sent_at` before processing |
| Timeout errors | Use early return pattern, implement queue system |

---

## Related Documentation

- `CRON_JOB_FIX.md` - Detailed cron job setup and fixes
- `QUEUE_SETUP.md` - Queue system setup instructions
- `EMAIL_TROUBLESHOOTING.md` - Email sending troubleshooting guide
- `README.md` - General project documentation

