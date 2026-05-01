import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'SEO Audit Example for a Small Business'
const description =
  'See a practical SEO audit example for a small business, including top issues, prioritized fixes, and expected outcomes.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/seo-audit-example-for-small-business',
  },
  openGraph: {
    title,
    description,
    url: '/resources/seo-audit-example-for-small-business',
    type: 'article',
  },
}

export default function SeoAuditExampleForSmallBusinessPage() {
  const faqs = [
    {
      question: 'What should a small business SEO audit include?',
      answer:
        'It should include crawl access checks (sitemap, robots.txt), metadata quality (title tags, meta descriptions, headings), broken links, page speed basics, mobile usability, and security signals like HTTPS. These categories cover the most common issues that prevent small business websites from ranking well in local and organic search results.',
    },
    {
      question: 'How many issues should I fix first?',
      answer:
        'Start with the top 3 to 5 high-impact issues that affect crawlability, indexing, and page clarity. These typically resolve the biggest bottlenecks first. Once those are done, re-run the audit to see how the numbers shifted before moving on to the next batch.',
    },
    {
      question: 'How quickly can this improve site performance?',
      answer:
        'Technical and crawl improvements like fixing a blocked sitemap or broken robots.txt can show results within days. Ranking and traffic improvements from metadata and content fixes usually take 2 to 6 weeks to appear, depending on your competition and how often search engines recrawl your pages.',
    },
    {
      question: 'Is this example realistic for any small business?',
      answer:
        'Yes. The types of issues shown here — missing metadata, broken links, slow images, crawl errors — appear in the majority of small business audits regardless of industry. The specific numbers will differ, but the pattern of issues and fixes is very consistent.',
    },
    {
      question: 'Do I need an expensive tool to replicate this example?',
      answer:
        'No. SEO CheckSite costs $14.99 for a one-time report with no subscription. You can also use free tools like Google Search Console and PageSpeed Insights to check many of the same categories, though you will need to piece the results together yourself.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/seo-audit-example-for-small-business',
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
        name: 'SEO Audit Example for a Small Business',
        item: 'https://seochecksite.net/resources/seo-audit-example-for-small-business',
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
          Example scenario: a local service business with low organic traffic and unclear page metadata. This walkthrough
          shows what a practical audit looks like and how to execute the highest-value fixes first. The business in this
          example is "Oakland Plumbing" — a fictional family-owned plumbing company in Oakland, California with a 15-page
          website built on WordPress.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">About the example business</h2>
          <p className="text-gray-700 mb-4">
            Oakland Plumbing has been operating for eight years, has solid customer reviews, and gets most of its business
            from referrals. Their website was built three years ago by a local freelancer. They are getting about 150
            organic visits per month, mostly to their homepage, and they know they should be ranking for local search
            terms like "emergency plumber Oakland" and "water heater repair Oakland."
          </p>
          <p className="text-gray-700">
            The business owner, Sarah, runs the company and manages the website herself. She is comfortable editing pages
            in WordPress but does not write code. She ran an SEO CheckSite audit after a friend recommended it, paying
            the one-time $14.99 fee with no subscription required.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Initial findings — what the audit revealed</h2>
          <p className="text-gray-700 mb-4">
            The SEO CheckSite report identified 42 total issues across the site. Here are the most impactful findings
            broken down by category:
          </p>
          <h3 className="font-semibold text-gray-900 mb-2">Crawl and indexing issues</h3>
          <ul className="space-y-2 text-gray-700 list-disc pl-6 mb-4">
            <li><strong>No sitemap.xml found.</strong> WordPress can generate one with a plugin, but it was never set up.</li>
            <li><strong>Robots.txt blocked important CSS and JS files.</strong> This prevented Google from rendering the pages correctly for mobile-friendliness checks.</li>
            <li><strong>3 core pages returned 404 errors.</strong> The "Water Heater Repair" page, "Drain Cleaning" page, and "Contact Us" confirmation page had been deleted during a site update but still existed in the navigation menu.</li>
          </ul>
          <h3 className="font-semibold text-gray-900 mb-2">On-page SEO issues</h3>
          <ul className="space-y-2 text-gray-700 list-disc pl-6 mb-4">
            <li><strong>Missing or duplicated title tags on 8 of 15 pages.</strong> The homepage and three service pages all shared the generic title "Home | Oakland Plumbing."</li>
            <li><strong>No meta descriptions on 10 of 15 pages.</strong> Search results showed automatically pulled snippets that often cut off mid-sentence.</li>
            <li><strong>Missing H1 headings on 4 pages.</strong> The section pages for HVAC services and commercial plumbing had no heading structure at all.</li>
            <li><strong>11 images lacked alt text.</strong> Service photos, team photos, and the logo had empty alt attributes.</li>
          </ul>
          <h3 className="font-semibold text-gray-900 mb-2">Performance issues</h3>
          <ul className="space-y-2 text-gray-700 list-disc pl-6">
            <li><strong>Homepage loaded in 5.3 seconds on mobile.</strong> Google recommends under 2.5 seconds. The main culprit was a 2.8 MB hero image.</li>
            <li><strong>Largest Contentful Paint (LCP) was 4.8 seconds.</strong> Visitors saw a blank screen for nearly five seconds before any content appeared.</li>
            <li><strong>Two third-party scripts (a chat widget and an analytics tracker) were render-blocking.</strong> They delayed the page from becoming interactive.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Fix order used — what Sarah tackled first</h2>
          <p className="text-gray-700 mb-4">
            Sarah followed the report's priority ranking and spent two focused sessions (about 90 minutes total) on
            these fixes:
          </p>
          <ol className="space-y-3 text-gray-700 list-decimal pl-6">
            <li><strong>Publish sitemap and verify crawl access settings.</strong> She installed a simple WordPress SEO plugin that auto-generated a sitemap. Then she updated robots.txt to allow Googlebot access to CSS and JS files. She submitted the sitemap through Google Search Console — a step she had never done before. (20 minutes)</li>
            <li><strong>Rewrite titles and descriptions for core service pages.</strong> She created unique title tags for each service page using the format "Service + Location | Brand Name." For example, "Emergency Plumbing Oakland | Oakland Plumbing." She wrote 140-to-160-character meta descriptions for each page that included a service description and a call to action. (30 minutes)</li>
            <li><strong>Resolve broken links and retest internal navigation.</strong> She restored two of the three deleted pages from a backup. For the third page that no longer existed, she set up a 301 redirect to the nearest relevant service page. She then clicked through every link in her main navigation to confirm everything worked. (20 minutes)</li>
            <li><strong>Compress heavy images and recheck load performance.</strong> She ran the homepage hero image through a free compression tool, shrinking it from 2.8 MB to 420 KB with no visible quality loss. She enabled lazy loading on all gallery images. She deferred the chat widget script so it loaded after the main content. (20 minutes)</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Results after one month</h2>
          <div className="overflow-x-auto mb-4">
            <table className="w-full border border-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b border-gray-200">Metric</th>
                  <th className="text-left p-3 border-b border-gray-200">Before Fixes</th>
                  <th className="text-left p-3 border-b border-gray-200">After Fixes</th>
                  <th className="text-left p-3 border-b border-gray-200">Change</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-gray-200">Total SEO issues</td>
                  <td className="p-3 border-b border-gray-200">42</td>
                  <td className="p-3 border-b border-gray-200">14</td>
                  <td className="p-3 border-b border-gray-200 text-green-700">-67%</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Pages with unique title tags</td>
                  <td className="p-3 border-b border-gray-200">5 of 15</td>
                  <td className="p-3 border-b border-gray-200">14 of 15</td>
                  <td className="p-3 border-b border-gray-200 text-green-700">+180%</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Homepage mobile load time</td>
                  <td className="p-3 border-b border-gray-200">5.3s</td>
                  <td className="p-3 border-b border-gray-200">2.1s</td>
                  <td className="p-3 border-b border-gray-200 text-green-700">-60%</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Google Search Console impressions (28 days)</td>
                  <td className="p-3 border-b border-gray-200">1,150</td>
                  <td className="p-3 border-b border-gray-200">2,080</td>
                  <td className="p-3 border-b border-gray-200 text-green-700">+81%</td>
                </tr>
                <tr>
                  <td className="p-3">Organic clicks (28 days)</td>
                  <td className="p-3">42</td>
                  <td className="p-3">89</td>
                  <td className="p-3 text-green-700">+112%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-gray-700">
            The biggest surprise for Sarah was the impression growth. Within a month, Google showed her pages in search
            results nearly twice as often. She attributed this to the fixed crawl issues and unique metadata that helped
            Google understand what each page was about. Organic clicks more than doubled, translating to an estimated
            8 to 12 new service inquiries that month according to her call tracking.
          </p>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">See what a full sample report looks like</h2>
          <p className="text-gray-700 mb-4">
            Review a complete example report format to understand how findings and actions are presented. SEO CheckSite
            organizes every issue by severity, explains why it matters in plain English, and tells you exactly what to
            do next.
          </p>
          <Link href="/sample-report" className="text-blue-700 font-semibold hover:text-blue-800">
            View sample report →
          </Link>
        </section>

        <section>
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

        <ResourceLinksBlock excludeHref="/resources/seo-audit-example-for-small-business" />
      </article>
    </main>
  )
}
