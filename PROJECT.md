# SEO CheckSite - Project Single Source of Truth (SSOT)

**Last Updated**: 2025-01-28  
**Status**: Production - Health Check Completed, Changes Pushed  
**Version**: 1.0  
**Last Commit**: afbeb1d - Add PROJECT.md SSOT and health check system

This document is the authoritative source for all project state, decisions, TODOs, and issues. All changes to scope, behavior, or structure must be documented here immediately.

---

## Table of Contents

1. [Current Status](#current-status)
2. [Recent Changes](#recent-changes)
3. [TODOs](#todos)
4. [Unresolved Issues](#unresolved-issues)
5. [Architecture Decisions](#architecture-decisions)
6. [Configuration Status](#configuration-status)
7. [Deployment Status](#deployment-status)
8. [Known Issues & Solutions](#known-issues--solutions)

---

## Current Status

### System Health
- ✅ **Build**: Passing without errors
- ✅ **TypeScript**: No type errors
- ✅ **Function Structure**: `netlify/functions/process-queue.js` correctly configured
- ✅ **Package Dependencies**: `@netlify/functions@5.1.0` installed
- ✅ **Configuration**: `netlify.toml` has `functions.directory = "netlify/functions"`
- ✅ **Email Logic**: Atomic reservation system implemented
- ✅ **Timeout Handling**: Process-queue route implements 20s safety margin
- ✅ **Pricing Display**: Correctly converts cents to dollars
- ⚠️ **Scheduled Function**: Needs verification after next deploy (check Netlify dashboard)

### Pricing Model (Current)
- **Base Package**: $24.99 - "Website Audit"
  - Always includes: Performance, Crawl Health, On-Page SEO, Mobile Optimization, Accessibility, Security, Schema Markup, Social Metadata
- **Add-ons**:
  - Local SEO: +$10.00
  - Competitor Overview: +$10.00 (only charged when competitor URL provided)

### Module Status
- ✅ **Fully Implemented**: Performance, On-Page SEO, Mobile Optimization, Crawl Health, Local SEO, Accessibility, Security, Schema Markup, Social Metadata
- ⚠️ **Partially Implemented**: Competitor Overview (basic content analysis only)

---

## Recent Changes

### 2025-01-28: Email Issue Root Causes Identified

**Diagnostic Results** (from comprehensive-email-diagnostic.js):
1. **CRITICAL**: Email provider not configured in local env (SENDGRID_API_KEY or SMTP_PASSWORD missing)
2. **ROOT CAUSE**: Queue not processing - 3 pending items, 10 items stuck in "processing" for 650-788 minutes
3. **BLOCKING**: 10 abandoned email reservations (>30 minutes old) preventing sends

**Files Created**:
- `scripts/comprehensive-email-diagnostic.js` - Comprehensive email diagnostic tool
- `scripts/fix-stuck-queue.sql` - SQL to fix stuck queue items and clear abandoned reservations

**Status**: CRITICAL - Multiple issues preventing email delivery
**Action Required**:
1. Verify email provider configured in Netlify (SENDGRID_API_KEY or SMTP_PASSWORD)
2. Run `scripts/fix-stuck-queue.sql` to clear stuck items
3. Verify scheduled function is running in Netlify dashboard

### 2025-01-28: Email Issue Investigation & Diagnostic Tools

**Changes Made**:
1. Created `scripts/diagnose-email-issue.js` - Email diagnostic tool
2. Updated `PROJECT.md` to document email issue

**Files Created**:
- `scripts/diagnose-email-issue.js` - Checks for completed audits without emails, stale reservations, abandoned reservations, and email configuration

**Issue**: Emails not being sent for completed audits
**Status**: Likely caused by scheduled function not running (Issue #1)

### 2025-01-28: Health Check & Scheduled Function Setup

**Changes Made**:
1. Added `functions.directory = "netlify/functions"` to `netlify.toml`
2. Created `scripts/health-check.js` - Automated health check script
3. Created `HEALTH_CHECK_SEQUENCE.md` - Step-by-step health check guide
4. Created `PROJECT.md` - This SSOT document
5. Verified all code structure and configuration
6. Committed and pushed all changes (commit: afbeb1d)

**Files Modified**:
- `netlify.toml` - Added functions directory configuration
- `README.md` - Added reference to PROJECT.md as SSOT

**Files Created**:
- `PROJECT.md` - Single Source of Truth document
- `HEALTH_CHECK_SEQUENCE.md` - Health check guide
- `RECURRING_ISSUES.md` - Recurring issues documentation
- `scripts/health-check.js` - Health check script

**Decision**: Use `PROJECT.md` as the single source of truth for all project state, decisions, and TODOs.

**Status**: ✅ Committed and pushed to main branch

### 2025-01-27: Pricing Model Update

**Changes Made**:
1. Updated base price from $19.99 to $24.99
2. Moved Accessibility, Security, Schema Markup, Social Metadata into base package (no longer add-ons)
3. Updated UI to show base package + two optional add-ons
4. Fixed pricing display to show dollars instead of cents
5. Removed LLM from module recommendations (now content-based only)
6. Fixed Competitor Overview checkbox behavior (can be unchecked, auto-unchecks when URL cleared)

**Files Modified**:
- `lib/types.ts` - Updated `PRICING_CONFIG.basePrice` to 2499, set module prices to 0 for base modules
- `app/recommend/page.tsx` - Updated pricing display, module selection logic, competitor URL handling
- `app/api/create-checkout/route.ts` - Updated total calculation to only charge competitor_overview when URL provided
- `app/page.tsx` - Updated pricing display from $19.99 to $24.99
- `app/api/recommend-modules/route.ts` - Removed LLM integration, simplified to content-based recommendations

**Decision**: Simplified pricing model to one base package with two optional add-ons. Removed LLM dependency for recommendations.

### 2025-01-26: Queue Processing & Email System

**Changes Made**:
1. Removed 5-minute delay from queue processing
2. Added automatic detection and re-queueing of orphaned audits
3. Improved email reservation logic with fallback direct update
4. Enhanced error logging for email sending

**Files Modified**:
- `app/api/process-queue/route.ts` - Removed delay, added orphaned audit detection
- `lib/process-audit.ts` - Improved email reservation with fallback

**Decision**: Process audits immediately without delay. Auto-detect and fix orphaned audits.

### 2025-01-25: Netlify Scheduled Functions

**Changes Made**:
1. Removed all mentions of `cron-job.org` from codebase
2. Created `netlify/functions/process-queue.js` using `@netlify/functions`
3. Updated documentation to reference Netlify scheduled functions

**Files Modified**:
- `netlify/functions/process-queue.js` - Created scheduled function wrapper
- `netlify.toml` - Updated configuration
- `README.md` - Updated queue troubleshooting section
- `CRON_JOB_FIX.md` - Removed cron-job.org references
- `QUEUE_SETUP.md` - Updated to Netlify scheduled functions

**Decision**: Use Netlify Scheduled Functions instead of external cron service.

---

## TODOs

### High Priority
- [ ] **Verify Scheduled Function After Deploy**: Check Netlify dashboard → Functions → Scheduled functions to confirm `process-queue` appears and has recent executions
- [ ] **Run Health Check Script**: Execute `node scripts/health-check.js` after deploy to verify system health
- [ ] **Test End-to-End Flow**: Create a test audit and verify:
  - [ ] Audit enters `audit_queue` table
  - [ ] Audit progresses from pending to completed
  - [ ] Email is sent and `email_sent_at` is set
  - [ ] Report is accessible at `/report/[id]`

### Medium Priority
- [ ] **Check for Stuck Audits**: Run SQL queries from `HEALTH_CHECK_SEQUENCE.md` Step 3 to find and fix any orphaned audits
- [ ] **Verify Email Environment Variables**: Confirm all email variables are set in Netlify dashboard
- [ ] **Monitor Queue Processing**: Check Netlify function logs for queue processing activity

### Low Priority / Future Enhancements
- [ ] Real Lighthouse integration for Core Web Vitals (LCP, CLS, FID)
- [ ] Full site crawler for multi-page analysis
- [ ] Performance metrics dashboard (actual load times, bundle sizes)
- [ ] PDF report generation
- [ ] User dashboard to view past audits
- [ ] Email authentication for report access
- [ ] Analytics tracking
- [ ] A/B testing for pricing

---

## Unresolved Issues

### Active Issues
1. **Scheduled Function (Cron Job) Not Running** (Reported 2025-01-28, FIXED 2025-01-28)
   - **Status**: ✅ FIXED - Function now recognized by Netlify
   - **Symptoms**: 
     - Audits added to queue but never processed
     - No logs from `/api/process-queue` endpoint
     - No logs from `[process-queue-scheduled]` function
     - Queue items remain in "pending" status indefinitely
   - **Evidence**: 
     - Audit `3cee9452-f169-4740-8375-8850beee160e` added to queue at 09:21:38 PM
     - Queue entry `7250ec7f-964e-44f8-b8db-76a9347ccd89` created with status "pending"
     - No subsequent logs showing queue processing
     - **Current Status** (2025-01-28): 
       - Queue processing: ✅ Working (manually triggered successfully)
       - Email sending: ✅ Working (email sent for processed audit)
       - Queue status: 13 pending items, 21 completed items
       - No stuck processing items found
       - No abandoned email reservations found
   - **Root Cause**: Using legacy `schedule()` wrapper instead of modern `config.schedule` format
   - **Issue**: Netlify's modern Functions runtime (used by Next.js) doesn't recognize the old `schedule()` wrapper pattern
   - **Fix Applied**: 
     - Converted function to modern ESM format with `export default` handler
     - Replaced `schedule()` wrapper with `export const config = { schedule: "*/2 * * * *" }`
     - Updated handler to use modern Request/Response API instead of event/context
     - Removed `require('@netlify/functions')` dependency
   - **Status**: ✅ FULLY WORKING - Scheduled function executing successfully every 2 minutes
   - **Configuration**: 
     - ✅ Schedule defined in netlify.toml: `[functions."process-queue"] schedule = "*/2 * * * *"`
     - ✅ Function file uses clean ESM format (no schedule export to avoid conflicts)
     - ✅ Fixed JSDoc comment syntax error (removed `*/` from comment)
   - **Verification**: 
     - ✅ Function shows "Scheduled" badge in dashboard
     - ✅ Function executing automatically every 2 minutes
     - ✅ Logs show successful API calls: `Response: 200 { success: true, message: 'No pending audits in queue' }`
     - ✅ Next execution time displayed correctly
   - **Last Verified**: Nov 28, 10:52 PM - Function executed successfully
   - **Verification**: 
     - ✅ Functions section visible in Logs → Functions
     - ✅ `process-queue` function appears in list (created at 10:39 PM)
     - ✅ Function shows "Running in production" status
     - ✅ Function endpoint accessible: `/.netlify/functions/process-queue`
     - ⏳ Waiting to verify scheduled executions (check logs in 4-6 minutes for automatic runs every 2 minutes)
   - **Next Steps**: 
     - Wait 2-4 minutes and check function logs for automatic executions
     - Look for "Scheduled" badge in dashboard (if available)
     - Check "Scheduled Functions" tab (if available)
     - See `scripts/verify-scheduled-function.md` for detailed verification steps
     - Check function execution logs
     - Verify `netlify/functions/process-queue.js` exists and is correctly formatted
     - Manually trigger queue processing to test: `curl -X GET "https://seochecksite.netlify.app/api/process-queue?secret=YOUR_QUEUE_SECRET"`
     - Monitor queue status: `node scripts/check-queue-status.js` (requires .env.local)
     - See `scripts/monitor-queue.md` for detailed monitoring guide
   - **Priority**: CRITICAL
   - **Impact**: This is preventing all queue processing, which means audits never complete and emails never send
   - **Testing Tools**: 
     - `scripts/test-queue-processing.sh` - Test endpoint manually
     - `scripts/check-queue-status.js` - Check queue status
     - `scripts/monitor-queue.md` - Full monitoring guide

2. **Email Not Being Sent** (Reported 2025-01-28, Still Active)
   - **Status**: Investigating - Multiple possible causes
   - **Symptoms**: Audits complete but emails not sent to customers
   - **Possible Causes** (in order of likelihood):
     1. **PRIMARY**: Scheduled function not running (audits never processed) - See Issue #1
     2. Queue items stuck in "pending" status (not being processed)
     3. Email environment variables not set in Netlify (SENDGRID_API_KEY or SMTP_PASSWORD)
     4. Email sending errors (check `error_log` column in database)
     5. Stale/abandoned email reservations blocking sends
     6. Email provider configuration issues (SendGrid domain not verified, Zoho SMTP credentials wrong)
   - **Action**: 
     - **FIRST**: Run comprehensive diagnostic: `node scripts/comprehensive-email-diagnostic.js`
     - **SECOND**: Fix stuck queue items: `./scripts/fix-stuck-queue-cli.sh` (uses Supabase CLI)
     - **THIRD**: Check Netlify status: `./scripts/check-netlify-status.sh` (uses Netlify CLI)
     - **FOURTH**: Test queue processing: `./scripts/test-queue-netlify.sh` (uses Netlify CLI)
     - **FIFTH**: Fix scheduled function issue (Issue #1) if queue not processing
     - **SIXTH**: Review Netlify function logs: `netlify functions:log process-queue`
     - **SEVENTH**: Manually resend emails for completed audits using admin endpoint
   - **Priority**: High
   - **Diagnostic Tools**: 
     - `scripts/comprehensive-email-diagnostic.js` - **NEW** - Comprehensive check of all email issues
     - `scripts/diagnose-email-issue.js` - Basic email diagnostic
     - `scripts/check-queue-status.js` - Check queue processing status

### Pending Verification (After Next Deploy)
1. **Scheduled Function Visibility**: Need to verify `process-queue` appears in Netlify dashboard → Functions → Scheduled functions
   - **Status**: Waiting for deployment
   - **Action**: Check dashboard after deploy
   - **Priority**: High

2. **Queue Processing**: Need to verify queue processor runs every 2 minutes automatically
   - **Status**: Waiting for deployment
   - **Action**: Monitor Netlify function logs
   - **Priority**: High

3. **Stuck Audits**: May exist in database from previous issues
   - **Status**: Unknown - needs health check
   - **Action**: Run `scripts/health-check.js` or SQL queries from `HEALTH_CHECK_SEQUENCE.md`
   - **Priority**: Medium

### Known Limitations
1. **Competitor Overview**: Only basic content analysis implemented, full competitor crawling not yet done
2. **Performance Module**: Basic checks only, no real Lighthouse integration yet
3. **Crawl Health**: Single-page analysis only, no full site crawler

---

## Architecture Decisions

### Scheduled Functions
- **Decision**: Use Netlify Scheduled Functions with modern `config.schedule` format (ESM)
- **Rationale**: Native Netlify integration, required for modern Functions runtime (Next.js App Router)
- **Implementation**: `netlify/functions/process-queue.js` uses ESM with `export const config = { schedule: "*/2 * * * *" }`
- **Format**: Modern ESM format - `export default` handler + `export const config = { schedule: "..." }`
- **Schedule**: Every 2 minutes (`*/2 * * * *`)
- **Note**: Legacy `schedule()` wrapper from `@netlify/functions` doesn't work with modern runtime - causes Functions section to not appear in dashboard

### Email System
- **Decision**: Atomic reservation system using `email_sent_at` timestamp
- **Rationale**: Prevents duplicate emails, handles race conditions, allows retry on failure
- **Implementation**: 
  - Reservation: `UPDATE ... WHERE email_sent_at IS NULL`
  - Status check: Recent timestamp (<5 min) = reservation, old (>5 min) = sent
  - Fallback: Direct update if atomic reservation fails

### Queue System
- **Decision**: Supabase-based queue with automatic orphaned audit detection
- **Rationale**: Prevents Netlify timeouts, handles long-running audits, auto-fixes stuck audits
- **Implementation**: 
  - Queue processor checks for orphaned audits (pending/running but not in queue)
  - Automatically adds them to queue for processing
  - Processes one audit at a time to avoid timeouts

### Pricing Model
- **Decision**: Single base package ($24.99) with two optional add-ons ($10 each)
- **Rationale**: Simplified pricing, clearer value proposition, easier to understand
- **Implementation**: Base package includes 8 modules, add-ons are Local SEO and Competitor Overview

### Timeout Handling
- **Decision**: 20-second safety margin with early return pattern
- **Rationale**: Netlify Pro has 26s limit, need buffer for network/processing overhead
- **Implementation**: `Promise.race()` between processing and timeout, processing continues in background

---

## Configuration Status

### Environment Variables (Required in Netlify)

**Database**:
- ✅ `SUPABASE_URL` - Supabase project URL
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side operations

**Email**:
- ✅ `SENDGRID_API_KEY` - Primary email provider
- ✅ `FROM_EMAIL` - Sender email address
- ✅ `FROM_NAME` - Sender name
- ⚠️ `SMTP_HOST` - Zoho SMTP fallback (optional)
- ⚠️ `SMTP_USER` - Zoho SMTP fallback (optional)
- ⚠️ `SMTP_PASSWORD` - Zoho SMTP fallback (optional)

**Payments**:
- ✅ `STRIPE_SECRET_KEY` - Stripe secret key
- ✅ `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Public Stripe key

**Security**:
- ✅ `ADMIN_SECRET` - Admin endpoint authentication
- ✅ `QUEUE_SECRET` - Queue processor authentication

**Site Configuration**:
- ✅ `NEXT_PUBLIC_SITE_URL` - Site URL for links and webhooks
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Public Supabase URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public Supabase anon key

**LLM (Optional - Not Currently Used)**:
- ⚠️ `DEEPSEEK_API_KEY` - DeepSeek API key (removed from recommendations, may be used elsewhere)

### Netlify Configuration

**Build Settings**:
- Build command: `npm run build`
- Publish directory: `.next`
- Node version: `20`

**Functions**:
- Directory: `netlify/functions`
- Scheduled function: `process-queue` (every 2 minutes)

**Status**: ✅ Configured

---

## Deployment Status

### Current Deployment
- **Platform**: Netlify
- **Tier**: Pro (26-second function timeout)
- **Last Deploy**: Pending (after health check changes)
- **Build Status**: ✅ Passing locally
- **Git Status**: ✅ Changes committed and pushed (commit: afbeb1d)

### Deployment Checklist
- [ ] Run `npm run build` locally (✅ Passed)
- [ ] Fix any TypeScript errors (✅ No errors)
- [ ] Verify environment variables in Netlify dashboard
- [ ] Deploy to production
- [ ] Verify scheduled function appears in dashboard
- [ ] Test queue processing
- [ ] Create test audit and verify end-to-end flow

### Post-Deployment Verification
1. Check Netlify dashboard → Functions → Scheduled functions
2. Verify `process-queue` appears with recent executions
3. Run `node scripts/health-check.js` (requires `.env.local`)
4. Create test audit and monitor processing
5. Check for stuck audits using SQL queries

---

## Known Issues & Solutions

### Issue 1: Scheduled Functions Not Visible / Not Executing
**Symptoms**: Function doesn't appear in Netlify dashboard or doesn't execute on schedule  
**Root Causes**:
- Function not in correct directory (`netlify/functions/`)
- Missing `@netlify/functions` package
- Incorrect export format (legacy vs modern)
- `netlify.toml` missing `functions.directory`
- Schedule not recognized (only in function code vs also in netlify.toml)

**Solutions Applied**:
- ✅ Function structure: Modern ESM format with `export const config = { schedule: "*/2 * * * *" }`
- ✅ `netlify.toml` has `functions.directory = "netlify/functions"`
- ✅ Added schedule to `netlify.toml` as backup: `[functions."process-queue"] schedule = "*/2 * * * *"`
- ✅ Function appears in dashboard (verified)
- ✅ Function shows "Running in production" status

**Verification Steps**:
1. ✅ Check Functions section in dashboard (visible)
2. ✅ Check function details page (shows "Running in production")
3. ⏳ Wait 2-4 minutes and check logs for scheduled executions
4. ⏳ Look for "Scheduled" badge on function (if available in dashboard)
5. ⏳ Check "Scheduled Functions" tab (if available in dashboard)

**Status**: ✅ FULLY RESOLVED - Function executing successfully every 2 minutes
- Verified: Nov 28, 10:52 PM - Function executed and called API successfully
- Logs show: `Response: 200 { success: true, message: 'No pending audits in queue' }`
- Next execution scheduled correctly

### Issue 2: Email Sending Failures
**Symptoms**: Audits complete but emails not sent  
**Root Causes**:
- Missing environment variables
- Email reservation race conditions
- Provider configuration issues
- Stale/abandoned reservations blocking sends
- Email provider errors (SendGrid/Zoho)

**Solutions**:
- ✅ Atomic reservation system implemented
- ✅ Fallback direct update if reservation fails
- ✅ Comprehensive error logging
- ✅ Diagnostic tool created (`scripts/diagnose-email-issue.js`)
- ⚠️ Verify environment variables in Netlify
- ⚠️ Check for stale/abandoned reservations
- ⚠️ Review Netlify function logs for email errors

**Status**: ✅ FIXED - Queue processor now treats audits with report OR email as complete
**Fix Applied**: Updated verification logic to check for report OR email_sent_at, automatically fixes status from 'failed' to 'completed'
**Manual Fix**: Use `scripts/fix-failed-audits-with-reports.sql` to fix existing audits
**Diagnostic**: `node scripts/diagnose-email-issue.js`

### Issue 3: Orphaned Audits
**Symptoms**: Audits stuck in pending/running but not in queue  
**Root Causes**:
- Audit created but never added to queue
- Queue entry deleted or missing
- Processing error left audit in wrong state

**Solutions**:
- ✅ Auto-detection in queue processor
- ✅ Automatic re-queueing of orphaned audits
- ✅ SQL queries for manual fixes (see `HEALTH_CHECK_SEQUENCE.md`)

**Status**: Auto-fix implemented, may need manual cleanup of existing audits

### Issue 4: Pricing Display Errors
**Symptoms**: Prices shown in cents instead of dollars  
**Root Causes**:
- Missing division by 100 in display logic

**Solutions**:
- ✅ Fixed all price displays to divide by 100
- ✅ Verified in `app/recommend/page.tsx`

**Status**: ✅ Fixed

### Issue 5: Competitor Overview Checkbox
**Symptoms**: Checkbox can't be unchecked, price doesn't update  
**Root Causes**:
- Logic prevented unchecking
- Price calculation not reactive

**Solutions**:
- ✅ Allow unchecking at any time
- ✅ Auto-uncheck when URL cleared
- ✅ Reactive price calculation

**Status**: ✅ Fixed

---

## Documentation Files

### Primary Documentation
- **`PROJECT.md`** (this file) - Single Source of Truth
- **`README.md`** - User-facing documentation, setup guide
- **`HEALTH_CHECK_SEQUENCE.md`** - Step-by-step health check guide
- **`RECURRING_ISSUES.md`** - Detailed issue tracking and solutions

### Setup Guides
- **`NETLIFY_DEPLOY.md`** - Deployment instructions
- **`QUEUE_SETUP.md`** - Queue system setup
- **`EMAIL_TROUBLESHOOTING.md`** - Email system troubleshooting
- **`CRON_JOB_FIX.md`** - Cron job setup and fixes
- **`DNS_SETUP_GUIDE.md`** - DNS configuration
- **`REQUIRED_SECRETS.md`** - Environment variables guide

### Scripts
- **`scripts/health-check.js`** - Automated health check
- **`scripts/comprehensive-email-diagnostic.js`** - Comprehensive email diagnostic (all issues)
- **`scripts/diagnose-email-issue.js`** - Email issue diagnostic tool
- **`scripts/check-queue-status.js`** - Check current queue status
- **`scripts/fix-stuck-queue-cli.sh`** - Fix stuck queue items using Supabase CLI (requires project link)
- **`scripts/fix-stuck-queue-psql.sh`** - **NEW** - Fix stuck queue items using direct psql connection
- **`scripts/fix-stuck-queue.sql`** - SQL script to fix stuck queue items (run in Supabase Dashboard)
- **`scripts/check-netlify-status.sh`** - **NEW** - Check Netlify status using CLI
- **`scripts/test-queue-netlify.sh`** - **NEW** - Test queue processing using Netlify CLI
- **`scripts/test-queue-processing.sh`** - Test queue processing endpoint (manual)
- **`scripts/check-scheduled-function.md`** - How to verify scheduled function is running
- **`scripts/monitor-queue.md`** - Queue monitoring guide
- **`scripts/setup-netlify-scheduled-function.md`** - Scheduled function setup guide
- **`scripts/setup-external-cron.md`** - External cron fallback (not recommended)

---

## Change Log

### 2025-01-29
- Updated `scripts/test-audit-end-to-end.js` to support pricing tiers:
  - **Base tier**: runs only core modules (Performance, Crawl Health, On-Page SEO, Mobile, Accessibility, Security, Schema, Social)
  - **Full tier**: runs base modules + add-ons (Local SEO, Competitor Overview)
- Test script now only sends a competitor URL when Competitor Overview is included
- Used test script to verify:
  - Base $24.99 package only runs included modules
  - Add-on run includes Local SEO and Competitor Overview when explicitly requested

### 2025-01-28
- Created `PROJECT.md` as SSOT
- Added `functions.directory` to `netlify.toml`
- Created health check script and documentation
- Consolidated all project state into SSOT
- Created email diagnostic tool (`scripts/diagnose-email-issue.js`)
- Documented email sending issue in Unresolved Issues
- Identified scheduled function not running as root cause of email issue
- Created scheduled function verification guide (`scripts/check-scheduled-function.md`)

### 2025-01-27
- Updated pricing model to $24.99 base + 2 add-ons
- Removed LLM from recommendations
- Fixed pricing display and competitor checkbox behavior

### 2025-01-26
- Removed 5-minute delay from queue processing
- Added orphaned audit auto-detection
- Improved email reservation logic

### 2025-01-25
- Migrated from cron-job.org to Netlify Scheduled Functions
- Created `netlify/functions/process-queue.js`
- Updated all documentation

---

## Notes

- **SSOT Principle**: This document must be updated immediately after any change to scope, behavior, or structure
- **Never Assume State**: Always read this document before making decisions
- **All TODOs**: Must be tracked here, not in code comments
- **All Decisions**: Must be documented in Architecture Decisions section
- **All Issues**: Must be tracked in Unresolved Issues or Known Issues sections

---

**Last Updated**: 2025-01-29  
**Next Review**: After next end-to-end audit test across both pricing tiers

