/**
 * smoke-gate.ts — Pre-deploy smoke manifest gate
 *
 * Reads a smoke-manifest YAML/JSON file, runs each assertion against
 * the target URL, fails fast on the first non-pass.
 *
 * Usage:
 *   npx tsx scripts/smoke-gate.ts --manifest smoke-manifests/m-003.yaml \
 *     --target-url https://seochecksite.net \
 *     --admin-secret <secret>
 *
 * Flags:
 *   --manifest <path>        Path to manifest file (required)
 *   --target-url <url>       Base URL to test against (required)
 *   --admin-secret <secret>  Admin auth secret for admin_api assertions
 *   --stage <preview|production_promote>  Filter assertions by stage
 *   --report-to-bridge       Write P0 to urgent_alerts on failure
 */

interface SmokeAssertion {
  id: string
  description: string
  stage: 'preview' | 'production_promote' | 'both'
  assertion_type: string
  url?: string
  expect_status?: number
  expect_body_contains?: string
  expect_body_not_contains?: string
  expect_body_json?: Record<string, unknown>
  cleanup?: { url: string; method?: string }
  query?: string
  path?: string
}

interface SmokeManifest {
  sprint: string
  deploy?: string
  base_url?: string
  items: SmokeAssertion[]
}

const args: Record<string, string> = {}
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i].replace(/^--/, '')
  args[key] = process.argv[i + 1] || ''
}

const manifestPath = args['manifest']
const targetUrl = args['target-url']?.replace(/\/$/, '')
const adminSecret = args['admin-secret']
const stage = args['stage'] || 'both'
const reportToBridge = !!args['report-to-bridge']

// Support ADMIN_SECRET env var as fallback (Windows/PowerShell workaround)
const effectiveAdminSecret = adminSecret || process.env.ADMIN_SECRET

if (!manifestPath || !targetUrl) {
  console.error('❌ Required: --manifest <path> --target-url <url>')
  process.exit(1)
}

// Validate required fields on load
const VALID_STAGES = ['preview', 'production_promote', 'both']
const VALID_TYPES = ['http_get', 'http_post', 'admin_api_post', 'sql_query', 'file_exists']

function validateManifest(item: SmokeAssertion, index: number): string | null {
  if (!item.id) return `Item ${index}: missing 'id'`
  if (!item.description) return `Item ${index} (${item.id}): missing 'description'`
  if (!item.stage) return `Item ${index} (${item.id}): missing 'stage'`
  if (!VALID_STAGES.includes(item.stage)) return `Item ${index} (${item.id}): invalid stage '${item.stage}'. Valid: ${VALID_STAGES.join(', ')}`
  if (!item.assertion_type) return `Item ${index} (${item.id}): missing 'assertion_type'`
  if (!VALID_TYPES.includes(item.assertion_type)) return `Item ${index} (${item.id}): invalid assertion_type '${item.assertion_type}'. Valid: ${VALID_TYPES.join(', ')}`
  if (item.assertion_type === 'http_get' && !item.url) return `Item ${index} (${item.id}): http_get requires 'url'`
  if (item.assertion_type === 'admin_api_post' && !item.url) return `Item ${index} (${item.id}): admin_api_post requires 'url'`
  // Stage-aware: only check admin_secret if this item would run in the current stage
  const stageMatches = stage === 'both' || item.stage === stage || item.stage === 'both'
  if (stageMatches && item.stage !== 'preview' && typeof effectiveAdminSecret === 'undefined' && item.assertion_type === 'admin_api_post') {
    return `Item ${index} (${item.id}): admin_api_post assertions on production stage require --admin-secret`
  }
  return null
}

