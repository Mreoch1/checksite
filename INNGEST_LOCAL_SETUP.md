# Inngest Local Development Setup

## Quick Start

### 1. Start Next.js Dev Server

In one terminal:
```bash
npm run dev
```

Your app will run at `http://localhost:3000`

### 2. Start Inngest Dev Server

In another terminal:
```bash
npx inngest-cli@latest dev
```

The Inngest dev server will:
- Run at `http://localhost:8288`
- Automatically discover your functions
- Show you the onboarding guide
- Allow you to test functions locally

### 3. Follow the Onboarding Guide

1. **Create an Inngest app** (Step 1)
   - The dev server will guide you
   - Your functions will be auto-discovered

2. **Deploy your Inngest app** (Step 2)
   - For local dev, this is already done
   - For production, you'll deploy to Netlify

3. **Sync your app to Inngest** (Step 3)
   - Set sync endpoint to: `http://localhost:3000/api/inngest`
   - Or for production: `https://seochecksite.netlify.app/api/inngest`

4. **Invoke your function** (Step 4)
   - Test by creating a test audit
   - Monitor in the Inngest dashboard

## Testing Locally

### Create a Test Audit

```bash
curl -X POST "http://localhost:3000/api/test-audit" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://seoauditpro.net", "email": "test@example.com"}'
```

### Monitor in Inngest Dev Server

1. Open `http://localhost:8288`
2. Navigate to **Runs**
3. You should see the audit processing job
4. Check logs for any errors

## Environment Variables for Local Dev

Create `.env.local` with:

```bash
# Inngest (optional for local dev - dev server handles this)
INNGEST_APP_ID=your_app_id
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key

# Other required vars
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
STRIPE_SECRET_KEY=your_stripe_key
# ... etc
```

## Production Setup

After testing locally:

1. **Set environment variables in Netlify:**
   ```bash
   netlify env:set INNGEST_APP_ID=your_app_id
   netlify env:set INNGEST_EVENT_KEY=your_event_key
   netlify env:set INNGEST_SIGNING_KEY=your_signing_key
   ```

2. **Configure Inngest sync endpoint:**
   - Go to Inngest dashboard
   - Set sync endpoint to: `https://seochecksite.netlify.app/api/inngest`

3. **Deploy:**
   ```bash
   git push  # Auto-deploys to Netlify
   ```

## Troubleshooting

### Dev Server Not Finding Functions

- Make sure Next.js is running on `http://localhost:3000`
- Check that `/api/inngest` endpoint is accessible
- Verify function is exported correctly

### Functions Not Appearing

- Check Inngest dev server logs
- Verify `app/api/inngest/route.ts` exists
- Make sure function is properly exported

### Events Not Triggering

- Check Next.js console for event sends
- Verify Inngest dev server is running
- Check function logs in Inngest dashboard

## Next Steps

1. ✅ Start Next.js dev server
2. ✅ Start Inngest dev server
3. ✅ Follow onboarding guide
4. ✅ Test audit processing locally
5. ✅ Set up production environment variables
6. ✅ Configure production sync endpoint
7. ✅ Deploy and test in production

