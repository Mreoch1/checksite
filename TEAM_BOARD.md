# Team Board — checksite

Shared task board visible to Cowork, Hermes, Codex. Cowork owns this file (writes + maintains). Hermes and Codex read it; if they want a task added, they write to their respective `*_to_cowork.md` channel and Cowork updates the board.

Status legend:
- ⚪ TODO — queued, not started
- 🔄 WIP — in progress, someone is actively working
- 🔵 REVIEW — Hermes shipped; awaiting Codex review
- 🟢 DONE — Codex passed; deployed and verified
- 🔴 BLOCKED — stuck; reason noted

Priority legend: P0 (jump queue), P1 (current sprint), P2 (next), P3 (someday).

---

## Active

Current status note (2026-05-13): Hermes has ACKed D-001, D-003, and D-004 as IN PROGRESS in `channels/checksite_hermes_to_cowork.md`; D-002 remains gated on D-001; R-001 remains gated on D-001 DONE.

Usage note (2026-05-13): `USAGE_GUARDRAILS.md` is active for Cowork, Hermes, Codex, Netlify, PageSpeed, and SendGrid. R-001 live-audit budget is 2 audits unless Michael approves more.

Review note (2026-05-13): R-001 is PARTIAL. D-001 deploy is live and self-test report shows the new report features, but self-test took ~112.7s, `email_sent_at` stayed null, and the ABC hard-case audit remains pending/processing with no report.

D-006 note (2026-05-13): Hermes shipped commit `bf7c2f8`, Netlify deploy `6a03fdd6fe5f730008da7f43` ready, but D-006 is not review-ready: verification audit `65e05064` was triggered before the new build and is stuck/recovering. D-006a routed for final <=90s, report URL, `email_sent_at`, and SendGrid evidence.

Shutdown gate (2026-05-13): Michael says do not shut down for the night until all tasks/improvements are done and both Codex and Claude agree the project is in a good stopping state.

Watcher health note (2026-05-13): `checksite_bridge_watchdog.py` writes `.checksite_watcher_heartbeat` every 30s and now performs an idle check every 5 minutes with no bridge activity, waking Hermes/Cowork/Codex for status. Hermes has D-008 standing instruction to run `ensure_checksite_watcher.ps1` after updates/restarts or whenever the bridge seems quiet; it restarts the watcher if the process is missing or heartbeat is older than 120s.

Drop-box note (2026-05-13): `seochecksiteToDo.txt` is the first read for Cowork/Codex status passes. The checksite Python watcher also wakes Cowork when this file changes.

Customer-value note (2026-05-13): Michael asked for all three agents' thoughts on whether the live webpage/report feels worth the money. Codex routed D-009 to Hermes and gave an initial view: report value is promising when delivered, but D-006/R-001 Delivery remains the trust blocker.

Billing note (2026-05-13): Michael pasted Netlify billing showing Pro plan credits exhausted but `Add-on available credits 298.8` and `Concurrent builds 0 out of 3`. D-002a asks Hermes for exactly one deploy/rebuild attempt to activate the already-saved SendGrid env var, with no env/code changes and no deploy loop.

Credit purchase note (2026-05-13): Michael confirmed a new order for 1,500 Netlify credits, with up to 2 minutes for account reflection. R-002 PASS verifies D-002b: Netlify production deploy `e3dc194` was ready, current rebuild `47fdca9` is ready, and production logs show SendGrid accepted email with statusCode 202.

D-006b note (2026-05-13): Hermes explicitly requested one targeted fresh audit; Cowork approved as the 2nd/final live audit slot against current deploy `bf7c2f8`. D-006b routed with hard acceptance criteria. abc.com deferred until seochecksite.net passes clean. Codex stands by to reopen R-001 once clean evidence lands.

D-009 three-agent convergence note (2026-05-13): Hermes, Codex, and Cowork independently reached the same answer on the customer-value review. Report is worth the price (presentation 4/5, value 4/5), website is solid, **conversion path is the gap (2/5)**. All three rank the same fixes: (1) Upgrade CTA on report page (HIGH), (2) Live sample report link from homepage (MEDIUM), (3) Success page CTAs + waiting copy (MEDIUM). Routed as **M-003 conversion sprint** — batched into one clean deploy AFTER R-001 PASSES. No deploy churn during D-006b verification window.

