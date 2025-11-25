'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MODULE_DISPLAY_NAMES, ModuleKey } from '@/lib/types'

interface AuditStatus {
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_at?: string
}

export default function SuccessClient() {
  const searchParams = useSearchParams()
  const [auditId, setAuditId] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [modules, setModules] = useState<ModuleKey[]>([])
  const [auditStatus, setAuditStatus] = useState<AuditStatus | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)

  useEffect(() => {
    // Get audit ID from URL or sessionStorage
    const id = searchParams.get('audit_id') || sessionStorage.getItem('lastAuditId')
    const auditUrl = sessionStorage.getItem('auditUrl')
    const auditModules = sessionStorage.getItem('auditModules')

    if (id) {
      setAuditId(id)
      sessionStorage.setItem('lastAuditId', id)
      // Check audit status
      checkAuditStatus(id)
      // Poll every 10 seconds if not completed
      const interval = setInterval(() => {
        checkAuditStatus(id)
      }, 10000)
      return () => clearInterval(interval)
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

  const checkAuditStatus = async (id: string) => {
    if (checkingStatus) return
    setCheckingStatus(true)
    try {
      const response = await fetch(`/api/check-audit-status?id=${id}`)
      if (response.ok) {
        const data = await response.json()
        setAuditStatus(data)
      }
    } catch (error) {
      console.error('Error checking audit status:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  const getETA = (createdAt?: string): string => {
    if (!createdAt) return '5 minutes'
    const created = new Date(createdAt).getTime()
    const now = Date.now()
    const elapsed = (now - created) / 1000 / 60 // minutes
    const estimatedTotal = 5 // 5 minutes estimated
    const remaining = Math.max(0, estimatedTotal - elapsed)
    if (remaining < 1) return 'any moment now'
    return `${Math.ceil(remaining)} minutes`
  }

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
            <div className="flex justify-center mb-4">
              <Image
                src="/logo.svg"
                alt="SEO CheckSite"
                width={160}
                height={48}
              />
            </div>
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4">How to View Your Report</h2>
            
            <div className="space-y-4 text-left">
              <div>
                <p className="font-semibold text-blue-900 mb-2">📧 Option 1: Check Your Email</p>
                <p className="text-blue-800 text-sm">
                  You'll receive a <strong>Stripe receipt email</strong> with your payment confirmation. 
                  The email includes a link to your report in the product description.
                </p>
                <p className="text-blue-700 text-xs mt-1 italic">
                  Check your inbox (and spam folder) for an email from Stripe.
                </p>
              </div>

              <div>
                <p className="font-semibold text-blue-900 mb-2">🔗 Option 2: Use This Direct Link</p>
                {auditId && (
                  <div className="bg-white rounded p-3 border border-blue-200 mb-2">
                    <code className="text-sm text-blue-800 break-all">
                      {typeof window !== 'undefined' ? `${window.location.origin}/report/${auditId}` : `/report/${auditId}`}
                    </code>
                  </div>
                )}
                <p className="text-blue-800 text-sm">
                  Bookmark this link or click the button below to view your report.
                </p>
              </div>

              {auditStatus?.status === 'completed' ? (
                <div className="bg-green-50 border border-green-200 rounded p-3 mt-4">
                  <p className="text-green-900 font-semibold">✅ Your report is ready!</p>
                  <p className="text-green-800 text-sm mt-1">Click the button below to view it now.</p>
                </div>
              ) : auditStatus?.status === 'running' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                  <p className="text-yellow-900 font-semibold">⏳ Report is being generated...</p>
                  <p className="text-yellow-800 text-sm mt-1">
                    Estimated time remaining: <strong>{getETA(auditStatus.created_at)}</strong>
                  </p>
                  <p className="text-yellow-700 text-xs mt-1">
                    Check back in a few minutes or refresh this page.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
                  <p className="text-blue-900 font-semibold">⏱️ Report Processing</p>
                  <p className="text-blue-800 text-sm mt-1">
                    Your report is being generated. Estimated time: <strong>{getETA()}</strong>
                  </p>
                  <p className="text-blue-700 text-xs mt-1">
                    The report typically takes 2-5 minutes to complete. You can check back using the link above.
                  </p>
                </div>
              )}
            </div>
          </div>

          {auditId && (
            <div className="mt-4">
              <Link
                href={`/report/${auditId}`}
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {auditStatus?.status === 'completed' ? 'View Your Report' : 'Check Report Status'}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

