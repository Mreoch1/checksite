import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'Free SEO Audit Tools Compared'
const description =
  'A practical comparison of free SEO audit tools, what you can trust from free reports, and what to do after your first scan.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/free-seo-audit-tools-compared',
  },
  openGraph: {
    title,
    description,
    url: '/resources/free-seo-audit-tools-compared',
    type: 'article',
  },
}

export default function FreeSeoAuditToolsComparedPage() {
  const faqs = [
    {
      question: 'Are free SEO audit tools accurate enough to trust?',
      answer:
        'They are useful for finding obvious issues, but you still need clear prioritization and context before acting on every warning.',
    },
    {
      question: 'What should I fix first from a free SEO report?',
      answer:
        'Start with crawl blockers, broken links, and missing page metadata because these usually have fast, practical impact.',
    },
    {
      question: 'When should I move beyond a free tool?',
      answer:
        'Move when reports become hard to interpret or you need a clearer action plan for your team.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/free-seo-audit-tools-compared',
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
        name: 'Free SEO Audit Tools Compared',
        item: 'https://seochecksite.net/resources/free-seo-audit-tools-compared',
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
          Free SEO audit tools are useful for spotting obvious issues quickly. The key is knowing which findings matter
          first and which results need context before you spend time fixing them.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">What free tools usually do well</h2>
          <ul className="space-y-2 text-gray-700 list-disc pl-6">
            <li>Surface missing title tags and metadata issues.</li>
            <li>Flag crawl basics like sitemap and robots.txt gaps.</li>
            <li>Show broad technical warnings fast, with no setup.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Where free reports can be weak</h2>
          <ul className="space-y-2 text-gray-700 list-disc pl-6">
            <li>Issue priority is often unclear for small business context.</li>
            <li>Recommendations can be generic or too technical.</li>
            <li>Action steps are not always easy to hand to a non-SEO teammate.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">A practical workflow</h2>
          <ol className="space-y-3 text-gray-700 list-decimal pl-6">
            <li>Run one free scan to collect baseline issues.</li>
            <li>Focus only on the top 3 to 5 high-impact items first.</li>
            <li>Re-scan after fixes to confirm measurable improvement.</li>
            <li>Move to a clearer paid report if execution is blocked by unclear language.</li>
          </ol>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Want a clearer free starting point?</h2>
          <p className="text-gray-700 mb-4">
            SEO CheckSite gives one free first report with plain-language priorities so you can decide quickly what to fix.
          </p>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Get your free first audit →
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

        <ResourceLinksBlock excludeHref="/resources/free-seo-audit-tools-compared" />
      </article>
    </main>
  )
}

