# M-004 Codex Strategic Audit

Date: 2026-05-13
Scope: Independent visual, UX, copy, report-quality, and competitor review of SEO CheckSite. I did not read Hermes's M-004 deliverable before writing this.

Supporting screenshots captured for this pass:
- `analytics/m004-screens/home-desktop.png`
- `analytics/m004-screens/home-mobile.png`
- `analytics/m004-screens/report-desktop.png`
- `analytics/m004-screens/report-mobile.png`
- `analytics/m004-screens/resources-desktop.png`
- `analytics/m004-screens/sample-desktop.png`

## Executive Summary

Verdict: refresh, not a full rebuild. The product idea is clear and the trust/legal basics are stronger than many small tools, but the interface currently feels like a competent internal MVP rather than a polished $14.99 purchase experience. The homepage passes the "what is this?" test but fails the sharper "why pay $14.99 instead of using a free checker?" test. The report is information-rich enough to justify the price, but its visual system needs hierarchy, fewer table-heavy sections, and a more guided "do these next" layer.

Primary strategic move: keep the simple positioning, then make the product feel more premium and more outcome-led. Do not redesign into a SaaS dashboard. Instead, upgrade the first viewport, checkout path, report presentation, and comparison/proof surfaces.

## First 5 Seconds

What is clear:
- The homepage immediately says it is a free website audit for small business owners (`app/page.tsx:153-170`).
- The $14.99 full-report price is visible before the form (`app/page.tsx:148-170`).
- The form is easy to find and low-friction (`app/page.tsx:175-206`).

What is not clear enough:
- The first viewport says what the product is, but not why this report is better than free alternatives.
- "Regular business owners" is friendly, but not as conversion-focused as "Get a plain-English fix list you can send to your web designer today."
- The proof is below the fold. In 5 seconds, I do not see number of pages checked, sample report credibility, delivery speed, refund/trust, or "no subscription" as a concise proof row.

## Per-Page Strategic Table

| URL | Visual Verdict | Copy Verdict | Recommendation |
|---|---|---|---|
| `/` | Tweak. Clean, responsive, but blue/white/card-heavy and visually generic. | Tweak. Clear audience and price, but the offer is descriptive more than persuasive. | Rewrite hero around outcome + proof: "Plain-English SEO fixes for your website in minutes." Add a compact proof row: 5-page sample, $14.99 once, no subscription, email delivery, refund policy. Code area: `app/page.tsx:148-175`. |
| `/recommend` | Tweak/overhaul. Good module-card mechanics after session state, but cold visits are confusing. | Tweak. It explains modules but could better frame add-ons as "worth it when..." decisions. | Add a server-visible fallback state explaining why the page needs a started audit, instead of relying on session storage (`app/recommend/page.tsx:34-65`). Improve add-on copy at `app/recommend/page.tsx:421-453` and total-price clarity at `app/recommend/page.tsx:501-531`. |
| `/report/c62829fb...` | Tweak. The report has substance, but looks like generated HTML/PDF more than a polished paid deliverable. | Keep/tweak. The advice is plain-English and useful. | Add a sticky or top "Top 5 fixes" summary, clearer severity cards, and less raw evidence-table dominance. The report is injected wholesale at `app/report/[id]/page.tsx:206`, so the real fix belongs in report HTML generation, not the route wrapper. |
| `/sample-report` | Tweak. Useful, but the static embedded sample feels disconnected from the newer live report design. | Keep/tweak. Good expectation-setting, but should sell the paid outcome harder. | Replace the static giant HTML string with a live canonical sample report or componentized renderer. Current static sample starts at `app/sample-report/page.tsx:27-29`, with embedded report HTML beginning `app/sample-report/page.tsx:29`. |
| `/resources` | Keep/tweak. Simple grid is fine for SEO content, but visually plain. | Keep. The hub is practical and small-business aligned. | Add category grouping and "start here" ordering. Current flat card grid is `app/resources/page.tsx:127-133`; CTA is `app/resources/page.tsx:139-145`. |
| Blog/resource detail pages | Keep/tweak. Functional article pages support SEO, but should not drive the main conversion look. | Keep/tweak. Strong plain-language intent; needs stronger internal CTA consistency. | Standardize article CTA blocks: "run your own audit" + sample report + comparison proof. |
| `/privacy`, `/terms`, `/refund`, `/accessibility` | Keep. Trust pages are conventional and readable. | Keep. Legal/trust copy is better than expected for a small paid tool. | Add a slim trust nav back to audit/sample/report, not only "Back to Home." Legal pages share the basic container at `app/privacy/page.tsx:20-28`, `app/terms/page.tsx:20-28`, `app/refund/page.tsx:20-28`, `app/accessibility/page.tsx:20-28`. |
| Global footer | Tweak. Minimal but too sparse for trust/commercial navigation. | Tweak. Only legal links and copyright. | Add Resources, Sample Report, Contact, and "Run an audit" to footer. Current footer links only legal/trust pages at `components/Footer.tsx:8-24`. |

