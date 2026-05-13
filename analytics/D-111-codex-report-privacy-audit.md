# D-111 Codex Report Privacy/Security Audit

Audit target: `https://seochecksite.net/report/c62829fb-54cb-481c-a051-89c6f02aebef`  
Date: 2026-05-13  
Verdict: **No red public-data leak found; yellow hardening required.**

## Executive Summary

The live public report did not expose customer email, payment fields, internal timestamps, queue/retry fields, source/referrer/IP fields, stack traces, or UUIDs beyond the audit ID. The browser network trace showed one report document request, the report page chunk, and one `POST /api/funnel-event` that returned `204` and did not return audit data. The main privacy/security weakness is server-side over-selection: the public route fetches the full `audits` row plus `customers(email)` with a service client even though it renders only a small subset. That is not currently a client-visible leak, but it is an avoidable leak surface and should be fixed in D-112.

## Per-Field Rendered Content Audit

| Surface / field | Example seen on live report | Classification | Reason |
|---|---|---:|---|
| Report title/domain/date | `Website Report for seochecksite.net`, `May 13, 2026` | Green | Expected customer deliverable content. |
| Audited URL / final URL | `https://seochecksite.net`, `https://seochecksite.net/` | Green | Public site data the customer paid to audit. |
| Page title / meta description / H1 | Public SEO metadata from audited pages | Green | Public webpage content; report generator escapes these values before HTML output. Evidence: `lib/generate-simple-report.ts:700-704`. |
| Multi-page sample list | Public sitemap URLs, page titles, descriptions, word counts, issue counts | Green | Public site data. Descriptions/titles are escaped/truncated before output. Evidence: `lib/generate-simple-report.ts:738-749`. |
| Scores, issue titles, fixes, explanations | Performance score, crawl health, on-page SEO, mobile optimization, action items | Green | Core report value. |
| PageSpeed metrics | FCP/LCP/TBT/CLS/Speed Index, recommendations | Green | Derived public performance data. |
| Raw PageSpeed metadata | Not visible in rendered report | Green | DB raw JSON contains public `finalUrl`/metrics and no email/IP/referrer/user-agent evidence in this audit. |
| Admin contact email | `admin@seochecksite.net` in site schema/meta | Green | Business contact, not customer data. |
| Audit UUID | `c62829fb-54cb-481c-a051-89c6f02aebef` | Yellow | Necessary for the current share URL, but it is still a bearer-style access token. |
| Customer email | Not rendered | Green | Live grep found no customer email or `customer_email`. |
| Payment fields | Not rendered | Green | Live grep found no `stripe_session_id`, `total_price_cents`, or `paid`. |
| Internal timestamps | Not rendered | Green | Live grep found no `email_sent_at`. |
| Queue/retry fields | Not rendered | Green | Live grep found no `queue_id` or `retry_count`. |
| Referrer/IP/source fields | Not rendered | Green | Live grep found no `source_url`, `referrer`, or `ip_address`. |
| Stack traces/server paths | Not rendered | Green | Live grep found no stack trace/server path leak; `server` text only appeared in ordinary report advice. |

## Network-Tab Findings

Observed browser requests for the live report:

| Request | Response | Finding |
|---|---:|---|
| `GET /report/c62829fb-54cb-481c-a051-89c6f02aebef` | `200` | HTML response contained only the audit UUID from the known risk UUID class. |
| `GET /_next/static/chunks/app/report/%5Bid%5D/page-5d258f7253e48527.js` | `200` | Client chunk did not include audit row data. |
| `POST /api/funnel-event` | `204` | Request body contained `event_name`, a browser `session_id`, the audit ID, and audited site URL. Response body was empty. |

The public report route does **not** make a client-side API call that fetches the full audit row. The full-row access happens server-side in `app/report/[id]/page.tsx:93-99`, where the service client selects `*, customers(email)`.

