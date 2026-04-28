import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'Before and After SEO Audit Checklist'
const description =
  'Use this before-and-after SEO audit checklist to track baseline issues, completed fixes, and measurable progress.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/before-and-after-seo-audit-checklist',
  },
  openGraph: {
    title,
    description,
    url: '/resources/before-and-after-seo-audit-checklist',
    type: 'article',
  },
}

export default function BeforeAfterChecklistPage() {
  const faqs = [
    {
      question: 'What is a before-and-after SEO checklist?',
      answer:
        'It is a simple way to compare your site state before fixes and after fixes so you can see real progress.',
    },
    {
      question: 'Which metrics should I track first?',
      answer:
        'Track issue count, crawl blockers, broken links, metadata completion, and load performance trends.',
    },
    {
      question: 'How often should I update this checklist?',
      answer:
        'Update it after every audit cycle, usually monthly or after major site changes.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/before-and-after-seo-audit-checklist',
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
        name: 'Before and After SEO Audit Checklist',
        item: 'https://seochecksite.net/resources/before-and-after-seo-audit-checklist',
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
          This template helps you track what changed after each audit cycle. Use it to keep SEO work measurable and focused
          on outcomes, not random tasks.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Before checklist</h2>
          <ul className="space-y-2 text-gray-700 list-disc pl-6">
            <li>Record baseline issue count and top severity categories.</li>
            <li>Capture crawl access status, sitemap, and robots configuration.</li>
            <li>Note missing metadata and broken internal links.</li>
            <li>Capture performance snapshots for core landing pages.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">After checklist</h2>
          <ul className="space-y-2 text-gray-700 list-disc pl-6">
            <li>Re-run the audit and compare issue count reduction.</li>
            <li>Confirm crawl blockers are resolved and key pages are indexable.</li>
            <li>Verify metadata updates on all priority pages.</li>
            <li>Measure page speed improvements and document remaining bottlenecks.</li>
          </ul>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Need a repeatable baseline report?</h2>
          <p className="text-gray-700 mb-4">
            Use SEO CheckSite to generate consistent audit snapshots and track improvements over each cycle.
          </p>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Run your next audit →
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

        <ResourceLinksBlock excludeHref="/resources/before-and-after-seo-audit-checklist" />
      </article>
    </main>
  )
}

