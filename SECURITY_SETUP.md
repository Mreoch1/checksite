# Security Setup Instructions

## New Security Features Added

### 1. Admin Route Protection
All `/api/admin/*` routes now require authentication.

**Setup:**
1. Add `ADMIN_SECRET` to Netlify environment variables
2. Generate a secure random string: `openssl rand -hex 32`
3. Use this secret in Authorization header: `Bearer YOUR_SECRET`

**Usage:**
```bash
curl -H "Authorization: Bearer YOUR_SECRET" \
  https://seochecksite.netlify.app/api/admin/diagnose-audit?id=AUDIT_ID
```

### 2. Input Validation
API routes now use Zod for input validation.

**Protected Routes:**
- `/api/create-checkout` - Validates URL, email, modules
- More routes will be added

### 3. Security Headers
Added security headers to all responses:
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

### 4. Health Check Endpoint
New endpoint: `/api/health`

**Usage:**
```bash
curl https://seochecksite.netlify.app/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-25T...",
  "checks": {
    "database": { "status": "ok", "duration": 45 },
    "environment": { "status": "ok" }
  },
  "duration": 50
}
```

### 5. Environment Variable Validation
Environment variables are now validated (in production).

**Required Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- At least one: `RESEND_API_KEY` or `SMTP_PASSWORD`

## Still TODO (See MISSING_BEST_PRACTICES.md)

- Rate limiting
- Error tracking (Sentry)
- Request ID tracking
- API request size limits
- Testing
- Analytics