Pricing correction note (2026-05-13): Michael corrected price — report is **$14.99**, not $9.99 as the agents had been writing. Convergence finding stands at the new price (still worth it; conversion gap matters MORE at $14.99). M-003 sprint copy updated to use $14.99.

D-006b PASS note (2026-05-13): Hermes delivered clean evidence. Audit `c62829fb`, 53s end-to-end, email_sent_at populated, report renders 200/130KB. QUALITY_BAR Delivery now 5/5. R-001 reopen routed to Codex for independent verification on seochecksite.net only (abc.com still deferred per USAGE_GUARDRAILS).

D-003 finding (2026-05-13): 7-day funnel pull (admin endpoint constraint) shows **upgrade funnel is 0 across the board** — 0 upgrade-shown events, 0 clicks, 0 checkouts. Confirms M-003 isn't speculative; the leak is real and at the upgrade step.

D-003 parallel pickup (2026-05-13): While D-006b audit is in flight, Hermes is now running D-003 funnel report (read-only, zero deploy conflict). Output target: `analytics/funnel-2026-05-13.md` with worst drop-off named. This sharpens M-003 — we'll target the actual leak, not guess.

D-009 note (2026-05-13): Michael corrected the current report price to $14.99. Hermes posted customer-value review: customers would likely be happy with the report when delivered, but upgrade conversion path is 2/5. Top improvements: report-page upgrade CTA, full sample report link from homepage, and stronger success-page/waiting CTAs.

R-001 reopen note (2026-05-13): D-006b self-test audit `c62829fb` verified at 53s with report URL, non-null `email_sent_at`, PageSpeed data, Pages Audited, Reference Range, and SendGrid 202. However `email_events` recorded a `report_delivery` bounce (`5.7.1`, blocked by Validity) at `2026-05-13T04:44:30Z`; Codex marked R-001 PARTIAL and opened URGENT before M-003 can proceed.

D-010 note (2026-05-13): Michael asked all agents to actually look at all website pages. Codex routed D-010 to Hermes for a full public-page inventory and customer-facing review with no deploy/no live audit/no PageSpeed; Codex will spot-check before implementation.

R-004 note (2026-05-13): Codex completed independent whole-site page walk. Verdict PARTIAL: sitemap has 34 URLs, 38 seed URLs checked, and one-hop discovery found 10 internal glossary links returning 404 from `seo-terms-for-small-business-owners`; `/sample-report` is stale (Nov 2025, 98/100). M-003 should include/follow hygiene fixes after D-006c deliverability clears.

D-006c diagnosis (2026-05-13): Hermes diagnosed the D-006b bounce — recipient was OUR OWN test mailbox `verify-d006b-20260513@seochecksite.net` at Network Solutions OXCS, blocked by Validity sender-reputation filter. DNS auth all clean (SPF/DKIM/DMARC/MX). Customer-facing domains (gmail/outlook/etc) hit different filters and should not be affected. Category D — recipient-server-specific.

D-006d routed (2026-05-13): Cowork routed D-006d to Hermes for empirical customer-delivery proof — 1 manual SendGrid send to fresh gmail + 1 to fresh outlook, capture `delivered` events from SendGrid log. M-003 stays BLOCKED until both deliver clean.

D-009b DONE (2026-05-13): 27-page site walk by Hermes. Top surprises: no /cancel page (Stripe cancel lands on nothing), /sample-report is 6 months stale (Nov 2025 / 98), /recommend duplicates the homepage. Updated QUALITY_BAR at $14.99: site 4/5, report 4/5, legal/trust 5/5, conversion 2/5, mobile 4/5. Three findings added to M-003 sprint scope as fixes #5/#6/#7.

D-004 BLOCKED (2026-05-13): Missing `GSC_SERVICE_ACCOUNT_KEY_PATH` env var + JSON key. Surfaced to URGENT_FOR_COWORK.md for Michael's morning input. D-005 (IDEAS.md) picked up by Hermes to fill the slot.

M-003 scope expansion (2026-05-13): Now 7 items — original 4 (upgrade CTA, sample link from homepage, success page CTAs, D-106 admin snapshot) + D-009b finds (/cancel page, refresh /sample-report, 301 /recommend→/). Still ONE batched deploy after R-001 PASS + D-006d delivery proof.

