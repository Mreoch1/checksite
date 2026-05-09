# Netlify Deployment Guide

## Prerequisites

- Netlify account
- GitHub/GitLab/Bitbucket repository (or use Netlify CLI)
- All environment variables ready

## Option 1: Deploy via Netlify Dashboard (Recommended)

### Step 1: Push to Git Repository

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Push to your repository
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2: Connect to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git provider (GitHub/GitLab/Bitbucket)
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Framework preset**: Next.js (auto-detected)

### Step 3: Configure Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://ybliuezkxrlgiydbfzqy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SXAll4OlWo66uf7qrTAcQQGGeXozYMSO5GsQb28fmBBXMsxaUOaHBcaVKKXrFvQyyVPL01YYtCg7RflPp9OHAqr00zjMhZE1w
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET
RESEND_API_KEY=YOUR_RESEND_API_KEY
FROM_EMAIL=contact@seochecksite.net
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=YOUR_DEEPSEEK_API_KEY
NEXT_PUBLIC_SITE_URL=https://your-site-name.netlify.app
```

**Important**: Update `NEXT_PUBLIC_SITE_URL` with your actual Netlify site URL after deployment.

### Step 4: Deploy

1. Click "Deploy site"
2. Wait for build to complete
3. Your site will be live at `https://your-site-name.netlify.app`

### Step 5: Configure Stripe Webhook for Production

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your Netlify URL: `https://your-site-name.netlify.app/api/webhooks/stripe`
4. Select event: `checkout.session.completed`
5. Copy the new webhook signing secret
6. Update `STRIPE_WEBHOOK_SECRET` in Netlify environment variables

### Step 6: SendGrid Event Webhook Setup

Used for open/click/bounce analytics (`email_events` + `/api/admin/funnel`). Requires migration `011_email_events.sql` applied in Supabase.

1. In SendGrid: **Settings** → **Mail Settings** → **Event Webhook**.
2. **HTTP POST URL**: `https://seochecksite.net/api/webhooks/sendgrid` (or your Netlify production URL + `/api/webhooks/sendgrid`).
3. Enable action types: **Delivered**, **Opened**, **Clicked**, **Bounced**, **Dropped**, **Spam Reports**, **Unsubscribed** (match what you need for deliverability).
4. Enable **Signed Event Webhook** (signature verification on the server).
5. Copy the **verification public key** into Netlify as **`SENDGRID_WEBHOOK_PUBLIC_KEY`** (same value in production env).

Without this env var, production returns **503** on the webhook route (local dev skips verification with a warning).

## Option 2: Deploy via Netlify CLI

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify

```bash
netlify login
```

### Step 3: Initialize Site

```bash
netlify init
```

Follow the prompts:
- Create & configure a new site
- Choose your team
- Site name (or leave blank for auto-generated)
- Build command: `npm run build`
- Directory to deploy: `.next`

### Step 4: Set Environment Variables

```bash
# Set each variable
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://ybliuezkxrlgiydbfzqy.supabase.co"
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your_supabase_anon_key"
# ... (set all other variables)
```

Or use a script:

```bash
# Copy from .env.local
cat .env.local | grep -v "^#" | grep -v "^$" | while read line; do
  key=$(echo $line | cut -d'=' -f1)
  value=$(echo $line | cut -d'=' -f2-)
  netlify env:set "$key" "$value"
done
```

### Step 5: Deploy

```bash
# Build and deploy
netlify deploy --prod
```

## Post-Deployment Checklist

- [ ] Update `NEXT_PUBLIC_SITE_URL` in Netlify env vars to your production URL
- [ ] Configure Stripe webhook endpoint for production
- [ ] Update Stripe webhook secret in Netlify env vars
- [ ] Apply Supabase migrations (including `010_funnel_events.sql`, `011_email_events.sql`)
- [ ] Configure SendGrid Event Webhook + `SENDGRID_WEBHOOK_PUBLIC_KEY` (see Step 6 above)
- [ ] Test the full flow: URL → Payment → Report
- [ ] Verify emails are being sent
- [ ] Check Netlify function logs for any errors (grep `FUNNEL_EVENT_INSERT_FAILED` if funnel inserts fail)

## Troubleshooting

### Build Fails

- Check Netlify build logs
- Ensure all dependencies are in `package.json`
- Verify Node version (should be 18+)

### Webhook Not Working

- Verify webhook URL is correct in Stripe dashboard
- Check webhook secret matches in Netlify env vars
- Review Netlify function logs: `netlify functions:log`

### Environment Variables Not Loading

- Ensure variables are set in Netlify dashboard (not just `.env.local`)
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

## Custom Domain (Optional)

1. Go to Netlify Dashboard → Domain settings
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_SITE_URL` to your custom domain

## Continuous Deployment

Once connected to Git, Netlify will automatically deploy on every push to your main branch.

To disable auto-deploy:
- Netlify Dashboard → Site Settings → Build & Deploy → Deploy settings

