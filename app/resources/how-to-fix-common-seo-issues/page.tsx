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
    fix: 'Write one specific title per page, include the core topic, and keep it readable for humans.',
  },
  {
    issue: 'Missing meta descriptions',
    fix: 'Add a plain summary for each page with a clear value statement and call to action.',
  },
  {
    issue: 'Broken links',
    fix: 'Replace or redirect dead links, then recheck key navigation and footer links.',
  },
  {
    issue: 'No sitemap.xml',
    fix: 'Generate a sitemap from your CMS or framework and submit it in Google Search Console.',
  },
  {
    issue: 'Robots.txt blocks important pages',
    fix: 'Review disallow rules and remove blocks for pages you want indexed.',
  },
  {
    issue: 'Slow pages from large assets',
    fix: 'Compress large images, lazy-load non-critical media, and reduce heavy scripts.',
  },
]

export default function CommonSeoFixesPage() {
  const faqs = [
    {
      question: 'Which SEO issues should I fix first?',
      answer:
        'Start with crawl and indexing blockers, then fix title and metadata clarity, and then improve speed and UX.',
    },
    {
      question: 'Can I fix common SEO issues without a developer?',
      answer:
        'Many metadata and content issues can be fixed in your CMS. More technical fixes may require a developer.',
    },
    {
      question: 'How quickly can SEO fixes show results?',
      answer:
        'You can often see crawl and indexing improvements quickly, while ranking impact usually takes longer and depends on competition.',
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
          that prevent search engines from understanding or trusting your site.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Fast fixes that improve results early</h2>
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Execution order</h2>
          <ol className="space-y-2 text-gray-700 list-decimal pl-6">
            <li>Fix crawl blockers first (sitemap and robots.txt).</li>
            <li>Fix page clarity next (titles, descriptions, heading structure).</li>
            <li>Fix trust and quality signals after that (broken links, mobile, speed basics).</li>
          </ol>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Get these fixes prioritized automatically</h2>
          <p className="text-gray-700 mb-4">
            SEO CheckSite ranks these issues for your specific site and explains exactly what to tackle first.
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

