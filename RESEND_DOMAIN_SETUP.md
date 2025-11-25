# Resend Domain Verification Setup

To use `contact@seoauditpro.net` as your sender email, you need to verify your domain in Resend.

## Steps to Verify Domain

1. **Go to Resend Dashboard**
   - Visit: https://resend.com/domains
   - Log in with your Resend account

2. **Add Your Domain**
   - Click "Add Domain"
   - Enter: `seoauditpro.net`
   - Click "Add"

3. **Add DNS Records**
   Resend will provide you with DNS records to add. You'll need to add these to your domain's DNS settings:

   **SPF Record (TXT)**
   ```
   v=spf1 include:resend.com ~all
   ```

   **DKIM Records (TXT)**
   - Resend will provide 2-3 DKIM records
   - Add each as a TXT record with the name and value they provide

   **DMARC Record (TXT)**
   ```
   v=DMARC1; p=none; rua=mailto:contact@seoauditpro.net
   ```

4. **Verify in Resend**
   - After adding DNS records, wait a few minutes
   - Click "Verify" in Resend dashboard
   - Resend will check your DNS records

5. **Wait for Propagation**
   - DNS changes can take up to 48 hours (usually much faster)
   - Resend will show verification status

## Current Configuration

- **FROM_EMAIL**: `contact@seoauditpro.net` (set in Netlify)
- **FROM_NAME**: `SEO CheckSite` (set in Netlify)
- **RESEND_API_KEY**: Already configured

## Testing

Once verified, test with:
```bash
curl -X POST "https://seochecksite.netlify.app/api/test-email" \
  -H "Content-Type: application/json" \
  -d '{"email": "mreoch82@hotmail.com"}'
```

## Temporary Solution

Until the domain is verified, emails will be sent from `onboarding@resend.dev` (Resend's default domain). This still works but isn't branded.

Once verified, emails will automatically use `contact@seoauditpro.net`.

