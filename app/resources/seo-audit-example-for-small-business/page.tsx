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
        'It should include crawl access checks, metadata quality, broken links, page speed basics, mobile usability, and security signals.',
    },
    {
      question: 'How many issues should I fix first?',
      answer:
        'Start with the top 3 to 5 high-impact issues that affect crawlability, indexing, and page clarity.',
    },
    {
      question: 'How quickly can this improve site performance?',
      answer:
        'Technical and crawl improvements can appear quickly, while ranking and traffic improvements usually take longer.',
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
          shows what a practical audit looks like and how to execute the highest-value fixes first.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Initial findings</h2>
          <ul className="space-y-2 text-gray-700 list-disc pl-6">
            <li>Missing or duplicated title tags on core pages.</li>
            <li>No sitemap.xml and unclear robots.txt directives.</li>
            <li>Multiple broken internal links in footer and service pages.</li>
            <li>Large unoptimized images slowing key landing pages.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Fix order used</h2>
          <ol className="space-y-2 text-gray-700 list-decimal pl-6">
            <li>Publish sitemap and verify crawl access settings.</li>
            <li>Rewrite titles and descriptions for core service pages.</li>
            <li>Resolve broken links and retest internal navigation.</li>
            <li>Compress heavy images and recheck load performance.</li>
          </ol>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">See a full sample report</h2>
          <p className="text-gray-700 mb-4">
            Review a complete example report format to understand how findings and actions are presented.
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

