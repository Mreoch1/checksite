# SEO CheckSite - Website Audit Tool

A production-ready, beginner-friendly website audit tool built for non-technical website and small business owners. Get clear, actionable insights about your website without the jargon.

**Copyright © 2025 SEO CheckSite. All rights reserved.**

## Features

- **Automated Website Analysis**: Checks performance, SEO, mobile optimization, accessibility, security, and more
- **Evidence-Based Reports**: Shows actual values found (title tags, meta descriptions, robots.txt content, etc.) with data tables
- **AI-Powered Recommendations**: Uses DeepSeek LLM to recommend which checks you need
- **Plain Language Reports**: Reports written in simple, non-technical language with actionable insights
- **Stripe Integration**: Secure payment processing
- **Email Delivery**: Reports sent via SendGrid
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
- Resend account
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

# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourdomain.com

# DeepSeek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=your_deepseek_api_key

# Search API (Optional - for competitor identification)
# At least one is recommended for accurate competitor identification
# SerpAPI (recommended): https://serpapi.com/
SERPAPI_API_KEY=your_serpapi_key_here

# OR Bing Web Search API: https://www.microsoft.com/en-us/bing/apis/bing-web-search-api
BING_SEARCH_API_KEY=your_bing_search_api_key_here
BING_SEARCH_ENDPOINT=https://api.bing.microsoft.com/v7.0/search

# Site URL (for webhooks and links)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
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
- **Local SEO**: Address/phone detection, LocalBusiness schema validation, Google Maps integration
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
│   ├── email-unified.ts         # Unified email sending (Resend + Zoho SMTP)
│   ├── generate-simple-report.ts # Report generation (non-LLM)
│   ├── llm.ts                   # DeepSeek integration
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
  basePrice: 1999, // $19.99 in cents
  modules: {
    // Core modules: 0 (included in base price)
    performance: 0,
    crawl_health: 0,
    on_page: 0,
    mobile: 0,
    // High value modules ($10)
    local: 1000,
    schema: 1000,
    competitor_overview: 1000,
    // Medium value modules ($7)
    accessibility: 700,
    social: 700,
    // Lower value modules ($5)
    security: 500,
  },
}
```

**Pricing Philosophy:**
- Pricing is based on **perceived value to customers**, not development effort
- High value modules ($10): Directly relate to business success, ranking, and competition
- Medium value modules ($7): Users understand them once explained but feel secondary
- Lower value modules ($5): Less understood by non-technical users

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

### Queue Processing Issues
- Verify `QUEUE_SECRET` is set in environment variables
- Check cron job is configured and running (see `QUEUE_SETUP.md`)
- Verify `/api/process-queue` endpoint is accessible
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

### Queue System
- Implemented Supabase-based queue system to handle long-running audits
- Prevents Netlify function timeouts (10-second limit)
- Auto-detects and fixes stuck audits with reports but wrong status
- Timeout protection (8-minute max) with proper error handling

### Email System
- Unified email system with Resend (primary) and Zoho SMTP (fallback)
- Atomic email deduplication to prevent duplicate emails
- Email errors don't prevent audit completion
- Reports saved before email sending to ensure URL works

### Report Generation
- Non-LLM report generation for faster processing
- Evidence tables in every module showing actual values found
- Module descriptions for context
- Score badges and priority actions
- Executive summary with health assessment

### Admin Tools
- Comprehensive admin endpoints for diagnostics
- Auto-fix for stuck audits
- Queue status monitoring
- Audit retry functionality

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

For issues or questions, please contact support at contact@seoauditpro.net.

