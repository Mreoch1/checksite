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
        'Knowing core terms helps you prioritize fixes, communicate with vendors, and avoid wasting budget on low-impact work. When a developer or agency says "your site has indexing issues," knowing what indexing means lets you ask better follow-up questions and evaluate whether the proposed fix makes sense for your budget.',
    },
    {
      question: 'Do I need to learn every SEO term?',
      answer:
        'No. Focus on terms tied to crawlability, indexing, metadata, and user experience first. These cover the majority of issues that affect small business websites. Terms related to advanced link building, international SEO, or enterprise-level schema can wait until your business grows enough to need them.',
    },
    {
      question: 'How should I use this glossary?',
      answer:
        'Use it as a quick reference while reviewing reports so each recommendation is easier to understand and execute. When your SEO audit says "fix your canonical URLs" or "add alt text to images," look up the term here. Understanding the concept behind the recommendation makes it much easier to do the work yourself or describe it to someone who can help.',
    },
    {
      question: 'Can I learn these terms in one sitting?',
      answer:
        'Yes. These are foundational concepts, not advanced topics. Read through the glossary once to get the gist, then refer back to specific terms as they come up in your audit reports. Within a few audit cycles, most of these terms will feel familiar.',
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
          Use this glossary to understand what matters before you spend time or budget on fixes. Each term includes
          a link to a detailed explanation on the SEO glossary page.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Why SEO vocabulary matters for your business</h2>
          <p className="text-gray-700 mb-4">
            If you cannot name the problem, it is harder to fix it. Small business owners who learn basic SEO terminology
            save money in two ways: they can do simple fixes themselves instead of hiring someone, and they can evaluate
            whether a proposed service or tool is actually worth the cost.
          </p>
          <p className="text-gray-700 mb-4">
            For example, if you understand that "meta descriptions" are the short blurbs under your search result links,
            you can spot when your pages are missing them and fix them directly in your CMS in a few minutes. If someone
            tries to sell you a "$500 meta description optimization service," you will know it is something you can do
            yourself or delegate to an hourly VA.
          </p>
          <p className="text-gray-700">
            The terms below cover about 90% of what comes up in a standard small business SEO audit. If you learn these,
            you will be able to read any SEO CheckSite report (or any competitor's report) and understand exactly what
            needs to happen next.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Categories of SEO terms</h2>
          <p className="text-gray-700 mb-4">
            To make things easier, these terms break down into three groups:
          </p>
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-1">Crawl and indexing</h3>
            <p className="text-gray-700 text-sm">Terms related to how search engines find, access, and store your pages: Crawlability, Indexing, Robots.txt, Sitemap.xml, Meta Robots, Google Search Console.</p>
          </div>
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-1">On-page structure</h3>
            <p className="text-gray-700 text-sm">Terms related to how individual pages are organized and labeled: Title Tag, Meta Description, Heading Structure, Alt Text, Canonical URL, Canonical Tag, Duplicate Content.</p>
          </div>
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-1">Performance and experience</h3>
            <p className="text-gray-700 text-sm">Terms related to how fast and usable your site is: Core Web Vitals, Page Speed, Mobile Usability, Organic Traffic.</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Glossary terms</h2>
          <p className="text-gray-700 mb-4">
            Click any term to open its full glossary page with detailed examples and fix instructions.
          </p>
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

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Quick plain-English reference</h2>
          <p className="text-gray-700 mb-4">
            If you only have two minutes, here is a cheat sheet of the most important terms explained simply:
          </p>
          <ul className="space-y-3 text-gray-700 list-disc pl-6">
            <li><strong>Title Tag</strong> — The clickable headline that appears in search results. Should be unique per page and describe what that page is about. This is the single most important on-page SEO element.</li>
            <li><strong>Meta Description</strong> — The short summary under the title in search results. Does not directly affect rankings, but a good description makes people more likely to click your link.</li>
            <li><strong>Sitemap.xml</strong> — A file that lists all pages on your site. You submit it to Google so they know which pages exist and when they were last updated.</li>
            <li><strong>Robots.txt</strong> — A file that tells search engines which parts of your site they can and cannot visit. Accidentally blocking important pages here is one of the most common small business SEO mistakes.</li>
            <li><strong>Canonical URL</strong> — The "official" version of a page when multiple URLs show the same content. Prevents search engines from treating duplicates as separate pages.</li>
            <li><strong>301 Redirect</strong> — A permanent forward from one URL to another. Use this when you delete or move a page so visitors and search engines end up at the right place.</li>
            <li><strong>Alt Text</strong> — A text description of an image. Helps search engines understand images and makes your site accessible to visually impaired users.</li>
            <li><strong>Core Web Vitals</strong> — A set of speed and stability measurements Google uses to evaluate user experience. Includes loading speed (LCP), interactivity (FID/INP), and visual stability (CLS).</li>
          </ul>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Need these terms translated into action?</h2>
          <p className="text-gray-700 mb-4">
            SEO CheckSite explains each issue in plain language and gives clear next steps specific to your website.
            For a one-time fee of $14.99 — no subscription, no recurring charges — you get a report written in the
            same plain English you see here, tailored to your actual site.
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
