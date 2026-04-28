import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'Best SEO Audit Tools for Small Businesses (2026)'
const description =
  'Compare the best SEO audit tools for small businesses, including ease of use, reporting clarity, and best-fit scenarios.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/best-seo-audit-tools-for-small-business',
  },
  openGraph: {
    title,
    description,
    url: '/resources/best-seo-audit-tools-for-small-business',
    type: 'article',
  },
}

export default function BestSeoAuditToolsPage() {
  const faqs = [
    {
      question: 'What is the best SEO audit tool for non-technical business owners?',
      answer:
        'A strong option is one that gives clear priorities and plain-language fixes. SEO CheckSite is built for that workflow.',
    },
    {
      question: 'Do small businesses need enterprise SEO platforms?',
      answer:
        'Usually not at the beginning. Most small businesses benefit more from clear issue prioritization than from advanced dashboards.',
    },
    {
      question: 'How often should I run an SEO audit?',
      answer:
        'Run a full audit monthly and after major site updates so you can catch crawl and metadata issues early.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/best-seo-audit-tools-for-small-business',
    author: {
      '@type': 'Organization',
      name: 'SEO CheckSite',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SEO CheckSite',
    },
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
        name: 'Best SEO Audit Tools for Small Businesses',
        item: 'https://seochecksite.net/resources/best-seo-audit-tools-for-small-business',
      },
    ],
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
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
          Small business owners usually need three things from an SEO tool: clear priorities, plain language, and fast
          results. This guide compares common options so you can choose the right fit for your stage.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Quick comparison</h2>
          <ul className="space-y-3 text-gray-700 list-disc pl-6">
            <li>
              <strong>SEO CheckSite</strong>: Best for non-technical owners who want a fast, plain-language action list.
            </li>
            <li>
              <strong>Seobility</strong>: Better if you want broader tracking and more technical depth over time.
            </li>
            <li>
              <strong>SEO Site Checkup</strong>: Useful for quick checks and benchmarking, less guided for next actions.
            </li>
          </ul>
        </section>

        <section className="mb-8 overflow-x-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Comparison matrix</h2>
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
                <td className="p-3 border-b border-gray-200">Owners who want plain-language action steps</td>
                <td className="p-3 border-b border-gray-200">Teams wanting broader technical monitoring</td>
                <td className="p-3 border-b border-gray-200">Fast technical snapshots</td>
              </tr>
              <tr>
                <td className="p-3 border-b border-gray-200 font-medium">Learning curve</td>
                <td className="p-3 border-b border-gray-200">Low</td>
                <td className="p-3 border-b border-gray-200">Medium to high</td>
                <td className="p-3 border-b border-gray-200">Medium</td>
              </tr>
              <tr>
                <td className="p-3 border-b border-gray-200 font-medium">Time to first action</td>
                <td className="p-3 border-b border-gray-200">Very fast</td>
                <td className="p-3 border-b border-gray-200">Medium</td>
                <td className="p-3 border-b border-gray-200">Medium</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Tradeoff</td>
                <td className="p-3">Less feature complexity</td>
                <td className="p-3">More setup and interpretation effort</td>
                <td className="p-3">Less guided prioritization</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">How to choose the right tool</h2>
          <ol className="space-y-3 text-gray-700 list-decimal pl-6">
            <li>Pick the one you can act on the same day, not the one with the most charts.</li>
            <li>Look for a clear top-priority list and issue explanations in plain language.</li>
            <li>Choose a format you can share with your developer or freelancer quickly.</li>
            <li>Prefer tools that avoid unnecessary setup if your immediate goal is fixing basics.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">When SEO CheckSite is a strong fit</h2>
          <ul className="space-y-2 text-gray-700 list-disc pl-6">
            <li>You want to understand your SEO health in under 10 minutes.</li>
            <li>You need clear language without technical overload.</li>
            <li>You want one report you can execute directly or forward to a contractor.</li>
          </ul>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Try a free first audit</h2>
          <p className="text-gray-700 mb-4">
            Run one free audit and get a prioritized report with plain-language fixes for the most important issues first.
          </p>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Start your audit →
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

        <ResourceLinksBlock excludeHref="/resources/best-seo-audit-tools-for-small-business" />
      </article>
    </main>
  )
}

