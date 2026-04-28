import type { Metadata } from 'next'
import Link from 'next/link'

const title = 'SEO Learning Hub for Small Business Owners'
const description =
  'Practical SEO guides, comparisons, and beginner checklists written in plain language for small business owners.'

const resourceLinks = [
  {
    href: '/resources/best-seo-audit-tools-for-small-business',
    title: 'Best SEO Audit Tools for Small Businesses',
    description: 'A practical comparison of popular audit tools and where each one fits.',
  },
  {
    href: '/resources/free-seo-audit-tools-compared',
    title: 'Free SEO Audit Tools Compared',
    description: 'See what free options include, what they miss, and when to upgrade.',
  },
  {
    href: '/resources/website-seo-audit-checklist-for-beginners',
    title: 'Website SEO Audit Checklist for Beginners',
    description: 'A step-by-step audit process you can run without technical experience.',
  },
  {
    href: '/resources/how-to-fix-common-seo-issues',
    title: 'How to Fix Common SEO Issues',
    description: 'Simple fixes for titles, descriptions, broken links, sitemap, and robots.',
  },
  {
    href: '/resources/seo-terms-for-small-business-owners',
    title: 'SEO Terms for Small Business Owners',
    description: 'A plain-English glossary that explains common SEO terms and why they matter.',
  },
  {
    href: '/resources/seo-audit-example-for-small-business',
    title: 'SEO Audit Example for a Small Business',
    description: 'A practical walkthrough showing findings, priorities, and fix order.',
  },
  {
    href: '/resources/before-and-after-seo-audit-checklist',
    title: 'Before and After SEO Audit Checklist',
    description: 'A repeatable framework to track baseline issues and improvement over time.',
  },
  {
    href: '/resources/seo-checksite-vs-ahrefs',
    title: 'SEO CheckSite vs Ahrefs (2026)',
    description: 'Compare pricing, ease of use, and depth to see which tool fits your small business.',
  },
  {
    href: '/resources/seo-checksite-vs-other-audit-tools',
    title: 'SEO CheckSite vs Other SEO Audit Tools',
    description: 'A clarity-first comparison focused on execution speed and practical fit.',
  },
  {
    href: '/resources/seo-checksite-vs-seobility',
    title: 'SEO CheckSite vs Seobility',
    description: 'Compare simplicity-first execution with broader technical monitoring.',
  },
  {
    href: '/resources/seo-checksite-vs-seo-site-checkup',
    title: 'SEO CheckSite vs SEO Site Checkup',
    description: 'See which workflow is better for fast action vs technical scorecards.',
  },
  {
    href: '/resources/seo-checksite-vs-semrush',
    title: 'SEO CheckSite vs Semrush',
    description: 'Evaluate clarity-first audits against advanced all-in-one SEO depth.',
  },
]

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources',
  },
  openGraph: {
    title,
    description,
    url: '/resources',
    type: 'website',
  },
}

export default function ResourcesPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://seochecksite.net/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Resources',
        item: 'https://seochecksite.net/resources',
      },
    ],
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-lg text-gray-700 mb-10 max-w-3xl">{description}</p>

        <div className="grid gap-5 md:grid-cols-2">
          {resourceLinks.map((resource) => (
            <article key={resource.href} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{resource.title}</h2>
              <p className="text-gray-700 mb-4">{resource.description}</p>
              <Link href={resource.href} className="text-blue-600 font-semibold hover:text-blue-700">
                Read guide →
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-10 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Need a done-for-you audit?</h2>
          <p className="text-gray-700 mb-3">
            Start with your free first report and get a plain-language checklist tailored to your own website.
          </p>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Start your audit →
          </Link>
        </div>
      </section>
    </main>
  )
}

