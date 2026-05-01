/**
 * Google PageSpeed Insights API caller
 * Fetches real-world performance metrics for a given URL
 * No API key required for basic usage (rate-limited to ~200 queries/day per IP)
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

/**
 * Call Google PageSpeed Insights API for a single strategy
 */
async function callPageSpeedAPI(
  url: string,
  strategy: 'mobile' | 'desktop'
): Promise<any | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}`
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
 * Fetch detailed PageSpeed data from both mobile and desktop strategies.
 * Prefers desktop results, falls back to mobile.
 * Returns null entirely if both strategies fail.
 */
export async function fetchPageSpeedMetrics(url: string): Promise<PageSpeedRawData | null> {
  const strategies = ['desktop', 'mobile'] as const
  const results: Array<{ data: any; strategy: 'mobile' | 'desktop' }> = []

  for (const strategy of strategies) {
    const data = await callPageSpeedAPI(url, strategy)
    if (data) {
      results.push({ data, strategy })
    }
  }

  if (results.length === 0) return null

  const desktopResult = results.find(r => r.strategy === 'desktop')
  const mobileResult = results.find(r => r.strategy === 'mobile')
  const primary = desktopResult || mobileResult
  if (!primary) return null

  const parsed = parseLighthouseResult(primary.data)
  if (!parsed) return null

  return {
    performanceScore: parsed.score,
    fcp: parsed.fcp,
    lcp: parsed.lcp,
    tbt: parsed.tbt,
    cls: parsed.cls,
    si: parsed.si,
    recommendations: parsed.recommendations,
    strategy: primary.strategy,
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
      error: 'PageSpeed data unavailable (API quota exceeded or timeout)',
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
