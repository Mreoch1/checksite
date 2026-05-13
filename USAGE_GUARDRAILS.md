# SEO CheckSite Usage Guardrails

Live app. Paying customers. Treat usage as production spend.

## Agent Usage

- `seochecksiteToDo.txt` is Michael's drop-box. Cowork and Codex must check it on every bridge/status pass before acting on lower-priority work.
- Keep bridge rounds small: one clear outcome per directive, no exploratory loops unless tied to a live blocker.
- Hermes does mechanical execution and smoke checks; Codex does independent verification and deeper review; Cowork/Codex lead avoids duplicate work.
- Do not ask multiple agents to verify the same thing unless the first result is suspect or high-risk.
- Every long-running task reply should include what was checked and what was skipped, so the next agent does not repeat it.
- Prefer reading existing logs/reports before triggering new live audits.

## Live Audit / PageSpeed Usage

- PageSpeed quota is finite. Do not run bulk verification.
- Default verification budget: at most 2 live verification audits per deploy unless a failure requires one targeted rerun.
- R-001 is allowed to run exactly the two requested audits: `seochecksite.net` and `abc.com`.
- Performance must run on the homepage only. Do not enable per-page PageSpeed without explicit approval.
- If PageSpeed fails, confirm whether the honest unavailable banner renders before spending another audit.

## Netlify Usage

- Local Netlify CLI is authenticated as Michael and linked to project `seochecksite` (`09c79090-7ff2-4b13-ba0e-cb7141ec833d`). Use CLI/dashboard facts instead of guessing.
- Avoid redeploy loops. One push/deploy per directive unless the build fails before production is affected.
- If Netlify build fails, stop and report the first failure excerpt instead of iterating blindly.
- Before any intentional clear-cache deploy, confirm it is tied to a specific fix or env rotation.
- Watch for scheduled-function churn: queue processor runs every 2 minutes, so avoid manual queue-processing loops unless debugging a stuck audit.
- Netlify usage should be checked from the Netlify dashboard or authenticated CLI before any high-volume test plan.

## Email / SendGrid Usage

- Do not batch-resend old emails without explicit approval.
- Use one test email for SendGrid rotation verification.
- Do not paste API keys or webhook public keys into bridge files, logs, or reports.

## Stop-And-Ask

Surface to Michael before:
- More than 2 live audits in one review cycle.
- Any Netlify redeploy beyond the first deploy/fix attempt for a directive.
- Any env var rotation, vendor change, pricing change, or email-send behavior change.
- Any action likely to increase recurring platform cost.

## Shipping Bar

- **A change is not DONE until the downstream consumer of that change can be proven to have received the real outcome, by evidence.** Endpoint returns 200 ≠ endpoint works. File written to /tmp ≠ alert surfaced. Migration file committed ≠ schema live. SendGrid 202 ≠ email delivered. Before claiming DONE, identify the real consumer (a user, a row in a DB, a Codex review, a customer's inbox) and produce evidence — log line, DB row, HTTP response body, screenshot — that the consumer reached the intended state.
- If you can't produce that evidence, mark 🟡 PARTIAL with the specific gap named, not ✅ DONE.
- Added 2026-05-13 after three consecutive cycles (M-003 #6, M-003a #3, D-006e) of shipping work that passed superficial checks but missed the real goal. D-107 (pre-deploy smoke manifest gate) is the structural fix; this is the standing rule version.

## Review Quality Rules

- **Walk every page.** Any customer-facing review (UX, copy, conversion, trust, customer-value) must visit EVERY page on the live site, not just homepage + a sample. The bar is: "if a paying customer can land on it, you reviewed it." Three-surface reviews are not acceptable. Added 2026-05-13 by Michael.
- Enumerate page list from `app/` directory routes, `/sitemap.xml`, header/footer nav, email template links, and Stripe checkout success/cancel URLs.
- Explicitly check legal/trust surfaces: refund policy, terms, privacy, contact, FAQ. Missing pages get flagged, NOT created without approval.
- Cross-agent reviews are good — where Hermes and Codex disagree about the same page, that's real signal.
