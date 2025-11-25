# Environment Variables Setup

## Important: Replace Placeholders

The scripts contain placeholders like `YOUR_STRIPE_SECRET_KEY`. You need to replace these with your actual keys when running the scripts.

## Get Your Actual Keys

### Stripe Keys
- Get from: https://dashboard.stripe.com/apikeys
- **STRIPE_SECRET_KEY**: Your secret key (starts with `sk_test_` or `sk_live_`)
- **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**: Your publishable key (starts with `pk_test_` or `pk_live_`)
- **STRIPE_WEBHOOK_SECRET**: Get from Stripe Dashboard → Webhooks (starts with `whsec_`)

### Supabase Keys
- Get from: https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/settings/api
- **NEXT_PUBLIC_SUPABASE_URL**: Your project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Your anon/public key
- **SUPABASE_SERVICE_ROLE_KEY**: Your service role key (keep secret!)

### Resend
- Get from: https://resend.com/api-keys
- **RESEND_API_KEY**: Your Resend API key (starts with `re_`)
- **FROM_EMAIL**: Your verified email domain

### DeepSeek
- Get from: https://platform.deepseek.com/api_keys
- **DEEPSEEK_API_KEY**: Your DeepSeek API key (starts with `sk-`)

## Using the Scripts

When running `./scripts/set-all-netlify-env.sh`, edit it first and replace `YOUR_STRIPE_SECRET_KEY` with your actual Stripe secret key.

Or set them manually:
```bash
netlify env:set STRIPE_SECRET_KEY "sk_test_..."
```

