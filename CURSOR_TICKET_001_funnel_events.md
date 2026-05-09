# CURSOR TICKET 001 — Funnel Event Tracking

**Owner:** Cursor AI
**Priority:** P0 (blocks all other strategy work)
**Estimated scope:** 1 session, ~3-4 files touched
**Acceptance:** all four AC checks pass before opening PR

---

## Why this ticket exists

We are flying blind on conversion. We know audits complete (`audits.status = 'completed'`) and we know revenue (Stripe), but we have **no data on the steps in between**. Without funnel data we cannot decide whether the bottleneck is:

- Homepage → audit start (UX problem)
- Audit start → free report delivered (technical problem, already mostly solved)
- Free report → upgrade click (positioning problem)
- Upgrade click → checkout complete (pricing/friction problem)

Every product decision after this depends on knowing where the leak is.

---

## Scope

Add structured event tracking for the two critical funnels — **acquisition** and **upsell** — and a single read endpoint that surfaces the conversion rates.

**NOT in scope** (separate ticket): SendGrid webhook for email open/click tracking. Build that as TICKET 002.

---

## Implementation

### 1. New migration: `supabase/migrations/010_funnel_events.sql`

Create a `funnel_events` table:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `event_name TEXT NOT NULL` — enum-like, see list below
- `audit_id UUID REFERENCES audits(id) ON DELETE CASCADE` (nullable — early funnel events have no audit yet)
- `customer_id UUID REFERENCES customers(id) ON DELETE CASCADE` (nullable for the same reason)
- `session_id TEXT NOT NULL` — client-generated UUID, persists in localStorage for the browser session, lets us join pre-audit events to post-audit events
- `url TEXT` — the URL the user entered, when relevant
- `metadata JSONB` — free-form for ticket-specific context (e.g., variant labels, error reasons)

Indexes: `(event_name, created_at DESC)`, `(session_id)`, `(audit_id)`.

RLS: deny all to `anon`; allow service role to insert and select. Follow the pattern in `005_enable_rls.sql`.

**Event names (use these exact strings):**

Acquisition funnel:
- `homepage_url_entered`
- `homepage_email_submitted`
- `homepage_consent_given`
- `audit_started_free`
- `audit_started_paid`
- `audit_completed`
- `report_email_sent`

Upsell funnel:
- `report_viewed`
- `upgrade_button_shown`
- `upgrade_button_clicked`
- `upgrade_checkout_started`
- `upgrade_checkout_completed`

### 2. New endpoint: `app/api/funnel-event/route.ts`

`POST /api/funnel-event` — accepts `{ event_name, session_id, audit_id?, url?, metadata? }`. Validates `event_name` against the enum list. Inserts into `funnel_events` using the service-role Supabase client. Returns 204 on success, 400 on bad event name. Wrap in `withRequestId` if that pattern is used elsewhere in `lib/middleware`.

Fire-and-forget from the client; do not block UX on failure.

### 3. Client-side tracker: `lib/funnel-tracker.ts`

Expose `trackFunnelEvent(eventName, payload?)`. Internally:
- Lazy-init a `session_id` in `localStorage` under key `sitecheck_session_id` (UUID).
- POST to `/api/funnel-event`. Swallow errors silently.
- Also fire to GA4 via `window.gtag('event', eventName, payload)` so we double-up in GA reports without extra work.

### 4. Wire the events

Find the existing form/handler files and add `trackFunnelEvent` calls at the right moments. Likely targets:

- `app/page.tsx` and any form components — `homepage_url_entered`, `homepage_email_submitted`, `homepage_consent_given`
- `app/api/create-checkout/route.ts` — emit `audit_started_paid` server-side via direct Supabase insert (no need to bounce through the API endpoint server-to-server)
- The free-audit start path — `audit_started_free`
- `lib/process-audit.ts` (or wherever audits transition to `completed`) — `audit_completed`
- The email send path — `report_email_sent`
- `app/report/[id]/page.tsx` (or equivalent) — `report_viewed`
- `components/UpgradeToFullButton.tsx` — `upgrade_button_shown` on mount, `upgrade_button_clicked` on click
- `app/api/upgrade-to-full/route.ts` — `upgrade_checkout_started`
- Stripe webhook handler in `app/api/webhooks/stripe/` — `upgrade_checkout_completed` when an upgrade payment succeeds

**Do not** track on every render. Use `useEffect` with empty deps where applicable.

### 5. Read endpoint: `app/api/admin/funnel/route.ts`

`GET /api/admin/funnel?days=7` (default 7, max 90).

Auth: same pattern as other admin endpoints — `Authorization: Bearer ${ADMIN_SECRET}`.

Returns JSON:

```json
{
  "window_days": 7,
  "acquisition": {
    "homepage_url_entered": 0,
    "homepage_email_submitted": 0,
    "homepage_consent_given": 0,
    "audit_started_free": 0,
    "audit_started_paid": 0,
    "audit_completed": 0,
    "report_email_sent": 0
  },
  "upsell": {
    "report_viewed": 0,
    "upgrade_button_shown": 0,
    "upgrade_button_clicked": 0,
    "upgrade_checkout_started": 0,
    "upgrade_checkout_completed": 0
  },
  "rates": {
    "url_to_email_pct": 0.0,
    "email_to_audit_pct": 0.0,
    "audit_to_completed_pct": 0.0,
    "report_to_upgrade_click_pct": 0.0,
    "upgrade_click_to_paid_pct": 0.0,
    "url_to_paid_pct": 0.0
  }
}
```

Single SQL query against `funnel_events` grouping by `event_name`. Compute rates in JS.

---

## Acceptance Criteria

1. **Migration applies cleanly** to production Supabase. No errors, RLS enabled, indexes created.
2. **End-to-end manual test** — run a free audit on staging, then `curl -H 'Authorization: Bearer $ADMIN_SECRET' https://seochecksite.net/api/admin/funnel?days=1` and confirm the count of `audit_started_free` and `audit_completed` both incremented by 1 for that session.
3. **Upsell test** — click the upgrade CTA without completing checkout, confirm `upgrade_button_clicked` incremented but `upgrade_checkout_completed` did not.
4. **No regressions** — existing audits still complete and email delivery still fires. Run the existing health check sequence.

---

## Out of scope / explicitly do NOT do

- Don't build a frontend dashboard. The JSON endpoint is enough — Michael will read it directly or I'll wire it into Cowork.
- Don't add per-URL or per-customer breakdowns. Aggregate only.
- Don't change `audits.status` semantics or the queue worker.
- Don't touch Hermes/Openclaw scaffolding (`AGENTS.md`, `.openclaw/`, `memory/`, `DREAMS.md`, `HEARTBEAT.md`) — those agents are on loan to other startups and will rotate back. Leave their files alone.

---

## Definition of done

- PR opened against `main` with the migration, endpoint, tracker lib, and instrumented call sites.
- `PROJECT.md` updated under "Recent Changes" with the new event taxonomy and the read endpoint URL.
- Updated `REQUIRED_SECRETS.md` if any new env var was added (none expected — reuses `ADMIN_SECRET`).
