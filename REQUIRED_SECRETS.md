# Required Secrets for End-to-End Audit Testing

## Environment Variables Needed

To run the full audit test end-to-end using the proper API endpoints, you need these secrets in your `.env.local` file:

### Required Secrets

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Your Supabase project URL
   - Example: `https://ybliuezkxrlgiydbfzqy.supabase.co`
   - ✅ Already in your `.env.local`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Your Supabase anonymous key
   - ✅ Already in your `.env.local`

3. **ADMIN_SECRET** ⚠️ **REQUIRED FOR TEST ENDPOINTS**
   - Secret key for admin/test API endpoints
   - Used by `/api/test-audit` endpoint
   - ❌ **MISSING** - You need to add this
   - Can be any secure random string (e.g., generate with `openssl rand -hex 32`)

### Optional (for production)

4. **QUEUE_SECRET**
   - Secret for queue processing endpoint
   - Used by `/api/process-queue` (production endpoint)
   - Not needed for test endpoint `/api/test-process-queue`

5. **NEXT_PUBLIC_SITE_URL**
   - Your site URL (defaults to `https://seochecksite.netlify.app`)
   - ✅ Already in your `.env.local` (but set to localhost)

## How to Add ADMIN_SECRET

1. Generate a secure secret:
   ```bash
   openssl rand -hex 32
   ```

2. Add to `.env.local`:
   ```
   ADMIN_SECRET=your-generated-secret-here
   ```

3. Also add to Netlify environment variables (for production):
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add `ADMIN_SECRET` with the same value

## Running the Test

Once `ADMIN_SECRET` is set, run:

```bash
# Load environment variables and run test
export $(cat .env.local | grep -v '^#' | xargs)
node scripts/test-audit-end-to-end.js [URL] [COMPETITOR_URL] [EMAIL]

# Example:
node scripts/test-audit-end-to-end.js \
  https://seochecksite.netlify.app \
  https://www.seoptimer.com \
  Mreoch82@hotmail.com
```

## What Each Step Does

1. **Step 1: Create Audit** - Uses `/api/test-audit` with `ADMIN_SECRET` auth
2. **Step 2: Trigger Queue** - Uses `/api/test-process-queue` (no auth needed)
3. **Step 3: Monitor** - Polls Supabase for audit status
4. **Step 4: Verify** - Checks report, email, and all modules

## Security Note

- `ADMIN_SECRET` should be kept private
- Never commit it to git
- Use different secrets for development and production
- The test endpoints are for testing only - they bypass normal authentication

PAGESPEED_API_KEY - Google PageSpeed Insights API key (free, 25K queries/day). Get one at https://console.cloud.google.com/apis/credentials
# Force deploy Thu Apr 30 23:53:43 EDT 2026
# Fresh deploy with PAGESPEED_API_KEY Thu Apr 30 23:58:44 EDT 2026

---

## SendGrid Event Webhook (production)

- **`SENDGRID_WEBHOOK_PUBLIC_KEY`** — ECDSA public key from SendGrid Event Webhook “Signed Event Webhook” settings. Required for **`POST /api/webhooks/sendgrid`** in production (`NETLIFY` / `NODE_ENV=production`). Without it the webhook returns **503**. Local dev may omit it (verification skipped; logs a warning).

---

## GSC (Google Search Console) API — Setup Required

The GSC helper module was removed until `googleapis` is installed (see workspace hygiene). Restore `lib/search-console-api.ts` when you add that dependency.

### 1. Google Cloud Project Setup
- Go to https://console.cloud.google.com/apis/library
- Create or select a project
- Enable **Google Search Console API**
- Go to **Credentials** → **Create Credentials** → **Service Account**
- Download the JSON key file

### 2. GSC Property Access
- Go to https://search.google.com/search-console
- Select `seochecksite.net` property
- Go to **Settings** → **Users and permissions**
- Add the service account email (from step 1) as an **Owner** (or User)

### 3. Environment Variables
- Store the JSON key file somewhere safe (not in the repo)
- Set these in `.env.local` and Netlify env vars:

```
GSC_SERVICE_ACCOUNT_KEY_PATH=/path/to/your-service-account-key.json
GSC_SITE_URL=scoped:https://seochecksite.net/
```

### 4. Install npm dependency
```bash
npm install googleapis google-auth-library
```

### 5. Test the connection
```bash
export $(cat .env.local | grep -v '^#' | xargs)
npx tsx scripts/fetch-gsc-data.ts --days 7
```
