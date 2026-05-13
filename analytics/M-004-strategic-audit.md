# M-004 Hermes Strategic Audit

**Date:** 2026-05-13
**Scope:** Independent visual, UX, copy, report-quality, and competitive review.
**Constraint:** Read-only — no deploy, no live audit, no code changes.
**Note:** Written independently; Codex version at `analytics/M-004-codex-strategic-audit.md`.

## Executive Summary

**Verdict: Refresh, not redesign. Product concept is sound at $14.99. Simplicity is the moat — don't turn into a dashboard.**

The report delivers good value for $14.99 when it arrives. The homepage explains what the product is clearly. The three gaps that matter most:

1. **First viewport doesn't sell the outcome** — it says WHAT ("free website audit") but not WHY THIS ONE is worth $14.99 vs the free alternatives
2. **Report visual hierarchy is table-heavy** — good information density, but the evidence tables dominate. A paying customer needs a "here's what to fix first" summary before the data dump
3. **Competitive positioning is unclear at a glance** — Sitechecker and SEOptimer are full agency suites ($20-100+/mo). SEO CheckSite is a one-off $14.99 report. That's a *strength*, but it's not stated on the homepage

## First 5 Seconds (Homepage)

**Passes (what's clear):**
- This is a free website audit for small business owners
- The $14.99 full report price is visible before the form
- The form is simple (URL + email + name)
- Trust signals: "No jargon", "No subscription", "Delivered to inbox"

**Fails (what's not clear):**
- Why pay $14.99 instead of running a free Sitechecker/SEOptimer audit?
- What makes this report *different* from free tools?
- No proof strip at the top: pages checked, delivery speed, sample report link, trust badges
- "Regular business owners" is warm but not persuasive

**Fix (app/page.tsx:148-175):** Rewrite hero area to include a 3-item proof row:
- "5 pages checked in-depth" / "$14.99 one-time" / "Includes fix instructions"

## Visual Verdict

| Page | Verdict | Notes |
|------|---------|-------|
| `/` | Tweak | Clean and responsive. Blue/white/card layout is generic but not offensive. Feels like many SaaS landing pages — not bad, not memorable. |
| `/sample-report` | Tweak | D-110 ships DB-backed render (live audit). Big improvement. |
| `/resources/*` | Keep | SEO content pages are functional. Grid layout is fine for the purpose. |
| `/success` | Tweak | Post-audit page is sparse. M-003 added waiting copy which helps. |
| `/recommend` | Overhaul | Cold-visit state is confusing. Session-storage-dependent. |
| Legal pages | Keep | Privacy, Terms, Refund, Accessibility all present. Clean. Trust-positive. |
| 404 | Keep | Standard Next.js 404. Not offensive. |

**Color/design:** The blue (#0369a1) + white palette is safe but samey. Not a redo priority. The sample report card on the homepage (81/100, 4 module scores) is the strongest visual element.

## Copy Verdict

**Homepage copy is functional but not conversion-optimized:**
- "Free Website Audit for Small Business Owners" — clear audience, weak hook
- "No jargon. No technical knowledge needed." — good, but buried below the fold
- "Your first report is free" — undersells the paid report
- The $14.99 line is present but not compelling: what do I get for $14.99 that I don't get for free?

**Missing at $14.99:** A comparison table (free vs paid) on the homepage showing exactly what unlocks. The resource pages do comparison articles (vs Seobility, vs Semrush) but the homepage doesn't make the case.

## Report Page Visual Quality

**Report at `/report/c62829fb` is information-rich but visually dense:**
- Evidence tables are the dominant visual pattern — they contain good data but lack visual hierarchy
- The "top 3 actions" section is good — that's the pattern to emphasize
- Module sections (Performance, Crawl Health, etc.) use the same table layout each time
- Colors: blue headers, green/amber/red severity badges, black text — functional but not premium
- The page is scroll-heavy but readable

**At $14.99, the report delivers substance.** A customer who reads it will get clear, actionable advice. The question is whether the visual presentation supports the price point. Current verdict: the substance justifies $14.99; the presentation is "competent but not premium."

## Competitor Comparison

| Competitor | Model | Price | Coverage | Best at | SEO CheckSite advantage |
|------------|-------|-------|----------|---------|------------------------|
| **Sitechecker.pro** | Agency suite | $20-100+/mo | 300+ checks, ongoing monitoring, GSC/GA4 integration, white-label reports | Segmentation, issue trends, multi-user | Simpler/faster output. No subscription. $14.99 one-off vs monthly commit. |
| **SEOptimer** | Agency suite | $17-50+/mo | SEO audit + GEO/LLM visibility, keyword tracking, backlinks, white-label PDF | White-label PDF reports, embedded audit widget, multilingual | Cheaper entry point for one audit. No account needed. Results in minutes. |
| **Ubersuggest (Neil Patel)** | Freemium suite | Free tier + $12-24/mo | Domain overview, keyword ideas, content ideas, backlinks | Keyword research + content gap analysis | No registration required for preview. Audit-focused, not a full SEO suite. |
| **SEMrush Site Audit** | Enterprise suite | $129+/mo | Full crawler, 140+ checks, historical data | Depth of crawl, competitive analysis, integrations | 1/10th the price. Small-business focused copy. No learning curve. |

**Key insight:** SEO CheckSite's biggest competitive advantage is never mentioned on the homepage:
- **No account creation** — enter URL + email, get report
- **No subscription** — pay once, $14.99
- **No dashboard to learn** — the report IS the deliverable
- **Small-business language** — competitors write for agencies/SEOs

## Top 5 Prioritized Changes

| # | Change | Effort | Impact | Notes |
|---|--------|--------|--------|-------|
| 1 | **Proof strip on homepage hero** (pages checked, $14.99 one-time, minutes-to-inbox) | S (1-2h) | High | Closes the "why pay?" gap. `app/page.tsx:148-175` |
| 2 | **Free vs paid comparison table on homepage** | S (1-2h) | High | Shows exactly what unlocks at $14.99. Below the form, above the sample report. |
| 3 | **Report visual: sticky "top 5 fixes" summary** | M (4-8h) | Medium | Report generation change in `lib/generate-simple-report.ts`. A sticky header with the top 5 actions before the module tables. |
| 4 | **Mobile report readability pass** | M (4-8h) | Medium | The report is readable on mobile but the evidence tables are cramped. Side-scrolling or stacked cards. |
| 5 | **Add a "no subscription, no dashboard" tagline** | S (<1h) | Medium | One-line addition to hero: "No account. No dashboard. One report, $14.99." Directly differentiates from competitors. |

## Notes on Codex Alignment

Codex's verdict was also **"refresh, not full redesign"** and focused on:
- First-5-seconds clarity
- Report hierarchy
- Upgrade/CTA paths

I agree on all three. My main addition: **the competitive positioning gap** — we never say what makes us different from free alternatives. The "no subscription, no dashboard" angle is our strongest differentiator and it's not stated anywhere on the homepage.
