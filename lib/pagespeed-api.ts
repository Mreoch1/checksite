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
 * Call Google PageSpeed Insights API for a single strategy.
 *
 * Reliability layer:
 * - 3 attempts with progressive timeouts (30s, 45s, 60s) — heavy JS-rendered
 *   sites (e.g. major brand sites with hundreds of scripts) can need ~50s of
 *   Lighthouse runtime before responding.
 * - Retry on transient failures: timeouts, network errors, HTTP 5xx, HTTP 408.
 * - Fast-fail on permanent failures: HTTP 401/403 (auth) and HTTP 429 (quota)
 *   — those won't be fixed by waiting.
 * - Small backoff between retries (1s, 2s) to give the upstream a moment.
 */
async function callPageSpeedAPI(
  url: string,
  strategy: 'mobile' | 'desktop'
): Promise<{ data: any | null; error?: { type: 'timeout' | 'quota' | 'auth' | 'http' | 'network' | 'unknown'; message: string } }> {
  const TIMEOUTS_MS = [30000, 45000]
  const MAX_ATTEMPTS = TIMEOUTS_MS.length
  const BACKOFF_MS = [0, 1000, 2000]

  let lastError: { type: 'timeout' | 'quota' | 'auth' | 'http' | 'network' | 'unknown'; message: string } | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt - 1] > 0) {
      await new Promise(resolve => setTimeout(resolve, BACKOFF_MS[attempt - 1]))
    }
    try {
      const controller = new AbortController()
      const timeoutMs = TIMEOUTS_MS[attempt - 1]
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
        console.warn(`PageSpeed API returned ${response.status} on attempt ${attempt}/${MAX_ATTEMPTS} for ${strategy}: ${body.substring(0, 200)}`)

        // Permanent failures — don't retry.
        if (response.status === 429) {
          return { data: null, error: { type: 'quota', message: `API quota exhausted (HTTP 429) for ${strategy}` } }
        }
        if (response.status === 401 || response.status === 403) {
          return { data: null, error: { type: 'auth', message: `API key invalid or expired (HTTP ${response.status}) for ${strategy}` } }
        }
        // Transient failures — retry on 408 Request Timeout and 5xx.
        if (response.status === 408 || response.status >= 500) {
          lastError = { type: 'http', message: `HTTP ${response.status} for ${strategy}` }
          if (attempt < MAX_ATTEMPTS) {
            console.log(`🔄 Retrying PageSpeed API for ${strategy} after HTTP ${response.status} (attempt ${attempt + 1}/${MAX_ATTEMPTS})`)
            continue
          }
          return { data: null, error: lastError }
        }
        // Other 4xx: fail fast.
        return { data: null, error: { type: 'http', message: `HTTP ${response.status} for ${strategy}` } }
      }
      return { data: await response.json() }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        const timeoutSec = TIMEOUTS_MS[attempt - 1] / 1000
        console.warn(`PageSpeed API timeout on attempt ${attempt}/${MAX_ATTEMPTS} for ${strategy} (${timeoutSec}s)`)
        lastError = { type: 'timeout', message: `API timed out after ${MAX_ATTEMPTS} attempts (last: ${timeoutSec}s) for ${strategy}` }
        if (attempt < MAX_ATTEMPTS) {
          const nextSec = TIMEOUTS_MS[attempt] / 1000
          console.log(`🔄 Retrying PageSpeed API for ${strategy} with longer timeout (${nextSec}s)...`)
          continue
        }
        return { data: null, error: lastError }
      }
      // Network-level error (DNS, connection reset, etc.) — usually transient.
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`PageSpeed API network error on attempt ${attempt}/${MAX_ATTEMPTS} for ${strategy}: ${message}`)
      lastError = { type: 'network', message: `${message} for ${strategy}` }
      if (attempt < MAX_ATTEMPTS) {
        console.log(`🔄 Retrying PageSpeed API for ${strategy} after network error (attempt ${attempt + 1}/${MAX_ATTEMPTS})`)
        continue
      }
      return { data: null, error: lastError }
    }
  }

  return { data: null, error: lastError ?? { type: 'unknown', message: `Exhausted ${MAX_ATTEMPTS} attempts for ${strategy}` } }
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
  const psData = result.data
  if (!psData) {
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
    performanceScore: psData.performanceScore,
    fcp: psData.fcp !== null ? `${(psData.fcp / 1000).toFixed(1)}s` : null,
    lcp: psData.lcp !== null ? `${(psData.lcp / 1000).toFixed(1)}s` : null,
    tbt: psData.tbt !== null ? `${(psData.tbt / 1000).toFixed(1)}s` : null,
    cls: psData.cls !== null ? psData.cls.toFixed(3) : null,
  }
}
