# Quick Start Guide

## ✅ What's Been Set Up

1. **Dependencies**: Installed via `npm install`
2. **Environment Variables**: Configured in `.env.local`
3. **Setup Scripts**: Created in `scripts/` directory
4. **Dev Server**: Should be running on http://localhost:3000

## 🚀 Quick Commands

### Start Everything

```bash
# Start dev server (if not already running)
npm run dev

# In a separate terminal, start Stripe webhook
./scripts/setup-stripe-webhook.sh
```

### Database Migration

**Option 1: Via Supabase Dashboard** (Easiest)
1. Go to: https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/sql/new
2. Open `supabase/migrations/001_initial_schema.sql`
3. Copy all SQL content
4. Paste into Supabase SQL Editor
5. Click "Run"

**Option 2: Via Script**
```bash
./scripts/run-db-migration.sh
```

### Stripe Webhook Setup

```bash
# Install Stripe CLI (if needed)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Start webhook listener (in separate terminal)
./scripts/setup-stripe-webhook.sh
# OR
npm run stripe:webhook
```

When the webhook starts, copy the `whsec_...` secret and add to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## 📝 Final Steps

1. **Run Database Migration** (see above)
2. **Set up Stripe Webhook** (see above)
3. **Update FROM_EMAIL** in `.env.local` to your verified Resend email
4. **Test the app** at http://localhost:3000

## 🧪 Testing

1. Open http://localhost:3000
2. Enter a website URL (e.g., `example.com`)
3. Enter your email
4. Select modules
5. Use Stripe test card: `4242 4242 4242 4242`
6. Check your email for the report

## 📁 Project Structure

```
sitecheck/
├── scripts/
│   ├── complete-setup.sh      # Full setup script
│   ├── setup-stripe-webhook.sh # Stripe webhook setup
│   └── run-db-migration.sh     # Database migration helper
├── app/                        # Next.js pages
├── lib/                        # Core libraries
└── supabase/
    └── migrations/            # Database migrations
```

## 🆘 Troubleshooting

- **Dev server not running**: `npm run dev`
- **Stripe webhook errors**: Make sure webhook listener is running
- **Database errors**: Verify migration was run successfully
- **Email not sending**: Check Resend API key and FROM_EMAIL domain

