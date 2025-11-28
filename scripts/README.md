# Scripts Directory

Helper scripts for development, testing, and debugging.

## Testing Scripts

- **`test-audit-end-to-end.js`** - Full end-to-end audit test (creates audit, processes queue, monitors progress)
  - Usage: `node scripts/test-audit-end-to-end.js <url> <competitor> <email>`
  - Example: `node scripts/test-audit-end-to-end.js https://example.com https://competitor.com user@example.com`

- **`test-audit-direct.js`** - Direct audit creation and processing test
- **`test-full-audit-flow.js`** - Complete audit flow testing
- **`test-full-audit-with-competitor.js`** - Audit testing with competitor comparison
- **`test-own-site-audit.js`** - Test audit on the SEO CheckSite itself

## Debugging Scripts

- **`check-audit-status.js`** - Check status of an audit by ID
- **`check-audit.js`** - Quick audit status check
- **`check-specific-audit.js`** - Detailed audit information
- **`check-duplicate-audits.js`** - Find duplicate audits by URL and customer
- **`check-queue.js`** - Check queue processing status
- **`debug-queue.js`** - Debug queue issues

## Email Scripts

- **`send-audit-email.js`** - Manually send audit report email
- **`resend-email.js`** - Resend email for a specific audit

## Direct Processing Scripts

- **`process-audit-direct.js`** - Process an audit directly (bypasses queue)
- **`create-audit-direct.ts`** - Create audit directly in database

## Usage

All scripts require environment variables from `.env.local`. Load them before running:

```bash
export $(cat .env.local | grep -v '^#' | xargs)
node scripts/script-name.js [arguments]
```

Or use the test scripts with proper authentication:

```bash
node scripts/test-audit-end-to-end.js https://example.com https://competitor.com email@example.com
```

## Requirements

- Node.js 18+
- Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `ADMIN_SECRET` (for admin operations)
  - `QUEUE_SECRET` (for queue operations)

