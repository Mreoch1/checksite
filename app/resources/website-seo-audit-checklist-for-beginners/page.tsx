import type { Metadata } from 'next'
import Link from 'next/link'
import ResourceLinksBlock from '@/components/ResourceLinksBlock'

const title = 'Website SEO Audit Checklist for Beginners'
const description =
  'A beginner-friendly SEO audit checklist you can run step by step, even if you are not technical.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/resources/website-seo-audit-checklist-for-beginners',
  },
  openGraph: {
    title,
    description,
    url: '/resources/website-seo-audit-checklist-for-beginners',
    type: 'article',
  },
}

const checklistItems = [
  'Confirm your homepage title and meta description are unique and clear.',
  'Check that each important page has one clear H1 heading that matches the page topic.',
  'Click through your main navigation and footer and fix any broken internal links or obvious 404 pages.',
  'Make sure your site has a valid sitemap.xml file and submit it to Google Search Console.',
  'Review robots.txt so key pages are not blocked accidentally and CSS/JS files are accessible.',
  'Verify mobile usability and text readability on smaller screens using Google\'s Mobile-Friendly Test.',
  'Check page speed basics, especially large images and render-blocking scripts on your most-visited pages.',
  'Confirm HTTPS is active site-wide and that mixed-content warnings are resolved.',
  'Add descriptive alt text to images, especially product photos, service illustrations, and team headshots.',
  'Write one unique meta description per important page. Keep each between 140 and 160 characters.',
  'Fix duplicate title tags — every page should have a unique title that describes its specific content.',
  'Review your heading hierarchy. No skipping from H1 to H3, and use H2s for main section breaks.',
  'Check that your contact page has accurate NAP (name, address, phone) information consistent with your Google Business Profile.',
  'Run a link check on any pages you created or updated recently. New pages often have placeholder or broken links.',
  'Ensure your blog or resource pages have at least 600 words of original content — not manufacturer descriptions or copied text.',
  'Verify that your 301 redirects work correctly for any renamed or deleted pages.',
  'Check your Google Search Console for manual actions or critical crawl error notifications.',
  'Make sure your site loads in under 3 seconds on a mobile connection. Test with actual mobile throttling, not just desktop.',
  'Review forms and contact mechanisms to ensure they submit correctly and trigger appropriate notifications.',
  'Set up tracking so you can measure whether your SEO fixes are working. At minimum, have Google Search Console and a basic analytics tool connected.',
]

