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
  inp: number | null   // milliseconds (interaction-to-next-paint)
  si: number | null    // speed index, milliseconds
  recommendations: string[]
  strategy: 'mobile' | 'desktop'
}

// Google PageSpeed Insights API key.
// Env var takes priority. Embedded fallback handles Netlify runtime scope issue.
// API keys are designed for client-side embedding and are rate-limited (25K queries/day).
const PAGESPEED_API_KEY_FALLBACK = 'AIzaSy...bON0'

/**
 * Call Google PageSpeed Insights API for a single strategy
 * Includes retry-on-timeout and specific error type reporting
 */
async function callPageSpeedAPI(
  url: string,
  strategy: 'mobile' | 'desktop'
): Promise<{ data: any | null; error?: { type: 'timeout' | 'quota' | 'auth' | 'http' | 'unknown'; message: string } }> {
  const MAX_ATTEMPTS = 2
  let lastError: any = null
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutMs = attempt === 1 ? 30000 : 45000
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const apiKey = process.env.PAGESPEED_API_KEY || PAGESPEED_API_KEY_FALLBACK
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}${apiKey ? `&key=${apiKey}` : ''}`
      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'SEO CheckSite/1.0' },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        console.warn(`PageSpeed API returned ${response.status}: ${body.substring(0,200)}`)
        
        if (response.status === 429) {
          return { data: null, error: { type: 'quota', message: `API quota exhausted (HTTP 429) for ${strategy}` } }
        }
        if (response.status === 403) {
          return { data: null, error: { type: 'auth', message: `API key invalid or expired (HTTP 403) for ${strategy}` } }
        }
        return { data: null, error: { type: 'http', message: `HTTP ${response.status} for ${strategy}` } }
      }
      return { data: await response.json() }
    } catch (error: any) {
      lastError = error
      if (error?.name === 'AbortError') {
        console.warn(`PageSpeed API timeout on attempt ${attempt}/${MAX_ATTEMPTS} for ${strategy} (${attempt === 1 ? '30s' : '45s'})`)
        if (attempt < MAX_ATTEMPTS) {
          console.log(`🔄 Retrying PageSpeed API for ${strategy} with longer timeout (45s)...`)
          continue
        }
        return { data: null, error: { type: 'timeout', message: `API timed out after ${MAX_ATTEMPTS} attempts (last: ${attempt === 1 ? '30s' : '45s'}) for ${strategy}` } }
      }
      console.warn(`PageSpeed API call failed for ${strategy}:`, error)
      return { data: null, error: { type: 'unknown', message: `${error instanceof Error ? error.message : String(error)} for ${strategy}` } }
    }
  }
  
  return { data: null, error: { type: 'unknown', message: `Exhausted ${MAX_ATTEMPTS} attempts for ${strategy}` } }
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
  inp: number | null
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
  const inp = audits['interaction-to-next-paint']?.numericValue ?? null
  const si = audits['speed-index']?.numericValue ?? null

  // Collect top improvement opportunities (passing audits with score < 0.9)
  const recommendations: string[] = []
  for (const [key, audit] of Object.entries(audits) as [string, any][]) {
    if (audit.score !== null && audit.score < 0.9 && audit.score > 0 && audit.title) {
      recommendations.push(audit.title)
      if (recommendations.length >= 5) break
    }
  }

  return { score, fcp, lcp, tbt, cls, inp, si, recommendations }
}

/**
 * Uses mobile strategy (real-user metrics are more actionable for SMB audits).
 * Returns null if the API call fails entirely.
 */
export async function fetchPageSpeedMetrics(url: string): Promise<{ data: PageSpeedRawData | null; error?: { type: string; message: string } }> {
  const result = await callPageSpeedAPI(url, 'mobile')
  if (!result.data) {
    return { data: null, error: result.error }
  }

  const parsed = parseLighthouseResult(result.data)
  if (!parsed) {
    return { data: null, error: { type: 'parse', message: 'Failed to parse Lighthouse result' } }
  }

  return {
    data: {
      performanceScore: parsed.score,
      fcp: parsed.fcp,
      lcp: parsed.lcp,
      tbt: parsed.tbt,
      cls: parsed.cls,
      inp: parsed.inp,
      si: parsed.si,
      recommendations: parsed.recommendations,
      strategy: 'mobile',
    },
  }
}

/**
 * Fetch PageSpeed data and return simplified display-friendly data.
 * This is the high-level convenience function for report consumers.
 */
export async function getPageSpeedData(url: string): Promise<PageSpeedData> {
  const result = await fetchPageSpeedMetrics(url)
  if (!result.data) {
    const errorMsg = result.error?.type === 'timeout' 
      ? 'PageSpeed API timed out — the site took too long to analyze. Try a lighter page URL.'
      : result.error?.type === 'quota'
      ? 'PageSpeed API quota exceeded. Try again tomorrow.'
      : result.error?.type === 'auth'
      ? 'PageSpeed API key invalid. Check PAGESPEED_API_KEY.'
      : 'PageSpeed data unavailable (check PAGESPEED_API_KEY or try again later)'
    return {
      performanceScore: null,
      fcp: null,
      lcp: null,
      tbt: null,
      cls: null,
      error: errorMsg,
    }
  }

  return {
    performanceScore: result.data.performanceScore,
    fcp: result.data.fcp !== null ? `${(result.data.fcp / 1000).toFixed(1)}s` : null,
    lcp: result.data.lcp !== null ? `${(result.data.lcp / 1000).toFixed(1)}s` : null,
    tbt: result.data.tbt !== null ? `${(result.data.tbt / 1000).toFixed(1)}s` : null,
    cls: result.data.cls !== null ? result.data.cls.toFixed(3) : null,
  }
}
