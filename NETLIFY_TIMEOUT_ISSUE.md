# Netlify Function Timeout Issue

## Problem

**Root Cause:** Netlify functions timeout at 10 seconds (free tier), but audit processing takes 2-5 minutes. When the function times out, background processing is killed, leaving audits stuck in "running" status.

## Current Behavior

1. Stripe webhook triggers audit processing
2. Function starts `processAudit()` in background (Promise.race)
3. Function returns immediately (good)
4. **BUT:** After 10 seconds, Netlify kills the function process
5. Background Promise.race() gets killed
6. Audit never completes, stuck in "running" status
7. No email is sent

## Solutions

### Option 1: Netlify Background Functions (Recommended for Pro Plan)
- Upgrade to Netlify Pro
- Use Background Functions that can run up to 15 minutes
- Modify code to use `netlify/functions` background functions

### Option 2: External Queue Service (Recommended for Free Tier)
Use a service designed for background jobs:

**Inngest (Recommended)**
- Free tier available
- Designed for background jobs
- Easy integration
- Reliable execution

**Trigger.dev**
- Open source
- Good for background processing
- Self-hosted or cloud

**Implementation:**
```typescript
// Instead of Promise.race in webhook, trigger Inngest event
import { inngest } from '@/lib/inngest'

// In webhook:
await inngest.send({
  name: 'audit/process',
  data: { auditId }
})

// Separate function handles processing
```

### Option 3: Separate Worker Service
- Deploy a separate service (e.g., Railway, Render) for audit processing
- Webhook triggers worker via API call
- Worker processes audit independently

### Option 4: Polling/Retry Mechanism (Quick Fix)
- Webhook marks audit as "pending"
- Separate endpoint polls for pending audits
- Processes them with retry logic
- **Limitation:** Still subject to Netlify timeout

## Immediate Workaround

For now, we can:
1. Mark stuck audits as failed automatically
2. Send failure emails
3. Allow manual retry
4. Recommend upgrading to Pro or using a queue service

## Recommended Next Steps

1. **Short-term:** Implement automatic stuck audit detection and failure emails
2. **Medium-term:** Integrate Inngest or similar queue service
3. **Long-term:** Consider Netlify Pro for Background Functions

## Code Changes Needed

### Current (Broken):
```typescript
// In webhook - background processing gets killed
Promise.race([
  processAudit(auditId),
  timeoutPromise
]).catch(...)
```

### With Inngest (Fixed):
```typescript
// In webhook - trigger background job
await inngest.send({
  name: 'audit/process',
  data: { auditId }
})

// Separate Inngest function processes audit
// Runs independently, not subject to webhook timeout
```

## Testing

Once fixed, test with:
```bash
# Create test audit
curl -X POST "https://seochecksite.netlify.app/api/test-audit" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://seoauditpro.net", "email": "test@example.com"}'

# Monitor until completion
./monitor-audit-direct.sh
```