export default function SeoChecklistPage() {
  const faqs = [
    {
      question: 'Can beginners run an SEO audit without technical tools?',
      answer:
        'Yes. Start with crawl access, metadata basics, and broken links, then improve speed and usability in small steps. Most of what beginners need to check can be done through free tools: Google Search Console for crawl issues, your browser inspector for metadata, and free speed test tools for performance. You do not need an expensive platform to make meaningful improvements.',
    },
    {
      question: 'How long does a basic SEO audit take?',
      answer:
        'A first pass usually takes 30 to 60 minutes if you focus only on high-impact fundamentals. The key is not to over-research everything — just check, note the problem, and move on. You can come back to dig deeper once you know which issues are most important for your site.',
    },
    {
      question: 'How do I know if fixes are working?',
      answer:
        'Re-run your audit after changes and track whether issue count and priority severity trend down over time. The simplest approach is to record your total issue count before each fix session, then compare it after. If the number goes down and stays down, you are moving in the right direction. Also watch Google Search Console for increases in impressions and clicks.',
    },
    {
      question: 'What if my checklist reveals too many issues?',
      answer:
        'Start with the first 3 to 5 items on the list. You do not need to fix everything at once. Focus on the items related to crawl access and metadata first. Fix those, re-check, and then move to the next group. SEO is not an all-or-nothing project — it is a gradual improvement process.',
    },
    {
      question: 'Should I automate this checklist?',
      answer:
        'You can automate parts of it with SEO CheckSite for a one-time fee of $14.99 — no subscription, no recurring charges. The tool checks most of these items automatically and prioritizes them by severity so you know exactly where to start. But even running through the list manually once a month will keep your site in better shape than 90% of small business competitors.',
    },
  ]

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    mainEntityOfPage: 'https://seochecksite.net/resources/website-seo-audit-checklist-for-beginners',
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
        name: 'Website SEO Audit Checklist for Beginners',
        item: 'https://seochecksite.net/resources/website-seo-audit-checklist-for-beginners',
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
          If SEO feels overwhelming, use this checklist in order. Start with items that affect crawling and clarity,
          then move to speed and experience improvements. Each item is written in plain English with no jargon,
          and the actions are things you can do directly from your website dashboard or with free online tools.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Why this checklist works for beginners</h2>
          <p className="text-gray-700 mb-4">
            Most SEO advice is written for people who already know the basics. This checklist is different. It assumes
            you have never run an SEO audit before and you do not plan to become an SEO specialist. You just want your
            website to show up better in search results so customers can find you.
          </p>
          <p className="text-gray-700 mb-4">
            The items below are ordered by impact — the things that matter most to search engines come first. You can
            work through them in order, or start with the ones that sound most relevant to your site. The goal is not
            perfection; it is progress. Even completing half this checklist will put your website ahead of most small
            business competitors who do nothing at all.
          </p>
          <p className="text-gray-700">
            If you get stuck on any item, skip it and move to the next one. Come back to it later or note it for a
            developer or tech-savvy friend. The important thing is to make progress on the items you can handle today.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Beginner checklist</h2>
          <p className="text-gray-700 mb-4">
            Run through these items in order. Mark each one as done, skipped, or needs attention. Revisit the skipped
            items on your next audit cycle.
          </p>
          <ol className="space-y-3 text-gray-700 list-decimal pl-6">
            {checklistItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">How to use this checklist each month</h2>
          <p className="text-gray-700 mb-4">
            Consistency beats intensity. A 30-minute monthly checkup will keep your site in better shape than a single
            all-day audit once a year. Here is a rhythm that works for most small business owners:
          </p>
          <ul className="space-y-3 text-gray-700 list-disc pl-6">
            <li><strong>Run one full audit at the start of the month.</strong> Spend 30 minutes going through the checklist. Note how many issues you find and which category they fall into.</li>
            <li><strong>Fix the highest-priority 3 issues first.</strong> Do not try to fix everything at once. Pick the three items that seem most impactful for your site — usually crawl access, metadata, or broken links — and fix them within the following week.</li>
            <li><strong>Recheck after publishing key site updates.</strong> Anytime you add a new page, redesign a section, or update your navigation, run through the checklist again. New changes often introduce new issues.</li>
            <li><strong>Track your issue count trend, not just one score snapshot.</strong> A single snapshot tells you where you are today. A trend line over several months tells you whether you are improving. If your issue count is trending down, your SEO is heading in the right direction.</li>
            <li><strong>Log your results in a simple spreadsheet or document.</strong> Date, total issues, top 3 problems, and what you fixed. Three months from now, you will be glad you did.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Tool recommendations for beginners</h2>
          <p className="text-gray-700 mb-4">
            You do not need to buy expensive software to run this checklist. Here are the free tools that cover most items:
          </p>
          <ul className="space-y-2 text-gray-700 list-disc pl-6">
            <li><strong>Google Search Console</strong> — Free. Shows crawl errors, sitemap status, indexing coverage, and search performance. Essential for any website owner.</li>
            <li><strong>PageSpeed Insights</strong> — Free. Tests mobile and desktop performance and gives specific suggestions for improvement.</li>
            <li><strong>Mobile-Friendly Test</strong> — Free. Checks whether your pages work well on smartphones and tablets.</li>
            <li><strong>SEO CheckSite</strong> — $14.99 one-time, no subscription. Combines all the checks above into a single prioritized report with plain-English explanations. Built specifically for small business owners who do not want to piece together multiple free tools.</li>
            <li><strong>Your browser's Inspect tool</strong> — Free. Right-click any page and select "Inspect" or "View Page Source" to check title tags, meta descriptions, and heading structure.</li>
          </ul>
        </section>

        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Want this checklist auto-generated for your site?</h2>
          <p className="text-gray-700 mb-4">
            SEO CheckSite produces a prioritized version of this process based on your live pages and common SEO blockers.
            For a one-time fee of $14.99 — no subscription, no recurring charges — you skip the manual checklist and get
            a report that tells you exactly what to fix, in what order, and why it matters.
          </p>
          <Link href="/" className="text-blue-700 font-semibold hover:text-blue-800">
            Generate your checklist →
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

        <ResourceLinksBlock excludeHref="/resources/website-seo-audit-checklist-for-beginners" />
      </article>
    </main>
  )
}
