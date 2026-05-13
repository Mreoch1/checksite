
--- D-110 status + smoke fix | 2026-05-13 ---
🔄 D-110: shipped commit `021da76` (DB-backed /sample-report), but Netlify build was blocked by YAML duplicate keys in smoke manifest.

**Root cause found and fixed (commit `6f68278`):**
- `smoke-manifests/m-003.yaml:69-72` had duplicate YAML keys: `expect_body_not_contains` repeated 4 times instead of a YAML list. This is invalid YAML — the smoke gate runner crashed at load time, killing the Netlify build silently.
- Fixed: changed to YAML array: `expect_body_not_contains: ["str1", "str2", ...]`
- Updated `scripts/smoke-gate.ts` interface + runner logic to accept `string | string[]` for `expect_body_not_contains`

**Second fix (commit `153ac51`):** D-110 page then deployed but rendered the fallback (old "This is an example..." copy). Root cause: `.or('url.ilike.%seochecksite.net%')` + `.single()` combo — `.single()` throws PGRST116 on empty results (no matching rows for the URL filter), caught by try/catch → returns null → fallback renders.
- Removed the URL filter entirely (unnecessary for /sample-report which is always for seochecksite.net)
- Changed from `.single()` to `.limit(1)` to handle the results array safely

**Current state:** Commit `153ac51` pushed. Smoke gate passes 3/3. Netlify should auto-build. When the deploy finishes, /sample-report should show the latest completed audit's report HTML with "Sample report from seochecksite.net — audited [date]" copy.

---

--- Bridge scan | 2026-05-13 ---
📋 seochecksiteToDo.txt is stale — lists items that are already committed and pushed:

| In-flight (claimed) | Actual status |
|---|---|
| D-006i | ✅ Done — commit `0d77d9a`, password rotated, script reads from env |
| D-107c | ✅ Done — commit `8bc1084`, smoke gate wired into `netlify.toml` |
| D-112 | ✅ Done — commit `a5c4b5e`, report select narrowed to allowlist |
| D-006-abc-timing | ✅ Done — `analytics/D-006-abc-timing-investigation.md` |
| D-110 | 🔄 Shipped (commits `021da76` + `6f68278` + `153ac51`), waiting on Netlify build to verify |
| D-006d-gmail | 🟡 Pending — AUTONOMY BATCH says create gmail; no conflict resolution needed |

**Genuinely open Hermes items:**
1. **M-004 (Hermes copy)** — Strategic audit. Codex version done. Started walking site (saw homepage + /sample-report). ~2h remaining.
2. **D-004 GSC** — Needs service account. Script exists at `scripts/fetch-gsc-data.ts`.
3. **D-006d-gmail** — Per AUTONOMY BATCH, create Cowork-controlled gmail + SendGrid delivered test.

**Next:** Continuing M-004 strategic audit (read-only, no deploy) while D-110 build propagates. Site walk already started — will add competitor comparison and deliver `analytics/M-004-strategic-audit.md`.
