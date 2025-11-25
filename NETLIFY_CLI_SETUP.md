# Netlify CLI Setup for Inngest

## Site Information
- **Site:** seochecksite.netlify.app
- **Repo:** https://github.com/Mreoch1/checksite
- **Account:** Mreoch82
- **Project ID:** f46dd225-aca2-452e-863c-a91d52b9ebf9

## Quick Commands

### View Current Status
```bash
netlify status
```

### View Environment Variables
```bash
netlify env:list
```

### Set Environment Variables
```bash
# Set Inngest credentials
netlify env:set INNGEST_APP_ID=your_app_id
netlify env:set INNGEST_EVENT_KEY=your_event_key
netlify env:set INNGEST_SIGNING_KEY=your_signing_key
```

### Open Netlify Dashboard
```bash
netlify open
```

### View Function Logs
```bash
netlify logs:functions
```

### Deploy to Production
```bash
netlify deploy --prod
```

## Setting Up Inngest

### Step 1: Get Inngest Credentials

1. Go to https://www.inngest.com
2. Sign up for a free account
3. Create a new app
4. Get your credentials from the dashboard:
   - **App ID**
   - **Event Key**
   - **Signing Key**

### Step 2: Set Environment Variables

**Option A: Use the setup script**
```bash
./setup-inngest-netlify.sh
```

**Option B: Manual setup**
```bash
netlify env:set INNGEST_APP_ID=your_app_id_here
netlify env:set INNGEST_EVENT_KEY=your_event_key_here
netlify env:set INNGEST_SIGNING_KEY=your_signing_key_here
```

**Option C: Set all at once**
```bash
netlify env:set INNGEST_APP_ID=your_app_id INNGEST_EVENT_KEY=your_event_key INNGEST_SIGNING_KEY=your_signing_key
```

### Step 3: Verify Variables

```bash
netlify env:list | grep INNGEST
```

You should see:
- `INNGEST_APP_ID`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`

### Step 4: Configure Inngest Dashboard

1. Go to Inngest dashboard
2. Navigate to your app
3. Set the **Sync Endpoint** to:
   ```
   https://seochecksite.netlify.app/api/inngest
   ```
4. Save the configuration

### Step 5: Deploy (if needed)

```bash
# Deploy latest changes
netlify deploy --prod

# Or just push to GitHub (auto-deploys)
git push
```

## Testing

### Check Inngest Endpoint

```bash
curl https://seochecksite.netlify.app/api/inngest
```

Should return Inngest sync response.

### Create Test Audit

```bash
curl -X POST "https://seochecksite.netlify.app/api/test-audit" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://seoauditpro.net", "email": "test@example.com"}'
```

### Monitor in Inngest Dashboard

1. Go to Inngest dashboard
2. Navigate to **Runs**
3. You should see audit processing jobs
4. Check logs for any errors

## Troubleshooting

### Check Environment Variables

```bash
netlify env:list
```

### View Function Logs

```bash
netlify logs:functions
```

### Check Site Status

```bash
netlify status
```

### Open Dashboard

```bash
netlify open
```

## Useful Netlify CLI Commands

```bash
# View all sites
netlify sites:list

# Link to a site
netlify link

# View build logs
netlify logs

# View deploy history
netlify deploy:list

# Rollback to previous deploy
netlify rollback

# View site analytics
netlify status --verbose
```

## Next Steps After Setup

1. ✅ Environment variables set
2. ✅ Inngest endpoint configured
3. ✅ Code deployed
4. ✅ Test audit created
5. ✅ Monitor in Inngest dashboard
6. ✅ Verify email delivery

## Verification Checklist

- [ ] Inngest account created
- [ ] Environment variables set in Netlify
- [ ] Inngest sync endpoint configured
- [ ] Code deployed to Netlify
- [ ] Test audit created successfully
- [ ] Audit appears in Inngest dashboard
- [ ] Audit completes successfully
- [ ] Email received

