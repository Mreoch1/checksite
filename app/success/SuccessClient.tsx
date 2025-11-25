'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MODULE_DISPLAY_NAMES, ModuleKey } from '@/lib/types'

export default function SuccessClient() {
  const searchParams = useSearchParams()
  const [auditId, setAuditId] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [modules, setModules] = useState<ModuleKey[]>([])

  useEffect(() => {
    // Get audit ID from URL or sessionStorage
    const id = searchParams.get('audit_id') || sessionStorage.getItem('lastAuditId')
    const auditUrl = sessionStorage.getItem('auditUrl')
    const auditModules = sessionStorage.getItem('auditModules')

    if (id) {
      setAuditId(id)
      sessionStorage.setItem('lastAuditId', id)
    }
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
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
            <p className="text-gray-600">
              Thanks, your website audit is being created.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
            <h2 className="font-semibold text-gray-900 mb-3">Audit Summary</h2>
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
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-900">
              <strong>What happens next?</strong>
            </p>
            <p className="text-blue-800 mt-2">
              Your report is being generated (usually within a few minutes).
              The report will include actionable recommendations in plain language.
            </p>
            {auditId && (
              <div className="mt-4">
                <p className="text-blue-900 font-medium mb-2">Your Report Link:</p>
                <div className="bg-white rounded p-3 border border-blue-200">
                  <code className="text-sm text-blue-800 break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/report/${auditId}` : `/report/${auditId}`}
                  </code>
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  Bookmark this link or check back in a few minutes. Your report will be available here when ready.
                </p>
              </div>
            )}
          </div>

          {auditId && (
            <div className="mt-4">
              <Link
                href={`/report/${auditId}`}
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                View Report (when ready)
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

