# Testing Inngest Integration

## Current Status

✅ **Inngest Dev Server:** Running at http://localhost:8288
⏳ **Next.js Dev Server:** Starting...
✅ **Inngest Endpoint:** `/api/inngest` ready

## Steps to Test

### 1. Verify Functions are Discovered

1. In Inngest Dev Server (http://localhost:8288):
   - Click on **"Functions"** in the left sidebar
   - You should see `process-audit` function listed
   - If not visible, check that Next.js is running

### 2. Test with Inngest Dashboard

**Option A: Send Test Event**
1. In Inngest Dev Server, click **"Send test event"** button
2. Event name: `audit/process`
3. Event data:
   ```json
   {
     "auditId": "test-audit-123"
   }
   ```
4. Click "Send"
5. Go to **"Runs"** tab to see the function execute

**Option B: Create Real Test Audit**
```bash
curl -X POST "http://localhost:3000/api/test-audit" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seoauditpro.net",
    "email": "test@example.com",
    "modules": ["performance", "crawl_health", "on_page", "mobile"]
  }'
```

This will:
1. Create an audit in the database
2. Trigger Inngest event `audit/process`
3. Process the audit in Inngest
4. Send email when complete

### 3. Monitor Execution

1. Go to **"Runs"** tab in Inngest Dev Server
2. You should see the audit processing run
3. Click on a run to see:
   - Execution logs
   - Step-by-step progress
   - Any errors

### 4. Check Function Logs

In the Inngest Dev Server:
- **Runs** tab shows all executions
- Click on a run to see detailed logs
- Check for any errors or warnings

## Troubleshooting

### Functions Not Appearing

**Check:**
1. Next.js is running: `lsof -ti:3000`
2. Endpoint is accessible: `curl http://localhost:3000/api/inngest`
3. Function is exported correctly in `app/api/inngest/route.ts`

**Fix:**
```bash
# Restart Next.js
npm run dev

# Restart Inngest dev server
npx inngest-cli@latest dev
```

### Events Not Triggering

**Check:**
1. Event name matches: `audit/process`
2. Event data includes `auditId`
3. Function is listening for the correct event

**Verify:**
- Check Next.js console for event sends
- Check Inngest Dev Server logs
- Verify function is registered

### Runs Not Appearing

**Check:**
1. Function is actually being called
2. No errors in function execution
3. Inngest Dev Server is connected

**Debug:**
- Check Next.js console logs
- Check Inngest Dev Server logs
- Verify database connection

## Expected Flow

1. **Test Audit Created** → Database
2. **Inngest Event Sent** → `audit/process` event
3. **Function Triggered** → `process-audit` function runs
4. **Audit Processing** → Modules executed
5. **Report Generated** → LLM generates report
6. **Email Sent** → Customer receives email
7. **Run Complete** → Shows in Inngest dashboard

## Next Steps After Testing

Once local testing works:

1. **Set Production Environment Variables:**
   ```bash
   netlify env:set INNGEST_APP_ID=your_app_id
   netlify env:set INNGEST_EVENT_KEY=your_event_key
   netlify env:set INNGEST_SIGNING_KEY=your_signing_key
   ```

2. **Configure Production Sync Endpoint:**
   - In Inngest dashboard (production)
   - Set sync endpoint: `https://seochecksite.netlify.app/api/inngest`

3. **Deploy:**
   ```bash
   git push  # Auto-deploys to Netlify
   ```

4. **Test Production:**
   - Create a real audit via Stripe checkout
   - Monitor in Inngest production dashboard
   - Verify email delivery

