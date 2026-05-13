# Shutdown Readiness Rubric — checksite

Michael's standing rule (2026-05-13): "Do not shut down for the night until all tasks/improvements are done and Codex and Claude both agree the project is in a good stopping state."

This file makes "agree" explicit. Codex and Cowork independently check each box; only when both fully agree is the project at a good stopping state.

Owner: Cowork maintains this file (writes + maintains). Codex independently verifies and can flip boxes only with cited evidence.

Status legend per item: `[ ]` unchecked, `[~]` in-progress, `[x]` checked-with-evidence.

---

## Security (NEW — added 2026-05-13 after R-003a leak finding)

- [ ] **No secrets in git history.** Specifically: Supabase DB password rotated AND `scripts/apply-urgent-alerts.ts:4` no longer contains hardcoded credentials. Either history scrubbed via `git filter-repo` OR explicit decision documented that old commits stay (with old password rotated and rendered useless).
- [ ] **Migration script reads connection string from env.** No hardcoded secrets in any committed `scripts/*` file.

## Customer-facing experience

- [ ] **M-003 sprint items all functionally verified, not just HTTP 200.** Each of 6 items (sample link homepage, success CTAs, refreshed /sample-report, removed glossary 404s, D-106 admin snapshot, SendGrid monitor) confirmed working end-to-end.
- [ ] **/sample-report shows a non-stale score.** Current source has 98/100 hardcoded post-M-003a; M-003a updated it to 79; need post-D-006h verification that 79 (or dynamic value) renders in production HTML.
- [ ] **No customer-facing broken links** per R-004's whole-site walk + a current sitemap+crawl verification.
- [ ] **Report email proven to deliver to multiple domains.** Hotmail proven via D-006d `delivered` event. Gmail proof pending Michael's test address.

## Safety net (monitoring + observability)

- [~] **`urgent_alerts` table live in production** — Codex R-003a verified table exists via `to_regclass`. Functional pass. Box stays [~] until D-006i security remediation closes (because the script that applied it leaked credentials).
- [~] **SendGrid bounce monitor actually inserts on trip** — Codex verified `test-urgent-alert` round-trips clean. Functional pass. Box stays [~] until D-006i closes.
- [ ] **First-5-send watch active OR all 5 sent clean.** Counter state visible via `/api/admin/snapshot`. Active now; counter starts at 0; will count real customer sends going forward.
- [x] **D-107b manual smoke gate runs cleanly** — Codex R-D-107b-fix PASS (2026-05-13). `npm run smoke:preview` → 2/2 PASS. `ADMIN_SECRET=... npm run smoke:production` AND `npm run smoke:production -- -- --admin-secret <key>` both reach the honest D-006h failure (`urgent_alerts` table missing). Manual gate fully usable. Evidence: `REVIEWS_FROM_CODEX.md:19`, commit `82bedd2`.
- [ ] **D-107c Netlify build wiring live** — `netlify.toml` invokes `npm run smoke:preview` as part of the build process with deploy-failing-on-smoke-fail AND a preview-specific admin secret env var distinct from production. OR: Michael explicitly types acceptance of permanent manual-only operation in the drop-box, knowing the structural risk (humans forget; the four prior cycles are evidence).

## Outstanding Michael blockers (not Cowork/Codex/Hermes addressable)

- [ ] **D-004 GSC service account resolved.** Service account exists + JSON key in env, OR explicitly deferred with Michael's acknowledgment.
- [ ] **Gmail test address provided** for full R-001 PASS (closes the abc.com-deferred half).
- [ ] **D-006h SQL paste applied.** Michael drops "applied" / "done" in drop-box.

## Codex sign-off

- [ ] **R-003a PASSED** — M-003 + M-003a + D-006e/f/g/h verified end-to-end.
- [ ] **R-D-107b PASSED** — pre-deploy smoke gate live and gating.
- [ ] **abc.com R-001 reopened and PASSED** OR explicitly deferred with Michael's acknowledgment.
- [ ] **No open URGENT items** other than Michael-side blockers Cowork has surfaced.
- [ ] **Codex explicitly types** "Codex agrees project is at a good stopping state" in `checksite_codex_to_cowork.md` with cited evidence.

## Cowork sign-off

- [ ] **All Codex boxes above checked.**
- [ ] **Drop-box current; no pending action items requiring Cowork.**
- [ ] **Team board reflects reality** — no stale WIP rows that should be DONE or BLOCKED.
- [ ] **Cowork explicitly types** "Cowork agrees project is at a good stopping state" in the drop-box with the date/time and a cited reference to this file.

---

## Notes

- **This rubric is not a feature gate; it is a shutdown gate.** The team can keep shipping past unchecked items — but cannot stop for the night with unchecked items in the first four sections (the Michael-blockers section explicitly allows deferral with acknowledgment).
- **The rubric evolves.** If new customer-facing or safety items emerge mid-night, they get added here; we don't quietly let them slip.
- **Disagreement protocol:** If Codex and Cowork disagree on any box, surface to Michael with the specific item, the evidence each side cites, and a one-line "Cowork view / Codex view" pair. Michael breaks the tie.
- **Snapshot for Michael:** Whenever Michael wakes, the count of unchecked vs total boxes gives him a one-glance read of how far we are from a clean close.

**Current state (snapshot at 2026-05-13 ~11:30 UTC):** 0 of 16 boxes checked. Many are blocked on Michael's hand (D-006h SQL paste) or downstream of Hermes's D-107b fix. The path is clear; the bridge is moving.
