import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'SEO CheckSite vs Other SEO Audit Tools'
const description =
  'See how SEO CheckSite compares with other SEO audit tools for small business owners who need clear, actionable guidance.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/seo-checksite-vs-other-audit-tools',
  },
  openGraph: {
    title,
    description,
    url: '/resources/seo-checksite-vs-other-audit-tools',
    type: 'article',
  },
}

export default function SeoCheckSiteComparisonPage() {
  const faqs = [
    {
      question: 'Who is SEO CheckSite best for?',
      answer:
        'SEO CheckSite is best for non-technical small business owners who need a clear, prioritized action plan without technical overload.',
    },
    {
      question: 'Does SEO CheckSite replace technical SEO platforms?',
      answer:
        'It can replace them for many beginner workflows, but advanced teams may still use deeper technical platforms for specialized analysis.',
    },
    {
      question: 'What makes this comparison useful?',
      answer:
        'It focuses on execution clarity, not feature counts, because most small businesses need simple actions they can complete quickly.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/seo-checksite-vs-other-audit-tools',
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
        name: 'SEO CheckSite vs Other SEO Audit Tools',
        item: 'https://seochecksite.net/resources/seo-checksite-vs-other-audit-tools',
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
      <article className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-lg text-gray-700 mb-8">
          If you are choosing between SEO tools, the biggest difference is usually not feature count. It is whether your
          team can act on the report quickly. This comparison is designed for small business owners who need practical
          execution.
        </p>

        <section className="mb-8 overflow-x-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Quick comparison matrix</h2>
          <table className="w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 border-b border-gray-200">Criteria</th>
                <th className="text-left p-3 border-b border-gray-200">SEO CheckSite</th>
                <th className="text-left p-3 border-b border-gray-200">Seobility</th>
                <th className="text-left p-3 border-b border-gray-200">SEO Site Checkup</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border-b border-gray-200 font-medium">Best for</td>
                <td className="p-3 border-b border-gray-200">Non-technical owners</td>
                <td className="p-3 border-b border-gray-200">Broader technical monitoring</td>
                <td className="p-3 border-b border-gray-200">Quick technical snapshots</td>
              </tr>
              <tr>
                <td className="p-3 border-b border-gray-200 font-medium">Reporting style</td>
                <td className="p-3 border-b border-gray-200">Plain language + checklist</td>
                <td className="p-3 border-b border-gray-200">Detailed dashboards</td>
                <td className="p-3 border-b border-gray-200">Issue list and checks</td>
              </tr>
              <tr>
                <td className="p-3 border-b border-gray-200 font-medium">Time to first action</td>
                <td className="p-3 border-b border-gray-200">Very fast</td>
                <td className="p-3 border-b border-gray-200">Medium</td>
                <td className="p-3 border-b border-gray-200">Medium</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Primary tradeoff</td>
                <td className="p-3">Less feature complexity</td>
                <td className="p-3">Higher learning curve</td>
                <td className="p-3">Less guided prioritization</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Try SEO CheckSite with your own website</h2>
          <p className="text-gray-700 mb-4">
            Get one free first report and evaluate whether the clarity-first approach fits your workflow.
          </p>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Start your audit →
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

        <ResourceLinksBlock excludeHref="/resources/seo-checksite-vs-other-audit-tools" />
      </article>
    </main>
  )
}

