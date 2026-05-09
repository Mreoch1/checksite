# CURSOR TICKET 002 — SendGrid Event Webhook for Email Engagement

**Owner:** Cursor AI
**Priority:** P1 (do after Ticket 001 ships)
**Estimated scope:** 1 session, ~3 files touched
**Acceptance:** all three AC checks pass

---

## Why this ticket exists

We send two important emails per customer: the **report delivery email** and the **free-report follow-up survey email**. We currently track that they were *sent* (`audits.email_sent_at`, `audits.free_report_follow_up_sent_at`) but **not whether they were opened or clicked**. Without that data we can't tell whether the survey response rate is low because the email is bad or because no one is opening it.

This ticket wires SendGrid's Event Webhook into our database so we can answer that.

---

## Scope

Receive SendGrid's event POSTs at a new endpoint, persist them, and surface aggregate engagement on the funnel admin endpoint built in Ticket 001.

---

## Implementation

### 1. New migration: `supabase/migrations/011_email_events.sql`

Create `email_events` table:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `sg_event_id TEXT UNIQUE NOT NULL` — SendGrid's `sg_event_id`, used for idempotency
- `event_type TEXT NOT NULL` — `delivered`, `open`, `click`, `bounce`, `dropped`, `spamreport`, `unsubscribe`
- `email TEXT NOT NULL`
- `audit_id UUID REFERENCES audits(id) ON DELETE SET NULL` — populated from custom args (see step 3)
- `email_category TEXT` — `report_delivery` or `free_report_followup` or `upgrade_receipt`
- `sg_message_id TEXT` — SendGrid's message ID for joining a single send to its lifecycle
- `url TEXT` — for click events
- `user_agent TEXT`
- `ip TEXT`
- `raw JSONB NOT NULL` — full SendGrid event payload for forensics

Indexes: `(event_type, created_at DESC)`, `(audit_id)`, `(email_category, event_type)`, `(sg_event_id)` already from UNIQUE.

RLS: deny all to anon, allow service role.

### 2. New endpoint: `app/api/webhooks/sendgrid/route.ts`

`POST /api/webhooks/sendgrid`. SendGrid sends an array of events per request — handle the batch.

**Auth:** SendGrid signs requests with ECDSA. Verify the signature using `@sendgrid/eventwebhook` (already in `@sendgrid/mail`'s ecosystem — install if needed: `@sendgrid/eventwebhook`). Reject with 401 on signature mismatch. Public key goes in env var `SENDGRID_WEBHOOK_PUBLIC_KEY` (added to `REQUIRED_SECRETS.md`).

**Idempotency:** insert with `ON CONFLICT (sg_event_id) DO NOTHING`. SendGrid retries; we must not double-count.

**Custom args mapping:** the email send code in `lib/email-unified.ts` already passes some custom args (or should) — extend it so every send tags the message with `audit_id` and `email_category`. SendGrid forwards `customArgs` back on every event. Read those off each event and persist into the columns above.

Return 200 quickly. Do the inserts in a single batch query; do not loop with awaits.

### 3. Update `lib/email-unified.ts`

Wherever we call SendGrid, ensure every send includes:

```ts
customArgs: {
  audit_id: <uuid>,
  email_category: 'report_delivery' | 'free_report_followup' | 'upgrade_receipt'
}
```

Zoho fallback path is fine to leave un-tracked — it's the fallback, not the primary; we'd see Zoho usage in logs.

### 4. Extend `app/api/admin/funnel/route.ts` (from Ticket 001)

Add a new top-level key to the response:

```json
"email": {
  "report_delivery": {
    "sent": 0,
    "delivered": 0,
    "opened": 0,
    "clicked": 0,
    "bounced": 0,
    "spam_reports": 0,
    "open_rate_pct": 0.0,
    "click_rate_pct": 0.0
  },
  "free_report_followup": { ... same shape ... }
}
```

`sent` comes from counting distinct `sg_message_id` per category in the window. `delivered`/`opened`/`clicked`/`bounced`/`spam_reports` come from counting distinct `(sg_message_id, event_type)` pairs (one open per message — SendGrid sends multiple opens per recipient). Open rate = `opened / delivered`. Click rate = `clicked / delivered`.

### 5. SendGrid console configuration (Michael will do this — document it)

Add to `NETLIFY_DEPLOY.md` a short section called "SendGrid Event Webhook Setup":

1. SendGrid → Settings → Mail Settings → Event Webhook
2. HTTP POST URL: `https://seochecksite.net/api/webhooks/sendgrid`
3. Enable: Delivered, Opened, Clicked, Bounced, Dropped, Spam Reports, Unsubscribed
4. Enable Signed Event Webhook
5. Copy the public key into Netlify env as `SENDGRID_WEBHOOK_PUBLIC_KEY`

---

## Acceptance Criteria

1. **Signature verification works** — POST with a tampered body returns 401; valid SendGrid POSTs return 200.
2. **Idempotency works** — replaying the same payload twice produces one row in `email_events`.
3. **End-to-end** — send a real report email to a test inbox, open it, click a link, then `curl /api/admin/funnel?days=1` and confirm `email.report_delivery.opened` and `clicked` both ≥ 1.

---

## Out of scope / do NOT do

- Don't refactor `lib/email-unified.ts` beyond adding custom args. Email send architecture stays as-is.
- Don't build retry logic for the webhook — SendGrid handles retries.
- Don't add per-recipient deliverability dashboards. Aggregate only.
- Don't touch the Zoho fallback path.
- Don't touch Hermes/Openclaw scaffolding.

---

## Definition of done

- PR with migration, webhook endpoint, custom args added to email sends, funnel endpoint extended, doc update.
- `REQUIRED_SECRETS.md` updated with `SENDGRID_WEBHOOK_PUBLIC_KEY`.
- `NETLIFY_DEPLOY.md` updated with SendGrid console setup steps.
- `PROJECT.md` "Recent Changes" entry.
