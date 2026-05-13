# Quality Bar — checksite reports

**The standing question (Michael, 2026-05-13):**

> Always be asking: is the report worth the money? Would a paying customer be happy and impressed to receive it, or disappointed?

This is the north-star quality bar for every audit report customers receive. Every directive, every fix, every new feature gets evaluated against this. Hermes, Codex, and Cowork all read this file on every bridge poll and use it as a sanity check.

---

## The rubric — apply on every shipped change

When evaluating a customer-facing report or any change that touches one, score each on a 1-5 scale. A score below 3 on any line is a red flag worth surfacing.

### 1. Substance — would the customer feel smarter about their site?
- Every score is backed by visible evidence the customer can verify
- Recommendations are concrete (file a path / change a tag / add a header), not vague ("optimize images")
- Findings tell the customer something they didn't already know
- The report uncovers real problems, not just lints obvious issues

### 2. Honesty — does the report avoid the smell of AI slop?
- No generic filler ("In today's digital landscape...")
- No euphemisms hiding gaps ("Page Structure & Efficiency" instead of "Performance with no real data")
- Unavailable data is named explicitly ("PageSpeed data unavailable — Performance score below is from static analysis only")
- Scores and evidence agree (the original robots.txt 95-with-critical contradiction is the failure mode to avoid)
- "Reference Range" framing — guidelines, not fake benchmarks

### 3. Depth — would a competitor reviewing this call it lightweight?
- Audits multiple pages, not just the homepage
- Real PageSpeed data, not heuristic-only
- Module scores reflect site-wide patterns (worst-page for breakage, average for consistency)
- The "Pages Audited" section names the actual URLs checked
- Module evidence includes raw data the customer can spot-check

### 4. Actionability — would the customer share this with their developer?
- Each issue lists: what's wrong + why it matters + exactly how to fix it
- Quick wins are flagged separately from strategic work
- The Quick Fix Checklist is printable and checkable
- Issues are sorted by impact, not by module order

### 5. Delivery — does the customer get the value they paid for?
- Audit completes in ≤ 90 seconds (Mission 002 Obj 1 budget)
- Confirmation email actually arrives at the customer's inbox
- Report URL is permanent and shareable
- No silent failures — every customer-impacting error surfaces as an explicit notice

---

## How to use this file

**Hermes:** before shipping any directive that touches the report or audit pipeline, write a one-line `QUALITY_BAR check:` block in your reply naming any rubric line scoring below 4. Don't ship a 1 or 2 without flagging it.

**Codex:** every R-XXX verdict implicitly evaluates against this bar. PARTIAL or FAIL verdicts should cite which rubric line the deployed state fails.

**Cowork:** every directive includes "what does this do for the rubric?" reasoning. Reject proposed work that doesn't move at least one rubric line up.

**Michael:** drop a line in `seochecksiteToDo.txt` if the rubric is missing something, or if you want a different north-star question.

---

## The honest current state (2026-05-13)

| Rubric line | Score | Notes |
|---|---|---|
| 1. Substance | 4/5 | Multi-page audit + per-module evidence is solid. Customers learn things they didn't know. |
| 2. Honesty | 4/5 | Reference Range + unavailable-banner + robots parser unification all landed. One residual: word count inflated on JS-heavy SPAs. |
| 3. Depth | 3/5 | Multi-page IS shipped, but abc.com-style heavy-JS sites hang (R-001 PARTIAL). D-006 fixes this. |
| 4. Actionability | 4/5 | Quick Fix Checklist + per-issue fix instructions. Could be sharper on prioritization by-impact. |
| 5. Delivery | 2/5 | 112s timing miss + abc.com queue hang = real customer-impact issue. D-006 + R-001 follow-up will lift this. |

**Headline:** average 3.4/5 right now. Target: 4.5+ after D-006 ships. The Delivery gap is the urgent one.

---

## Shutdown rule (Michael, 2026-05-13)

> Only when all task improvements are done AND Cowork and Codex agree on that, you can shut down for the night.

**Operational meaning:**

1. **Don't stop while there's unstarted work in `TEAM_BOARD.md` Active or queued in either channel.** Hermes keeps picking the next D-XXX after each completion. Cowork drafts new directives as gaps appear. Codex verifies and signs PASS/PARTIAL/FAIL.

2. **The shift ends ONLY when:**
   - TEAM_BOARD.md Active section has no ⚪ TODO or 🔄 WIP or 🔵 REVIEW rows
   - All R-XXX verdicts are ✅ PASS or explicitly punted to a future shift
   - Cowork writes a `--- SHIFT END | <ISO timestamp> ---` block in `checksite_cowork_to_hermes.md` AND in `checksite_cowork_to_codex.md` summarizing what's done
   - Codex replies ✅ AGREED in `checksite_codex_to_cowork.md`
   - Both agreements include the night's QUALITY_BAR rubric score — should be ≥ 4 average to actually shut down

3. **If Cowork or Codex disagrees**, the disagreement is recorded with a one-line reason and the shift CONTINUES until resolved. Hermes keeps executing.

4. **Hermes does not unilaterally shut down.** He keeps working through the queue. If the queue empties and he hasn't seen a SHIFT END / AGREED pair, he scans for proactive improvements (from IDEAS.md Backlog) and proposes the next D-XXX himself for Cowork or Codex to review.

5. **Michael's drop-box overrides everything.** A new item in `seochecksiteToDo.txt` reopens the shift immediately, even after sign-off.
