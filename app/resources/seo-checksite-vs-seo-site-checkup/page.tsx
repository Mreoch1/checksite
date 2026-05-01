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
        'SEO CheckSite focuses on plain-language prioritization, while SEO Site Checkup is often used for broader technical checks and benchmarking. SEO CheckSite organizes findings into a clear before-and-after action plan. SEO Site Checkup provides a scorecard with individual pass/fail checks. The former is built for execution, the latter for assessment.',
    },
    {
      question: 'Which tool is easier for non-technical owners?',
      answer:
        'SEO CheckSite is designed for non-technical owners who need immediate next actions without interpretation overhead. Every finding includes a "why it matters" explanation in plain English and step-by-step fix instructions. SEO Site Checkup gives you a list of issues but expects you to know what to do with them.',
    },
    {
      question: 'Should I switch tools completely?',
      answer:
        'Not always. Some teams use both, with one tool for issue discovery and one for action-first execution. If you are comfortable with SEO Site Checkup\'s interface and know how to prioritize its findings, there is no urgent reason to switch. But if you find yourself spending more time interpreting results than fixing issues, SEO CheckSite may save you hours per audit cycle.',
    },
    {
      question: 'How does pricing compare?',
      answer:
        'SEO CheckSite charges $14.99 per report with no subscription. SEO Site Checkup offers a limited free version and paid plans starting at about $10 per month for more frequent checks. Over a year, SEO Site Checkup costs about $120, while SEO CheckSite costs $14.99 to $60 depending on how many reports you run. Both are affordable, but the one-time model gives you more flexibility.',
    },
    {
      question: 'Does SEO Site Checkup offer more checks than SEO CheckSite?',
      answer:
        'SEO Site Checkup checks a larger number of individual data points — about 100 separate checks. SEO CheckSite focuses on roughly 60 to 70 high-impact checks that cover the issues most likely to affect small business websites. The extra checks in SEO Site Checkup are often minor or redundant for non-technical users. Quality of prioritization matters more than raw check count.',
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
    <main className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-lg text-gray-700 mb-8">
        This comparison focuses on what small businesses actually need: clear priorities, practical fixes, and fast execution,
        not just a long list of technical checks. Both SEO CheckSite and SEO Site Checkup help identify website issues, but
        they approach the reporting process very differently.
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">How they approach reporting differently</h2>
        <p className="text-gray-700 mb-4">
          SEO Site Checkup gives you a score out of 100 and a list of checks with green, yellow, or red indicators. It is
          good for a quick snapshot — you enter your URL, get a score, and see which individual tests pass or fail. The
          challenge for non-technical users is that a list of 70 failed checks does not tell you where to start. You have
          to figure out the priority yourself.
        </p>
        <p className="text-gray-700 mb-4">
          SEO CheckSite groups issues by severity and impact. Instead of a flat list of 70 red marks, you get a handful
          of high-severity findings with clear explanations of why each one matters and how to fix it. The report tells
          you "fix these 4 things first" rather than "you have 47 issues, good luck." That difference matters when you
          have limited time and just want your site to improve.
        </p>
        <p className="text-gray-700">
          The naming similarity between the two tools also causes confusion. "SEO Site Checkup" and "SEO CheckSite" sound
          alike but serve different audiences. SEO Site Checkup is positioned as a general-purpose scanning tool. SEO CheckSite
          is built specifically for small business owners who want a tool that does the thinking for them.
        </p>
      </section>

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
              <td className="p-3 border-b border-gray-200 font-medium">Report output</td>
              <td className="p-3 border-b border-gray-200">Prioritized plain-language checklist</td>
              <td className="p-3 border-b border-gray-200">Issue scorecards and checks</td>
            </tr>
            <tr>
              <td className="p-3 border-b border-gray-200 font-medium">Fix instructions</td>
              <td className="p-3 border-b border-gray-200">Detailed, plain English, per finding</td>
              <td className="p-3 border-b border-gray-200">Brief, more technical</td>
            </tr>
            <tr>
              <td className="p-3 border-b border-gray-200 font-medium">Pricing</td>
              <td className="p-3 border-b border-gray-200">$14.99 one-time per report</td>
              <td className="p-3 border-b border-gray-200">Free limited version; paid ~$10/mo</td>
            </tr>
            <tr>
              <td className="p-3 border-b border-gray-200 font-medium">Subscription</td>
              <td className="p-3 border-b border-gray-200">Not required</td>
              <td className="p-3 border-b border-gray-200">Yes for full features</td>
            </tr>
            <tr>
              <td className="p-3 border-b border-gray-200 font-medium">Number of checks</td>
              <td className="p-3 border-b border-gray-200">~60-70 high-impact checks</td>
              <td className="p-3 border-b border-gray-200">~100 checks</td>
            </tr>
            <tr>
              <td className="p-3 font-medium">Key advantage</td>
              <td className="p-3">Guided action plan</td>
              <td className="p-3">Broader check coverage</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">What you get from each tool in practice</h2>
        <div className="space-y-4">
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold text-gray-900 mb-1">An SEO CheckSite report will tell you:</h3>
            <ul className="text-gray-700 text-sm list-disc pl-5 space-y-1">
              <li>"Your 3 highest-priority issues are missing title tags on your services page, a broken footer link on your contact page, and an unsubmitted sitemap."</li>
              <li>"Fix the title tags first — here is how to edit them in [your CMS name]."</li>
              <li>"Here is the before-and-after so you can measure whether the fix worked."</li>
            </ul>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-1">An SEO Site Checkup report will tell you:</h3>
            <ul className="text-gray-700 text-sm list-disc pl-5 space-y-1">
              <li>"Your score is 62/100. You failed 37 of 100 checks."</li>
              <li>"Title tag — fail. Meta description — fail. Sitemap — fail."</li>
              <li>"Here is a brief description of each failed check."</li>
            </ul>
          </div>
        </div>
        <p className="text-gray-700 mt-4">
          Both approaches are valid, but they serve different working styles. If you already know SEO and just want a
          data dump, SEO Site Checkup works well. If you want guidance and prioritization, SEO CheckSite saves you the
          interpretation step.
        </p>
      </section>

      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-10">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">See your own site report format</h2>
        <p className="text-gray-700 mb-4">
          Use your free first report to evaluate whether the action-first format matches your workflow. For a one-time
          fee of $14.99 with no subscription, you can compare the approach against any other tool on the market risk-free.
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
    </main>
  )
}