async function main() {
  // Load manifest
  const fs = await import('fs')
  const manifestRaw = fs.readFileSync(manifestPath, 'utf8')
  const manifest: SmokeManifest = manifestRaw.trim().startsWith('{')
    ? JSON.parse(manifestRaw)
    : (await import('js-yaml')).load(manifestRaw) as SmokeManifest

  if (!manifest.items?.length) {
    console.error('❌ Manifest has no items')
    process.exit(1)
  }

  // Validate all items before running
  for (let i = 0; i < manifest.items.length; i++) {
    const err = validateManifest(manifest.items[i], i)
    if (err) {
      console.error(`❌ Manifest validation failed: ${err}`)
      process.exit(1)
    }
  }

  // Filter by stage
  const filtered = manifest.items.filter(
    (item) => stage === 'both' || item.stage === stage || item.stage === 'both'
  )

  if (filtered.length === 0) {
    console.log(`⚠️  No assertions match stage="${stage}"`)
    process.exit(0)
  }

  console.log(`🔍 Smoke Gate: ${manifest.sprint} (${filtered.length} assertions, stage=${stage})`)
  console.log(`   Target: ${targetUrl}`)
  console.log()

  let passed = 0
  let failed = 0
  const failures: string[] = []

  for (const item of filtered) {
    process.stdout.write(`  [${item.id}] ${item.description}... `)

    try {
      const result = await runAssertion(item)
      if (result.pass) {
        console.log('✅ PASS')
        passed++
      } else {
        console.log(`❌ FAIL — ${result.detail}`)
        failed++
        failures.push(`${item.id}: ${result.detail}`)
        break // Fail fast
      }
    } catch (err: any) {
      console.log(`❌ ERROR — ${err.message}`)
      failed++
      failures.push(`${item.id}: ${err.message}`)
      break
    }
  }

  console.log()
  console.log(`📊 Results: ${passed} passed, ${failed} failed`)

  if (failed > 0 && reportToBridge) {
    console.log('📝 Reporting failure to bridge...')
    for (const f of failures) {
      const fs2 = await import('fs')
      fs2.appendFileSync('/tmp/smoke-gate-failures.log', `[${manifest.sprint}] ${f}\n`, 'utf8')
    }
  }

  process.exit(failed > 0 ? 1 : 0)
}

async function runAssertion(item: SmokeAssertion): Promise<{ pass: boolean; detail: string }> {
  switch (item.assertion_type) {
    case 'http_get': {
      const url = `${targetUrl}${item.url}`
      const res = await fetch(url)
      const body = await res.text()

      if (item.expect_status && res.status !== item.expect_status) {
        return { pass: false, detail: `Expected status ${item.expect_status}, got ${res.status}` }
      }
      if (item.expect_body_contains && !body.includes(item.expect_body_contains)) {
        return { pass: false, detail: `Body missing expected content: "${item.expect_body_contains.substring(0, 50)}"` }
      }
      if (item.expect_body_not_contains && body.includes(item.expect_body_not_contains)) {
        return { pass: false, detail: `Body contains forbidden content: "${item.expect_body_not_contains.substring(0, 50)}"` }
      }
      return { pass: true, detail: '' }
    }

    case 'admin_api_post': {
      if (!effectiveAdminSecret) {
        return { pass: false, detail: 'Admin secret required for admin_api_post assertions. Pass --admin-secret.' }
      }
      const url = `${targetUrl}${item.url}`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveAdminSecret}`,
        },
        body: JSON.stringify(item.body || {}),
      })
      const bodyJson = await res.json().catch(() => null)

      if (item.expect_status && res.status !== item.expect_status) {
        return { pass: false, detail: `Expected status ${item.expect_status}, got ${res.status}: ${JSON.stringify(bodyJson)}` }
      }
      if (item.expect_body_json) {
        for (const [key, val] of Object.entries(item.expect_body_json)) {
          const actual = (bodyJson as any)?.[key]
          if (actual !== val) {
            return { pass: false, detail: `Expected ${key}=${val}, got ${actual}. Full: ${JSON.stringify(bodyJson).substring(0, 200)}` }
          }
        }
      }

      // Side-effects cleanup check
      if (item.cleanup && bodyJson) {
        const cleanUrl = item.cleanup.url
          ? `${targetUrl}${item.cleanup.url}`
          : null
        if (cleanUrl) {
          const cleanRes = await fetch(cleanUrl, {
            method: item.cleanup.method || 'DELETE',
            headers: {
              'Authorization': `Bearer ${effectiveAdminSecret}`,
            },
          })
          if (!cleanRes.ok) {
            return { pass: false, detail: `Cleanup failed: ${cleanRes.status}` }
          }
        }
      }

      return { pass: true, detail: '' }
    }

    case 'file_exists': {
      const fs = await import('fs')
      try {
        fs.accessSync(item.path!, fs.constants.R_OK)
        return { pass: true, detail: '' }
      } catch {
        return { pass: false, detail: `File not found: ${item.path}` }
      }
    }

    default:
      return { pass: false, detail: `Unknown assertion_type: ${item.assertion_type}` }
  }
}

main()
