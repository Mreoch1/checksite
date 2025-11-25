import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import PrintButton from './PrintButton'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data: audit } = await supabase
    .from('audits')
    .select('url, status')
    .eq('id', params.id)
    .single()

  if (!audit) {
    return {
      title: 'Report Not Found | SEO CheckSite',
    }
  }

  const domain = audit.url ? new URL(audit.url).hostname : 'your website'
  
  return {
    title: `Website Audit Report for ${domain} | SEO CheckSite`,
    description: `Complete SEO audit report for ${domain}. Get actionable insights to improve your website's performance and search rankings.`,
  }
}

export default async function ReportPage({ params }: { params: { id: string } }) {
  const { id } = params

  // Fetch audit from database
  const { data: audit, error } = await supabase
    .from('audits')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !audit) {
    notFound()
  }

  if (audit.status !== 'completed' || !audit.formatted_report_html) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
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
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
            role="status"
            aria-label="Loading report"
          >
            <span className="sr-only">Loading...</span>
          </div>
          <p className="text-gray-600" role="status" aria-live="polite">Your report is still being generated...</p>
          <p className="text-sm text-gray-500 mt-2">We'll email you when it's ready.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" aria-label="Go to homepage">
            <Image
              src="/logo.svg"
              alt="SEO CheckSite - Website Audit for Small Business Owners"
              width={240}
              height={72}
              priority
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label="Back to homepage"
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
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: audit.formatted_report_html }}
        />
        <div className="mt-8 pt-8 border-t text-center">
          <PrintButton />
        </div>
      </div>
    </div>
  )
}

