import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'Website SEO Audit Checklist for Beginners'
const description =
  'A beginner-friendly SEO audit checklist you can run step by step, even if you are not technical.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/website-seo-audit-checklist-for-beginners',
  },
  openGraph: {
    title,
    description,
    url: '/resources/website-seo-audit-checklist-for-beginners',
    type: 'article',
  },
}

const checklistItems = [
  'Confirm your homepage title and meta description are unique and clear.',
  'Check that each important page has one clear H1 heading.',
  'Find and fix broken internal links and obvious 404 pages.',
  'Make sure your site has a valid sitemap.xml file.',
  'Review robots.txt so key pages are not blocked accidentally.',
  'Verify mobile usability and text readability on smaller screens.',
  'Check page speed basics, especially large images and blocking scripts.',
  'Confirm HTTPS is active and mixed-content warnings are resolved.',
]

export default function SeoChecklistPage() {
  const faqs = [
    {
      question: 'Can beginners run an SEO audit without technical tools?',
      answer:
        'Yes. Start with crawl access, metadata basics, and broken links, then improve speed and usability in small steps.',
    },
    {
      question: 'How long does a basic SEO audit take?',
      answer:
        'A first pass usually takes 30 to 60 minutes if you focus only on high-impact fundamentals.',
    },
    {
      question: 'How do I know if fixes are working?',
      answer:
        'Re-run your audit after changes and track whether issue count and priority severity trend down over time.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/website-seo-audit-checklist-for-beginners',
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
        name: 'Website SEO Audit Checklist for Beginners',
        item: 'https://seochecksite.net/resources/website-seo-audit-checklist-for-beginners',
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
          If SEO feels overwhelming, use this checklist in order. Start with items that affect crawling and clarity,
          then move to speed and experience improvements.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Beginner checklist</h2>
          <ol className="space-y-3 text-gray-700 list-decimal pl-6">
            {checklistItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">How to use this checklist each month</h2>
          <ul className="space-y-2 text-gray-700 list-disc pl-6">
            <li>Run one full audit at the start of the month.</li>
            <li>Fix the highest-priority 3 issues first.</li>
            <li>Recheck after publishing key site updates.</li>
            <li>Track your issue count trend, not just one score snapshot.</li>
          </ul>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Want this checklist auto-generated for your site?</h2>
          <p className="text-gray-700 mb-4">
            SEO CheckSite produces a prioritized version of this process based on your live pages and common SEO blockers.
          </p>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Generate your checklist →
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

        <ResourceLinksBlock excludeHref="/resources/website-seo-audit-checklist-for-beginners" />
      </article>
    </main>
  )
}

