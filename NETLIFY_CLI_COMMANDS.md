# Netlify CLI Commands - Quick Reference

## Site Information
- **Site:** seochecksite.netlify.app
- **Project ID:** f46dd225-aca2-452e-863c-a91d52b9ebf9
- **Account:** Mreoch82

## Quick Status Check

```bash
# View current status
netlify status

# Check Inngest variables
./netlify-check-status.sh

# View all environment variables
netlify env:list
```

## Set Inngest Environment Variables

### Option 1: Interactive Script
```bash
./setup-inngest-complete.sh
```

### Option 2: Manual Commands
```bash
netlify env:set INNGEST_APP_ID=your_app_id
netlify env:set INNGEST_EVENT_KEY=your_event_key
netlify env:set INNGEST_SIGNING_KEY=your_signing_key
```

### Option 3: Set All at Once
```bash
netlify env:set INNGEST_APP_ID=your_app_id INNGEST_EVENT_KEY=your_event_key INNGEST_SIGNING_KEY=your_signing_key
```

## View Environment Variables

```bash
# List all variables
netlify env:list

# Get specific variable value
netlify env:get INNGEST_APP_ID

# Check if Inngest vars are set
netlify env:list | grep INNGEST
```

## Deploy & Management

```bash
# Deploy to production
netlify deploy --prod

# Deploy preview
netlify deploy

# View deploy history
netlify deploy:list

# Rollback to previous deploy
netlify rollback
```

## Monitoring & Logs

```bash
# View function logs
netlify logs:functions

# View all logs
netlify logs

# Open dashboard
netlify open

# View site analytics
netlify status --verbose
```

## Useful Scripts

```bash
# Quick status check
./netlify-check-status.sh

# Complete Inngest setup
./setup-inngest-complete.sh

# View all Netlify info
./netlify-setup-all.sh
```

## Inngest Sync Endpoint

After setting environment variables, configure in Inngest dashboard:

**Production Sync Endpoint:**
```
https://seochecksite.netlify.app/api/inngest
```

**Local Dev Sync Endpoint:**
```
http://localhost:3000/api/inngest
```

## Verification

After setup, verify:

```bash
# 1. Check variables are set
netlify env:list | grep INNGEST

# 2. Test endpoint
curl https://seochecksite.netlify.app/api/inngest

# 3. Create test audit
curl -X POST "https://seochecksite.netlify.app/api/test-audit" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://seoauditpro.net", "email": "test@example.com"}'

# 4. Check Inngest dashboard for runs
```

## Troubleshooting

```bash
# Check if logged in
netlify status

# Login if needed
netlify login

# Check site link
netlify link

# View all sites
netlify sites:list
```

