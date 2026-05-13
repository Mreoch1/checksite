import Link from 'next/link'
import Image from 'next/image'
import { Metadata } from 'next'
import { getSupabaseServiceClient } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'Sample Report | SEO CheckSite',
  description: 'View a sample SEO audit report to see what you\'ll get. Complete website analysis with actionable insights in plain language.',
  openGraph: {
    title: 'Sample SEO Audit Report | SEO CheckSite',
    description: 'See what you\'ll get in your SEO audit report. Complete website analysis with actionable insights.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sample SEO Audit Report | SEO CheckSite',
    description: 'See what you\'ll get in your SEO audit report.',
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://seochecksite.net'}/sample-report`,
  },
  robots: {
    index: true,
    follow: true,
  },
}

// Hardcoded fallback HTML used when DB query fails or no audit exists
const fallbackSampleHtml = `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO CheckSite - Website Report</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 900px; 
      margin: 0 auto; 
      padding: 20px; 
      background: #f9fafb;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 { 
      color: #0369a1; 
      margin-top: 0;
    }
    h3 {
      color: #0369a1;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 1.2em;
    }
    .summary { 
      background: #f0f9ff; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0; 
      border-left: 4px solid #0ea5e9;
    }
    .action { 
      background: #fff; 
      border-left: 4px solid #0ea5e9; 
      padding: 15px; 
      margin: 15px 0; 
      border-radius: 4px;
    }
    .action.high { border-left-color: #dc2626; }
    .action.medium { border-left-color: #f59e0b; }
    .action.low { border-left-color: #10b981; }
    .module-section {
      margin: 30px 0;
      padding: 20px;
      background: #f9fafb;
      border-radius: 6px;
    }
    .issue { 
      margin: 15px 0; 
      padding: 15px; 
      background: #fff; 
      border-radius: 6px; 
      border-left: 3px solid #e5e7eb;
    }
    .issue.high { border-left-color: #dc2626; }
    .issue.medium { border-left-color: #f59e0b; }
    .issue.low { border-left-color: #10b981; }
    .severity { 
      display: inline-block; 
      padding: 4px 12px; 
      border-radius: 4px; 
      font-size: 0.85em; 
      font-weight: 600; 
      margin-bottom: 10px; 
      text-transform: uppercase;
    }
    .severity.high { background: #fee2e2; color: #991b1b; }
    .severity.medium { background: #fef3c7; color: #92400e; }
    .severity.low { background: #d1fae5; color: #065f46; }
    .no-issues {
      color: #10b981;
      font-weight: 600;
      padding: 10px;
      background: #d1fae5;
      border-radius: 4px;
    }
    .meta-info {
      color: #6b7280;
      font-size: 0.95em;
      margin-bottom: 30px;
    }
    .evidence-table {
      margin: 15px 0;
      border-collapse: collapse;
      width: 100%;
      background: #fff;
      border-radius: 4px;
      overflow: hidden;
    }
    .evidence-table th {
      background: #f3f4f6;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      font-size: 0.9em;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    .evidence-table td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.9em;
    }
    .score-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 1.1em;
      margin: 10px 0;
    }
    .score-high { background: #d1fae5; color: #065f46; }
    .score-medium { background: #fef3c7; color: #92400e; }
    .score-low { background: #fee2e2; color: #991b1b; }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 20px; }
      a[href^="/"] { display: none; }
      .action, .issue { page-break-inside: avoid; }
      h1, h2 { page-break-after: avoid; }
    }
  </style>

  <div class="container">
    <h1>SEO CheckSite</h1>
    <div style="margin-bottom: 20px;">
      <a href="/" style="color: #0ea5e9; text-decoration: none; font-weight: 600;">← Back to Home</a>
    </div>
    
    <h1 style="margin-top: 20px;">Website Report</h1>
    <div class="meta-info">
      <p><strong>Website:</strong> seochecksite.net</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><strong>Overall Score:</strong> 
        <span class="score-badge score-medium">
          79/100
        </span>
      </p>
    </div>

    
    <h2>Page Breakdown</h2>
    <div class="summary">
      <table class="evidence-table">
        <tbody><tr><th>Page URL</th><td>https://seochecksite.net</td></tr>
        <tr><th>Final URL (after redirect)</th><td>https://seochecksite.net/</td></tr>
        <tr><th>Page Title</th><td>SEO CheckSite - Website Audit for Small Business Owners</td></tr>
        <tr><th>Page Description</th><td>Get a simple, jargon-free website report. No technical knowledge required. Professional SEO audits for small business owners.</td></tr>
        <tr><th>Main Heading (H1)</th><td>Get Your Website Checked</td></tr>
        <tr><th>Word Count</th><td>579 words</td></tr>
        <tr><th>Images</th><td>1 total</td></tr>
        <tr><th>Links</th><td>5 internal, 0 external</td></tr>
        <tr><th>HTTPS</th><td>Yes ✓</td></tr>
        <tr><th>Redirect</th><td>Yes (redirected from https://seochecksite.net to https://seochecksite.net/)</td></tr>
      </tbody></table>
    </div>
    
    <h2>Actions Recommended</h2>
    
    <div class="action high">
      <h3>Add Missing Meta Description</h3>
      <p>Your homepage meta description provides good content for search results, but make sure it covers your full value proposition clearly within the 155-160 character limit.</p>
    </div>
    
    <div class="action high">
      <h3>Improve Image Alt Text</h3>
      <p>Images with descriptive alt text help search engines understand your content and improve accessibility for visually impaired users.</p>
    </div>
    
    <div class="action medium">
      <h3>Improve Internal Linking Structure</h3>
      <p>Add more internal links between your pages to help search engines discover all your content and distribute link equity.</p>
    </div>
    
    <div class="action medium">
      <h3>Review Heading Structure</h3>
      <p>Ensure each page has one clear H1 tag and follows a logical hierarchy (H1 → H2 → H3) throughout.</p>
    </div>

    <div class="module-section">
      <h3>Content Analysis</h3>
      <p>Your page has decent content at 579 words, but consider expanding to at least 800-1000 words to provide more comprehensive coverage of your topic. Add more images to break up text and improve engagement.</p>
    </div>

    <div class="module-section">
      <h3>Technical Analysis</h3>
      <p>HTTPS is properly configured. Your page loads over a secure connection, which is a positive signal for both search engines and visitors. Redirect handling is correct: non-www redirects properly to www version.</p>
    </div>
  </div>
`

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }
}

async function getLatestSelfAudit() {
  try {
    const supabase = getSupabaseServiceClient()
    const { data, error } = await supabase
      .from('audits')
      .select('id, created_at, formatted_report_html')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0 || !data[0].formatted_report_html) {
      return null
    }
    return data[0]
  } catch {
    return null
  }
}

export default async function SampleReportPage() {
  const audit = await getLatestSelfAudit()
  const hasLiveReport = !!(audit?.formatted_report_html)
  const auditDate = audit?.created_at ? formatDate(audit.created_at) : null

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-blue-900 mb-2">Sample Report</h2>
          <p className="text-blue-800">
            {hasLiveReport && auditDate
              ? `Sample report from seochecksite.net — audited ${auditDate}`
              : 'This is an example of what your audit report will look like. Your actual report will be customized based on your website\'s specific findings.'}
          </p>
        </div>
        
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{
            __html: hasLiveReport && audit?.formatted_report_html
              ? audit.formatted_report_html
              : fallbackSampleHtml
          }}
        />
      </div>
    </div>
  )
}
