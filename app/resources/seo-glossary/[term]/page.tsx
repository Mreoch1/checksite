import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type GlossaryEntry = {
  term: string
  definition: string
  whyItMatters: string
  quickTip: string
}

const glossaryEntries: Record<string, GlossaryEntry> = {
  'meta-description': {
    term: 'Meta Description',
    definition: 'A short summary shown under your page title in search results.',
    whyItMatters: 'A clear description improves click-through rate and helps searchers understand your page.',
    quickTip: 'Write one unique summary per page, roughly 120 to 160 characters.',
  },
  'title-tag': {
    term: 'Title Tag',
    definition: 'The page title shown in browser tabs and search results.',
    whyItMatters: 'It is one of the strongest on-page signals for topic relevance.',
    quickTip: 'Keep it specific, readable, and aligned with the page intent.',
  },
  'robots-txt': {
    term: 'Robots.txt',
    definition: 'A file that tells crawlers which sections of your site to avoid.',
    whyItMatters: 'Incorrect rules can block important pages from being crawled.',
    quickTip: 'Double-check that key service, product, and blog pages are not disallowed.',
  },
  'sitemap-xml': {
    term: 'Sitemap.xml',
    definition: 'A list of important URLs on your site for search engines to discover.',
    whyItMatters: 'It helps crawlers find pages faster and understand site structure.',
    quickTip: 'Keep your sitemap updated automatically through your framework or CMS.',
  },
  'schema-markup': {
    term: 'Schema Markup',
    definition: 'Structured data that labels your content for search engines.',
    whyItMatters: 'It can improve how your pages appear in results and clarifies page meaning.',
    quickTip: 'Start with Organization and WebSite schema, then add page-specific types.',
  },
  'core-web-vitals': {
    term: 'Core Web Vitals',
    definition: 'Google performance signals for load speed, interaction, and visual stability.',
    whyItMatters: 'Poor user experience can hurt engagement and search visibility.',
    quickTip: 'Compress large assets and reduce blocking scripts first.',
  },
  crawlability: {
    term: 'Crawlability',
    definition: 'How easily search bots can access and move through your pages.',
    whyItMatters: 'If pages cannot be crawled, they will not perform in search.',
    quickTip: 'Fix broken internal links and avoid orphan pages.',
  },
  indexing: {
    term: 'Indexing',
    definition: 'The process of adding crawled pages to a search engine index.',
    whyItMatters: 'A page must be indexed to appear in search results.',
    quickTip: 'Use Search Console URL inspection when critical pages are missing.',
  },
  'canonical-url': {
    term: 'Canonical URL',
    definition: 'The preferred version of a page when multiple similar URLs exist.',
    whyItMatters: 'Canonicals prevent duplicate-content confusion and ranking dilution.',
    quickTip: 'Use self-referencing canonicals and avoid conflicting canonical targets.',
  },
  'alt-text': {
    term: 'Alt Text',
    definition: 'Text description for images used by screen readers and search engines.',
    whyItMatters: 'Improves accessibility and helps image context in search.',
    quickTip: 'Describe the image purpose naturally, not keyword stuffing.',
  },
}

type Props = {
  params: { term: string }
}

export function generateStaticParams() {
  return Object.keys(glossaryEntries).map((term) => ({ term }))
}

export function generateMetadata({ params }: Props): Metadata {
  const entry = glossaryEntries[params.term]

  if (!entry) {
    return {}
  }

  const title = `${entry.term}: Simple Definition for Small Businesses`
  const description = `${entry.definition} Why it matters: ${entry.whyItMatters}`

  return {
    title,
    description,
    alternates: {
      canonical: `/resources/seo-glossary/${params.term}`,
    },
    openGraph: {
      title,
      description,
      url: `/resources/seo-glossary/${params.term}`,
      type: 'article',
    },
  }
}

export default function GlossaryTermPage({ params }: Props) {
  const entry = glossaryEntries[params.term]

  if (!entry) {
    notFound()
  }

  const faqs = [
    {
      question: `What does ${entry.term} mean in simple terms?`,
      answer: entry.definition,
    },
    {
      question: `Why does ${entry.term} matter for SEO?`,
      answer: entry.whyItMatters,
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${entry.term}: Simple Definition for Small Businesses`,
    description: entry.definition,
    mainEntityOfPage: `https://seochecksite.net/resources/seo-glossary/${params.term}`,
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
        name: 'SEO Terms for Small Business Owners',
        item: 'https://seochecksite.net/resources/seo-terms-for-small-business-owners',
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: entry.term,
        item: `https://seochecksite.net/resources/seo-glossary/${params.term}`,
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
      <article className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{entry.term}</h1>
        <p className="text-lg text-gray-700 mb-8">{entry.definition}</p>

        <section className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Why this matters</h2>
          <p className="text-gray-700">{entry.whyItMatters}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Quick tip</h2>
          <p className="text-gray-700">{entry.quickTip}</p>
        </section>

        <section className="mb-8">
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

        <div className="border-t border-gray-200 pt-6 flex flex-wrap gap-4">
          <Link href="/resources/seo-terms-for-small-business-owners" className="text-blue-700 font-semibold hover:text-blue-800">
            Back to glossary →
          </Link>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Run a free first audit →
          </Link>
        </div>
      </article>
    </main>
  )
}

