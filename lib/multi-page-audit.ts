/**
 * Multi-page audit orchestrator.
 *
 * The audit product previously analyzed only the homepage. Customers and
 * comparison reviewers expect a "website audit" to look at multiple pages.
 * This module wraps the existing single-URL `runAuditModules` to produce an
 * aggregated, multi-page result without changing the modules themselves.
 *
 * Design decisions (documented in PROJECT.md → Architecture Decisions):
 *
 * 1. Some modules are inherently SITE-WIDE — robots.txt is one file, security
 *    headers come from the server, business address lives in the footer. Running
 *    these per-page doesn't add information; we run them on the homepage only.
 *
 * 2. Other modules are PER-PAGE and benefit from cross-page sampling — page
 *    titles, headings, alt text, structured data, social tags, AI readiness.
 *    For these we run the module on each sampled page and aggregate the
 *    results.
 *
 * 3. Aggregation strategy varies by module:
 *      - WORST score for on_page and mobile — a single broken page is what a
 *        customer sees and complains about; the average hides the problem.
 *      - AVERAGE score for accessibility, schema, social, llm_readiness —
 *        these tend to be consistent site-wide, and the average gives a
 *        truer headline reading.
 *
 * 4. PageSpeed is run on the homepage ONLY to protect the API quota. Per-page
 *    Performance is a separate decision and is NOT enabled here.
 *
 * 5. The homepage is always included in the per-page set even if it isn't in
 *    the sitemap sample, so its data feeds into the aggregation.
 *
 * 6. Sampled page fetches are bounded to concurrency 3 to avoid overwhelming
 *    the target site (and to stay within Netlify function memory limits).
 */

import { runAuditModules, SiteData } from '@/lib/audit/modules'
import { ModuleKey, ModuleResult, AuditIssue } from '@/lib/types'

/** Modules that run on the homepage only (single-source data, no aggregation). */
const SITE_WIDE_MODULES: ReadonlyArray<ModuleKey> = [
  'performance',
  'crawl_health',
  'security',
  'local',
  'competitor_overview',
]

/**
 * Aggregation strategy for per-page modules.
 * 'worst' — keep the worst-scoring page's result. Customer-facing breakage signal.
 * 'avg'   — average scores; merge issues. Consistent-across-site signal.
 */
const PER_PAGE_AGGREGATION: Record<string, 'worst' | 'avg'> = {
  on_page: 'worst',
  mobile: 'worst',
  accessibility: 'avg',
  schema: 'avg',
  social: 'avg',
  llm_readiness: 'avg',
}

export type PageAuditStatus = {
  url: string
  status: 'ok' | 'failed'
  failureReason?: string
}

export type MultiPageAuditResult = {
  results: ModuleResult[]
  /** The cheerio-loaded SiteData for the homepage; forwarded to pageAnalysis. */
  siteData: SiteData
  pagesAudited: PageAuditStatus[]
}

/**
 * Run the full module suite on the homepage AND a per-page subset on each
 * additionally sampled page, then aggregate.
 *
 * @param homepageUrl    The audit's primary URL (already normalized).
 * @param sampledPageUrls Additional URLs sampled from the sitemap. The
 *                        homepage is filtered out automatically if present.
 * @param enabledModules  All modules the customer paid for. Per-page runs
 *                        only execute the per-page subset of these.
 * @param competitorUrl   Optional competitor URL for the competitor_overview
 *                        module (which only runs on the homepage anyway).
 */
