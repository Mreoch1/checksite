# Setup Instructions

## ✅ Completed Steps

1. **Dependencies**: Installed via `npm install`
2. **Environment Variables**: Configured in `.env.local`
3. **Dev Server**: Starting on http://localhost:3000

## 🔧 Remaining Setup Steps

### 1. Database Migration

Run the SQL migration in Supabase:

**Option A: Via Supabase Dashboard** (Recommended)
1. Go to: https://supabase.com/dashboard/project/ybliuezkxrlgiydbfzqy/sql/new
2. Open `supabase/migrations/001_initial_schema.sql` in this project
3. Copy the entire SQL content
4. Paste into Supabase SQL Editor
5. Click "Run"

**Option B: Via Supabase CLI**
```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref ybliuezkxrlgiydbfzqy

# Run migration
supabase db push
```

### 2. Stripe Webhook Setup (for local testing)

**Install Stripe CLI** (if not already installed):
```bash
brew install stripe/stripe-cli/stripe
```

**Login to Stripe**:
```bash
stripe login
```

**Start webhook listener** (in a separate terminal):
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This will output a webhook signing secret like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

**Add the webhook secret to `.env.local`**:
```bash
# Edit .env.local and update:
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 3. Update FROM_EMAIL

Edit `.env.local` and change:
```
FROM_EMAIL=noreply@yourdomain.com
```
to an email from a domain you've verified in Resend.

### 4. Test the Application

1. Open http://localhost:3000 in your browser
2. Enter a website URL and email
3. Select modules
4. Complete checkout (use Stripe test card: 4242 4242 4242 4242)
5. Check your email for the report

## 🚀 Quick Commands

- **Start dev server**: `npm run dev`
- **Stripe webhook**: `npm run stripe:webhook` (after installing Stripe CLI)
- **Run setup script**: `./setup.sh`

## 📝 Notes

- The dev server is running in the background
- Make sure Stripe webhook is running in a separate terminal when testing payments
- Database migration must be completed before the app can save audits
- Use Stripe test mode cards for testing: https://stripe.com/docs/testing

