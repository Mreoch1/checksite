import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'How to Fix Common SEO Issues (Step by Step)'
const description =
  'Fix common SEO issues quickly with plain-language instructions for metadata, broken links, sitemap, robots, and page speed basics.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/how-to-fix-common-seo-issues',
  },
  openGraph: {
    title,
    description,
    url: '/resources/how-to-fix-common-seo-issues',
    type: 'article',
  },
}

const fixes = [
  {
    issue: 'Missing or weak title tags',
    fix: 'Write one specific title per page, include the core topic, and keep it readable for humans. Aim for 50 to 60 characters so the full title displays in search results. Start with the primary keyword or service name, then add your brand at the end. For example, "Plumbing Repairs in Austin | Jones Plumbing" is better than "Home Services | Jones Plumbing" because it tells search engines and visitors exactly what the page is about.',
  },
  {
    issue: 'Missing meta descriptions',
    fix: 'Add a plain summary for each page with a clear value statement and call to action. Keep it between 140 and 160 characters. Do not stuff it with keywords — write for the person reading the search snippet. Include what the page offers and why someone should click. For example, "We handle burst pipe repairs in Austin within 2 hours. Same-day service, flat-rate pricing. Call now to book an appointment." tells searchers what to expect and prompts action.',
  },
  {
    issue: 'Broken links',
    fix: 'Replace or redirect dead links, then recheck key navigation and footer links. Use an audit tool or manual review to find pages returning 404 errors. If the linked content no longer exists, either restore it, redirect it to the closest relevant page using a 301 redirect, or update the link to point to a live resource. Broken links hurt user experience and tell search engines your site is not well maintained.',
  },
  {
    issue: 'No sitemap.xml',
    fix: 'Generate a sitemap from your CMS or framework and submit it in Google Search Console. Most modern platforms (WordPress, Shopify, Squarespace, Next.js) can generate a sitemap automatically. The sitemap tells search engines which pages exist and when they were last updated. Without one, Google may still find your pages, but it will take longer and some pages may be missed entirely.',
  },
  {
    issue: 'Robots.txt blocks important pages',
    fix: 'Review disallow rules and remove blocks for pages you want indexed. Common mistakes include blocking CSS and JavaScript files (which search engines need to render your page correctly) or accidentally blocking your entire site with "Disallow: /". Test your robots.txt in the Robots Testing Tool within Google Search Console before publishing changes.',
  },
  {
    issue: 'Slow pages from large assets',
    fix: 'Compress large images, lazy-load non-critical media, and reduce heavy scripts. Start with images — they are usually the biggest contributor to slow load times. Use a tool like TinyPNG or Squoosh to compress JPEG and PNG files. For images below the fold, add lazy loading so they only load when the user scrolls to them. Next, review third-party scripts (analytics, chat widgets, tracking pixels) and remove any that are not essential.',
  },
  {
    issue: 'Duplicate content across pages',
    fix: 'Use canonical tags to tell search engines which version of a page is the primary one. If two pages share very similar content (like a product page accessible from multiple URLs), add a rel="canonical" link tag pointing to the preferred URL. This prevents search engines from splitting ranking signals across duplicate pages.',
  },
  {
    issue: 'Missing heading structure (H1, H2, H3)',
    fix: 'Ensure each page has exactly one H1 that matches the page topic. Use H2 tags for major sections and H3 tags for subsections. This helps search engines understand the hierarchy of your content and makes pages easier for visitors to scan. Avoid skipping heading levels (going from H1 to H3) as it creates confusion.',
  },
  {
    issue: 'Thin or low-value content',
    fix: 'Expand pages that have very little text. Aim for at least 300 words on most pages and at least 800 to 1,000 words on primary service or blog pages. Add useful information that answers common customer questions. Thin content is harder for search engines to evaluate and often ranks lower than more comprehensive alternatives.',
  },
  {
    issue: 'Missing alt text on images',
    fix: 'Add descriptive alt text to every image, especially those that convey meaning or context. Alt text helps search engines understand what an image shows and is essential for accessibility. Keep it concise — describe what is in the image and why it matters. "Team installing a water heater with safety gear" is helpful. "image.jpg" or "IMG_20240301" is not.',
  },
]

