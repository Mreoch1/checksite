import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'SEO CheckSite vs SEO Site Checkup'
const description =
  'A practical comparison of SEO CheckSite vs SEO Site Checkup for small businesses that need fast, actionable SEO improvements.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/seo-checksite-vs-seo-site-checkup',
  },
  openGraph: {
    title,
    description,
    url: '/resources/seo-checksite-vs-seo-site-checkup',
    type: 'article',
  },
}

export default function SeoCheckSiteVsSeoSiteCheckupPage() {
  const faqs = [
    {
      question: 'What is the core difference between these tools?',
      answer:
        'SEO CheckSite focuses on plain-language prioritization, while SEO Site Checkup is often used for broader technical checks and benchmarking.',
    },
    {
      question: 'Which tool is easier for non-technical owners?',
      answer:
        'SEO CheckSite is designed for non-technical owners who need immediate next actions without interpretation overhead.',
    },
    {
      question: 'Should I switch tools completely?',
      answer:
        'Not always. Some teams use both, with one tool for issue discovery and one for action-first execution.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/seo-checksite-vs-seo-site-checkup',
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
        name: 'SEO CheckSite vs SEO Site Checkup',
        item: 'https://seochecksite.net/resources/seo-checksite-vs-seo-site-checkup',
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
          This comparison focuses on what small businesses actually need: clear priorities, practical fixes, and fast execution,
          not just a long list of technical checks.
        </p>

        <section className="mb-8 overflow-x-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Comparison matrix</h2>
          <table className="w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 border-b border-gray-200">Criteria</th>
                <th className="text-left p-3 border-b border-gray-200">SEO CheckSite</th>
                <th className="text-left p-3 border-b border-gray-200">SEO Site Checkup</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border-b border-gray-200 font-medium">Best for</td>
                <td className="p-3 border-b border-gray-200">Execution clarity</td>
                <td className="p-3 border-b border-gray-200">Technical scan and scoring</td>
              </tr>
              <tr>
                <td className="p-3 border-b border-gray-200 font-medium">Ease for beginners</td>
                <td className="p-3 border-b border-gray-200">High</td>
                <td className="p-3 border-b border-gray-200">Medium</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Report output</td>
                <td className="p-3">Prioritized plain-language checklist</td>
                <td className="p-3">Issue scorecards and checks</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">See your own site report format</h2>
          <p className="text-gray-700 mb-4">
            Use your free first report to evaluate whether the action-first format matches your workflow.
          </p>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Run a free audit →
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

        <ResourceLinksBlock excludeHref="/resources/seo-checksite-vs-seo-site-checkup" />
      </article>
    </main>
  )
}