The funnel event endpoint stores the event and looks up only `customer_id` server-side when `audit_id` is present. Evidence: request schema at `app/api/funnel-event/route.ts:9-15`, audit lookup at `app/api/funnel-event/route.ts:31-35`, insert at `app/api/funnel-event/route.ts:37-44`.

## View-Source / Hydration Findings

Live source fetch:

- HTTP `200`
- HTML size: `129815` bytes
- `__NEXT_DATA__`: not present
- Unique UUIDs found: only `c62829fb-54cb-481c-a051-89c6f02aebef`
- Known-risk grep counts: `customer_email=0`, `stripe_session_id=0`, `total_price_cents=0`, `paid=0`, `email_sent_at=0`, `queue_id=0`, `retry_count=0`, `source_url=0`, `referrer=0`, `ip_address=0`, `raw_result_json=0`

The route also sets `robots: { index: false, follow: false }`, which is correct for report privacy. Evidence: `app/report/[id]/page.tsx:35-38`.

## Risky Fields Found

### Red

None confirmed on the live public surface.

### Yellow

1. **Over-broad server-side public-route query.** The report page uses the service client and selects the full audit row plus `customers(email)` for a public UUID route. Evidence: `app/report/[id]/page.tsx:93-99`. The DB row includes customer/account fields that are not needed for rendering: `customer_id`, `total_price_cents`, `email_sent_at`, follow-up timestamps, `error_log`, plaintext report, raw JSON, and `customers.email` were present in the server-side row inspected for audit `c62829fb`. None leaked to HTML/network in this pass, but the query should be narrowed before future client props/refactors accidentally serialize private fields.

2. **Bearer-link report access.** The report is intentionally open to anyone with the UUID URL. The audit ID appeared in canonical/source and the funnel-event POST body. Evidence: `app/report/[id]/page.tsx:39-40` and `components/ReportFunnelTracker.tsx:11-18`. This is acceptable for a shareable report model, but the product should treat the URL as a private bearer link.

3. **`dangerouslySetInnerHTML` relies on report-generator escaping.** The current generator escapes scraped fields before output, e.g. `lib/generate-simple-report.ts:162`, `lib/generate-simple-report.ts:700-704`, and `lib/generate-simple-report.ts:738-749`. Keep this invariant tested because the public report page renders stored HTML directly at `app/report/[id]/page.tsx:204-206`.

## PageSpeed Raw Response Check

The `raw_result_json` for audit `c62829fb` contains report data and PageSpeed-derived performance fields such as `pageSpeedScore`, `firstContentfulPaint`, `largestContentfulPaint`, `totalBlockingTime`, `pageSpeedStrategy`, and public `finalUrl`. In this sample, it did **not** contain email, IP/referrer, or user-agent/request metadata. It also did not appear in live HTML source or network responses.

## URL Share-Model Recommendation

Recommendation: **Hybrid.**

Keep the current open UUID report link for convenience and supportability, but harden it as a bearer-link model:

- Keep `noindex,nofollow`.
- Narrow the report query to an explicit allowlist.
- Do not pass full audit objects to client components.
- Add an optional “private report” or email-gated dashboard later for customers who want report history or sensitive-client privacy.

## Top Fixes

1. **D-112 should ship as hardening, not emergency.** Replace `.select('*, customers(email)')` with an explicit allowlist for exactly what the page needs: `id`, `url`, `status`, `completed_at`, `formatted_report_html`, `total_price_cents`, and the minimal customer email field only if the free-report upgrade gating remains email-based.
2. Move upgrade-gating logic server-side into a helper that returns a boolean rather than exposing `customers(email)` to the page object.
3. Add a privacy regression test that fetches a report page and fails if HTML/source contains `customer_email`, `stripe_session_id`, `total_price_cents`, `email_sent_at`, `queue_id`, `retry_count`, `source_url`, `referrer`, `ip_address`, `raw_result_json`, or any UUID beyond the report ID.
4. Add a generator test asserting scraped title/meta/H1/issue strings are escaped before becoming `formatted_report_html`.
