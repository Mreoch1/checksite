'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
              We'll email your complete report to you when it's ready (usually within a few minutes).
              The report will include actionable recommendations in plain language.
            </p>
          </div>

          {auditId && (
            <p className="text-sm text-gray-500">
              Audit ID: {auditId}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

