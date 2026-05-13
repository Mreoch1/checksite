# D-006 abc.com Timing Investigation — 2026-05-13

## Audit: fd82d6b5-0b88-4075-ad14-f9f2cbb09744

| Metric | Value |
|--------|-------|
| URL | https://abc.com/ |
| Created | 2026-05-13T11:07:33Z |
| email_sent_at | 2026-05-13T11:12:09Z |
| Total time | 4m 36s (276s) |
| Retry count | 3 |
| Status | completed |
| Report | ✅ renders |

## Root Cause Analysis

**1. PageSpeed:** abc.com is a heavy JS-rendered news/media site. With the old code (3 retries at 30s/45s/60s), PageSpeed alone could consume 135s of wall time on the homepage. With D-006's fix (2 retries at 30s/45s with 1s backoff = 76s max), this is still a major contributor on heavy sites.

**2. Sitemap crawl:** abc.com uses a sitemap index structure (sitemapindex-*.xml with child sitemaps). `discoverSitemapUrls` resolves 2 child sitemaps, which could yield 500+ URLs. The crawl samples 5 pages at concurrency-3 with 8s timeouts each.

**3. Per-page modules:** 5 sampled pages × 4 per-page modules (on_page, mobile) at concurrency 3 = 2 batches. Each batch waits for the slowest page. abc.com's pages are JS-heavy and slow to analyze.

**4. Queue anomaly:** Queue row shows `retry_count=3`, `status=completed` but `completed_at=null`. The first attempts timed out (old code + abc.com slowness). Each timeout incremented retry_count. The auto-heal reset it. On the final attempt, the audit completed but the queue `completed_at` wasn't set — code path never reached `markQueueItemCompletedWithLogging` with `completed_at`.

## Recommendations (ranked)

### Fix 1 (HIGH, ~2h): Reduce sitemap sample from 5 to 3 pages
`crawlSitemapPages` picks 5 from the sitemap. Reducing to 3 saves ~40% of per-page time. Change `Math.min(5, shuffled.length)` to `Math.min(3, shuffled.length)`. Low risk — still representative.

### Fix 2 (MEDIUM, ~4h): Hard-cap total audit wall time at 120s
Wrap processAudit in a timeout. If exceeded, save whatever results are collected and mark as `partial_results: true`. The customer gets a report with a note instead of an error. This is I-013 from IDEAS.md.

### Fix 3 (LOW, ~1h): Fix queue completed_at write
The queue handler has a code path where the queue item completes but `completed_at` stays null. Find and fix the missing `{ completed_at: new Date().toISOString() }` in the completion update.

## Effort: Fix 1 alone (2h) would bring abc.com under 120s
