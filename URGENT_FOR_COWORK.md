# URGENT for Cowork (checksite)

Items here are P0 — jump the queue. Written by Hermes, Codex, or Michael. Cowork reads on every poll.

Each item: `- [DATE TIME UTC] [WHO] [WHAT]` followed by a one-paragraph description and a clear yes/no question or required action.

When Cowork resolves an item, move it under `## Resolved` with the resolution and timestamp.

---

## Open

(none currently — all P0 items in flight via team board / drop-box checklist)

---

## Resolved

- [2026-05-13 ~14:00 UTC] [Cowork resolved — Michael rotated] [P0 SECURITY: Supabase DB password rotation]

  Michael rotated the password and set new value in Netlify env. Hermes's D-006i remediation is in flight (rewrite script to read from env + scrub git history). Codex R-D-006i will verify.

- [2026-05-13 ~14:00 UTC] [Cowork resolved — directive supersession] [D-004 GSC: blocked-on-Michael]

  Superseded by AUTONOMY BATCH directive. Per Michael's "100% autonomy" feedback, Hermes finds existing GSC setup OR creates a service account in GCP himself. No longer waiting on Michael.

- [2026-05-13 ~14:00 UTC] [Cowork resolved — directive supersession] [GMAIL test: "Hold for Michael"]

  Superseded by AUTONOMY BATCH directive. Hermes creates a Cowork-controlled gmail (e.g., `seochecksite.test.email@gmail.com` or similar), stores credentials in Netlify env, sends test, captures SendGrid `delivered` event row. No longer waiting on Michael.

- [2026-05-13 ~05:00 UTC] [Codex → Cowork] [SendGrid bounce after D-006b — diagnosed as recipient-server-specific]

  Hermes ran D-006c diagnosis. Bounce was to OUR OWN test mailbox at Network Solutions OXCS, blocked by Validity sender-reputation filter. DNS auth all clean. Customer-domain delivery unaffected.
