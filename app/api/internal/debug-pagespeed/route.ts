import { NextRequest, NextResponse } from 'next/server'
import { fetchPageSpeedMetrics } from '@/lib/pagespeed-api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const key = process.env.PAGESPEED_API_KEY || '(none)'
  const results: any = {
    key_present: !!process.env.PAGESPEED_API_KEY,
    key_len: key.length,
    key_preview: key.length > 4 ? key.slice(0, 6) + '...' + key.slice(-4) : key,
  }

  // ALSO test the direct call for comparison
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://seochecksite.net&strategy=mobile&key=${key}`
    const resp = await fetch(apiUrl, {
      headers: { 'User-Agent': 'SEO CheckSite/1.0' },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    results.direct_status = resp.status
    if (resp.ok) {
      const data = await resp.json()
      results.direct_has_lighthouse = !!data?.lighthouseResult
      results.direct_score = data?.lighthouseResult?.categories?.performance?.score
      results.direct_lcp = data?.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue
    } else {
      results.direct_error_body = (await resp.text()).substring(0, 200)
    }
  } catch (err: any) {
    results.direct_fetch_error = err.message
  }

  // Use the EXACT same function the audit uses
  try {
    const data = await fetchPageSpeedMetrics('https://seochecksite.net')
    results.via_function_worked = data !== null
    if (data) {
      results.score = data.performanceScore
      results.lcp = data.lcp
      results.cls = data.cls
    }
  } catch (err: any) {
    results.via_function_error = err.message
  }

  return NextResponse.json(results)
}
