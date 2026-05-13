# M-004 Synthesis — Hermes + Codex Strategic Audits

**Date:** 2026-05-13
**Author:** Cowork (CEO)
**Source docs:**
- `analytics/M-004-strategic-audit.md` (Hermes)
- `analytics/M-004-codex-strategic-audit.md` (Codex)

## Verdict (both agents converged)

**Refresh, not full redesign.** Product substance is strong enough for $14.99. Presentation is "competent internal MVP" — functional, not premium. Specific surfaces need attention; the architecture is sound.

## Where both agents agreed (high-confidence findings)

1. **Homepage first viewport doesn't sell at $14.99.** Both: rewrite hero around outcome + proof, not category. Cite: `app/page.tsx:148-175`.
2. **Report visual hierarchy is table-heavy.** Both: add a sticky "Top 5 fixes" owner summary BEFORE the evidence tables. Cite: report wrapper at `app/report/[id]/page.tsx:204-206`; renderer at `lib/generate-simple-report.ts`.
3. **`/recommend` page is weak.** Hermes: "Overhaul." Codex: "make robust for cold visits and Stripe cancel returns." Cite: `app/recommend/page.tsx:34-65`.
4. **Trust/proof signals are scattered.** Codex: footer trust nav. Hermes: proof strip on hero. Same underlying gap.

## Where the agents complemented each other (additive findings)

Hermes added (not in Codex):
- **Competitive positioning never stated.** "No subscription, no dashboard, no account, one-off $14.99" is the differentiator vs Sitechecker/SEOptimer/SEMrush — never said anywhere on the homepage.
- **Free vs paid comparison table.** Customer doesn't know what $14.99 unlocks vs the free preview.
- **Mobile report readability.** Tables are cramped on phones; cards or side-scroll needed.

Codex added (not in Hermes):
- **Footer/trust navigation expansion.** Currently only legal links at `components/Footer.tsx:8-24`. Should include trust signals, contact, sample report link, social proof.
- **Standardize article CTAs** across the `/resources/*` content pages — most don't push back to the audit form.

## Where they (mildly) disagreed

- **Visual currency severity.** Codex called the design "competent internal MVP." Hermes was slightly more positive — "clean and responsive, not memorable but not offensive." Net: both agree it's serviceable; Codex pushes harder on premium feel.
- **`/sample-report`.** Codex listed it as a target; Hermes noted D-110 already shipped DB-backed render. (D-110 closed this gap; Codex's audit was written before he saw the deploy.)

## Recommended M-005 sprint scope (Cowork synthesis)

**M-005a — Conversion sprint (highest revenue impact, ship together):**

| # | Item | Effort | Source |
|---|------|--------|--------|
| 1 | Homepage hero: outcome-focused headline + 3-item proof strip ("5 pages checked / $14.99 one-time / minutes to inbox") | S (1-2h) | Both |
| 2 | "No subscription, no dashboard, no account" differentiator tagline in hero | S (<1h) | Hermes |
| 3 | Free vs paid comparison table below the form, above sample card | S (1-2h) | Hermes |
| 4 | Report: sticky "Top 5 fixes" owner summary BEFORE module tables | M (4-8h) | Both |
| 5 | `/recommend` overhaul: handle cold visits + Stripe cancel returns; less sessionStorage dependence | M (4-8h) | Both |

**Effort estimate:** ~12-22 hours. One batched deploy. Smoke gate gates it.

**M-005b — Polish sprint (deferred, after M-005a ships clean):**

| # | Item | Effort | Source |
|---|------|--------|--------|
| 6 | Footer trust nav expansion (sample, contact, trust badges) | S (1-2h) | Codex |
| 7 | Standardize CTAs across `/resources/*` articles | M (2-4h) | Codex |
| 8 | Mobile report readability (cards or side-scroll for evidence tables) | M (4-8h) | Hermes |

**Effort estimate:** ~7-14 hours.

## What we are NOT doing

- Full redesign / color palette change / framework swap. Both agents explicitly: not needed.
- New pricing tier work. Out of scope.
- Logo/brand refresh. Both: not a priority.
- New marketing pages. Existing resource library is sufficient.

## Sequencing recommendation

1. Hermes finishes current in-flight work (D-006i, D-107c, D-006-abc-timing, D-004, D-006d-gmail, D-112-fix).
2. R-003a re-passes once D-006i closes.
3. **Then** M-005a sprint starts — single batched deploy through the smoke gate.
4. Codex R-M-005a verifies all 5 items functionally (not just HTTP 200).
5. Then M-005b polish sprint.

**Do NOT start M-005 before D-006i + R-003a close.** Mixing infrastructure cleanup with conversion sprint = scope creep + harder review.

## Open questions for Michael (low priority, can answer when convenient)

- **The "no subscription" tagline** — sign off on the framing? It's a real differentiator but it's also implicitly saying competitors are too complicated. Want to be that direct, or softer ("simple, one-time audit")?
- **"Top 5 fixes" report header** — name confirmed? Alternatives: "Priority fixes", "Quick wins", "Start here", "Most important issues". Codex/Hermes lean toward "Top 5 fixes" as plain-English.
- **Free vs paid comparison table** — do you want me to draft the exact rows, or have Hermes propose them in M-005a?
