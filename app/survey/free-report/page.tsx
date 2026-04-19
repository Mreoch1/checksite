'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

function SurveyForm() {
  const searchParams = useSearchParams()
  const auditId = searchParams.get('audit')?.trim() || ''

  const [overallRating, setOverallRating] = useState('')
  const [metExpectations, setMetExpectations] = useState('')
  const [wouldPurchaseFull, setWouldPurchaseFull] = useState('')
  const [additionalComments, setAdditionalComments] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!auditId) {
      setMessage('Missing audit link. Please use the link from your follow-up email.')
      setStatus('error')
      return
    }
    if (!overallRating || !metExpectations || !wouldPurchaseFull) {
      setMessage('Please answer all required questions.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    try {
      const res = await fetch('/api/survey/free-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          overallRating,
          metExpectations,
          wouldPurchaseFull,
          additionalComments: additionalComments.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }
      setStatus('done')
    } catch {
      setMessage('Network error. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="max-w-lg mx-auto text-center py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you</h1>
        <p className="text-gray-600 mb-6">Your feedback helps us improve the free report and plan better paid audits.</p>
        <Link href="/" className="text-blue-600 font-medium hover:text-blue-700">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Free report feedback</h1>
      <p className="text-gray-600 text-sm leading-relaxed">
        This short survey is only for people who received a free report. It takes about one minute.
      </p>

      {!auditId && (
        <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm" role="alert">
          Open this page using the link in your follow-up email so we can match your answers to your report.
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-900 mb-2">How did you like the report?</legend>
        <select
          value={overallRating}
          onChange={(e) => setOverallRating(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          aria-label="How did you like the report"
        >
          <option value="">Select...</option>
          <option value="loved">Loved it</option>
          <option value="mostly_yes">Mostly liked it</option>
          <option value="mixed">Mixed</option>
          <option value="no">Did not like it</option>
        </select>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-900 mb-2">Was it what you expected?</legend>
        <select
          value={metExpectations}
          onChange={(e) => setMetExpectations(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          aria-label="Was the report what you expected"
        >
          <option value="">Select...</option>
          <option value="yes">Yes</option>
          <option value="somewhat">Somewhat</option>
          <option value="no">No</option>
        </select>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-900 mb-2">Would you consider purchasing a full paid audit in the future?</legend>
        <select
          value={wouldPurchaseFull}
          onChange={(e) => setWouldPurchaseFull(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          aria-label="Would you consider a full paid audit"
        >
          <option value="">Select...</option>
          <option value="likely">Likely</option>
          <option value="maybe">Maybe</option>
          <option value="unlikely">Unlikely</option>
        </select>
      </fieldset>

      <div>
        <label htmlFor="comments" className="block text-sm font-semibold text-gray-900 mb-2">
          Anything else we should know? <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          id="comments"
          value={additionalComments}
          onChange={(e) => setAdditionalComments(e.target.value)}
          rows={4}
          maxLength={5000}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Suggestions, missing topics, or what would make a paid audit valuable to you."
        >
        </textarea>
      </div>

      {message && status === 'error' && (
        <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm" role="alert">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {status === 'submitting' ? 'Submitting...' : 'Submit feedback'}
      </button>
    </form>
  )
}

export default function FreeReportSurveyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-xl mx-auto mb-8 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Image src="/logo.svg" alt="SEO CheckSite" width={200} height={60} />
        </Link>
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Home
        </Link>
      </div>
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <Suspense
          fallback={
            <div className="text-center text-gray-600 py-8" aria-busy="true">
              Loading survey...
            </div>
          }
        >
          <SurveyForm />
        </Suspense>
      </div>
    </div>
  )
}
