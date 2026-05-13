# D-107 — Pre-deploy Smoke Manifest Gate

**Status:** 💡 Spec Draft
**Author:** Hermes
**Date:** 2026-05-13
**Effort estimate:** 4-6 hours (manifest format + runner script + Netlify wiring)

---

## Problem Statement

Three consecutive M-003 cycles shipped code that passed superficial checks (HTTP 200, file written to `/tmp`, migration file committed) but failed to achieve the real goal:

1. **M-003 #6** — SendGrid delivery monitor: endpoint returned 200, but no monitoring logic was implemented. A real customer bounce would have been silently ignored.
2. **M-003a #3** — /tmp alert write: file wrote successfully to `/tmp`, but Netlify function containers recycle seconds later, destroying the alert. Nobody would ever see it.
3. **D-006e** — urgent_alerts migration: migration file committed and pushed, but never applied. The webhook writes to a table that doesn't exist.

Each failure followed the same pattern: the *appearance* of completeness passed review because the reviewer couldn't easily distinguish a stub from working code without re-testing every item manually. The fix is automated assertions that run before deploy promotion.

## Concept

Every M-NNN sprint commit includes a `smoke-manifest.json` listing each shipped item paired with an explicit, verifiable assertion about its real-world behavior. Before Netlify promotes the deploy to production:

1. Build completes normally.
2. Post-build script reads `smoke-manifest.json` from the committed code.
3. For each item, runs the assertion command against the **deploy preview URL**.
4. If any assertion fails → deploy is **held** (not promoted). Failing item + output written to URGENT.
5. If all pass → deploy promotes to production automatically.

## Manifest Schema

```json
{
  "$schema": "smoke-manifest-schema.json",
  "sprint": "M-003a",
  "deploy": "2026-05-13",
  "base_url": "https://staging--seochecksite.netlify.app",
  "items": [
    {
      "id": "sample-report-score",
      "description": "Sample report score updated from 98 to 79",
      "assertions": [
        {
          "type": "http_get",
          "url": "/sample-report",
          "expect_status": 200,
          "expect_body_not_contains": "98/100"
        }
      ]
    },
    {
      "id": "delivery-monitor",
      "description": "SendGrid bounce monitor writes to urgent_alerts",
      "assertions": [
        {
          "type": "admin_api_post",
          "url": "/api/admin/test-urgent-alert",
          "expect_body_json": {
            "success": true,
            "test_row_inserted": true,
            "unresolved_count_after_cleanup": 0
          }
        }
      ]
    },
    {
      "id": "urgent-alerts-table",
      "description": "urgent_alerts table exists in production DB",
      "assertions": [
        {
          "type": "sql_query",
          "query": "SELECT to_regclass('public.urgent_alerts') IS NOT NULL AS table_exists",
          "expect_rows": [{ "table_exists": true }]
        }
      ]
    }
  ]
}
```

### Assertion Types

| Type | Description | Parameters |
|------|-------------|------------|
| `http_get` | HTTP GET with status + body checks | url, expect_status, expect_body_contains?, expect_body_not_contains? |
| `http_post` | HTTP POST with JSON body + response checks | url, body, expect_status, expect_body_json? |
| `admin_api_post` | POST with admin auth header (uses ADMIN_SECRET) | url, body, expect_body_json? |
| `sql_query` | Read-only SQL query against production | query, expect_rows (array of expected row content) |
| `file_exists` | Check a file exists in the deploy | path |

## Gate Position

The gate runs as a **Netlify post-processing plugin** or **deploy context check** — between build completion and production promotion:

```
git push → Netlify build → Build succeeds → Smoke gate runs against preview URL → All pass → Promote to production
                                                                       → Any fail → HOLD + URGENT
```

**Option A (recommended):** Netlify Build Plugin (`plugins/smoke-gate/index.js`). Runs in the `onPostBuild` lifecycle hook. Has access to the deploy preview URL via `process.env.DEPLOY_PRIME_URL`. Cleanest integration.

**Option B:** Standalone script triggered by GitHub Actions after build, before merge. More portable, less Netlify-specific, but adds CI dependency.

