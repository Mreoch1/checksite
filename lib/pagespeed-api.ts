/**
 * Google PageSpeed Insights API caller
 * Fetches real-world performance metrics for a given URL
 * Requires PAGESPEED_API_KEY environment variable for production use (25K queries/day)
 * Without a key, quota is ~200 queries/day shared across all users — not reliable for customer reports
 */

export interface PageSpeedData {
  performanceScore: number | null
  fcp: string | null
  lcp: string | null
  tbt: string | null
  cls: string | null
  error?: string
}

export interface PageSpeedRawData {
  performanceScore: number | null
  fcp: number | null   // milliseconds
  lcp: number | null   // milliseconds
  tbt: number | null   // milliseconds
  cls: number | null   // unitless
  si: number | null    // speed index, milliseconds
  recommendations: string[]
  strategy: 'mobile' | 'desktop'
}

// Google PageSpeed Insights API key.
// Env var takes priority. Embedded fallback handles Netlify runtime scope issue.
// API keys are designed for client-side embedding and are rate-limited (25K queries/day).
const PAGESPEED_API_KEY_FALLBACK = 'AIzaSyAw8wYErbnaGqIZQfTpQc1u4FmTMykbON0'

/**
 * Call Google PageSpeed Insights API for a single strategy
 */
async function callPageSpeedAPI(
  url: string,
  strategy: 'mobile' | 'desktop'
): Promise<any | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const apiKey = process.env.PAGESPEED_API_KEY || PAGESPEED_API_KEY_FALLBACK
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}${apiKey ? `&key=${apiKey}` : ''}`
    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'SEO CheckSite/1.0' },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`PageSpeed API returned ${response.status} for ${strategy}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.warn(`PageSpeed API call failed for ${strategy}:`, error)
    return null
  }
}

/**
 * Parse the raw Lighthouse result from the PageSpeed API
 * Returns null if the response structure is invalid
 */
function parseLighthouseResult(data: any): {
  score: number
  fcp: number | null
  lcp: number | null
  tbt: number | null
  cls: number | null
  si: number | null
  recommendations: string[]
} | null {
  const lighthouse = data?.lighthouseResult
  if (!lighthouse) return null

  const audits = lighthouse.audits || {}

  const score = Math.round((lighthouse.categories?.performance?.score || 0) * 100)
  const fcp = audits['first-contentful-paint']?.numericValue ?? null
  const lcp = audits['largest-contentful-paint']?.numericValue ?? null
  const tbt = audits['total-blocking-time']?.numericValue ?? null
  const cls = audits['cumulative-layout-shift']?.numericValue ?? null
  const si = audits['speed-index']?.numericValue ?? null

  // Collect top improvement opportunities (passing audits with score < 0.9)
  const recommendations: string[] = []
  for (const [key, audit] of Object.entries(audits) as [string, any][]) {
    if (audit.score !== null && audit.score < 0.9 && audit.score > 0 && audit.title) {
      recommendations.push(audit.title)
      if (recommendations.length >= 5) break
    }
  }

  return { score, fcp, lcp, tbt, cls, si, recommendations }
}

/**
 * Uses mobile strategy (real-user metrics are more actionable for SMB audits).
 * Returns null if the API call fails entirely.
 */
export async function fetchPageSpeedMetrics(url: string): Promise<PageSpeedRawData | null> {
  const data = await callPageSpeedAPI(url, 'mobile')
  if (!data) return null

  const parsed = parseLighthouseResult(data)
  if (!parsed) return null

  return {
    performanceScore: parsed.score,
    fcp: parsed.fcp,
    lcp: parsed.lcp,
    tbt: parsed.tbt,
    cls: parsed.cls,
    si: parsed.si,
    recommendations: parsed.recommendations,
    strategy: 'desktop',
  }
}

/**
 * Fetch PageSpeed data and return simplified display-friendly data.
 * This is the high-level convenience function for report consumers.
 */
export async function getPageSpeedData(url: string): Promise<PageSpeedData> {
  const raw = await fetchPageSpeedMetrics(url)
  if (!raw) {
    return {
      performanceScore: null,
      fcp: null,
      lcp: null,
      tbt: null,
      cls: null,
      error: 'PageSpeed data unavailable (check PAGESPEED_API_KEY or try again later)',
    }
  }

  return {
    performanceScore: raw.performanceScore,
    fcp: raw.fcp !== null ? `${(raw.fcp / 1000).toFixed(1)}s` : null,
    lcp: raw.lcp !== null ? `${(raw.lcp / 1000).toFixed(1)}s` : null,
    tbt: raw.tbt !== null ? `${(raw.tbt / 1000).toFixed(1)}s` : null,
    cls: raw.cls !== null ? raw.cls.toFixed(3) : null,
  }
}
