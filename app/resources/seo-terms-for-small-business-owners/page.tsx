import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'SEO Terms for Small Business Owners'
const description =
  'A plain-English SEO glossary for small business owners. Learn what common SEO terms mean and why they matter.'

const terms = [
  { slug: 'meta-description', label: 'Meta Description' },
  { slug: 'title-tag', label: 'Title Tag' },
  { slug: 'robots-txt', label: 'Robots.txt' },
  { slug: 'sitemap-xml', label: 'Sitemap.xml' },
  { slug: 'schema-markup', label: 'Schema Markup' },
  { slug: 'core-web-vitals', label: 'Core Web Vitals' },
  { slug: 'crawlability', label: 'Crawlability' },
  { slug: 'indexing', label: 'Indexing' },
  { slug: 'canonical-url', label: 'Canonical URL' },
  { slug: 'alt-text', label: 'Alt Text' },
]

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/seo-terms-for-small-business-owners',
  },
  openGraph: {
    title,
    description,
    url: '/resources/seo-terms-for-small-business-owners',
    type: 'article',
  },
}

export default function SeoTermsForSmallBusinessOwnersPage() {
  const faqs = [
    {
      question: 'Why should small business owners learn SEO terms?',
      answer:
        'Knowing core terms helps you prioritize fixes, communicate with vendors, and avoid wasting budget on low-impact work.',
    },
    {
      question: 'Do I need to learn every SEO term?',
      answer:
        'No. Focus on terms tied to crawlability, indexing, metadata, and user experience first.',
    },
    {
      question: 'How should I use this glossary?',
      answer:
        'Use it as a quick reference while reviewing reports so each recommendation is easier to understand and execute.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/seo-terms-for-small-business-owners',
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
          SEO terms often sound technical, but most concepts are straightforward once explained in plain language.
          Use this glossary to understand what matters before you spend time or budget on fixes.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Glossary terms</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {terms.map((term) => (
              <Link
                key={term.slug}
                href={`/resources/seo-glossary/${term.slug}`}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">{term.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Need these terms translated into action?</h2>
          <p className="text-gray-700 mb-4">
            SEO CheckSite explains each issue in plain language and gives clear next steps specific to your website.
          </p>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Get your free first report →
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

        <ResourceLinksBlock excludeHref="/resources/seo-terms-for-small-business-owners" />
      </article>
    </main>
  )
}

