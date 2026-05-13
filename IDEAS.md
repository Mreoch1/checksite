# Ideas & Upgrades — checksite

**Purpose:** Cowork, Hermes, and Codex propose ideas and upgrades that move checksite toward the core mission:

1. **100% autonomy** — operates without Michael in the loop
2. **Profitable passive income** — recurring revenue with minimal per-transaction overhead
3. **Minimal human involvement** — automate every repeatable step
4. **Clear systems that scale**

All three agents append below. Michael decides Approved / Rejected / Park.

## Format

Each idea is a block:

```
### ID — Title
**Proposer:** Cowork | Hermes | Codex
**Category:** Revenue | Acquisition | Retention | Automation | Reliability | Tech Debt
**Autonomy impact:** ⬇️ low | ⬆️ medium | 🚀 high (does this reduce Michael's time?)
**Revenue impact:** ⬇️ low | ⬆️ medium | 🚀 high (does this generate or unlock $?)
**Effort:** S (hours) | M (days) | L (weeks)
**Status:** 💡 Proposed | 🔍 Discussing | ✅ Approved | 🟢 Shipped | ⏸️ Parked | ❌ Rejected

**Description:** one paragraph

**Discussion:**
- [Cowork] thought / counterpoint
- [Hermes] technical reality check
- [Codex] reliability / verification angle
- [Michael] decision
```

Sort by Status (Approved → Discussing → Proposed → Parked → Rejected).

---

## Proposed (seed batch from Cowork — 2026-05-13)

### I-001 — Subscription tier: $19/mo for unlimited audits + monthly auto-recheck
**Proposer:** Cowork
**Category:** Revenue
**Autonomy impact:** 🚀 high — recurring revenue is the textbook passive-income vehicle; converts one-time $9.99 transactions into ARR
**Revenue impact:** 🚀 high — even 50 subscribers = $11.4K ARR with marginal extra cost
**Effort:** M — Stripe subscription + audit-quota tracking + monthly cron to re-run audit + diff report
**Status:** 💡 Proposed

**Description:** Customers who run an audit get offered a $19/mo plan: unlimited audits + automatic monthly re-audit + email diff showing what changed. Recurring revenue with near-zero marginal cost (PageSpeed quota is the only meaningful variable). Stickiness comes from the monthly diff — customers see their improvements and stay subscribed.

**Discussion:**
- [Cowork] Pricing test before commit: A/B 30% of post-audit screens to see conversion.
- [Hermes] —
- [Codex] —
- [Michael] —

---

### I-002 — White-label agency tier: $99/mo for agencies running audits for clients
**Proposer:** Cowork
**Category:** Revenue
**Autonomy impact:** 🚀 high — agencies become a distribution channel that grows without Michael's involvement
**Revenue impact:** 🚀 high — 5x AOV vs consumer tier; agencies are sticky once they integrate the tool into their workflow
**Effort:** L — branding customization, multi-client dashboard, white-label report PDF, agency-specific Stripe pricing
**Status:** 💡 Proposed

**Description:** Agencies running SEO services for small businesses pay $99/mo for: unlimited audits, white-label reports with their logo and contact info, multi-client dashboard, basic API access. Single customer at $99/mo replaces 10 consumer customers at $9.99 with less support burden.

**Discussion:**
- [Cowork] Probably the highest-ROI tier we can build. Agencies pay willingly because they bill clients for the service.
- [Hermes] —
- [Codex] —
- [Michael] —

---

### I-003 — Affiliate program: 30% commission for referrals
**Proposer:** Cowork
**Category:** Acquisition
**Autonomy impact:** 🚀 high — outsources marketing to affiliates motivated by money
**Revenue impact:** ⬆️ medium — depends on affiliate uptake; SEO-community affiliates can drive meaningful traffic
**Effort:** M — affiliate-tracking links, Stripe Connect for payouts, attribution UI
**Status:** 💡 Proposed

**Description:** Anyone who sends customers gets 30% of the first paid audit, 30% of any subscription for 12 months. Use Rewardful or Tapfiliate for stack-light implementation. SEO bloggers and YouTubers in the small-business space will promote for affiliate revenue.

**Discussion:**
- [Cowork] —
- [Hermes] —
- [Codex] —
- [Michael] —

---

### I-004 — Auto-generated blog: turn aggregate audit data into SEO content
**Proposer:** Cowork
**Category:** Acquisition
**Autonomy impact:** 🚀 high — content generates itself from our existing data; no manual writing
**Revenue impact:** ⬆️ medium — long-tail organic traffic at zero marginal cost
**Effort:** M — query audit data, LLM-generate posts on patterns, schedule auto-publish
**Status:** 💡 Proposed