## Report Page Quality

The live report is worth charging for on substance. It includes score, grade, page breakdown, pages audited, module findings, priority actions, and sharing/printing. That is more concrete than many free checkers.

Where it feels underpriced/free-tool-like:
- The report is a long generated document with lots of tables, inline styles, and repeated sections.
- The top score is strong, but the "what should I do Monday morning?" layer needs to be more dominant.
- The report does not visually separate owner-facing advice from developer-facing evidence enough.
- The "Share This Report" and "Track Your Progress" sections are good ideas, but they appear after a lot of dense report content.

Recommended report model:
- Top: score, 3-sentence diagnosis, top 5 fixes, "send this to your developer" CTA.
- Middle: modules with cards and severity tags.
- Bottom: evidence tables, raw details, print/PDF.

## Competitor Comparison

| Competitor | What They Do Better | What SEO CheckSite Does Better |
|---|---|---|
| Semrush SEO Checker / Site Audit (`https://www.semrush.com/siteaudit/`, `https://www.semrush.com/features/site-audit/`) | Stronger brand trust, "140+ checks", AI/search positioning, and clear upgrade path to a full SEO platform. | Less intimidating for non-technical small-business owners; no enterprise-tool sprawl; one-time $14.99 is simpler. |
| Sitechecker (`https://sitechecker.pro/seo-site-audit/`) | Stronger ongoing-monitoring positioning, GSC/GA4 framing, and agency workflow language. | SEO CheckSite is more direct for a one-off owner report and avoids the "project dashboard" burden. |
| SEOptimer (`https://www.seoptimer.com/`) | Stronger lead-gen and white-label story; "beautiful branded audit" positioning is more commercially mature. | SEO CheckSite is more owner-friendly and less agency-oriented; better fit for a business owner who wants a checklist, not an agency pipeline. |
| Ahrefs Webmaster Tools (`https://ahrefs.com/webmaster-tools`) | Huge trust moat, free verified-site audit, 170+ issues, analytics and backlink context. | SEO CheckSite can audit a site without asking the user to verify ownership or learn an SEO suite. That immediacy is the wedge. |
| Surfer Audit (`https://docs.surferseo.com/en/articles/5700351-getting-started-with-audit`) | Better content-depth and SERP-comparison narrative for content teams. | SEO CheckSite is broader for technical owner-readiness and easier for a non-content team. |

Strategic takeaway: SEO CheckSite should not try to look like Semrush/Ahrefs. It should look like the fastest, clearest "send this fix list to my web person" product. The current site says that in words but not yet in visual confidence.

## Top 5 Prioritized Changes

| Priority | Recommendation | Impact | Effort |
|---|---|---:|---|
| 1 | Rewrite and redesign the homepage first viewport around outcome/proof, not only category. Add a compact proof bar and a more decisive CTA. File: `app/page.tsx:148-175`. | High conversion/trust | M |
| 2 | Upgrade report presentation with a top "Top 5 fixes" owner summary and cleaner module cards. Route wrapper injects report HTML at `app/report/[id]/page.tsx:206`; implementation likely belongs in `lib/generate-simple-report.ts`. | High perceived value | M/L |
| 3 | Make `/recommend` robust for cold visits and Stripe cancel returns. It currently depends heavily on `sessionStorage` at `app/recommend/page.tsx:34-65`; add a purposeful fallback/cancel page state. | High funnel recovery | S/M |
| 4 | Replace static sample-report HTML with the same renderer/system as real reports. Current embedded HTML begins in `app/sample-report/page.tsx:27-29`. | Medium trust/value | M |
| 5 | Expand footer/trust navigation and standardize article CTAs. Footer currently has only legal links at `components/Footer.tsx:8-24`; resources grid is flat at `app/resources/page.tsx:127-133`. | Medium SEO/conversion | S |

## Overall Verdict

Refresh. Do not scrap the product or turn it into a heavy dashboard. The site needs a sharper visual system and sales story, not a wholesale architecture change.

The best positioning is: "A plain-English SEO fix list for small business owners, ready to forward to your web designer." That is more compelling than "website audit" and more defensible against free tools.

## Likely Disagreement With Hermes

My guess: Hermes may rate the current homepage/report as "good enough" because the plumbing and hygiene are now much better. I think the substance is good enough, but the presentation is not yet doing $14.99-level persuasion. I expect the biggest disagreement to be the report page: I would prioritize report visual hierarchy almost as highly as homepage copy, because the report is both the product and the strongest sales asset.

