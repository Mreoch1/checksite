/**
 * Find the latest audit for a URL/host fragment and email the full report
 * (regenerates from raw_result_json so paid-tier HTML is used).
 *
 * Usage (from repo root):
 *   npx tsx scripts/send-full-report-for-domain.ts usevibekey.com
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  const raw = readFileSync(p, 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

async function main() {
  loadEnvLocal()

  const { getSupabaseServiceClient } = await import('../lib/supabase')
  const { regenerateFullReport } = await import('../lib/regenerate-full-report')

  const needle = (process.argv[2] || '').trim()
  if (!needle) {
    console.error('Usage: scripts/send-full-report-for-domain.ts <domain-or-url-fragment>')
    process.exit(1)
  }

  const db = getSupabaseServiceClient()
  const pattern = `%${needle.replace(/^https?:\/\//i, '').replace(/\/$/, '')}%`

  const { data: rows, error } = await db
    .from('audits')
    .select('id, url, status, created_at, completed_at, raw_result_json')
    .ilike('url', pattern)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Query failed:', error.message)
    process.exit(1)
  }

  if (!rows?.length) {
    console.error(`No audits found matching URL pattern: ${pattern}`)
    process.exit(1)
  }

  const withRaw = rows.find((r) => r.status === 'completed' && r.raw_result_json)
  const pick = withRaw || rows.find((r) => r.status === 'completed')
  if (!pick) {
    console.error('No completed audits found. Rows:', rows.map((r) => ({ id: r.id, status: r.status })))
    process.exit(1)
  }

  if (!pick.raw_result_json) {
    console.error(
      `Audit ${pick.id} has no raw_result_json; cannot regenerate full report. Re-run the audit from the site first.`,
    )
    process.exit(1)
  }

  console.log(`Using audit ${pick.id} — ${pick.url} (${pick.completed_at || pick.created_at})`)
  const result = await regenerateFullReport(pick.id)
  console.log(result.success ? '✅' : '❌', result.message)
  process.exit(result.success ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
