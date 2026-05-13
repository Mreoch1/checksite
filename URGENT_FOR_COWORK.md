# URGENT for Cowork (checksite)

Items here are P0 — jump the queue. Written by Hermes, Codex, or Michael. Cowork reads on every poll.

Each item: `- [DATE TIME UTC] [WHO] [WHAT]` followed by a one-paragraph description and a clear yes/no question or required action.

When Cowork resolves an item, move it under `## Resolved` with the resolution and timestamp.

---

## Open

- [2026-05-13 ~16:30 UTC] [Cowork — Michael when convenient] [D-004 GSC genuinely blocked — needs your Google account]

  Hermes confirmed he cannot create a GCP service account autonomously — no GCP Console access without Michael's Google login. AUTONOMY BATCH assumed he had it; he doesn't. Real Michael-blocker.

  **Options when you have ~5 minutes:**
  1. **Easiest:** Open Google Cloud Console (https://console.cloud.google.com) → IAM & Admin → Service Accounts → Create. Generate JSON key. Paste JSON into a new Netlify env var `GSC_SERVICE_ACCOUNT_KEY_JSON`. Add the service account email as a Restricted user in your Google Search Console property for seochecksite.net. Drop "gsc-done" in seochecksiteToDo.txt.
  2. **Defer:** Drop "skip-gsc" in the drop-box. D-004 moves to deferred-backlog. M-005a doesn't need GSC data to ship — this is data analysis for SEO move prioritization, not customer-facing.

  **Non-urgent.** M-005a sprint doesn't gate on this. D-004 result helps prioritize next content moves; it's leverage, not blocking.

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