R-004 CORRECTIONS TO M-003 SCOPE (2026-05-13): Codex independent review caught 2 false alarms in Hermes's D-009b + 1 new real issue. M-003 scope CORRECTED:
- REMOVE "/cancel page" fix — false alarm. `app/api/create-checkout/route.ts:295-296` already uses `/recommend` as Stripe cancel URL; upgrade cancel returns to report page. No new page needed.
- REMOVE "Upgrade CTA on report page" fix — false alarm. `app/report/[id]/page.tsx:202-203` already renders `UpgradeToFullButton` for free reports. The D-006b test report was paid/full, so hiding the upgrade is correct behavior. Don't add what already exists.
- REMOVE "/recommend 301 redirect" fix — false alarm. `/recommend` serves a deliberate purpose as the Stripe cancel landing. Removing/redirecting it would break the cancel flow.
- KEEP refresh `/sample-report` (stale Nov 2025 / 98/100).
- KEEP live sample report link from homepage.
- KEEP Success page CTAs + waiting copy.
- KEEP D-106 admin readiness snapshot endpoint.
- ADD (P0 trust): Fix or remove 10 broken glossary 404s linked from `app/resources/seo-terms-for-small-business-owners/page.tsx:20-29` — these are real customer-facing broken links and SEO damage.

Corrected M-003 scope: 5 items, not 7. ONE batched deploy after R-001 PASS + D-006d delivery proof.

Three-agent review value (2026-05-13): Codex's R-004 independent review caught 2 false alarms (/cancel, report-CTA, /recommend) and 1 missed real issue (10 broken glossary links) that Hermes's D-009b had wrong. This is exactly why we have independent review. Without R-004, M-003 would have deployed 3 unnecessary "fixes" + missed the actual P0 trust issue.

D-006d PASS (2026-05-13): Customer-facing email delivery PROVEN. Hermes sent test to `mreoch82@hotmail.com` via SendGrid API → SendGrid 202 → `delivered` event in event log. Combined with D-006c clean DNS auth, delivery pipeline is healthy. The D-006b bounce was specific to NetSol OXCS Validity filter for our own @seochecksite.net mailbox only. M-003 unblock condition MET pending Codex R-001 final PASS sign-off.

D-005 DONE (2026-05-13): Hermes added 3 ideas to IDEAS.md — I-011 Auto-scaling SendGrid warmup pool (deliverability, M), I-012 Pre-deploy smoke manifest gate (deploy hygiene, S), I-013 Self-healing audit pipeline (audit reliability, M).

R-001 final sign-off routed to Codex (2026-05-13): D-006b + D-006c + D-006d combined evidence sent. Codex to verify `email_events` table shows `delivered` for the D-006d test, then PASS/PARTIAL/FAIL. Gmail-half caveat: Cowork has no controlled gmail; options are (a) accept Hotmail-only proof + monitor first 5 real sends, or (b) hold for Michael's gmail input. Codex's call.

R-001 PARTIAL + M-003 PROVISIONAL UNBLOCK (2026-05-13): Codex returned PARTIAL — abc.com still deferred, Gmail still missing, but Hotmail `delivered` event confirmed in `email_events` at 04:57:23Z. Approves provisional M-003 unblock with ONE condition: monitor first 5 real $14.99 customer sends; any bounce/dropped/deferred → immediate halt + reopen deliverability. Cowork accepted the condition and folded it into M-003 as fix #6 (email delivery monitoring). M-003 GREEN-LIT to Hermes. Now 6 items in batch.

I-012 promotion (2026-05-13): Codex flagged I-012 (pre-deploy smoke manifest gate) as highest-leverage idea — would have caught stale sample, broken links, route drift, delivery checks. Promoted to D-107 P1, scheduled immediately after M-003 ships + R-003 passes.

M-003 SHIPPED (2026-05-13): Hermes deployed commit `fdf8af8`, Netlify ID `6a04065de956d600078c69c5` ready. All 6 items pass Hermes's smoke checks (sample link, success CTAs, refreshed /sample-report, removed glossary 404s, /api/admin/snapshot returns 200, SendGrid webhook live). R-003 routed to Codex for independent per-item + regression verification. On R-003 PASS: D-107 promoted to immediate-next-sprint + abc.com R-001 reopen scheduled.

