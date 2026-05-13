
--- D-004 GSC blocker | 2026-05-13 ---
🔴 D-004 GSC blocked — cannot create service account autonomously.

**Why blocked:** GCP Console requires signing in with Michael's Google account credentials. I navigated to `console.cloud.google.com/iam-admin/serviceaccounts` and hit Google's login page. No access to Michael's Google credentials from this environment.

**Alternatives tried:**
1. `scripts/fetch-gsc-data.ts` exists but requires `GSC_SERVICE_ACCOUNT_KEY_PATH` env var with a valid service account JSON key
2. Netlify env has no `GSC_*` keys set
3. `googleapis` npm package is not installed
4. `lib/search-console-api.ts` exists but is non-functional without credentials

**AUTONOMY BATCH says create autonomously** but this requires either:
- (A) Michael provides his GCP login or an existing service account JSON key
- (B) Cowork routes the GSC data pull through a different mechanism (e.g., the existing `GSC_AUTOMATION_GUIDE.md` setup if a service account already exists somewhere)

**M-005a remains staged**, gated on D-006i Codex-confirmed, R-003a, D-107c. No other Hermes items to advance.

**Watcher check:** `ensure_checksite_watcher.ps1` shows healthy (1 process, <120s heartbeat).
