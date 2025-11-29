# SEO CheckSite - Website Audit Tool

A production-ready, beginner-friendly website audit tool built for non-technical website and small business owners. Get clear, actionable insights about your website without the jargon.

**Copyright © 2025 SEO CheckSite. All rights reserved.**

> **📋 Single Source of Truth**: For project state, TODOs, decisions, and issues, see [`PROJECT.md`](./PROJECT.md)

## Features

- **Automated Website Analysis**: Checks performance, SEO, mobile optimization, accessibility, security, and more
- **Evidence-Based Reports**: Shows actual values found (title tags, meta descriptions, robots.txt content, etc.) with data tables
- **AI-Powered Recommendations**: Uses DeepSeek LLM to recommend which checks you need
- **Plain Language Reports**: Reports written in simple, non-technical language with actionable insights
- **URL Normalization**: Automatically normalizes URLs (adds https://, lowercases domain) to prevent DNS resolution issues
- **Stripe Integration**: Secure payment processing
- **Email Delivery**: Reports sent via SendGrid (with Zoho SMTP fallback)
- **Atomic Email Deduplication**: Prevents duplicate emails using timestamp-based reservation system
- **Queue System**: Asynchronous processing to handle long-running audits without timeouts
- **Admin Tools**: Comprehensive diagnostic and management endpoints
- **Modular Architecture**: Easy to extend with new audit modules

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, React Server Components, Tailwind CSS
- **Backend**: Next.js API Routes, Netlify Functions
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe Checkout
- **Email**: SendGrid (with Zoho SMTP fallback)
- **LLM**: DeepSeek API (OpenAI-compatible)

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Stripe account
- SendGrid account (or Zoho SMTP for fallback)
- DeepSeek API key

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email (SendGrid primary, Zoho SMTP fallback)
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=SEO CheckSite
EMAIL_PROVIDER=sendgrid  # Options: sendgrid, zoho
EMAIL_USE_FALLBACK=true  # Automatically fallback to Zoho if SendGrid fails

# Zoho SMTP (fallback email provider)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=your_zoho_email@yourdomain.com
SMTP_PASSWORD=your_zoho_app_password

# DeepSeek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=your_deepseek_api_key

# Site URL (for webhooks and links)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Security (for admin endpoints and queue processing)
ADMIN_SECRET=your_admin_secret_key
QUEUE_SECRET=your_queue_secret_key
```

## Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql` - Creates base tables
   - `supabase/migrations/002_add_error_log.sql` - Adds error logging
   - `supabase/migrations/003_create_audit_queue.sql` - Creates queue system
   - `supabase/migrations/004_add_email_sent_at.sql` - Adds email tracking

This will create the following tables:
- `customers` - Customer information
- `audits` - Audit records with report storage
- `audit_modules` - Individual module results
- `audit_queue` - Queue for processing audits (prevents Netlify timeouts)

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.example` to `.env.local` and fill in your values

3. **Run database migrations**:
   Execute the SQL in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Stripe Webhook Configuration

For local development, use Stripe CLI to forward webhooks:

1. **Install Stripe CLI**: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Copy the webhook signing secret** and add it to your `.env.local` as `STRIPE_WEBHOOK_SECRET`

For production, configure webhooks in Stripe Dashboard:
- Webhook URL: `https://yourdomain.com/api/webhooks/stripe`
- Events to listen for: `checkout.session.completed`

## Deployment to Netlify

See `NETLIFY_DEPLOY.md` for detailed deployment instructions.

Quick steps:
1. **Push to GitHub**: Your code should be in a GitHub repository
2. **Connect to Netlify**: 
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
3. **Set environment variables**: Use `scripts/set-netlify-env-secure.sh` or set manually in Netlify Dashboard
4. **Configure Stripe webhook**: 
   - In Stripe Dashboard, add webhook endpoint: `https://yourdomain.netlify.app/api/webhooks/stripe`
   - Copy the webhook signing secret to Netlify environment variables

## Audit Modules

### Core Modules (Always Included)
- **Performance**: Page speed and performance metrics (basic checks; Lighthouse integration available)
- **Crawl Health**: Search engine crawlability - checks sitemap.xml, robots.txt content, internal links
- **On-Page SEO**: Titles, descriptions, headings, content quality - shows actual values found
- **Mobile Optimization**: Mobile responsiveness and usability checks

### Optional Modules
- **Local SEO**: Business address, phone, Google Business Profile
- **Accessibility**: WCAG compliance, alt text, form labels
- **Security**: HTTPS, security headers
- **Schema Markup**: Structured data validation
- **Social Metadata**: Open Graph and Twitter Cards
- **Competitor Overview**: Competitive analysis (stubbed for v1)

## Module Implementation Status

### Fully Implemented
- **Performance**: Basic checks (HTTPS, image optimization, script blocking detection)
- **On-Page SEO**: Complete with evidence collection (title, meta description, H1/H2/H3 counts, word count, alt text)
- **Mobile Optimization**: Viewport checks, responsive design validation, touch target sizes
- **Crawl Health**: Sitemap.xml detection, robots.txt content analysis, internal link counting
- **Local SEO**: Enhanced address/phone detection (handles split addresses, HTML blocks, CMS structures), LocalBusiness schema validation, Google Maps integration
- **Accessibility**: Alt text, form labels, heading hierarchy, color contrast checks
- **Security**: HTTPS validation, mixed content detection
- **Schema Markup**: JSON-LD detection and validation, Organization/LocalBusiness schema checks
- **Social Metadata**: Open Graph and Twitter Card validation

### Partially Implemented
- **Competitor Overview**: Basic content analysis (full competitor crawling not yet implemented)

## Adding Real Crawlers and Lighthouse

### Lighthouse Integration

To add real Lighthouse performance metrics, update `lib/audit/modules.ts`:

```typescript
// In runPerformanceModule function
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

// Replace placeholder logic with:
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
const options = { logLevel: 'info', output: 'json', port: chrome.port }
const runnerResult = await lighthouse(siteData.url, options)
await chrome.kill()

const lhr = runnerResult.lhr
const performanceScore = Math.round(lhr.categories.performance.score * 100)
```

### Full Site Crawler

To add real crawling for Crawl Health module:

1. Create `lib/audit/crawler.ts`:
```typescript
export async function crawlSite(url: string, maxPages: number = 100) {
  // Use Puppeteer or similar to crawl site
  // Extract all internal links
  // Check for sitemap.xml
  // Verify robots.txt
  // Return crawl results
}
```

2. Update `runCrawlHealthModule` in `lib/audit/modules.ts` to use the crawler

## Project Structure

```
seo-checksite/
├── app/
│   ├── api/
│   │   ├── admin/               # Admin endpoints (diagnostics, fixes)
│   │   ├── recommend-modules/   # AI module recommendation
│   │   ├── create-checkout/     # Stripe checkout creation
│   │   ├── process-queue/        # Queue processor (called by cron)
│   │   ├── test-audit/          # Test endpoint for direct audit creation
│   │   └── webhooks/
│   │       └── stripe/           # Stripe webhook handler
│   ├── recommend/               # Module selection page
│   ├── success/                 # Payment success page
│   ├── report/[id]/             # Report viewing page
│   ├── layout.tsx
│   ├── page.tsx                 # Landing page
│   └── globals.css
├── lib/
│   ├── audit/
│   │   └── modules.ts           # Audit module implementations
│   ├── email-unified.ts         # Unified email sending (SendGrid + Zoho SMTP)
│   ├── email-status.ts          # Email status helpers (reservation, sent, abandoned)
│   ├── generate-simple-report.ts # Report generation (non-LLM)
│   ├── llm.ts                   # DeepSeek integration
│   ├── normalize-url.ts         # URL normalization utility
│   ├── process-audit.ts         # Main audit processing logic
│   ├── stripe.ts                # Stripe helpers
│   ├── supabase.ts              # Supabase client
│   └── types.ts                 # TypeScript types
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_add_error_log.sql
│       ├── 003_create_audit_queue.sql
│       └── 004_add_email_sent_at.sql
└── package.json
```

## Pricing Configuration

Pricing is configured in `lib/types.ts`:

```typescript
export const PRICING_CONFIG: PricingConfig = {
  basePrice: 2499, // $24.99 - "Website Audit" package
  modules: {
    // Base package modules (included in $24.99)
    performance: 0,
    crawl_health: 0,
    on_page: 0,
    mobile: 0,
    accessibility: 0,
    security: 0,
    schema: 0,
    social: 0,
    // Add-ons ($10 each)
    local: 1000, // +$10.00 - Local SEO
    competitor_overview: 1000, // +$10.00 - Competitor Overview (only charged when competitor URL provided)
  },
}
```

**Pricing Model:**
- **Base Package ($24.99)**: "Website Audit" - Always includes Performance, Crawl Health, On-Page SEO, Mobile Optimization, Accessibility, Security, Schema Markup, and Social Metadata
- **Add-ons**:
  - Local SEO: +$10.00
  - Competitor Overview: +$10.00 (only charged when a competitor URL is provided)

**Total Calculation:**
```
total = 24.99 + (localSeo ? 10 : 0) + (competitorProvided ? 10 : 0)
```

To adjust pricing, modify the `PRICING_CONFIG` object.

## Troubleshooting

### DeepSeek API Errors
- Verify `DEEPSEEK_API_KEY` is set correctly
- Check API rate limits
- Ensure `DEEPSEEK_BASE_URL` is correct

### Stripe Webhook Issues
- Verify webhook secret matches Stripe dashboard
- Check webhook endpoint URL is correct
- Ensure webhook events are configured correctly

### Database Connection Issues
- Verify Supabase URL and keys
- Check database migrations have been run
- Ensure RLS policies allow necessary operations

### Email Delivery Issues
- Verify SendGrid API key (primary) or Zoho SMTP credentials (fallback)
- Check `FROM_EMAIL` domain is authenticated in SendGrid (add DNS records)
- Check spam folder for test emails
- System automatically falls back to Zoho SMTP if SendGrid fails
- Ensure SendGrid domain authentication DNS records are added to your DNS provider
- Check `EMAIL_PROVIDER` and `EMAIL_USE_FALLBACK` environment variables
- Verify `FROM_NAME` is set for email sender name
- If receiving duplicate emails, check for stale reservations using admin endpoints
- Email reservation system prevents duplicates: check `email_sent_at` timestamp in database

### Queue Processing Issues
- Verify `QUEUE_SECRET` is set in environment variables
- Check Netlify cron job is configured and running (see `QUEUE_SETUP.md`)
- Verify `/api/process-queue` endpoint is accessible
- Check Netlify dashboard → Functions → Scheduled functions for cron job status
- Check for stuck audits using admin endpoints
- Queue processor auto-fixes audits with reports but wrong status

## Security Considerations

- All API keys stored in environment variables
- Stripe webhook signature verification
- URL validation on user input
- Rate limiting recommended for production (add via middleware)
- Consider adding authentication for report viewing

## Report Features

### Evidence Collection
All audit modules now collect and display evidence:
- **On-Page SEO**: Shows actual title tag text, meta description, H1 heading, heading counts, word count
- **Crawl Health**: Displays actual robots.txt content when issues are found
- **Issues**: Each issue includes evidence showing what was found vs. what should be there
- **Data Tables**: Evidence is displayed in easy-to-read tables in the HTML report

### Report Structure
- Executive Summary with overall health assessment
- Top Priority Actions (5 most important fixes)
- Module-by-Module breakdown with:
  - Evidence tables showing actual values found
  - Issue details with severity levels
  - Plain language explanations
  - Step-by-step fix instructions

## Recent Updates

### Local SEO Address Detection Improvements
- **Enhanced Address Detection**: Improved Local SEO module to reliably detect business addresses
  - Normalizes whitespace (handles `<br>` tags and newlines)
  - Searches multiple content areas: footer, contact sections, HTML content blocks, and raw HTML
  - Handles addresses split across lines (e.g., "950 N. River Street<br>Ypsilanti, MI 48198")
  - Supports directional abbreviations with periods (e.g., "N." or "N")
  - Combines street and city/state when found separately
  - Works with Squarespace and other CMS platforms that use HTML content blocks
  - Final fallback searches raw HTML for JavaScript-rendered or complex structures

### URL Normalization
- **Automatic URL Normalization**: All URLs are normalized before processing
  - Adds `https://` if no protocol is provided
  - Lowercases domain name (preserves path/query/fragment case)
  - Prevents DNS resolution issues from inconsistent casing
  - Applied at checkout creation, module recommendation, and audit processing

### Queue System
- Implemented Supabase-based queue system to handle long-running audits
- Prevents Netlify function timeouts (10-second limit)
- Auto-detects and fixes stuck audits with reports but wrong status
- Timeout protection (8-minute max) with proper error handling
- 5-minute delay before processing to ensure payment webhook completes
- Queue processor requires `QUEUE_SECRET` for security

### Email System
- Unified email system with SendGrid (primary) and Zoho SMTP (fallback)
- **Atomic Email Reservation**: Timestamp-based reservation system prevents duplicate emails
  - Uses `UPDATE ... WHERE email_sent_at IS NULL` for atomic reservation
  - Only one process can reserve email sending at a time
- **Stale Reservation Handling**: Automatically detects and clears:
  - **Abandoned reservations** (>30 minutes old): Hard timeout, force clear
  - **Stale reservations** (5-30 minutes old): Likely failed, clear and retry
- **Email Status Management**: Tracks email state using `email_sent_at` timestamp:
  - `null`: Email not sent (pending)
  - Recent timestamp (<5 min): Reservation (actively sending)
  - Old timestamp (>5 min): Email sent successfully
- Email errors don't prevent audit completion
- Reports saved before email sending to ensure URL works
- Comprehensive logging with reservation attempt IDs for debugging

### Report Generation
- Non-LLM report generation for faster processing
- Evidence tables in every module showing actual values found
- Module descriptions for context
- Score badges and priority actions
- Executive summary with health assessment

### Admin Tools
Comprehensive admin endpoints (all require `ADMIN_SECRET` header):
- **`/api/admin/check-audit-by-id`**: Get detailed audit status, queue entry, modules, and analysis (GET) or fix status/add to queue (POST)
- **`/api/admin/retry-audit`**: Retry a failed audit with URL normalization
- **`/api/admin/check-duplicates`**: Find duplicate audits by URL and customer
- **`/api/admin/check-queue-status`**: Monitor queue processing status
- **`/api/admin/check-audit`**: Quick audit status check
- **`/api/admin/check-audits`**: Batch audit status check
- **`/api/admin/fix-stuck-audit`**: Fix a single stuck audit
- **`/api/admin/fix-stuck-audits`**: Fix multiple stuck audits
- **`/api/admin/cleanup-queue`**: Clean up completed queue entries
- **`/api/admin/clear-stuck-queue`**: Clear stuck queue entries
- **`/api/admin/complete-audit`**: Manually complete an audit
- **`/api/admin/reset-audit`**: Reset an audit to pending
- **`/api/admin/send-report-email`**: Manually send report email
- **`/api/admin/test-audit-step`**: Test individual audit processing steps
- **`/api/admin/diagnose-audit`**: Comprehensive audit diagnosis
- **`/api/admin/check-timezone`**: Check timezone configuration
- **`/api/admin/check-id`**: Validate audit ID format

All admin endpoints require `Authorization: Bearer YOUR_ADMIN_SECRET` header.

## Recent Fixes

- **Local SEO Address Detection**: Fixed issue where addresses in footers (especially with `<br>` tags) were not being detected. Now searches multiple content areas and raw HTML for reliable detection.
- **Sitemap Generation**: Implemented Next.js built-in sitemap feature (`app/sitemap.ts`) for reliable sitemap.xml generation at root path.
- **Email Click Tracking**: Disabled SendGrid click tracking for report links to prevent SSL certificate errors.

## Future Enhancements

- [ ] Real Lighthouse integration for Core Web Vitals (LCP, CLS, FID)
- [ ] Full site crawler for multi-page analysis
- [ ] Performance metrics dashboard (actual load times, bundle sizes)
- [ ] PDF report generation
- [ ] User dashboard to view past audits
- [ ] Email authentication for report access
- [ ] Analytics tracking
- [ ] A/B testing for pricing

## Copyright

Copyright © 2025 SEO CheckSite. All rights reserved.

This software and associated documentation files (the "Software") are proprietary and confidential. Unauthorized copying, modification, distribution, or use of this Software, via any medium, is strictly prohibited without the express written permission of SEO CheckSite.

## Support

For issues or questions, please contact support at contact@seochecksite.net.

