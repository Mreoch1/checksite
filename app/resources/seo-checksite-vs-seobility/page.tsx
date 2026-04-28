import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'SEO CheckSite vs Seobility'
const description =
  'Compare SEO CheckSite vs Seobility for small business SEO workflows, including usability, reporting style, and execution speed.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/seo-checksite-vs-seobility',
  },
  openGraph: {
    title,
    description,
    url: '/resources/seo-checksite-vs-seobility',
    type: 'article',
  },
}

export default function SeoCheckSiteVsSeobilityPage() {
  const faqs = [
    {
      question: 'When is SEO CheckSite a better fit than Seobility?',
      answer:
        'SEO CheckSite is a better fit when you need plain-language guidance and fast execution without a technical learning curve.',
    },
    {
      question: 'When is Seobility a better fit?',
      answer:
        'Seobility is often better for teams that need deeper ongoing monitoring and are comfortable with more technical dashboards.',
    },
    {
      question: 'Can I use both tools?',
      answer:
        'Yes. Many teams use a clarity-first report for execution and a broader platform for long-term technical monitoring.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/seo-checksite-vs-seobility',
    author: { '@type': 'Organization', name: 'SEO CheckSite' },
    publisher: { '@type': 'Organization', name: 'SEO CheckSite' },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://seochecksite.net/' },
      { '@type': 'ListItem', position: 2, name: 'Resources', item: 'https://seochecksite.net/resources' },
      { '@type': 'ListItem', position: 3, name: 'SEO CheckSite vs Seobility', item: 'https://seochecksite.net/resources/seo-checksite-vs-seobility' },
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
          Both tools help identify SEO issues, but they optimize for different workflows. If you need clear action steps with minimal setup,
          SEO CheckSite is usually faster to execute.
        </p>

        <section className="mb-8 overflow-x-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Feature and workflow comparison</h2>
          <table className="w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 border-b border-gray-200">Criteria</th>
                <th className="text-left p-3 border-b border-gray-200">SEO CheckSite</th>
                <th className="text-left p-3 border-b border-gray-200">Seobility</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border-b border-gray-200 font-medium">Primary user</td>
                <td className="p-3 border-b border-gray-200">Small business owner</td>
                <td className="p-3 border-b border-gray-200">SEO-aware team</td>
              </tr>
              <tr>
                <td className="p-3 border-b border-gray-200 font-medium">Reporting style</td>
                <td className="p-3 border-b border-gray-200">Plain-language action list</td>
                <td className="p-3 border-b border-gray-200">Technical dashboard detail</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Time to first fix</td>
                <td className="p-3">Very fast</td>
                <td className="p-3">Medium</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Try the clarity-first workflow</h2>
          <p className="text-gray-700 mb-4">
            Run one free first audit and see whether your team can execute fixes faster with plain-language guidance.
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

        <ResourceLinksBlock excludeHref="/resources/seo-checksite-vs-seobility" />
      </article>
    </main>
  )
}

