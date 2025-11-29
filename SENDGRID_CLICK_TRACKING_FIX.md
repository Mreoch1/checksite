# Fix SendGrid Click Tracking SSL Certificate Error

## Problem

When users click the report link in emails, they see:
```
Your connection is not private
NET::ERR_CERT_COMMON_NAME_INVALID
url5121.seoauditpro.net
```

This happens because SendGrid's click tracking wraps links in a redirect through `url5121.seoauditpro.net`, which has an SSL certificate mismatch.

## Solution

### Step 1: Disable Click Tracking in SendGrid Dashboard

1. Log in to your SendGrid account: https://app.sendgrid.com
2. Go to **Settings** → **Tracking**
3. Find **Click Tracking**
4. Click **Disable** (or toggle it off)
5. Save changes

**Important**: Account-level click tracking overrides per-message settings, so this must be disabled in the dashboard even though the code has `clickTracking: { enable: false }`.

### Step 2: Verify Code Settings

The code already disables click tracking per-message in `lib/email-unified.ts`:

```typescript
mailSettings: {
  clickTracking: {
    enable: false,
    enableText: false,
  },
}
```

### Step 3: Test

After disabling click tracking in the dashboard:
1. Send a test email
2. Check the email source/HTML
3. Verify the report link goes directly to `https://seochecksite.netlify.app/report/[id]` 
4. Confirm it does NOT go through `url5121.seoauditpro.net`

## Alternative: Fix SSL Certificate for Tracking Domain

If you want to keep click tracking enabled, you need to fix the SSL certificate for `url5121.seoauditpro.net`:

1. Go to SendGrid Dashboard → **Settings** → **Sender Authentication**
2. Find your domain (`seoauditpro.net`)
3. Check the DNS records for `url5121` CNAME
4. Ensure the SSL certificate is properly configured

However, **disabling click tracking is recommended** because:
- It prevents SSL certificate errors
- Direct links are more trustworthy to users
- Report links don't need click tracking (they're unique per audit)

## Verification

To verify click tracking is disabled:

1. Send a test email using the test endpoint:
   ```bash
   curl -X POST https://seochecksite.netlify.app/api/test-email \
     -H "Content-Type: application/json" \
     -d '{"email": "your-email@example.com"}'
   ```

2. Check the email HTML source:
   - Open the email
   - View source/HTML
   - Search for the report link
   - It should be: `https://seochecksite.netlify.app/report/[id]`
   - It should NOT be: `https://url5121.seoauditpro.net/ls/click?...`

## Status

- ✅ Code updated to disable click tracking per-message
- ⚠️ **Action Required**: Disable click tracking in SendGrid dashboard
- ✅ Documentation added