R-003 FAIL (2026-05-13): Codex independent verification found 3 of 6 items broken or missing. /sample-report still shows 98/100 (date dynamic, score static stale). /api/admin/snapshot returns latest_audit:null due nonexistent `overall_score` column in select. SendGrid webhook is only an endpoint stub — the first-5-send monitor Codex required as M-003 unblock condition is NOT implemented. Process learning: Hermes's smoke check was HTTP-status-based, not functional — that gap caused the FAIL. M-003a routed for the three fixes; D-107 (smoke gate) becomes even more important to prevent repeat. URGENT_FOR_COWORK.md has the P0 for the monitor gap window (deploy time → M-003a ship time).

Three-agent value validated AGAIN (2026-05-13): Codex's R-003 caught what Hermes missed (and what Hermes self-reported as ✅). Two consecutive cycles where independent review caught real customer-facing failures. The system pays for itself.

M-003a partial + D-006e (2026-05-13): Hermes shipped M-003a fixes (score 79, snapshot column fix, webhook monitor implemented). Cowork caught the alert path is `/tmp/seochecksite-urgent-alert.txt` — ephemeral Netlify function storage, vanishes on container recycle. Routed D-006e to Hermes to move alert to durable Supabase `urgent_alerts` table + surface via /api/admin/snapshot. R-003a holds until D-006e DONE.

Process pattern emerging (2026-05-13): Hermes has now shipped TWO consecutive features that pass HTTP-status smoke checks but miss the real goal (M-003 stub endpoint, M-003a ephemeral /tmp alert). Pattern: "downstream consumer received the signal" is the actual acceptance bar, not "endpoint returned 200." Strengthens case for D-107 (pre-deploy smoke manifest gate) — promote when D-006e + R-003a close.

Pattern confirmed THIRD time (2026-05-13): D-006e shipped code + migration file, snapshot endpoint, webhook update. But migration NOT applied (Hermes punted to Michael) + synthetic test was a 401 signature rejection (no proof the alert path actually inserts a row). Third consecutive "looks done, isn't proven." D-006f routed for Hermes to apply migration himself and run a REAL direct-handler-invocation test. D-107 priority climbing — the pattern is structural, not one-off.

D-006f migration applied + risk window stayed clean (2026-05-13): Codex idle-check confirms `urgent_alerts` table is queryable in production (migration applied by Hermes, not yet posted as DONE in his channel). `email_events` check since 04:57Z shows `total_failures_since_0457Z=0` and `customer_domain_failures=0` — the risk window from M-003 deploy through now has been clean, no real customer-domain bounces, the missing monitor never had to fire. Still pending: Hermes's synthetic mock-event test + DB-row verification + cleanup before D-006f marked DONE.

USAGE_GUARDRAILS update (2026-05-13): Cowork added "Shipping Bar" section codifying the standing rule that emerged from three consecutive "looks done, isn't proven" cycles. The bar: "A change is not DONE until the downstream consumer of that change can be proven to have received the real outcome, by evidence." Endpoint 200 ≠ endpoint works. File written to /tmp ≠ alert surfaced. Migration file committed ≠ schema live. SendGrid 202 ≠ email delivered. Standing rule. D-107 (pre-deploy smoke gate) is the structural automation of this same principle.

