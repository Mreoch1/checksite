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