**Option C:** Pre-push git hook. Fastest to implement, but runs locally and can be skipped. Not suitable for enforcement.

**Default: Option A** with Option B as a future fallback for non-Netlify deploys.

## Runner Script

`scripts/smoke-gate.ts` — reads `smoke-manifest.json`, runs assertions, exits 0 (pass) or 1 (fail):

```typescript
interface SmokeManifest {
  sprint: string
  deploy: string
  base_url?: string
  items: SmokeItem[]
}

interface SmokeItem {
  id: string
  description: string
  assertions: SmokeAssertion[]
}

type AssertionType = 'http_get' | 'http_post' | 'admin_api_post' | 'sql_query' | 'file_exists'

interface SmokeAssertion {
  type: AssertionType
  // ... type-specific fields
}

async function runSmokeGate(manifest: SmokeManifest): Promise<{ pass: boolean; failures: string[] }> {
  // For each item, run assertions in series
  // Fail fast on first non-pass
  // Print clear pass/fail per item
  // Return overall result
}
```

The script should:
- Accept `--manifest <path>` (default `smoke-manifest.json` in project root)
- Accept `--base-url <url>` (overrides manifest's base_url)
- Accept `--admin-secret <key>` (for admin_api_post assertions)
- Print `✅ PASS: item-id` or `❌ FAIL: item-id — detail`
- Exit 0 if all pass, 1 if any fail
- Time out after 60 seconds total

## Concrete Failures It Would Have Caught

### 1. M-003 #6 — Stub delivery monitor
```json
{
  "id": "m003-delivery-monitor",
  "description": "SendGrid bounce monitor implemented",
  "assertions": [{
    "type": "admin_api_post",
    "url": "/api/admin/test-urgent-alert",
    "expect_body_json": {
      "success": true,
      "test_row_inserted": true,
      "unresolved_count_after_cleanup": 0
    }
  }]
}
```
**Would have failed** because the test endpoint's `/api/admin/test-urgent-alert` didn't exist yet — no monitoring code was written. The deploy would have been held.

### 2. M-003a #3 — /tmp alert write
```json
{
  "id": "m003a-alert-persistence",
  "assertions": [{
    "type": "admin_api_post",
    "url": "/api/admin/test-urgent-alert",
    "expect_body_json": {
      "success": true,
      "test_row_inserted": true,
      "unresolved_count_before_delete": 1
    }
  }]
}
```
**Would have failed** — the /tmp write never reaches urgent_alerts. The test endpoint checks the actual DB table.

### 3. D-006e — Missing migration
```json
{
  "id": "d006e-urgent-alerts-table",
  "assertions": [{
    "type": "sql_query",
    "query": "SELECT to_regclass('public.urgent_alerts') IS NOT NULL AS table_exists"
  }]
}
```
**Would have failed** — `to_regclass` returns NULL because the migration was never applied.

## Open Questions for Codex Review

1. **How should the smoke gate handle the `admin_api_post` assertion type's auth?** The deploy preview URL may not share the same `ADMIN_SECRET` as production. Options: (a) hardcode a test-only admin secret in the manifest, (b) pass via `--admin-secret` CLI arg from env, (c) use a separate test admin endpoint that doesn't require auth in preview. Each has security/complexity tradeoffs.

2. **SQL query assertions require database access from the deploy preview.** Deploy previews are ephemeral and may not have database connectivity, or may point to a staging DB. Do we: (a) run SQL queries only against production DB from a trusted runner, (b) use the admin API endpoint (e.g., `/api/admin/snapshot`) as a proxy instead of direct SQL, (c) skip SQL assertions for preview and let them run at production-promote time only?

3. **Should the manifest be a separate file or embedded in a known commit message format?** Separate file is cleaner for CI parsing; embedded in commit message is simpler but harder to validate before the deploy runs.

## Out of Scope (Phase 2)

- Retroactive manifest backfill for prior sprints
- Multi-environment manifest split (staging vs production)
- Automatic manifest generation from commit message
- Reporting dashboard for deploy gate history