export async function runMultiPageAudit(
  homepageUrl: string,
  sampledPageUrls: string[],
  enabledModules: ModuleKey[],
  competitorUrl: string | null,
): Promise<MultiPageAuditResult> {
  // Step 1 — full module suite on the homepage. Includes PageSpeed, robots,
  // security headers, etc.
  const homepageRun = await runAuditModules(homepageUrl, enabledModules, competitorUrl)
  const homepageResults = homepageRun.results
  const homepageSiteData = homepageRun.siteData

  const pagesAudited: PageAuditStatus[] = [{ url: homepageUrl, status: 'ok' }]

  // Per-page modules — drop site-wide ones from the per-page run.
  const perPageModules = enabledModules.filter(
    (m): m is ModuleKey => !SITE_WIDE_MODULES.includes(m),
  )

  // Strip the homepage from the sampled list (we already audited it).
  const homepageNorm = normalizeForCompare(homepageUrl)
  const additionalUrls = sampledPageUrls.filter((u) => normalizeForCompare(u) !== homepageNorm)

  // Step 2 — run per-page modules on each additional URL with bounded concurrency.
  const perPageResultsByUrl = new Map<string, ModuleResult[]>()
  if (perPageModules.length > 0 && additionalUrls.length > 0) {
    const CONCURRENCY = 3
    for (let i = 0; i < additionalUrls.length; i += CONCURRENCY) {
      const batch = additionalUrls.slice(i, i + CONCURRENCY)
      const batchResults = await Promise.allSettled(
        batch.map((url) => runAuditModules(url, perPageModules, null)),
      )
      for (let j = 0; j < batchResults.length; j++) {
        const url = batch[j]
        const result = batchResults[j]
        if (result.status === 'fulfilled') {
          perPageResultsByUrl.set(url, result.value.results)
          pagesAudited.push({ url, status: 'ok' })
        } else {
          const reason =
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          pagesAudited.push({ url, status: 'failed', failureReason: reason })
          console.warn(`[runMultiPageAudit] ${url} failed:`, reason)
        }
      }
    }
  }

  // Step 3 — aggregate. Walk the homepage results in original order; for
  // per-page modules, merge in data from the additional pages.
  const aggregatedResults: ModuleResult[] = []
  for (const homepageModuleResult of homepageResults) {
    const moduleKey = homepageModuleResult.moduleKey
    const aggregation = PER_PAGE_AGGREGATION[moduleKey]

    if (!aggregation) {
      // Site-wide module — pass through unchanged.
      aggregatedResults.push(homepageModuleResult)
      continue
    }

    // Collect this module's results from every page that audited it.
    const allPageResults: { url: string; result: ModuleResult }[] = [
      { url: homepageUrl, result: homepageModuleResult },
    ]
    perPageResultsByUrl.forEach((results, url) => {
      const matching = results.find((r) => r.moduleKey === moduleKey)
      if (matching) allPageResults.push({ url, result: matching })
    })

    if (allPageResults.length === 1) {
      // No multi-page data — homepage is the only signal.
      aggregatedResults.push(homepageModuleResult)
      continue
    }

    if (aggregation === 'worst') {
      // Pick the page with the lowest score; annotate which page it was.
      const worst = allPageResults.reduce((min, cur) =>
        cur.result.score < min.result.score ? cur : min,
      )
      const annotated: ModuleResult = {
        ...worst.result,
        summary: `${worst.result.summary} (Lowest-scoring page: ${pathFromUrl(worst.url)} — based on ${allPageResults.length} pages audited)`,
      }
      aggregatedResults.push(annotated)
    } else {
      // Average score; union-dedupe issues; keep homepage evidence as the canonical sample.
      const avgScore = Math.round(
        allPageResults.reduce((sum, p) => sum + p.result.score, 0) / allPageResults.length,
      )
      const issuesByTitle = new Map<string, AuditIssue>()
      for (const { result } of allPageResults) {
        for (const issue of result.issues) {
          if (!issuesByTitle.has(issue.title)) issuesByTitle.set(issue.title, issue)
        }
      }
      const merged: ModuleResult = {
        ...homepageModuleResult,
        score: avgScore,
        issues: Array.from(issuesByTitle.values()),
        summary: `${homepageModuleResult.summary} (Average across ${allPageResults.length} pages audited)`,
      }
      aggregatedResults.push(merged)
    }
  }

  return {
    results: aggregatedResults,
    siteData: homepageSiteData,
    pagesAudited,
  }
}

/**
 * Normalize a URL for comparison: protocol + host + pathname (no trailing /),
 * dropped query/fragment. Returns the raw input on parse failure.
 */
function normalizeForCompare(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, '')}`
  } catch {
    return url
  }
}

/** Extract the path segment of a URL for display ("/about" rather than the full URL). */
function pathFromUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname || '/'
  } catch {
    return url
  }
}
