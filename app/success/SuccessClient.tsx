'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MODULE_DISPLAY_NAMES, ModuleKey } from '@/lib/types'

export default function SuccessClient() {
  const searchParams = useSearchParams()
  const [url, setUrl] = useState<string | null>(null)
  const [modules, setModules] = useState<ModuleKey[]>([])

  useEffect(() => {
    const auditUrl = sessionStorage.getItem('auditUrl')
    const auditModules = sessionStorage.getItem('auditModules')

    if (auditUrl) {
      setUrl(auditUrl)
    }
    if (auditModules) {
      try {
        setModules(JSON.parse(auditModules))
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center py-12">
      <div className="max-w-2xl mx-auto px-4">
        <nav aria-label="Breadcrumb">
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
        </nav>
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="flex justify-center mb-4">
              <Image
                src="/logo.svg"
                alt="SEO CheckSite - Website Audit for Small Business Owners"
                width={240}
                height={72}
                priority
              />
            </div>
            <div 
              className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              role="img"
              aria-label="Success checkmark"
            >
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600 mb-4">
              Your website audit is being processed.
            </p>
          </div>

          <section aria-labelledby="audit-summary-heading" className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
            <h2 id="audit-summary-heading" className="font-semibold text-gray-900 mb-3">Audit Summary</h2>
            {url && (
              <p className="text-gray-600 mb-2">
                <span className="font-medium">Website:</span> {url}
              </p>
            )}
            {modules.length > 0 && (
              <div>
                <p className="font-medium text-gray-900 mb-2">Selected Checks:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  {modules.map((module, idx) => (
                    <li key={idx}>{MODULE_DISPLAY_NAMES[module] || module}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section aria-labelledby="email-notice-heading" className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start justify-center mb-4">
              <svg
                className="w-8 h-8 text-blue-600 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <div className="text-left">
                <h2 id="email-notice-heading" className="text-xl font-bold text-blue-900 mb-2">
                  Check Your Email
                </h2>
                <p className="text-blue-800 mb-3">
                  Your report will be sent to your email address within <strong>5-10 minutes</strong>.
                </p>
                <p className="text-blue-700 text-sm">
                  Look for an email from <strong>SEO CheckSite</strong> with your complete audit report and recommendations.
                </p>
                <p className="text-blue-600 text-xs mt-2 italic">
                  Don't forget to check your spam folder if you don't see it in your inbox.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