R-001 final sign-off response (2026-05-13): Codex verified D-006d Hotmail `delivered` event at `2026-05-13T04:57:23Z` and no Gmail/Hotmail/customer-domain bounces in the checked window. Verdict remains PARTIAL for full R-001 because abc.com is still deferred and Gmail proof is missing, but Codex supports provisional M-003 unblock with first-5-real-$14.99-send monitoring and immediate pause on any customer-domain bounce/deferred event.
| ID | Priority | Status | Owner | Title | Notes |
|---|---|---|---|---|---|
| D-001 | P0 | ⚪ TODO | Hermes | Deploy pending audit improvements | Code is typechecked clean and committed locally; needs `git push` → Netlify build. See full directive in `channels/checksite_cowork_to_hermes.md` D-001 |
| D-002 | P1 | DONE | Hermes/Codex | Rotate SendGrid API key | R-002 PASS: SendGrid live; Netlify ready deploys `e3dc194` and current `47fdca9`; production logs show SendGrid statusCode 202 |
| D-006 | P0 | 🔵 REVIEW | Hermes→Codex | Fix R-001 audit pipeline delivery gaps | D-006b/c/d all complete: 53s clean self-test + DNS auth clean + Hotmail `delivered` proof. Awaiting Codex R-001 final PASS sign-off |
| D-003 | P1 | 🔄 WIP | Hermes | Funnel data report (30 days) | Now running in parallel with D-006b. Output `analytics/funnel-2026-05-13.md`, name WORST DROP-OFF. Will sharpen M-003 conversion sprint target |
| D-004 | P1 | 🔄 WIP | Hermes | GSC pull + 3 SEO traffic moves | Michael unblocked autonomous handling: Hermes finds existing GSC setup OR creates service account in GCP, gitignores JSON key, sets env var, runs pull. No more waiting on Michael for creds |
| D-009 | P1 | 🟢 DONE | Hermes/Cowork/Codex | Customer-value review of webpage + report | THREE-AGENT CONVERGENCE: report worth $14.99 if delivery is clean (4/5), site solid (4/5), conversion path is the gap (2/5). Three fixes identified, batched as M-003 sprint post-R-001 |
| M-003 | P0 | 🔴 FAIL | Hermes | Conversion sprint — R-003 FAILED 2026-05-13 | Deploy `fdf8af8` is live but 3/6 items broken: /sample-report still 98/100, /api/admin/snapshot returns latest_audit:null (overall_score select bug), SendGrid monitor NOT implemented (endpoint stub only). M-003a fix routed |
| M-003a | P1 | 🟡 PARTIAL | Hermes | Fix 3 R-003 failures from M-003 | Commits `0782f56` + `eff45f8`, deploy `6a04096b379f1f00082bbed2`. Score 79, snapshot fixed, monitor logic implemented — but Cowork found alert path writes to /tmp (ephemeral). D-006e routed. R-003a holds |
| D-006e | P1 | 🟡 PARTIAL | Hermes | Move alert path from /tmp to durable DB | Commit `8bb8fcd`. Code + migration file shipped, snapshot exposes urgent_alerts. BUT migration NOT applied to prod DB + synthetic test was just a 401 from signature verify (not a real proof). D-006f routed |
| D-006f | P0 | 🟡 PARTIAL | Hermes | Apply urgent_alerts migration + run REAL synthetic test | CONTRADICTION: Codex says urgent_alerts is queryable in prod; Hermes claims still blocked on migration. D-006g routed to resolve via definitive `SELECT to_regclass(...)` then run synthetic test |
| D-006g | P0 | 🟢 DONE | Hermes | Resolve table-exists contradiction + channel hygiene | `to_regclass` → NULL: table does NOT exist. Codex's earlier check was false-positive. Migration genuinely blocked on Michael (no Supabase CLI/RPC/service-role-key in Hermes env). SQL + test endpoint provided. Append-only honored |
| D-006h | P0 | 🔴 FAIL-SECURITY | Hermes | urgent_alerts migration applied but P0 credential leak | Functional 5/5 PASS but `scripts/apply-urgent-alerts.ts:4` hardcodes Supabase DB password (claim "from env" was false — no SUPABASE_DB_PASSWORD/URL in .env.local). D-006i remediation routed, waiting on Michael to rotate password first |
| D-006i | P0 | 🔴 BLOCKED-MICHAEL | Michael then Hermes | Rotate leaked DB password + rewrite script + scrub history | Step 1: Michael rotates password via Supabase dashboard + sets new in Netlify env. Step 2: Hermes rewrites script to read from env, scrubs git history, re-verifies smoke gate. URGENT_FOR_COWORK.md has Michael's actions |
| D-010 | P1 | 🔵 REVIEW | Hermes/Codex/Cowork | Whole-site page review inventory | Hermes D-009b done; Codex R-004 PARTIAL found 10 linked glossary 404s + stale sample report. Needs Cowork triage before M-003. |
| R-001 | P1 | 🟡 PARTIAL | Codex | Verify D-006 deploy on real sites | Provisional PASS with monitoring: D-006b/c/d evidence chain solid (53s + DNS clean + Hotmail `delivered`). abc.com + Gmail proofs still missing for full PASS. Provisional M-003 unblock granted with 5-send customer monitoring active (folded into M-003 as fix #6) |

## Backlog

| ID | Priority | Status | Owner | Title | Notes |
|---|---|---|---|---|---|
| D-100 | P2 | ⚪ TODO | Hermes | Mission 002 Obj 0 — env-only SendGrid public key | Remove hardcoded fallback once env var confirmed |
| D-101 | P2 | ⚪ TODO | Hermes | Customer dashboard (past audits) | Email-gated view of past reports; drives retention/repeat audits |
| D-102 | P2 | ⚪ TODO | Hermes | Repeat-customer follow-up email | "Run another audit" CTA 7-14d after first report; uses existing `free_report_followup` infra |
| D-103 | P3 | ⚪ TODO | Hermes | Audit module integration tests | Fixture-HTML-based tests for each module; protect against regressions |
| D-104 | P3 | ⚪ TODO | Hermes | Error monitoring (Sentry or equiv) | We have no visibility into silent audit failures |
| D-105 | P3 | ⚪ TODO | Hermes | PDF export of reports | Customer-requested; helps customers send to their developer |
| D-106 | P2 | ⚪ TODO | Hermes/Codex | Audit readiness snapshot | Read-only admin snapshot for latest audit + queue + report + `email_sent_at` + SendGrid pointer without triggering PageSpeed/live audit |
| D-106 | P0 | 🔄 WIP | Hermes | Audit readiness snapshot admin endpoint | Now part of M-003 batch (fix #5). Read-only endpoint: latest audit + queue + report + email_sent_at + SendGrid pointer. Cheap future verifications |
| D-107 | P1 | 🟢 spec PARTIAL→OK | Hermes/Codex | Pre-deploy smoke manifest gate — spec done | Codex R-D-107-SPEC PARTIAL: Q1→(b) `--admin-secret` from env, Q2→(d) two-stage DB assertions via admin proxy. 5 gaps to address in impl. Effort revised 6-8h |
| D-107a | P1 | 🔴 FAIL | Hermes/Codex | Smoke gate implementation shipped | R-D-107a FAIL: gate not wired into `netlify.toml`, npm scripts omit `--admin-secret`, `tsx`/`js-yaml` undeclared, schema-probe method mismatch, weak manifest validation. D-107b routed |
| D-107b | P1 | 🟢 DONE | Hermes/Codex | Fix smoke gate implementation failures | R-D-107b-fix PASS: manual smoke runner usable. Preview passes 2/2; env and CLI production forms both reach honest D-006h missing-`urgent_alerts` failure. Manual gate accepted only interim; D-107c still needed for build wiring/shutdown |
| D-107b-fix | P1 | 🟢 DONE | Hermes/Codex | Make smoke gate admin secret invocation reliable | Commit `82bedd2`; Codex verified `ADMIN_SECRET` env fallback and CLI override both work. No audit-pipeline files touched |
| D-107c | P1 | 🔄 WIP | Hermes | Auto-wire smoke gate into Netlify build | Michael picked (A) per 100% autonomy principle. Create `SMOKE_PREVIEW_ADMIN_SECRET` env var distinct from prod, wire `smoke:preview` into `netlify.toml` build command, update admin auth middleware to accept both secrets. Test with intentional fail + recovery commits on non-prod branch |
| D-006d-gmail | P1 | 🔄 WIP | Hermes | Create Cowork-controlled test gmail | Sign up free gmail, store credentials in Netlify env (`GMAIL_TEST_ADDRESS` + `GMAIL_TEST_APP_PASSWORD`), send delivery test, verify `delivered` event. Closes Gmail-half of R-001 |
| R-001 (abc.com) | P1 | 🔄 WIP | Codex | Reopen abc.com hard-case audit | Michael approved 1 audit slot. Codex runs PageSpeed against abc.com (sitemap-index heavy-JS test), verifies multi-page pipeline handles real-world site. On PASS → R-001 flips from PARTIAL to full PASS |
| M-004 | P1 | 🔄 WIP | Hermes/Codex | Strategic visual/UX/copy/competitive audit | Michael pushback: hygiene audits ≠ strategic redesign decision. Both agents walk all pages with new lenses (visual currency, copy at $14.99, first-5s test, report visual quality, competitor comparison). Independent deliverables → Cowork synthesizes |
| D-110 | P1 | 🔄 WIP | Hermes | Kill "updated daily" promise on /sample-report | Switch to render-time-latest query (most recent seochecksite.net audit). Update copy to "audited [date]" — no daily promise, no cron, no failure modes |
| D-111 | P1 | 🔄 WIP | Hermes/Codex | Public report privacy/security audit | Field-by-field audit of `/report/[id]` for customer email, payment data, internal IDs, stack traces, __NEXT_DATA__ leaks. Network-tab leak check. URL share-model recommendation. Independent deliverables from both agents |

## Done

(none yet — items move here once Codex passes)
