import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'Before and After SEO Audit Checklist'
const description =
  'Use this before-and-after SEO audit checklist to track baseline issues, completed fixes, and measurable progress.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/before-and-after-seo-audit-checklist',
  },
  openGraph: {
    title,
    description,
    url: '/resources/before-and-after-seo-audit-checklist',
    type: 'article',
  },
}

export default function BeforeAfterChecklistPage() {
  const faqs = [
    {
      question: 'What is a before-and-after SEO checklist?',
      answer:
        'It is a simple way to compare your site state before fixes and after fixes so you can see real progress. Rather than guessing whether your changes made a difference, you capture a baseline snapshot first, make your fixes, then re-run the same checks. The difference between the two snapshots shows you exactly what improved, what stayed the same, and what still needs work.',
    },
    {
      question: 'Which metrics should I track first?',
      answer:
        'Track issue count, crawl blockers, broken links, metadata completion, and load performance trends. These five areas cover the majority of SEO problems for small business sites. Focus on metrics that are easy to measure and directly tied to how search engines discover and rank your content.',
    },
    {
      question: 'How often should I update this checklist?',
      answer:
        'Update it after every audit cycle, usually monthly or after major site changes like a redesign, new product launch, or platform migration. Consistency matters more than frequency — a well-documented monthly snapshot is more valuable than sporadic deep dives.',
    },
    {
      question: 'Can I use this with any SEO audit tool?',
      answer:
        'Yes. This checklist is tool-agnostic and works with SEO CheckSite, Google Search Console, or manual reviews. The key is using the same measurement method for your before and after snapshots so the comparison is accurate.',
    },
    {
      question: 'What if my numbers get worse on a re-check?',
      answer:
        'That is useful data, not failure. It may mean a fix introduced a new issue, a plugin update changed something, or content changes affected page structure. Track what changed between audits and adjust your approach.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/before-and-after-seo-audit-checklist',
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
        name: 'Before and After SEO Audit Checklist',
        item: 'https://seochecksite.net/resources/before-and-after-seo-audit-checklist',
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
          This template helps you track what changed after each audit cycle. Use it to keep SEO work measurable and focused
          on outcomes, not random tasks. Many small business owners spend hours making SEO changes but have no way to tell if
          those changes actually moved the needle. A before-and-after checklist solves that problem by forcing you to capture
          a baseline before you start fixing things.
        </p>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Why a before-and-after approach matters</h2>
          <p className="text-gray-700 mb-4">
            Without a baseline, you cannot measure progress. Small business owners often make SEO changes in response to
            tips they hear or articles they read, but without tracking the starting state, it is impossible to know whether
            those changes helped. A before-and-after checklist gives you concrete numbers to look back on.
          </p>
          <p className="text-gray-700 mb-4">
            For instance, imagine you fix ten missing meta descriptions across your site. If you did not record your starting
            issue count, you might later wonder whether you caught them all. With a snapshot, you know your "before" had ten
            metadata issues and your "after" has zero. That clarity builds confidence and keeps your SEO efforts on track.
          </p>
          <p className="text-gray-700">
            This approach also helps you prioritize. When you see the same issues reappearing month after month, you know
            they need a more permanent fix rather than a quick patch. Over time, your before-and-after log becomes a history
            of what is working and what is not.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Before checklist — capture your baseline</h2>
          <p className="text-gray-700 mb-4">
            Run these checks before making any SEO changes. Record the numbers in a spreadsheet or a note so you can compare
            them to your post-fix results later.
          </p>
          <ul className="space-y-3 text-gray-700 list-disc pl-6">
            <li><strong>Record baseline issue count and top severity categories.</strong> How many problems does your audit tool find? What are the most common types — missing metadata, broken links, slow pages, or crawl issues?</li>
            <li><strong>Capture crawl access status, sitemap, and robots configuration.</strong> Can search engines reach your site? Is your sitemap valid and submitted? Are important pages accidentally blocked in robots.txt?</li>
            <li><strong>Note missing metadata and broken internal links.</strong> Count how many pages lack a unique title tag or meta description. Note any links that return 404 errors, especially on key navigation and service pages.</li>
            <li><strong>Capture performance snapshots for core landing pages.</strong> Run a speed check on your homepage and top 3 to 5 landing pages. Record load times, Largest Contentful Paint (LCP), and Cumulative Layout Shift (CLS) scores.</li>
            <li><strong>Check mobile usability on real devices or a responsive tester.</strong> If your site is hard to use on a phone, your SEO will suffer. Note specific mobile issues like text that is too small, buttons that are too close together, or content that overflows the viewport.</li>
            <li><strong>Verify HTTPS security and mixed content warnings.</strong> Search engines prefer secure sites. If your site has mixed content (HTTP resources loading on an HTTPS page), fix those before moving to other tasks.</li>
            <li><strong>Document your current keyword rankings for 3 to 5 important terms.</strong> Use Google Search Console or a simple rank tracker to note where you currently sit. This gives you a directional sense of whether your SEO work is affecting visibility.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">After checklist — measure your impact</h2>
          <p className="text-gray-700 mb-4">
            Once you have completed your chosen fixes, run exactly the same checks again. Use the same tool, the same pages,
            and the same method so the comparison is apples-to-apples.
          </p>
          <ul className="space-y-3 text-gray-700 list-disc pl-6">
            <li><strong>Re-run the audit and compare issue count reduction.</strong> Did your total issue count go down? By how much? Focus on the reduction in high-severity issues first.</li>
            <li><strong>Confirm crawl blockers are resolved and key pages are indexable.</strong> Use the Inspect URL feature in Google Search Console to verify that your most important pages can be indexed.</li>
            <li><strong>Verify metadata updates on all priority pages.</strong> Check that the pages you fixed now have unique, descriptive title tags and meta descriptions. Confirm headings are properly structured with one clear H1 per page.</li>
            <li><strong>Measure page speed improvements and document remaining bottlenecks.</strong> Compare your before and after speed numbers. Even a 10% improvement in load time can affect user engagement and rankings.</li>
            <li><strong>Re-check mobile usability for the same pages.</strong> If you fixed font sizes, button spacing, or viewport issues, confirm those fixes are rendering correctly on mobile devices.</li>
            <li><strong>Cross-reference your keyword rankings after 2 to 4 weeks.</strong> Rankings take time to shift, but note any early movements. If a fix was particularly impactful, you may see a small bump in impressions first, then clicks later.</li>
            <li><strong>Update your tracking document with the new numbers and a summary of what changed.</strong> Write a short note about which fixes you made, how difficult they were, and whether you would do them again. This becomes your playbook for future audits.</li>
          </ul>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Need a repeatable baseline report?</h2>
          <p className="text-gray-700 mb-4">
            Use SEO CheckSite to generate consistent audit snapshots and track improvements over each cycle. For a
            one-time fee of $14.99, you get a clear, actionable report that makes your before-and-after comparison
            straightforward — no subscription, no learning curve, no hidden upsells.
          </p>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Run your next audit →
          </Link>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Example before-and-after tracking table</h2>
          <p className="text-gray-700 mb-4">
            Here is what a simple tracking log might look like for a small service business over three audit cycles:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 border-b border-gray-200">Metric</th>
                  <th className="text-left p-3 border-b border-gray-200">Before</th>
                  <th className="text-left p-3 border-b border-gray-200">After Fixes</th>
                  <th className="text-left p-3 border-b border-gray-200">Change</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-gray-200">Total issues</td>
                  <td className="p-3 border-b border-gray-200">47</td>
                  <td className="p-3 border-b border-gray-200">19</td>
                  <td className="p-3 border-b border-gray-200 text-green-700">-60%</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Missing title tags</td>
                  <td className="p-3 border-b border-gray-200">8</td>
                  <td className="p-3 border-b border-gray-200">1</td>
                  <td className="p-3 border-b border-gray-200 text-green-700">-88%</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Broken internal links</td>
                  <td className="p-3 border-b border-gray-200">12</td>
                  <td className="p-3 border-b border-gray-200">3</td>
                  <td className="p-3 border-b border-gray-200 text-green-700">-75%</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Homepage load time (desktop)</td>
                  <td className="p-3 border-b border-gray-200">4.2s</td>
                  <td className="p-3 border-b border-gray-200">2.1s</td>
                  <td className="p-3 border-b border-gray-200 text-green-700">-50%</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-200">Mobile usability issues</td>
                  <td className="p-3 border-b border-gray-200">5</td>
                  <td className="p-3 border-b border-gray-200">0</td>
                  <td className="p-3 border-b border-gray-200 text-green-700">Resolved</td>
                </tr>
                <tr>
                  <td className="p-3">Sitemap status</td>
                  <td className="p-3">Not found</td>
                  <td className="p-3">Valid and submitted</td>
                  <td className="p-3 text-green-700">Fixed</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-gray-600 text-sm mt-3">
            Over three months, this business reduced its total SEO issues by 60%, cut homepage load time in half, and
            resolved all mobile usability problems. Each audit cycle included about two hours of focused work.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Common pitfalls to avoid</h2>
          <ul className="space-y-3 text-gray-700 list-disc pl-6">
            <li><strong>Changing too many things at once.</strong> If you fix ten different categories of issues between audits, you will not know which change drove the improvement. Fix one or two categories at a time and re-check.</li>
            <li><strong>Using different tools for before and after.</strong> Each tool scores things differently. Always use the same tool and settings for both snapshots.</li>
            <li><strong>Ignoring low-severity issues.</strong> A single low-severity issue is not a crisis, but a growing pile of them signals a site that is slowly degrading. Track all severity levels.</li>
            <li><strong>Skipping the documentation step.</strong> If you do not write down what you fixed, you lose the institutional knowledge. A simple notes column in your tracking sheet is enough.</li>
            <li><strong>Checking too frequently.</strong> Weekly audits create noise — your numbers may naturally fluctuate. Monthly or quarterly is usually the right cadence for meaningful before-and-after comparisons.</li>
          </ul>
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

        <ResourceLinksBlock excludeHref="/resources/before-and-after-seo-audit-checklist" />
      </article>
    </main>
  )
}
