# Quick Start Guide

Get up and running in minutes.

## Prerequisites

- Node.js 18+ and npm
- Supabase account (project created)
- Stripe account (test mode)
- Resend account
- DeepSeek API key

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

```bash
# Create .env.local from template
./scripts/create-local-env.sh

# Or manually copy .env.example to .env.local and fill in values
```

See `ENV_VARS_SETUP.md` for where to get each API key.

### 3. Run Database Migration

**Via Supabase Dashboard** (Recommended):
1. Go to: https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/sql/new
2. Open `supabase/migrations/001_initial_schema.sql`
3. Copy all SQL content
4. Paste into Supabase SQL Editor
5. Click "Run"

### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 5. Set Up Stripe Webhook (for local testing)

In a separate terminal:

```bash
# Install Stripe CLI (if needed)
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Start webhook listener
./scripts/setup-stripe-webhook.sh
```

Copy the `whsec_...` secret and add to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## Testing

1. Open http://localhost:3000
2. Enter a website URL (e.g., `example.com`)
3. Enter your email
4. Select audit modules
5. Complete checkout with Stripe test card: `4242 4242 4242 4242`
6. Check your email for the report

## Next Steps

- See `README.md` for full documentation
- See `NETLIFY_DEPLOY.md` for deployment instructions
- See `MIGRATION_GUIDE.md` for database setup details

