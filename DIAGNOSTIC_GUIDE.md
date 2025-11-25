# Audit Diagnostic Guide

## Problem
Audits are failing or getting stuck, preventing emails from being sent to customers.

## Diagnostic Endpoints Created

### 1. `/api/admin/diagnose-audit?id={auditId}`
Get detailed information about an audit's status and progress.

**Usage:**
```bash
curl "https://seochecksite.netlify.app/api/admin/diagnose-audit?id=YOUR_AUDIT_ID" | python3 -m json.tool
```

**Returns:**
- Audit status and timing
- Current processing stage (fetching_site, generating_report, sending_email)
- Module status
- Diagnostic recommendations

### 2. `/api/admin/test-audit-step`
Test individual audit steps to isolate failures.

**Usage:**
```bash
# Test website fetching
curl -X POST "https://seochecksite.netlify.app/api/admin/test-audit-step" \
  -H "Content-Type: application/json" \
  -d '{"step": "fetch_site", "url": "https://seoauditpro.net"}'

# Test LLM report generation
curl -X POST "https://seochecksite.netlify.app/api/admin/test-audit-step" \
  -H "Content-Type: application/json" \
  -d '{"step": "test_llm", "url": "https://seoauditpro.net"}'

# Test email sending
curl -X POST "https://seochecksite.netlify.app/api/admin/test-audit-step" \
  -H "Content-Type: application/json" \
  -d '{"step": "test_email", "url": "https://seoauditpro.net", "email": "Mreoch82@hotmail.com"}'
```

### 3. `/api/admin/send-report-email`
Manually send report email if audit completed but email failed.

**Usage:**
```bash
curl -X POST "https://seochecksite.netlify.app/api/admin/send-report-email" \
  -H "Content-Type: application/json" \
  -d '{"auditId": "YOUR_AUDIT_ID"}'
```

## Diagnostic Process

### Step 1: Diagnose Failed Audit
```bash
# Check the failed audit
curl "https://seochecksite.netlify.app/api/admin/diagnose-audit?id=bf835397-18f3-4669-9ba7-76d5fb0f47a4" | python3 -m json.tool
```

This will show:
- What stage the audit failed at
- How long it's been running
- Whether it's stuck
- Recommendations

### Step 2: Test Individual Steps
Test each step to find where it's failing:

```bash
# 1. Test website fetch
curl -X POST "https://seochecksite.netlify.app/api/admin/test-audit-step" \
  -H "Content-Type: application/json" \
  -d '{"step": "fetch_site", "url": "https://seoauditpro.net"}' | python3 -m json.tool

# 2. Test LLM (if fetch works)
curl -X POST "https://seochecksite.netlify.app/api/admin/test-audit-step" \
  -H "Content-Type: application/json" \
  -d '{"step": "test_llm", "url": "https://seoauditpro.net"}' | python3 -m json.tool

# 3. Test email (if LLM works)
curl -X POST "https://seochecksite.netlify.app/api/admin/test-audit-step" \
  -H "Content-Type: application/json" \
  -d '{"step": "test_email", "url": "https://seoauditpro.net", "email": "Mreoch82@hotmail.com"}' | python3 -m json.tool
```

### Step 3: Check Netlify Logs
1. Go to Netlify Dashboard
2. Navigate to Functions → Logs
3. Look for errors during audit processing
4. Check for:
   - Timeout errors
   - API errors (DeepSeek, email)
   - Network errors
   - Memory issues

## Common Issues and Solutions

### Issue: Audit fails immediately
**Possible causes:**
- Website URL is inaccessible
- Network timeout
- Invalid URL format

**Solution:**
- Test with `fetch_site` step
- Verify URL is accessible
- Check network connectivity

### Issue: Audit gets stuck at "generating_report"
**Possible causes:**
- LLM API timeout
- LLM API rate limit
- LLM API error

**Solution:**
- Test with `test_llm` step
- Check DeepSeek API key
- Check API rate limits

### Issue: Audit completes but no email
**Possible causes:**
- Email service error
- Email configuration issue
- Email delivery failure

**Solution:**
- Test with `test_email` step
- Check email service logs
- Use `send-report-email` to manually send

### Issue: Audit times out after 5 minutes
**Possible causes:**
- Netlify function timeout (default 10 seconds for free tier)
- Processing takes too long
- Too many modules enabled

**Solution:**
- Check Netlify function timeout settings
- Reduce number of modules
- Optimize audit processing

## Next Steps

1. **Wait for deployment** (2-5 minutes after push)
2. **Run diagnostics** on failed audits
3. **Test individual steps** to isolate the issue
4. **Check Netlify logs** for detailed errors
5. **Fix the root cause** based on diagnostics

## Monitoring Script

Use `monitor-audit-direct.sh` to monitor an audit:
```bash
./monitor-audit-direct.sh
```

Or manually check status:
```bash
curl "https://seochecksite.netlify.app/api/check-audit-status?id=YOUR_AUDIT_ID" | python3 -m json.tool
```

