'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const validateUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!url.trim()) {
      setError('Please enter a website URL')
      return
    }

    if (!validateUrl(url)) {
      setError('Please enter a valid URL (e.g., example.com or https://example.com)')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      // Normalize URL
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
      
      // Store in sessionStorage and redirect
      sessionStorage.setItem('auditUrl', normalizedUrl)
      sessionStorage.setItem('auditEmail', email)
      if (name.trim()) {
        sessionStorage.setItem('auditName', name)
      }

      router.push('/recommend')
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index)
  }

  const faqs = [
    {
      question: 'How long does the audit take?',
      answer: 'Your report will be delivered to your email within 5-10 minutes after you complete checkout. We analyze your site automatically and send you a complete report.',
    },
    {
      question: 'What if my site is down or has errors?',
      answer: 'If we cannot access your website, we will notify you immediately and provide guidance on how to fix the issue. You can retry the audit once your site is back online.',
    },
    {
      question: 'Will this affect my SEO or website?',
      answer: 'No. Our audit is read-only. We only analyze your website—we never make changes, add code, or modify anything. Your site remains completely untouched.',
    },
    {
      question: 'Do you store my data?',
      answer: 'We store your audit report so you can access it later via a secure link. We never share or sell your email address or website data. See our Privacy Policy for full details.',
    },
    {
      question: 'What happens after I get my report?',
      answer: 'Your report includes clear, actionable steps to improve your SEO. You can work through the recommendations at your own pace, or share the report with your web designer.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.svg"
              alt="SEO CheckSite"
              width={360}
              height={108}
              priority
            />
          </div>
          
          {/* Credibility Badge */}
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6 text-sm text-gray-700">
            <span className="text-green-600 font-semibold">✓</span>
            <span>1,000+ audits delivered</span>
          </div>

          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Get Your Website Checked
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            One-time website audit for regular business owners
          </p>
          <div className="mb-4">
            <p className="text-2xl font-bold text-blue-600 mb-2">
              Basic audit starting at $19.99
            </p>
            <p className="text-lg text-gray-500">
              No jargon. No technical knowledge needed. Just clear, actionable insights.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div 
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Your Website URL
              </label>
              <input
                type="text"
                id="url"
                name="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="example.com or https://example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                aria-required="true"
                aria-describedby="url-description"
              />
              <p id="url-description" className="sr-only">
                Enter the website URL you want to audit
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Your Email Address <span className="text-red-600" aria-label="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
                aria-required="true"
                aria-describedby="email-description"
                autoComplete="email"
              />
              <p id="email-description" className="mt-1 text-sm text-gray-500">
                We'll email your report here when it's ready
              </p>
              <p className="mt-1 text-xs text-gray-400">
                🔒 We never share or sell your email.
              </p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name <span className="text-gray-500 text-sm font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                aria-required="false"
                autoComplete="name"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 px-8 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 shadow-lg"
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="sr-only">Processing your request</span>
                  Checking your site...
                </>
              ) : (
                'Check My Site'
              )}
            </button>

            {/* Pricing Clarity */}
            <div className="text-center pt-2">
              <p className="text-base font-semibold text-gray-900 mb-1">
                Starting at $19.99
              </p>
              <p className="text-sm text-gray-600">
                <strong>One-time audit.</strong> Flat price. <strong>No subscription.</strong>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Delivered to your inbox in 5-10 minutes.
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Report Preview Section */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What You'll Get in Your Report
            </h2>
            <p className="text-lg text-gray-600">
              A complete, easy-to-understand analysis of your website
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Overall Score</h3>
                  <p className="text-gray-600 text-sm">See how your site performs with a clear 0-100 score</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Page Breakdown</h3>
                  <p className="text-gray-600 text-sm">Title, description, headings, links, and more for each page</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Quick Fix Checklist</h3>
                  <p className="text-gray-600 text-sm">Prioritized list of what to fix first</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔍</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Detailed Analysis</h3>
                  <p className="text-gray-600 text-sm">Evidence tables showing exactly what we found</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Actionable Steps</h3>
                  <p className="text-gray-600 text-sm">Plain-language explanations of how to fix each issue</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-100 rounded-lg p-6 border-2 border-gray-200">
              <div className="bg-white rounded shadow-sm p-4 text-left">
                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                  <h4 className="font-bold text-gray-900">Website Report</h4>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">81/100</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Executive Summary</p>
                    <p className="text-gray-600">Your website is in good overall health with strong SEO fundamentals.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Top Priority Actions</p>
                    <ul className="text-gray-600 list-disc list-inside space-y-1">
                      <li>Sitemap file not found</li>
                      <li>Robots.txt may be blocking search engines</li>
                      <li>5 broken links found</li>
                      <li>No structured data found</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Module Scores</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>Performance: 95/100</div>
                      <div>Mobile: 85/100</div>
                      <div>On-Page: 90/100</div>
                      <div>Security: 95/100</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Link
                  href="/sample-report"
                  className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  View Full Sample Report →
                </Link>
              </div>
              <p className="text-xs text-center text-gray-500 mt-3">See a complete example report</p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Check Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What We Check
            </h2>
            <p className="text-lg text-gray-600">
              Comprehensive analysis across all important areas
            </p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { icon: '🔍', name: 'On-Page SEO', desc: 'Titles, descriptions, headings' },
              { icon: '⚡', name: 'Performance', desc: 'Page speed & loading' },
              { icon: '📱', name: 'Mobile', desc: 'Mobile-friendly design' },
              { icon: '🔒', name: 'Security', desc: 'HTTPS & security headers' },
              { icon: '♿', name: 'Accessibility', desc: 'Usability for everyone' },
              { icon: '🔗', name: 'Crawl Health', desc: 'Search engine access' },
            ].map((module, idx) => (
              <div key={idx} className="bg-white rounded-lg p-6 text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl mb-3">{module.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{module.name}</h3>
                <p className="text-sm text-gray-600">{module.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Small Business Owners Love It */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Small Business Owners Love It
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-600">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Simple Language</h3>
              <p className="text-gray-700">
                No technical jargon. We explain everything in plain English so you understand what needs fixing and why it matters.
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-600">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Actionable Steps</h3>
              <p className="text-gray-700">
                Every issue comes with clear instructions on how to fix it. You'll know exactly what to do next.
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-6 border-l-4 border-purple-600">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Fast Results</h3>
              <p className="text-gray-700">
                Get your complete report in minutes, not days. Start improving your site right away.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: 'Finally, an SEO report I can actually understand! The plain language explanations helped me fix issues I didn\'t even know I had.',
                author: 'Sarah M.',
                role: 'Local Business Owner',
              },
              {
                quote: 'Got my report in 10 minutes and started making changes the same day. The checklist format made it so easy to follow.',
                author: 'Mike T.',
                role: 'E-commerce Store Owner',
              },
              {
                quote: 'I\'ve tried other SEO tools, but this one actually tells me what to do. Worth every penny.',
                author: 'Jennifer L.',
                role: 'Service Business Owner',
              },
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex gap-1 mb-4 text-yellow-400">
                  {'★★★★★'.split('').map((star, i) => (
                    <span key={i}>{star}</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">&ldquo;{testimonial.quote}&rdquo;</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-expanded={expandedFaq === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <span className="text-gray-500 text-xl">
                    {expandedFaq === index ? '−' : '+'}
                  </span>
                </button>
                {expandedFaq === index && (
                  <div
                    id={`faq-answer-${index}`}
                    className="px-6 py-4 bg-white text-gray-700"
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to See How Your Website Stacks Up?
          </h2>
          <p className="text-xl text-blue-100 mb-2">
            Get your complete audit report in minutes
          </p>
          <p className="text-lg font-semibold text-white mb-8">
            Starting at just $19.99
          </p>
          <a
            href="#main-content"
            className="inline-block bg-white text-blue-600 py-4 px-8 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors shadow-lg focus:ring-4 focus:ring-blue-300 focus:ring-offset-2"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Start Your Audit
          </a>
        </div>
      </section>
    </div>
  )
}

