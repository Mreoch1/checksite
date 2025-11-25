# Build Fix: Dynamic Route Configuration

## Issue

Netlify build was failing with:
```
ReferenceError: File is not defined
    at 5399 (/opt/build/repo/.next/server/chunks/666.js:119:74884)
```

This occurred during the "Collecting page data" phase when Next.js tried to statically analyze API routes.

## Root Cause

Next.js 14 tries to statically analyze routes during build. Some dependencies (likely `cheerio` or transitive dependencies) reference the `File` API, which isn't available in Node.js 18's build environment.

## Solution

Marked all API routes as dynamic to prevent static analysis:

1. **`app/api/recommend-modules/route.ts`**
   - Added `export const dynamic = 'force-dynamic'`
   - Added `export const runtime = 'nodejs'`

2. **`app/api/create-checkout/route.ts`**
   - Added `export const dynamic = 'force-dynamic'`
   - Added `export const runtime = 'nodejs'`

3. **`app/api/webhooks/stripe/route.ts`**
   - Added `export const dynamic = 'force-dynamic'`
   - Added `export const runtime = 'nodejs'`
   - Updated to use `getStripe()` directly instead of importing `stripe` constant

## What This Does

- `dynamic = 'force-dynamic'` tells Next.js to never statically analyze this route
- `runtime = 'nodejs'` ensures the route runs in Node.js runtime (not Edge)
- Routes are now only evaluated at request time, not during build

## Testing

After this fix, the build should:
1. ✅ Compile successfully
2. ✅ Skip static analysis of API routes
3. ✅ Deploy to Netlify without errors

## Next Steps

1. Commit and push these changes
2. Netlify will automatically rebuild
3. Verify the build succeeds