**Description:** Every week, query the last 100 audits for the most common high-severity issues. Generate a blog post: "5 sites we audited this week with the same robots.txt bug — here's what they all got wrong." DeepSeek or GPT writes it; auto-published to /resources/. Each post is a long-tail SEO magnet AND social proof of the tool's depth.

**Discussion:**
- [Cowork] Privacy: aggregate-only, no customer URLs unless explicit consent. Anonymize.
- [Hermes] —
- [Codex] —
- [Michael] —

---

### I-005 — Post-audit email drip: convert free-tier to paid
**Proposer:** Cowork
**Category:** Retention
**Autonomy impact:** 🚀 high — fully automated email sequence
**Revenue impact:** ⬆️ medium — converts the existing first-free-report traffic into paid customers
**Effort:** S-M — SendGrid Marketing Campaigns + 5-email sequence + drip triggers in webhook
**Status:** 💡 Proposed

**Description:** When someone runs the free first audit, enroll them in a 5-email educational drip over 14 days. Each email teaches one issue we found in their audit + how to fix it + closes with "ready for a deeper look? Run another audit." Existing SendGrid `free_report_followup` infra already exists per CURSOR_TICKET_002.

**Discussion:**
- [Cowork] —
- [Hermes] —
- [Codex] —
- [Michael] —

---

### I-006 — API tier for SaaS integrations
**Proposer:** Cowork
**Category:** Revenue
**Autonomy impact:** 🚀 high — passive revenue from integrators, no support burden after onboarding
**Revenue impact:** 🚀 high — usage-based pricing scales with integrator's customer base
**Effort:** L — public API surface, key management, rate limits, docs, billing meter
**Status:** 💡 Proposed

**Description:** $0.50/audit programmatic access. Other SaaS tools (website builders, hosting providers, SEO platforms) embed our audit into their offerings. They get our value-add; we get usage-based revenue with no marketing cost.

**Discussion:**
- [Cowork] Could be a Stripe metered subscription with prepaid credits as the simpler V1.
- [Hermes] —
- [Codex] —
- [Michael] —

---

### I-007 — Auto-generated "vs [competitor]" comparison pages
**Proposer:** Cowork
**Category:** Acquisition
**Autonomy impact:** ⬆️ medium — content writes itself once the template exists
**Revenue impact:** ⬆️ medium — high-intent comparison searches convert well
**Effort:** S — scaffold a `[competitor].tsx` template; populate 20+ competitors programmatically
**Status:** 💡 Proposed

**Description:** We already have 3-4 "vs" pages (Seobility, SEMrush, SEO Site Checkup). High-intent comparison search traffic is some of the easiest to convert. Scale to 20+ comparison pages auto-generated from a competitor data file. Add new competitors via a single line in `data/competitors.ts`.

**Discussion:**
- [Cowork] —
- [Hermes] —
- [Codex] —
- [Michael] —

---

### I-008 — AI-powered support: auto-answer common customer questions
**Proposer:** Cowork
**Category:** Automation
**Autonomy impact:** 🚀 high — removes Michael from the support loop
**Revenue impact:** ⬆️ medium — faster support → higher conversion + retention
**Effort:** M — fine-tune a support FAQ system + integrate into the report page + admin@seochecksite.net auto-reply
**Status:** 💡 Proposed

**Description:** Most customer questions are predictable: "where's my report", "I didn't get the email", "what does X score mean", "can I get a refund". Build an LLM-backed reply system that handles these autonomously. Hermes already monitors admin@seochecksite.net per the email-bot setup — extend that bot to draft replies and only escalate genuinely novel questions.

**Discussion:**
- [Cowork] —
- [Hermes] —
- [Codex] —
- [Michael] —

---

### I-009 — Email-gated past-audits dashboard
**Proposer:** Cowork
**Category:** Retention
**Autonomy impact:** ⬆️ medium — drives repeat audits without sales effort
**Revenue impact:** ⬆️ medium — repeat customers spend at higher rates
**Effort:** S — email-magic-link login + audit history list page
**Status:** 💡 Proposed

**Description:** Customer enters email → emailed a one-click login link → sees all their past reports + "run another audit" CTA. No password infrastructure needed (passwordless). Drives the repeat audit + recurring touchpoint.

**Discussion:**
- [Cowork] —
- [Hermes] —
- [Codex] —
- [Michael] —

---

### I-010 — Error monitoring (Sentry or equivalent)
**Proposer:** Cowork
**Category:** Reliability
**Autonomy impact:** 🚀 high — autonomous failure detection removes "Michael notices customer email" loop
**Revenue impact:** ⬆️ medium — silent audit failures = silent revenue leaks
**Effort:** S — Sentry SDK install, source-map upload, alert thresholds
**Status:** 💡 Proposed

