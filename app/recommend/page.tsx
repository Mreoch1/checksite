'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ModuleKey, MODULE_DISPLAY_NAMES, MODULE_DESCRIPTIONS, PRICING_CONFIG, CORE_MODULES } from '@/lib/types'

interface ModuleOption {
  key: ModuleKey
  recommended: boolean
  reason?: string
}

export default function RecommendPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [modules, setModules] = useState<ModuleOption[]>([])
  const [selectedModules, setSelectedModules] = useState<Set<ModuleKey>>(new Set())
  const [competitorUrl, setCompetitorUrl] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    // Reset processing state when component mounts or reloads
    setProcessing(false)
    setError('')

    // Get data from sessionStorage
    const auditUrl = sessionStorage.getItem('auditUrl')
    const auditEmail = sessionStorage.getItem('auditEmail')

    if (!auditUrl || !auditEmail) {
      router.push('/')
      return
    }

    setUrl(auditUrl)
    setEmail(auditEmail)

    // Fetch recommendations
    fetchRecommendations(auditUrl)
  }, [router])

  const fetchRecommendations = async (siteUrl: string) => {
    try {
      const response = await fetch('/api/recommend-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: siteUrl }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || `Server error (${response.status})`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // Build module list
      const moduleList: ModuleOption[] = []
      
      // Core modules are always included
      CORE_MODULES.forEach(key => {
        moduleList.push({ key, recommended: true })
      })

      // Optional modules (add-ons only)
      const optionalModules: ModuleKey[] = ['local', 'competitor_overview']
      optionalModules.forEach(key => {
        moduleList.push({
          key,
          recommended: data[key] || false,
          reason: data.reasons?.[key],
        })
      })

      setModules(moduleList)
      
      // Only select core modules by default (not add-ons like local or competitor_overview)
      // Users can manually check Local SEO and Competitor Overview if they want them
      const coreOnly = new Set<ModuleKey>()
      moduleList.forEach(m => {
        if (CORE_MODULES.includes(m.key)) {
          coreOnly.add(m.key)
        }
      })
      setSelectedModules(coreOnly)
      
      setLoading(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze your site. Please try again.'
      setError(errorMessage)
      setLoading(false)
      console.error('Error fetching recommendations:', err)
    }
  }

  const toggleModule = (key: ModuleKey) => {
    // Core modules cannot be deselected
    if (CORE_MODULES.includes(key)) {
      return
    }

    const newSelected = new Set(selectedModules)
    const isCurrentlySelected = newSelected.has(key)
    
    // If trying to SELECT competitor_overview, require competitor URL
    if (key === 'competitor_overview' && !isCurrentlySelected) {
      if (!competitorUrl || !competitorUrl.trim()) {
        setError('Please enter a competitor URL first to enable Competitor Overview.')
        return
      }
    }
    
    // Allow unchecking (deselecting) at any time
    if (isCurrentlySelected) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedModules(newSelected)
    // Clear error when successfully toggling
    if (error) {
      setError('')
    }
  }

  const calculateTotal = (): number => {
    let total = PRICING_CONFIG.basePrice
    selectedModules.forEach(key => {
      // Only charge for competitor_overview if competitor URL is provided
      if (key === 'competitor_overview') {
        if (competitorUrl && competitorUrl.trim()) {
          total += PRICING_CONFIG.modules[key] || 0
        }
      } else {
        total += PRICING_CONFIG.modules[key] || 0
      }
    })
    return total
  }

  const handleContinue = async () => {
    setProcessing(true)
    setError('')

    // Normalize main URL - ensure it has https:// and lowercase domain
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`
    }
    // Lowercase the domain part
    try {
      const urlObj = new URL(normalizedUrl)
      urlObj.hostname = urlObj.hostname.toLowerCase()
      normalizedUrl = urlObj.toString()
    } catch {
      normalizedUrl = normalizedUrl.toLowerCase()
    }

    // Validate and normalize competitor URL if Competitor Overview is selected
    let normalizedCompetitorUrl: string | undefined = undefined
    if (selectedModules.has('competitor_overview')) {
      const trimmedUrl = competitorUrl.trim()
      if (!trimmedUrl) {
        setError('Please enter a competitor URL to compare against, or uncheck Competitor Overview.')
        setProcessing(false)
        return
      }
      
      // Remove competitor_overview from selected modules if URL is invalid
      if (!trimmedUrl) {
        const newSelected = new Set(selectedModules)
        newSelected.delete('competitor_overview')
        setSelectedModules(newSelected)
        setError('Competitor Overview requires a valid competitor URL. It has been removed from your selection.')
        setProcessing(false)
        return
      }
      
      // Normalize competitor URL - ensure it has https:// and lowercase domain
      let tempUrl = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') 
        ? trimmedUrl 
        : `https://${trimmedUrl}`
      
      // Lowercase the domain part
      try {
        const urlObj = new URL(tempUrl)
        urlObj.hostname = urlObj.hostname.toLowerCase()
        normalizedCompetitorUrl = urlObj.toString()
      } catch {
        normalizedCompetitorUrl = tempUrl.toLowerCase()
      }
      
      // Basic URL validation
      try {
        new URL(normalizedCompetitorUrl)
      } catch {
        setError('Please enter a valid competitor URL (e.g., competitor.com or https://competitor.com)')
        setProcessing(false)
        return
      }
    }

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: normalizedUrl,
          email,
          modules: Array.from(selectedModules),
          competitorUrl: normalizedCompetitorUrl,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout')
      }

      const { checkoutUrl } = await response.json()
      // Store selected modules for success page
      sessionStorage.setItem('auditModules', JSON.stringify(Array.from(selectedModules)))
      window.location.href = checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to proceed to payment')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing your website...</p>
        </div>
      </div>
    )
  }

  // Calculate total dynamically (updates when selectedModules or competitorUrl changes)
  const totalCents = calculateTotal()
  const totalDollars = (totalCents / 100).toFixed(2)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="SEO CheckSite"
              width={240}
              height={72}
            />
          </Link>
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
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Recommended Checks for Your Site
          </h1>
          <p className="text-gray-600 mb-6">
            Based on your website, we recommend the following checks:
          </p>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="font-medium text-gray-900">Website: {url}</p>
          </div>

          <div className="space-y-4 mb-8">
            {modules.map((module) => {
              const isCore = CORE_MODULES.includes(module.key)
              const isSelected = selectedModules.has(module.key)
              const price = PRICING_CONFIG.modules[module.key]
              const priceDisplay = price > 0 ? `+$${(price / 100).toFixed(2)}` : 'Included'

              return (
                <div
                  key={module.key}
                  className={`border-2 rounded-lg p-4 ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : module.recommended 
                        ? 'border-gray-200 bg-white' 
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id={module.key}
                      name={`module-${module.key}`}
                      checked={isSelected}
                      onChange={() => toggleModule(module.key)}
                      disabled={isCore}
                      className="mt-1 h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border-gray-300 rounded"
                      aria-label={`${isSelected ? 'Deselect' : 'Select'} ${MODULE_DISPLAY_NAMES[module.key]} module`}
                      aria-describedby={`${module.key}-description`}
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={module.key}
                          className={`font-semibold text-lg ${
                            isCore ? 'text-gray-700' : 'text-gray-900 cursor-pointer'
                          }`}
                        >
                          {MODULE_DISPLAY_NAMES[module.key]}
                        </label>
                        {isCore && (
                          <span className="text-sm text-gray-500 font-normal">(Always included)</span>
                        )}
                        {!isCore && module.recommended && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                            Recommended
                          </span>
                        )}
                        {!isCore && !module.recommended && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded font-medium">
                            {module.key === 'local' ? 'Optional' : 'Not recommended'}
                          </span>
                        )}
                      </div>
                      <p id={`${module.key}-description`} className="text-gray-600 mt-1">{MODULE_DESCRIPTIONS[module.key]}</p>
                      {module.reason && (
                        <div 
                          className={`mt-2 p-2 rounded border-l-4 ${
                            module.recommended 
                              ? 'bg-blue-50 border-blue-400' 
                              : 'bg-gray-100 border-gray-400'
                          }`}
                          role="note"
                          aria-label={module.recommended ? 'Recommendation reason' : 'Not recommended reason'}
                        >
                          <p className={`text-sm ${
                            module.recommended 
                              ? 'text-blue-800' 
                              : 'text-gray-700'
                          }`}>
                            {module.recommended ? (
                              <>💡 <strong>Why recommended:</strong> {module.reason}</>
                            ) : (
                              <>ℹ️ {module.reason}</>
                            )}
                          </p>
                        </div>
                      )}
                      {module.key === 'competitor_overview' && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <label htmlFor="competitor-url" className="block text-sm font-medium text-gray-700 mb-2">
                            Competitor Website URL {isSelected && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            id="competitor-url"
                            value={competitorUrl}
                            onChange={(e) => {
                              setCompetitorUrl(e.target.value)
                              const trimmedValue = e.target.value.trim()
                              // If URL is cleared and competitor_overview is selected, unselect it
                              if (!trimmedValue && selectedModules.has('competitor_overview')) {
                                const newSelected = new Set(selectedModules)
                                newSelected.delete('competitor_overview')
                                setSelectedModules(newSelected)
                              }
                              // Clear error when URL is provided
                              if (trimmedValue && error) {
                                setError('')
                              }
                            }}
                            placeholder="competitor.com or https://competitor.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            aria-required={isSelected}
                            aria-describedby="competitor-url-help"
                          />
                          <p id="competitor-url-help" className="mt-1 text-xs text-gray-500">
                            {isSelected 
                              ? 'Enter the URL of a competitor website you want to compare against.'
                              : 'Enter a competitor URL to enable Competitor Overview (+$10.00)'}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 text-right">
                      <span className="font-semibold text-gray-900">{priceDisplay}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {error && (
            <div 
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <div className="border-t pt-6">
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Website Audit (Base Package):</span>
                <span>${(PRICING_CONFIG.basePrice / 100).toFixed(2)}</span>
              </div>
              {Array.from(selectedModules)
                .filter(key => {
                  // Only show add-ons with price > 0
                  if (PRICING_CONFIG.modules[key] <= 0) return false
                  // For competitor_overview, only show if competitor URL is provided
                  if (key === 'competitor_overview' && (!competitorUrl || !competitorUrl.trim())) {
                    return false
                  }
                  return true
                })
                .map(key => (
                  <div key={key} className="flex justify-between text-gray-600">
                    <span>{MODULE_DISPLAY_NAMES[key]}:</span>
                    <span>+${(PRICING_CONFIG.modules[key] / 100).toFixed(2)}</span>
                  </div>
                ))}
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                <span>Total:</span>
                <span>${(calculateTotal() / 100).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleContinue}
              disabled={processing}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-busy={processing}
              aria-label={processing ? 'Processing your request' : 'Continue to payment'}
            >
              {processing ? (
                <>
                  <span className="sr-only">Processing</span>
                  Processing...
                </>
              ) : (
                'Continue to Payment'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

