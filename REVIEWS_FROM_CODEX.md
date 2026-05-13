# Reviews from Codex — checksite

Append-only one-line verdict digest.

Format:
`- [DATE] R-NNN | PASS|PARTIAL|FAIL | Title | Evidence gist`

---

- [2026-05-13] R-001 | PARTIAL | Verify D-001 deploy on real sites | Self-test report generated with PageSpeed/multi-page/Reference Range evidence but took ~112.7s and email_sent_at stayed null; ABC audit remains pending/processing with no report.
- [2026-05-13] R-002 | PASS | Verify D-002b SendGrid activation | Netlify production deploy for `e3dc194` was ready, current rebuild `47fdca9` is ready, both are empty trigger commits, and production logs show SendGrid accepted an email with statusCode 202 after deploy.
- [2026-05-13] R-001 | PARTIAL | D-006b self-test reopen | seochecksite.net audit `c62829fb` completed in 53s with report + email_sent_at + SendGrid 202, but SendGrid webhook recorded a report_delivery bounce and abc.com remains deferred.
- [2026-05-13] R-004 | PARTIAL | Whole-site page walk | Live sitemap has 34 URLs; Codex checked 38 seed URLs and found 10 linked glossary pages returning 404 plus stale `/sample-report`; site value holds at $14.99 only if delivery and hygiene are fixed.
- [2026-05-13] R-001 | PARTIAL | Final sign-off request | D-006d Hotmail test has `delivered` event and no customer-domain bounces were found in the checked window, but full R-001 PASS remains blocked by deferred abc.com and missing Gmail proof; provisional M-003 unblock recommended with first-5-send monitoring.
- [2026-05-13] R-003 | FAIL | Verify M-003 6-item batched deploy | Homepage sample link and glossary link removals passed, but `/sample-report` still shows 98/100, `/api/admin/snapshot` returns `latest_audit:null` due nonexistent `overall_score` select, and the required first-5-send delivery monitor is not implemented in the SendGrid webhook.
- [2026-05-13] R-D-107-SPEC | PARTIAL | Pre-deploy smoke manifest gate spec | Spec targets the right real-outcome failures, but D-107a needs preview-vs-production stage separation; Q1 pick CLI/env admin secret, Q2 pick two-stage DB checks via admin proxy/trusted promote-time probe.
- [2026-05-13] R-D-107a | FAIL | Smoke gate implementation | `netlify.toml` still runs only `npm run build`, npm smoke scripts omit `--admin-secret`, `tsx`/`js-yaml` are undeclared, schema-probe is GET-only while manifest uses admin_api_post, and both smoke scripts fail before proving the gate.
- [2026-05-13] R-D-107b | PARTIAL | Smoke gate fixes | Preview smoke passes 2/2 and production smoke honestly fails on missing `urgent_alerts`, but the documented `npm run smoke:production -- --admin-secret` pass-through fails on this Windows shell; accept manual gate only as interim pending D-107c.
- [2026-05-13] R-D-107b-fix | PASS | Smoke gate env-secret fallback | Commit `82bedd2` makes `ADMIN_SECRET` env fallback work; preview passes 2/2, env and CLI production forms both reach the honest missing-`urgent_alerts` D-006h failure.
- [2026-05-13] R-003a | FAIL | D-006h migration + M-003 chain | Functional checks passed, but commit `a049cd3` added `scripts/apply-urgent-alerts.ts` with a hardcoded Supabase DB password; rotate the DB password, remove/rewrite the script, and scrub git history before re-review.
- [2026-05-13] R-001 abc.com | PARTIAL | Hard-case audit reopen | Audit `fd82d6b5-0b88-4075-ad14-f9f2cbb09744` completed, report rendered, Pages Audited sampled abc.com sitemap URLs, SendGrid delivered, and smoke gate passed 5/5, but completion took ~274s vs the <=90s R-001 bar and the queue row still showed processing.
- [2026-05-13] D-111 | PARTIAL/HARDENING | Public report privacy audit | No red public leak found on live c628 report; source/network did not expose customer/payment/internal fields, but `app/report/[id]/page.tsx:93-99` over-selects full audit row plus `customers(email)` and should be narrowed in D-112.
- [2026-05-13] R-D-112 | PARTIAL | Report privacy hardening | Route allowlist is fixed and live report grep is clean, but `smoke-manifests/m-003.yaml:69-72` repeats `expect_body_not_contains`; `npm run smoke:preview` fails with `YAMLException: duplicated mapping key (70:5)`.
- [2026-05-13] R-D-112-fix | PARTIAL | Smoke manifest YAML array fix | Runner/manifest array fix works and direct preview runner passes 3/3, but committed `npm run smoke:preview` still fails on Windows/PowerShell because `${DEPLOY_PRIME_URL:-https://seochecksite.net}` is passed as a literal URL.