**Description:** Right now we have no idea how many audits silently fail in production. PageSpeed quota burns we don't notice. SendGrid bounces we don't see. Sentry (or PostHog with errors) flips this from reactive ("Michael saw a thing") to proactive (alert before customers report it).

**Discussion:**
- [Cowork] —
- [Hermes] —
- [Codex] —
- [Michael] —

---

## How to use this file

- **Hermes:** Append your own ideas in a fresh `### I-XXX` block. Tag yourself as proposer. Especially welcome: automation primitives, infrastructure simplifications, tech-debt items that unlock new features cheaply.
- **Codex:** Append ideas focused on reliability, customer trust, verifiability. Also chime in on others' ideas under their Discussion sections.
- **Cowork:** Maintain this file. Promote Discussing → Approved when Michael says yes. Move shipped items to a `## Shipped` section at the bottom.
- **Michael:** Read this file occasionally; mark Approved/Rejected/Park on any line. Or drop an idea in `seochecksiteToDo.txt` with prefix `IDEA:` and Cowork will move it here.

---

### I-011 — Auto-scaling SendGrid warmup pool for deliverability
**Proposer:** Hermes
**Category:** Reliability
**Autonomy impact:** 🚀 high — removes Michael from deliverability firefighting
**Revenue impact:** ⬆️ medium — prevents silent revenue leakage from undelivered reports
**Effort:** M — SendGrid sub-user API + sending schedule + monitoring dashboard
**Status:** 💡 Proposed

**Description:** D-006c/D-006d revealed that SendGrid's IP has warming gaps against certain recipient servers (NetSol OXCS Validity filter). Build an automated warmup system that sends low-volume, low-risk test emails (e.g., site-health digests to internal addresses) on a graduated schedule to build sender reputation with major providers automatically. Integrated with the existing SendGrid sub-user API. Includes a deliverability dashboard showing per-provider (Gmail/Outlook/Yahoo/other) delivery rates over time.

**Discussion:**
- [Cowork] —
- [Hermes] Building on the D-006d finding: this automates what otherwise becomes a manual "Michael sends test emails" workflow after every SendGrid credential change.
- [Codex] —
- [Michael] —

---

### I-012 — Pre-deploy smoke manifest (automated deploy gate)
**Proposer:** Hermes
**Category:** Reliability
**Autonomy impact:** 🚀 high — prevents shipping broken code without a human catching it
**Revenue impact:** ⬇️ low — protects existing revenue rather than generating new
**Effort:** S — reuse the existing `scripts/smoke-manifest.json` format and add a GitHub Actions check
**Status:** 💡 Proposed

**Description:** Every deploy currently requires a manual smoke check (open pages, verify HTTP 200). D-001's empty-commit deploy loop proved how easy it is to burn through Netlify credits on non-functional deploys. Build a pre-deploy gate: before `vercel --prod` runs, a GitHub Actions workflow or script hits every URL in `scripts/smoke-manifest.json`, verifies 200 responses, and blocks the deploy if any fail. Cheap upfront (the smoke manifest already exists), prevents trust-eroding 404s like the 10 broken glossary links Codex found.

**Discussion:**
- [Cowork] —
- [Hermes] The smoke manifest already exists at `scripts/smoke-manifest.json` — this is just wiring it into the deploy pipeline.
- [Codex] —
- [Michael] —

---

### I-013 — Self-healing audit pipeline: graceful timeout recovery
**Proposer:** Hermes
**Category:** Automation
**Autonomy impact:** 🚀 high — eliminates the "stuck audit" cycle that requires human intervention
**Revenue impact:** ⬆️ medium — completed audits = completed sales
**Effort:** M — partial-result save on timeout, queue priority aging, stuck-audit alerting
**Status:** 💡 Proposed

**Description:** D-006 found that when an audit exceeds the Netlify function timeout, the queue item gets stuck in `processing` and requires the auto-heal (3+ minute delay) to reset. For a paying customer, that means their report takes 3+ minutes longer than it should. Build a graceful timeout handler: when the function approaches its time limit, save whatever results are already collected (PageSpeed score, crawl health, on-page analysis for the homepage), mark the audit as `completed` with `partial_results=true`, and send the report. The customer gets a report with a "Some modules were still processing" note rather than nothing. Queue priority aging ensures stuck items don't block new audits.

**Discussion:**
- [Cowork] —
- [Hermes] This directly addresses the customer-visible failure mode from D-006. A customer waiting 4 minutes for their report is worse than getting a partial report in 60 seconds.
- [Codex] —
- [Michael] —

