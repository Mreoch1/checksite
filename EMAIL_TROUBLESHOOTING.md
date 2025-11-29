# Email Delivery Troubleshooting Guide

## Critical: Email Configuration Required

**Email delivery is a core feature and MUST be configured correctly in Netlify environment variables.**

## Required Environment Variables

At least ONE of these must be set in Netlify:

### Option 1: SendGrid (Recommended)
```
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=admin@seochecksite.net
FROM_NAME=SEO CheckSite
EMAIL_PROVIDER=sendgrid
EMAIL_USE_FALLBACK=true
```

### Option 2: Zoho SMTP (Fallback)
```
SMTP_PASSWORD=your_zoho_app_password
SMTP_HOST=smtppro.zoho.com
SMTP_PORT=465
SMTP_USER=admin@seochecksite.net
FROM_EMAIL=admin@seochecksite.net
FROM_NAME=SEO CheckSite
EMAIL_PROVIDER=smtp
```

### Option 3: Both (SendGrid + Zoho Fallback)
Set both SendGrid and Zoho credentials. System will try SendGrid first, then fallback to Zoho if SendGrid fails.

## How to Check Email Configuration

### 1. Check Netlify Environment Variables

1. Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
2. Verify these are set:
   - `SENDGRID_API_KEY` OR `SMTP_PASSWORD` (at least one required)
   - `FROM_EMAIL` (required)
   - `FROM_NAME` (optional, defaults to "SEO CheckSite")

### 2. Test Email Configuration

Use the admin endpoint to test email delivery:

```bash
curl -X POST https://seochecksite.netlify.app/api/test-email-detailed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -d '{"email": "your-email@example.com"}'
```

### 3. Check Audit Email Status

Check if email was sent for a specific audit:

```bash
curl -X GET "https://seochecksite.netlify.app/api/admin/check-audit-by-id?auditId=YOUR_AUDIT_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

Look for:
- `email_sent_at`: Timestamp if email was sent, `null` if not sent
- `error_log`: Contains email error details if sending failed

## Common Issues and Fixes

### Issue 1: Email Not Sent (email_sent_at is null)

**Symptoms:**
- Audit completes but no email received
- `email_sent_at` is `null` in database

**Possible Causes:**
1. Email environment variables not set in Netlify
2. Email sending failed (check `error_log` column)
3. Audit stuck in "running" status (report not generated)

**Fix:**
1. Verify environment variables in Netlify Dashboard
2. Check `error_log` for email errors
3. Manually send email using admin endpoint:
   ```bash
   curl -X POST https://seochecksite.netlify.app/api/admin/send-report-email \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
     -d '{"auditId": "YOUR_AUDIT_ID", "force": true}'
   ```

### Issue 2: Email Sending Failed (error_log contains errors)

**Symptoms:**
- `error_log` contains `email_send_failure` type
- Error message shows provider configuration issues

**Common Errors:**

#### "SENDGRID_API_KEY environment variable is required"
- **Fix:** Add `SENDGRID_API_KEY` to Netlify environment variables

#### "SMTP_PASSWORD environment variable is required"
- **Fix:** Add `SMTP_PASSWORD` to Netlify environment variables

#### "SendGrid email failed: [error message]"
- **Fix:** 
  - Verify SendGrid API key is valid
  - Check SendGrid account status
  - Verify `FROM_EMAIL` domain is authenticated in SendGrid
  - Check SendGrid activity logs for delivery issues

#### "Zoho SMTP failed: [error message]"
- **Fix:**
  - Verify SMTP credentials are correct
  - Check Zoho account status
  - Ensure using app-specific password (not account password)
  - Verify SMTP port (465 for SSL, 587 for TLS)

### Issue 3: Email Goes to Spam/Junk Folder

**Symptoms:**
- Email sent successfully but not in inbox

**Fixes:**
1. **SendGrid Domain Authentication:**
   - Go to SendGrid Dashboard → Settings → Sender Authentication
   - Add and verify your domain
   - Add DNS records (SPF, DKIM, DMARC)

2. **Check Email Content:**
   - Avoid spam trigger words
   - Use proper email formatting
   - Include unsubscribe link (already included)

3. **Ask Recipient to:**
   - Mark email as "Not Junk"
   - Add sender to contacts
   - Check spam folder

### Issue 4: Audit Stuck in "running" Status

**Symptoms:**
- Audit never completes
- No report generated
- Email never sent

**Fix:**
1. Check queue status:
   ```bash
   curl -X GET "https://seochecksite.netlify.app/api/admin/check-queue-status" \
     -H "Authorization: Bearer YOUR_ADMIN_SECRET"
   ```

2. Process queue manually:
   ```bash
   curl -X POST https://seochecksite.netlify.app/api/test-process-queue
   ```

3. If audit is truly stuck, reset it:
   ```bash
   curl -X POST https://seochecksite.netlify.app/api/admin/reset-audit \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
     -d '{"auditId": "YOUR_AUDIT_ID"}'
   ```

## Email Delivery Flow

1. **Audit Completes** → Report saved to database
2. **Email Reservation** → System reserves email slot (prevents duplicates)
3. **Email Sending** → Attempts SendGrid first, falls back to Zoho if enabled
4. **Email Confirmation** → Updates `email_sent_at` timestamp on success
5. **Error Handling** → Logs errors to `error_log`, resets `email_sent_at` to null for retry

## Verification Checklist

Before considering email "working", verify:

- [ ] At least one email provider configured (SendGrid OR Zoho)
- [ ] `FROM_EMAIL` environment variable set
- [ ] Test email sent successfully via admin endpoint
- [ ] Audit completes and generates report
- [ ] Email sent automatically after audit completion
- [ ] Email received in inbox (not spam)
- [ ] Report link in email works correctly

## Manual Email Resend

If an audit completed but email wasn't sent, manually resend:

```bash
curl -X POST https://seochecksite.netlify.app/api/admin/send-report-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -d '{
    "auditId": "YOUR_AUDIT_ID",
    "force": true
  }'
```

This will:
- Check if report exists
- Send email to customer
- Update `email_sent_at` timestamp
- Log any errors to `error_log`

## Monitoring Email Delivery

### Check Recent Audits Email Status

```bash
# Using Supabase client
const { data } = await supabase
  .from('audits')
  .select('id, url, email_sent_at, error_log, customers(email)')
  .order('created_at', { ascending: false })
  .limit(10)
```

### Check Email Errors

```bash
# Query audits with email errors
const { data } = await supabase
  .from('audits')
  .select('id, url, error_log, customers(email)')
  .not('error_log', 'is', null)
  .order('created_at', { ascending: false })
```

## Support

If email delivery continues to fail after checking all above:

1. Check Netlify function logs for detailed error messages
2. Verify environment variables are set correctly (case-sensitive)
3. Test email configuration using admin endpoint
4. Check SendGrid/Zoho account status and limits
5. Review `error_log` column in database for specific error details

