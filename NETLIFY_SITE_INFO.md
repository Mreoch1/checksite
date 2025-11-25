# Netlify Site Information

## Site Details

- **Site Name**: seochecksite
- **Site URL**: https://seochecksite.netlify.app
- **Repository**: https://github.com/Mreoch1/checksite

## Important Environment Variable

Make sure to set this in Netlify:

```
NEXT_PUBLIC_SITE_URL=https://seochecksite.netlify.app
```

## Stripe Webhook Configuration

Update your Stripe webhook endpoint to:

```
https://seochecksite.netlify.app/api/webhooks/stripe
```

After creating the webhook in Stripe, update the webhook secret in Netlify:

```bash
netlify env:set STRIPE_WEBHOOK_SECRET "whsec_..."
```

## Quick Commands

```bash
# Set site URL
netlify env:set NEXT_PUBLIC_SITE_URL "https://seochecksite.netlify.app"

# View all env vars
netlify env:list

# View site info
netlify status
```

