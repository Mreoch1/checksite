# SiteCheck - Website Audit Tool

A production-ready, beginner-friendly website audit tool built for non-technical website and small business owners. Get clear, actionable insights about your website without the jargon.

## Features

- **Automated Website Analysis**: Checks performance, SEO, mobile optimization, accessibility, security, and more
- **AI-Powered Recommendations**: Uses DeepSeek LLM to recommend which checks you need
- **Plain Language Reports**: Reports written in simple, non-technical language
- **Stripe Integration**: Secure payment processing
- **Email Delivery**: Reports sent via Resend
- **Modular Architecture**: Easy to extend with new audit modules

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, React Server Components, Tailwind CSS
- **Backend**: Next.js API Routes, Netlify Functions
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe Checkout
- **Email**: Resend
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

# Resend
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com

# DeepSeek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=your_deepseek_api_key

# Site URL (for webhooks and links)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration file: `supabase/migrations/001_initial_schema.sql`

This will create the following tables:
- `customers` - Customer information
- `audits` - Audit records
- `audit_modules` - Individual module results

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

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Connect to Netlify**:
   - Push your code to GitHub/GitLab
   - Connect your repository to Netlify
   - Or use Netlify CLI: `netlify deploy --prod`

3. **Set environment variables**:
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add all environment variables from `.env.local`

4. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`

5. **Set up Stripe webhook**:
   - In Stripe Dashboard, add webhook endpoint: `https://yourdomain.netlify.app/api/webhooks/stripe`
   - Copy the webhook signing secret to Netlify environment variables

## Audit Modules

### Core Modules (Always Included)
- **Performance**: Page speed and performance metrics
- **Crawl Health**: Search engine crawlability (stubbed for v1)
- **On-Page SEO**: Titles, descriptions, headings, content quality
- **Mobile Optimization**: Mobile responsiveness and usability

### Optional Modules
- **Local SEO**: Business address, phone, Google Business Profile
- **Accessibility**: WCAG compliance, alt text, form labels
- **Security**: HTTPS, security headers
- **Schema Markup**: Structured data validation
- **Social Metadata**: Open Graph and Twitter Cards
- **Competitor Overview**: Competitive analysis (stubbed for v1)

## Module Implementation Status

### Fully Implemented
- Performance (basic checks)
- On-Page SEO
- Mobile Optimization
- Local SEO
- Accessibility
- Security
- Schema Markup
- Social Metadata

### Stubbed (TODO)
- Crawl Health - Requires full site crawler
- Competitor Overview - Requires competitor URL crawling

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
sitecheck/
├── app/
│   ├── api/
│   │   ├── recommend-modules/    # AI module recommendation
│   │   ├── create-checkout/      # Stripe checkout creation
│   │   └── webhooks/
│   │       └── stripe/           # Stripe webhook handler
│   ├── recommend/                # Module selection page
│   ├── success/                  # Payment success page
│   ├── report/[id]/             # Report viewing page
│   ├── layout.tsx
│   ├── page.tsx                  # Landing page
│   └── globals.css
├── lib/
│   ├── audit/
│   │   └── modules.ts            # Audit module implementations
│   ├── llm.ts                   # DeepSeek integration
│   ├── stripe.ts                # Stripe helpers
│   ├── resend.ts                # Email helpers
│   ├── supabase.ts              # Supabase client
│   └── types.ts                 # TypeScript types
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
└── package.json
```

## Pricing Configuration

Pricing is configured in `lib/types.ts`:

```typescript
export const PRICING_CONFIG: PricingConfig = {
  basePrice: 1999, // $19.99 in cents
  modules: {
    // Core modules: 0 (included)
    // Optional modules: additional cost in cents
  },
}
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
- Verify Resend API key
- Check `FROM_EMAIL` domain is verified in Resend
- Check spam folder for test emails

## Security Considerations

- All API keys stored in environment variables
- Stripe webhook signature verification
- URL validation on user input
- Rate limiting recommended for production (add via middleware)
- Consider adding authentication for report viewing

## Future Enhancements

- [ ] Real Lighthouse integration for performance metrics
- [ ] Full site crawler implementation
- [ ] Competitor analysis implementation
- [ ] PDF report generation
- [ ] User dashboard to view past audits
- [ ] Email authentication for report access
- [ ] Rate limiting middleware
- [ ] Analytics tracking
- [ ] A/B testing for pricing

## License

MIT

## Support

For issues or questions, please open an issue on GitHub or contact support.

