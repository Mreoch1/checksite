import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'SEO CheckSite vs Semrush'
const description =
  'Understand SEO CheckSite vs Semrush for small business use cases, especially when choosing between simplicity and advanced depth.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/seo-checksite-vs-semrush',
  },
  openGraph: {
    title,
    description,
    url: '/resources/seo-checksite-vs-semrush',
    type: 'article',
  },
}

export default function SeoCheckSiteVsSemrushPage() {
  const faqs = [
    {
      question: 'Is Semrush too advanced for small businesses?',
      answer:
        'Not always, but many small businesses only need a smaller subset of features and may prefer a simpler execution-focused workflow.',
    },
    {
      question: 'When should I pick SEO CheckSite over Semrush?',
      answer:
        'Pick SEO CheckSite when your top priority is understanding and fixing core SEO issues quickly with minimal setup.',
    },
    {
      question: 'Can Semrush still be useful later?',
      answer:
        'Yes. As your team grows and requires broader market, keyword, and competitive workflows, Semrush can complement core audit work.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/seo-checksite-vs-semrush',
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
        name: 'SEO CheckSite vs Semrush',
        item: 'https://seochecksite.net/resources/seo-checksite-vs-semrush',
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
          Semrush provides broad SEO and marketing depth. SEO CheckSite focuses on a simpler path from audit to action.
          This page helps you choose based on execution style, not feature volume.
        </p>

        <section className="mb-8 overflow-x-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Practical fit comparison</h2>
          <table className="w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 border-b border-gray-200">Criteria</th>
                <th className="text-left p-3 border-b border-gray-200">SEO CheckSite</th>
                <th className="text-left p-3 border-b border-gray-200">Semrush</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border-b border-gray-200 font-medium">Workflow focus</td>
                <td className="p-3 border-b border-gray-200">Audit-to-action clarity</td>
                <td className="p-3 border-b border-gray-200">Broader SEO and market intelligence</td>
              </tr>
              <tr>
                <td className="p-3 border-b border-gray-200 font-medium">Setup complexity</td>
                <td className="p-3 border-b border-gray-200">Low</td>
                <td className="p-3 border-b border-gray-200">Higher</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Best stage</td>
                <td className="p-3">Early and execution-focused</td>
                <td className="p-3">Growth stage with broader SEO programs</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Choose clarity first, expand later</h2>
          <p className="text-gray-700 mb-4">
            Start with a free first audit to validate your highest-priority fixes before adding more complex SEO tooling.
          </p>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Get your free first report →
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

        <ResourceLinksBlock excludeHref="/resources/seo-checksite-vs-semrush" />
      </article>
    </main>
  )
}

