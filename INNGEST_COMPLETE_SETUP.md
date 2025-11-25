# Inngest Setup - Complete Guide

## ✅ What's Been Done

1. **Inngest Integration Code** - Complete
   - Inngest client configured
   - Function endpoint created (`/api/inngest`)
   - Webhook updated to use Inngest
   - Test and retry endpoints updated

2. **Environment Variables Set** - Complete
   - `INNGEST_EVENT_KEY`: Set in Netlify
   - `INNGEST_SIGNING_KEY`: Set in Netlify
   - `INNGEST_APP_ID`: Set to `seo-checksite`

3. **Netlify Configuration** - Complete
   - Variables set for all contexts
   - Ready for deployment

## ⏳ Final Step Required

### Configure Inngest Sync Endpoint

1. **Go to Inngest Dashboard**
   - Visit: https://www.inngest.com
   - Login to your account

2. **Navigate to Your App**
   - Click "Apps" in left sidebar
   - Select your app (should be "seo-checksite" or similar)

3. **Set Sync Endpoint**
   - Go to "Settings" or "Configuration"
   - Find "Sync Endpoint" or "App URL"
   - Set to: `https://seochecksite.netlify.app/api/inngest`
   - Save

4. **Verify Sync**
   - Inngest will attempt to sync with your endpoint
   - You should see your `process-audit` function appear
   - Check "Functions" tab to confirm

## 🧪 Testing

### After Sync Endpoint is Configured

**1. Test Inngest Endpoint**
```bash
curl https://seochecksite.netlify.app/api/inngest
```

Should return function information.

**2. Create Test Audit**
```bash
curl -X POST "https://seochecksite.netlify.app/api/test-audit" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://seoauditpro.net",
    "email": "test@example.com",
    "modules": ["performance", "crawl_health", "on_page", "mobile"]
  }'
```

**3. Monitor in Inngest Dashboard**
- Go to Inngest dashboard → "Runs"
- You should see the audit processing
- Check logs for any errors

**4. Verify Email**
- Check the email address you provided
- Should receive audit report when complete

## 🔍 Troubleshooting

### Functions Not Appearing in Inngest

**Check:**
1. Sync endpoint is correct
2. Endpoint is accessible (not behind auth)
3. Code is deployed to Netlify
4. Environment variables are set

**Fix:**
```bash
# Verify endpoint
curl https://seochecksite.netlify.app/api/inngest

# Check environment variables
netlify env:list | grep INNGEST

# Redeploy if needed
git push  # Auto-deploys
```

### Events Not Triggering

**Check:**
1. Event name matches: `audit/process`
2. Event data includes `auditId`
3. Inngest dashboard shows events received

**Debug:**
- Check Netlify function logs
- Check Inngest dashboard events tab
- Verify webhook is sending events

### Audits Still Timing Out

**If this happens:**
1. Verify Inngest is actually processing (check dashboard)
2. Check Inngest function logs for errors
3. Verify environment variables are set correctly
4. Check sync endpoint is configured

## 📊 Monitoring

### Inngest Dashboard
- **Runs**: See all function executions
- **Events**: See all events sent
- **Functions**: See registered functions
- **Logs**: Detailed execution logs

### Netlify Dashboard
- **Function Logs**: `netlify logs:functions`
- **Deploy Logs**: Check deployment status
- **Environment Variables**: Verify they're set

## ✅ Success Indicators

You'll know it's working when:
1. ✅ Functions appear in Inngest dashboard
2. ✅ Test audit creates a run in Inngest
3. ✅ Audit completes successfully
4. ✅ Email is received
5. ✅ No timeout errors

## 🎯 Next Steps

1. **Configure sync endpoint** (if not done)
2. **Wait for deployment** (if code just pushed)
3. **Test with a new audit**
4. **Monitor in Inngest dashboard**
5. **Verify email delivery**

Once everything is working, your audits will process reliably without timeout issues!