export default function CommonSeoFixesPage() {
  const faqs = [
    {
      question: 'Which SEO issues should I fix first?',
      answer:
        'Start with crawl and indexing blockers, then fix title and metadata clarity, and then improve speed and UX. Crawl blockers stop search engines from finding your content at all — fixing those first means your other improvements will actually get discovered. Metadata fixes are next because they directly affect how your pages appear in search results. Speed and UX improvements come third because they amplify the impact of good content but are less critical than being findable in the first place.',
    },
    {
      question: 'Can I fix common SEO issues without a developer?',
      answer:
        'Many metadata and content issues can be fixed in your CMS. Most modern website builders let you edit title tags, meta descriptions, headings, and image alt text through the page editor. Sitemaps are often generated automatically. More technical fixes like 301 redirects, robots.txt edits, and server-level caching may require a developer or at least access to your hosting control panel.',
    },
    {
      question: 'How quickly can SEO fixes show results?',
      answer:
        'You can often see crawl and indexing improvements within days to a week, especially if you submit a new sitemap through Google Search Console. Ranking improvements usually take 2 to 6 weeks depending on competition and how frequently Google recrawls your site. Speed improvements show up in your analytics immediately for returning visitors but may take weeks to influence search rankings.',
    },
    {
      question: 'How many issues should I fix at one time?',
      answer:
        'Focus on 3 to 5 high-priority issues per cycle. Fixing too many things at once makes it hard to tell which change made a difference. Work in focused batches: fix a group, re-check, then move to the next group.',
    },
    {
      question: 'Do I need to fix every issue an audit finds?',
      answer:
        'No. Not every issue needs immediate attention. Focus on the high and medium severity items that affect crawlability, indexing, and user experience. Low-severity issues like minor formatting suggestions can wait until your next maintenance cycle.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/how-to-fix-common-seo-issues',
    author: { '@type': 'Organization', name: 'SEO CheckSite' },
    publisher: { '@type': 'Organization', name: 'SEO CheckSite' },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://seochecksite.net/' },
      { '@type': 'ListItem', position: 2, name: 'Resources', item: 'https://seochecksite.net/resources' },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'How to Fix Common SEO Issues',
        item: 'https://seochecksite.net/resources/how-to-fix-common-seo-issues',
      },
    ],
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }

  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <article className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-lg text-gray-700 mb-8">
          Most websites do not need advanced SEO tactics first. Start by fixing common structural and on-page issues
          that prevent search engines from understanding or trusting your site. These are the same issues that SEO
          CheckSite finds in over 80% of small business audits — and they are all fixable without deep technical knowledge
          or expensive consultants.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Fast fixes that improve results early</h2>
          <p className="text-gray-700 mb-4">
            Each of the issues listed below appears frequently on small business websites. The fix instructions assume
            you have basic access to your website backend or CMS. If you run into something outside your comfort zone,
            these descriptions will at least help you explain the problem clearly to a developer.
          </p>
          <div className="space-y-4">
            {fixes.map((item) => (
              <div key={item.issue} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{item.issue}</h3>
                <p className="text-gray-700">{item.fix}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Execution order — which fixes to tackle first</h2>
          <p className="text-gray-700 mb-4">
            Not all fixes have equal impact. Follow this priority order to get the fastest results from your effort:
          </p>
          <ol className="space-y-3 text-gray-700 list-decimal pl-6">
            <li><strong>Fix crawl blockers first (sitemap and robots.txt).</strong> If search engines cannot reach your site, nothing else matters. Verify your sitemap is valid and submitted to Google Search Console. Check robots.txt for any accidental blocks on important pages.</li>
            <li><strong>Fix page clarity next (titles, descriptions, heading structure).</strong> Once search engines can crawl your site, they need to understand what each page is about. Unique, descriptive title tags and proper heading structure make that job easy.</li>
            <li><strong>Fix trust and quality signals after that (broken links, mobile, speed basics).</strong> Broken links damage credibility. Slow load times drive visitors away. Mobile usability issues block a growing share of your traffic. These fixes compound the value of good content.</li>
            <li><strong>Address content quality and duplication issues.</strong> Thin pages, duplicate content, and missing alt text are lower priority but still matter, especially for competitive search terms. Fix these when you have time between more urgent audit cycles.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Real-world example: one hour of fixes</h2>
          <p className="text-gray-700 mb-4">
            A local HVAC company used an SEO CheckSite audit that identified 34 issues. In one focused hour, they completed
            these fixes:
          </p>
          <ul className="space-y-2 text-gray-700 list-disc pl-6">
            <li>Added unique title tags to 6 service pages (15 minutes).</li>
            <li>Wrote meta descriptions for their top 5 pages by traffic (15 minutes).</li>
            <li>Fixed 4 broken internal links from their services menu (10 minutes).</li>
            <li>Added alt text to 8 product images on their shop page (10 minutes).</li>
            <li>Submitted their sitemap to Google Search Console (5 minutes).</li>
            <li>Enabled lazy loading for large gallery images (5 minutes via a plugin toggle).</li>
          </ul>
          <p className="text-gray-700 mt-2">
            The result: their total issue count dropped from 34 to 13 in a single session. Within three weeks, they saw
            a 40% increase in Google Search Console impressions on their service pages. No developer was needed — every
            fix was done through their CMS and hosting control panel.
          </p>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Get these fixes prioritized automatically</h2>
          <p className="text-gray-700 mb-4">
            SEO CheckSite ranks these issues for your specific site and explains exactly what to tackle first. For
            a one-time fee of $14.99 (no subscription, no recurring charges), you get a prioritized action plan
            written in plain English so you can start fixing what matters most.
          </p>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Run a free first audit →
          </Link>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">{faq.question}</summary>
                <p className="text-gray-700 mt-2">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <ResourceLinksBlock excludeHref="/resources/how-to-fix-common-seo-issues" />
      </article>
    </main>
  )
}
