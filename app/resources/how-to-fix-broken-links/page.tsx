import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'How to Fix Broken Links on Your Website (Step-by-Step Guide)'
const description =
  'Learn how to find and fix broken links on your website. A simple step-by-step guide for small business owners with no technical experience needed.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/how-to-fix-broken-links',
  },
  openGraph: {
    title,
    description,
    url: '/resources/how-to-fix-broken-links',
    type: 'article',
  },
}

export default function FixBrokenLinksPage() {
  const faqs = [
    {
      question: 'How many broken links are normal for a small business website?',
      answer:
        'Even well-maintained sites often have a few broken links. More than five is worth addressing promptly, especially on key pages like your homepage, contact page, and service pages.',
    },
    {
      question: 'Do broken links on other websites hurt my SEO?',
      answer:
        'No. Only broken links on your own website affect your SEO. If another site links to a broken page on yours, that is a problem worth fixing — but broken links pointing to other sites are not counted against you.',
    },
    {
      question: 'Will deleting a page with backlinks hurt my rankings?',
      answer:
        'It can, because those backlinks stop passing value to your site. Always set up a redirect from the old URL to a relevant live page before deleting anything that has external links pointing to it.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How to Fix Broken Links on Your Website',
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/how-to-fix-broken-links',
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
        name: 'How to Fix Broken Links on Your Website',
        item: 'https://seochecksite.net/resources/how-to-fix-broken-links',
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">How to Fix Broken Links on Your Website</h1>
        <p className="text-lg text-gray-700 mb-8">
          A broken link is a link on your website that leads nowhere — usually a page that has been deleted, moved
          without a redirect, or a URL that was typed wrong. When a visitor or a search engine bot clicks that link,
          they get a 404 error page instead of useful content. Fixing broken links is one of the easiest ways to
          improve your website's user experience and protect your SEO.
        </p>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">What are broken links?</h2>
          <p className="text-gray-700 mb-3">
            Broken links (also called dead links) are hyperlinks that point to a URL that no longer exists. Here are
            the most common situations:
          </p>
          <ul className="space-y-2 text-gray-700 list-disc pl-6">
            <li>
              <strong>Deleted pages</strong> — You removed a blog post or service page but left links pointing to it.
            </li>
            <li>
              <strong>Moved pages without redirects</strong> — You changed a URL structure but did not set up a 301
              redirect from the old address.
            </li>
            <li>
              <strong>Typo in the URL</strong> — A link was written with a spelling error (e.g. &quot;/servces&quot;
              instead of &quot;/services&quot;).
            </li>
            <li>
              <strong>Deleted external sites</strong> — You linked to another website and that site went offline or
              removed the page.
            </li>
            <li>
              <strong>Changed domain names</strong> — An external site you linked to changed its domain without
              redirecting.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Why broken links matter</h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-2">Bad for user experience</h3>
          <p className="text-gray-700 mb-4">
            Imagine clicking a link that promises helpful information and landing on a dead 404 page. Visitors get
            frustrated, lose trust, and often leave your site. If you run an online store or a local service business,
            a broken link on your booking page or checkout page means lost revenue.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-2">Bad for SEO</h3>
          <p className="text-gray-700 mb-4">
            Search engines like Google care about the quality of the links on your site. Too many broken links signals
            that the site is neglected. Broken links also waste what SEOs call &quot;link equity&quot; — the value
            that a link passes from one page to another. When a link leads to a 404 page, that value is lost. Google's
            crawlers also waste time hitting dead ends instead of finding your important pages.
          </p>
          <p className="text-gray-700 mb-4">
            Broken links are one of the first issues an SEO audit checks for. If you want a broader look at what an
            audit covers, our{' '}
            <Link href="/resources/website-seo-audit-checklist-for-beginners" className="text-blue-700 underline hover:text-blue-800">
              SEO audit checklist for beginners
            </Link>{' '}
            walks through everything in one place.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">How to find broken links on your website</h2>
          <p className="text-gray-700 mb-4">
            You have a few options, ranging from completely manual to fully automatic.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-2">Option 1: Use an SEO audit tool (easiest)</h3>
          <p className="text-gray-700 mb-4">
            The simplest way is to run an SEO audit that automatically finds every broken link on your site. An audit
            tool crawls all your pages, follows every link, and reports each one that returns a 404 error.
            <strong> SEO CheckSite finds broken links automatically</strong> and explains exactly where each one is
            located and what URL it points to. You do not need any technical setup.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-2">Option 2: Manual checking</h3>
          <p className="text-gray-700 mb-4">
            You can click through every link on your website by hand. For very small sites with only a handful of
            pages, this might be feasible. But it is time-consuming, easy to miss links, and hard to repeat regularly.
            Most people give up after the first few pages.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-2">Option 3: Google Search Console</h3>
          <p className="text-gray-700 mb-6">
            If you have Google Search Console set up, check the &quot;Pages&quot; report for 404 errors that Google
            found while crawling. This only shows pages Google tried to visit — not every broken link on your site. An
            SEO audit is more thorough.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">How to fix broken links step by step</h2>
          <p className="text-gray-700 mb-4">
            Once you have a list of broken links, here is exactly what to do for each one. These three choices cover
            every situation:
          </p>

          <ol className="space-y-6 text-gray-700 list-decimal pl-6">
            <li>
              <strong>Update the link URL</strong> — If the page still exists at a different URL, simply change the
              link to point to the correct address. This is the cleanest fix because the visitor lands exactly where
              they expected.
            </li>
            <li>
              <strong>Set up a 301 redirect</strong> — If the old page is gone but you have a related page that
              covers the same topic, redirect the old URL to the new page. A 301 redirect tells browsers and search
              engines that the page permanently moved. This preserves any SEO value the old page had. Most website
              platforms (WordPress, Squarespace, Wix) have a redirect settings area where you can add them.
            </li>
            <li>
              <strong>Remove the link</strong> — If there is no useful page to point to and no related content on
              your site, just delete the link entirely. A visitor is better off not seeing the link at all than
              clicking it to a 404 page.
            </li>
          </ol>

          <div className="mt-6 p-5 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-gray-800 font-medium">Real example:</p>
            <p className="text-gray-700 mt-1">
              Say your website has a page called &quot;Lawn Mowing Services&quot; at /lawn-mowing-services. You
              later renamed it to &quot;Our Services&quot; at /services and deleted the old page. Any link that
              still points to /lawn-mowing-services is now broken. The easiest fix: <strong>set up a 301 redirect</strong>{' '}
              from /lawn-mowing-services to /services. After that, every old link will automatically send visitors
              (and search engines) to the updated page.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Tools that help you find and fix broken links</h2>
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-1">
                <Link href="/" className="text-blue-700 underline hover:text-blue-800">
                  SEO CheckSite
                </Link>
              </h3>
              <p className="text-gray-700 text-sm">
                The simplest option. Run a free audit and SEO CheckSite automatically finds every broken link on your
                site. It tells you exactly which page the link is on, what URL it points to, and what status code it
                returns. No setup, no technical skills needed.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-1">Google Search Console</h3>
              <p className="text-gray-700 text-sm">
                Free tool from Google. It shows pages where Google found 404 errors during crawling. Good for
                catching external-facing broken links but does not crawl every page the way a dedicated audit does.
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-1">Broken link checkers</h3>
              <p className="text-gray-700 text-sm">
                There are standalone tools like Dead Link Checker, Dr. Link Check, and W3C Link Checker. They scan
                your site for broken links but often have page limits on free plans and do not check other SEO
                issues at the same time.
              </p>
            </div>
          </div>
          <p className="text-gray-700 mt-4">
            If you want a full comparison of tools, check out our guide on{' '}
            <Link href="/resources/best-seo-audit-tools-for-small-business" className="text-blue-700 underline hover:text-blue-800">
              best SEO audit tools for small businesses
            </Link>
            .
          </p>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Find broken links in minutes, for free</h2>
          <p className="text-gray-700 mb-4">
            Run your first SEO CheckSite audit and get a complete report of every broken link on your website plus
            other issues you should fix.
          </p>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Run a free audit →
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

        <ResourceLinksBlock excludeHref="/resources/how-to-fix-broken-links" />
      </article>
    </main>
  )
}
