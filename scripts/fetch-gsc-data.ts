#!/usr/bin/env npx tsx
/**
 * fetch-gsc-data.ts — Standalone GSC data fetcher
 *
 * Pulls performance data and indexing status from Google Search Console
 * and prints formatted output to stdout.
 *
 * Prerequisites:
 *   1. npm install googleapis google-auth-library
 *   2. GSC_SERVICE_ACCOUNT_KEY_PATH set to your service account JSON key
 *   3. Service account email added as user in GSC for seochecksite.net
 *
 * Usage:
 *   # Install dependencies first
 *   npm install googleapis google-auth-library
 *
 *   # Fetch last 28 days of performance data by page
 *   GSC_SERVICE_ACCOUNT_KEY_PATH=~/path/to/service-account-key.json npx tsx scripts/fetch-gsc-data.ts
 *
 *   # Fetch last 7 days by query
 *   GSC_SERVICE_ACCOUNT_KEY_PATH=~/path/to/key.json npx tsx scripts/fetch-gsc-data.ts --days 7 --dimension query
 *
 *   # Fetch today only, top 50 rows
 *   GSC_SERVICE_ACCOUNT_KEY_PATH=~/path/to/key.json npx tsx scripts/fetch-gsc-data.ts --days 1 --limit 50
 *
 * Cron example (daily at 9 AM):
 *   0 9 * * * cd /Users/michaelreoch/sitecheck && GSC_SERVICE_ACCOUNT_KEY_PATH=/path/to/key.json npx tsx scripts/fetch-gsc-data.ts >> logs/gsc-report-$(date +\%Y-\%m-\%d).txt 2>&1
 */

import { fetchGscPerformance, fetchGscIndexingStatus, inspectUrl } from '../lib/search-console-api'

function getDateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

;(async () => {
  const args = process.argv.slice(2)
  const daysIndex = args.indexOf('--days')
  const days = daysIndex !== -1 ? parseInt(args[daysIndex + 1], 10) || 28 : 28
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) || 25 : 25
  const dimension =
    args.indexOf('--dimension') !== -1 ? args[args.indexOf('--dimension') + 1] : 'page'
  const runInspect = args.includes('--inspect')
  const homepageUrl = args.find((a) => a.startsWith('http')) || 'https://seochecksite.net/'

  const startDate = getDateStr(days)
  const endDate = getDateStr(1)

  if (!process.env.GSC_SERVICE_ACCOUNT_KEY_PATH) {
    console.error('ERROR: GSC_SERVICE_ACCOUNT_KEY_PATH environment variable is required.')
    console.error('Set it to the path of your Google service account JSON key file.')
    console.error()
    console.error('Example:')
    console.error('  GSC_SERVICE_ACCOUNT_KEY_PATH=~/keys/gsc-sa.json npx tsx scripts/fetch-gsc-data.ts')
    process.exit(1)
  }

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  Google Search Console — Data Fetch                  ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log()
  console.log(`  Site:   scoped:https://seochecksite.net/`)
  console.log(`  Period: ${startDate} → ${endDate} (${days} days)`)
  console.log(`  Dimension: ${dimension}`)
  console.log()

  // ── Performance Data ──
  console.log('─── Performance ──────────────────────────────────────')
  const perf = await fetchGscPerformance({
    startDate,
    endDate,
    dimension: dimension as 'query' | 'page',
    limit,
  })

  if (perf.error) {
    console.log(`  ⚠️  ${perf.error}`)
  } else {
    console.log(`  Clicks:      ${perf.totalClicks}`)
    console.log(`  Impressions: ${perf.totalImpressions}`)
    console.log(`  Avg CTR:     ${(perf.averageCtr * 100).toFixed(2)}%`)
    console.log(`  Avg Position: ${perf.averagePosition.toFixed(1)}`)
    console.log()

    if (perf.rows.length > 0) {
      console.log(`  Top ${perf.rows.length} ${dimension === 'query' ? 'Queries' : 'Pages'}:`)
      console.log()
      const header = dimension === 'query'
        ? '  Query                          │ Impressions │ Clicks │ CTR    │ Pos'
        : '  Page                            │ Impressions │ Clicks │ CTR    │ Pos'
      console.log(header)
      console.log('  ' + '─'.repeat(header.length - 2))

      for (const row of perf.rows) {
        const label = (row.query || row.page || 'N/A').padEnd(dimension === 'query' ? 31 : 32)
        console.log(
          `  ${label} │ ${String(row.impressions).padStart(10)} │ ${String(row.clicks).padStart(6)} │ ${(row.ctr * 100).toFixed(2).padStart(5)}% │ ${row.position.toFixed(1).padStart(3)}`
        )
      }
    }
  }

  console.log()

  // ── Indexing Status ──
  console.log('─── Indexing Overview ────────────────────────────────')
  const idx = await fetchGscIndexingStatus()
  if (idx.error) {
    console.log(`  ⚠️  ${idx.error}`)
  } else {
    console.log(`  Indexed (via sitemaps): ${idx.indexed}`)
    console.log(`  Total URLs (via sitemaps): ${idx.total}`)
  }

  // ── URL Inspection (optional) ──
  if (runInspect) {
    console.log()
    console.log(`─── URL Inspection: ${homepageUrl} ──────────`)
    const result = await inspectUrl(homepageUrl)
    if (result.error) {
      console.log(`  ⚠️  ${result.error}`)
    } else {
      console.log(`  Indexed:       ${result.isIndexed === true ? '✅ Yes' : result.isIndexed === false ? '❌ No' : '⚠️  Unknown'}`)
      console.log(`  Coverage:      ${result.coverageState || 'N/A'}`)
      console.log(`  Crawl Status:  ${result.crawlStatus || 'N/A'}`)
      console.log(`  Canonical:     ${result.canonical || 'N/A'}`)
    }
  }

  console.log()
  console.log('──────────────────────────────────────────────────────')
  console.log(`  Fetched at: ${new Date().toISOString()}`)
})()
