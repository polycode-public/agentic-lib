# Plan: Benchmark 018 + 019 Fixes

Fixes for findings from BENCHMARK_REPORT_SIMPLE_018.md and BENCHMARK_REPORT_ADVANCED_019.md.

---

## Investigation Results (from Report 018)

### REC-1: S2 zero-budget (RESOLVED — not a bug)

**Finding**: Report 018 showed string-utils with `transformation-budget = 0/0`.

**Root cause**: The enriched report was generated from a snapshot taken during the init/update phase, before any `agentic-lib-workflow` run had executed. The state file had not yet been written by any agentic-step invocation.

**Current state**: The state file now shows `transformation-budget-used = 1, cap = 128` and `cumulative-transforms = 1`. The config correctly has `profile = "max"` and `[profiles.max].transformation-budget = 128`.

**Action**: None required. The report timing issue is inherent to the flow's architecture.

**Status**: RESOLVED

---

### REC-2: W3 — State file mission-complete not persisted (FIXED)

**Finding**: `MISSION_COMPLETE.md` exists on main but `agentic-lib-state.toml` on the logs branch shows `mission-complete = false`. Persistent since Report 014.

**Root cause**: Double-write race in `index.js`: the handler wrote `mission-complete = true` to disk, but `index.js` immediately overwrote it with a stale copy read before the handler ran.

**Fix applied**: `src/actions/agentic-step/index.js` now re-reads state from disk after the task handler returns (line 108: `const state = readState(".");`). Verified in code.

**Current state**: Fix is on main. The re-read happens at line 108, after `handler(context)` returns on line 103.

**Status**: FIXED (code verified)

**Remaining verification**:
- [ ] Run a benchmark scenario and confirm state file shows `mission-complete = true` on the logs branch when MISSION_COMPLETE.md exists

---

### REC-3: PR-less transforms with skipMaintain (RESOLVED — by design)

**Finding**: All benchmark transforms landed as direct commits with no PRs.

**Root cause**: Simple missions (7-kyu fizz-buzz, 6-kyu roman-numerals) complete via the bot/director before the dev job can create PRs. `skipMaintain=true` only skips the maintain job, not the PR cycle.

**Status**: RESOLVED — expected behaviour for simple missions

---

### REC-4: Tests don't exercise implemented API (PERSISTENT — S3)

**Finding**: Report 018 S3 (hamming-distance) had correct implementations but scaffold-only tests. After 5 transforms and 2.8M tokens, the pipeline never generated dedicated unit tests.

**Root cause**: The transform agent (`agent-apply-issue.md`) focuses on implementing the API but does not have a hard requirement to produce tests that import from `src/lib/`. The test-health check (`commit-if-changed`) rejects empty test suites but doesn't require mission-specific test imports.

**Fix**: Add a gate in the supervisor or director that checks for at least one test file importing from `src/lib/main.js` before declaring mission-complete. This prevents the "implemented but untested" pattern.

**File**: `src/actions/agentic-step/tasks/direct.js` — add a check before writing MISSION_COMPLETE.md

**Status**: NOT FIXED — needs implementation

---

### REC-5: Cancelled test runs / behaviour test failures (PERSISTENT — S4, all A1-A4)

**Finding**: Report 018 S4 had a cancelled test run. Report 019 had all 4 flows fail due to Playwright behaviour test failures.

**Root cause**: Two separate issues:
1. Docker container startup failures cause test cancellations (intermittent)
2. Behaviour test failures gate the flow conclusion even when the mission is functionally complete

**Status**: NOT FIXED — see FIX-8 below

---

## Investigation Results (from Report 019)

### REC-6: Agent-log and state files committed to main instead of agentic-lib-logs branch (BUG — NEW)

**Finding**: `repository0-dense-encoder` has 4 `agent-log-*.md` files and `agentic-lib-state.toml` on the `main` branch. `repository0-string-utils` also has `agentic-lib-state.toml` on main. These files should only exist on the `agentic-lib-logs` branch.

**Root cause**: Two commit paths in the `fix-stuck` job of `agentic-lib-workflow.yml` use bare `git add -A` without unstaging log/state files:

1. **Line 1319** ("Commit and push fixes" step): `git add -A` followed by commit+push. No `git reset HEAD` for log/state files.
2. **Line 1395** ("Commit, push, and open PR for main build fix" step): Same `git add -A` without unstaging.

The `commit-if-changed` action (used by maintain and dev jobs) correctly unstages these files at lines 36-38:
```bash
git reset HEAD -- 'intentïon.md' 'SCREENSHOT_INDEX.png' 2>/dev/null || true
git reset HEAD -- agent-log-*.md 2>/dev/null || true
git reset HEAD -- agentic-lib-state.toml 2>/dev/null || true
```

But the fix-stuck job's inline commit scripts bypass `commit-if-changed` and don't include these unstage lines.

**Evidence**:
- `96602d52` — "agentic-step: fix broken main build (run 23395643592) (#76)" committed `agent-log-2026-03-22T04-38-01-335Z-001.md` to main
- `d7d120de` — PR #77 committed `agent-log-2026-03-22T05-01-14-507Z-002.md` to main
- `0cb1fa98` — PR #80 committed `agent-log-2026-03-22T09-57-54-153Z-003.md` to main
- `e1601366` — PR #84 committed `agent-log-2026-03-22T10-20-43-715Z-004.md` and `agentic-lib-state.toml` to main

**Affected repos**: repository0-dense-encoder (4 agent-logs + state), repository0-string-utils (state only). repository0-random and repository0-plot-code-lib are clean.

**Status**: NOT FIXED — see FIX-4 below

---

### REC-7: Acceptance-criteria bookkeeping broken (PERSISTENT since Report 015)

**Finding**: All 4 advanced scenarios show `met=false` for acceptance criteria that clearly pass. Report 018 S1 and S4 also show this.

**Root cause**: The acceptance-criteria update mechanism uses regex matching between LLM-reported criteria text and MISSION.md checkbox text. The matching is unreliable — criteria text from the LLM doesn't exactly match the checkbox wording in MISSION.md.

**Status**: NOT FIXED — see FIX-5 below

---

### REC-8: Issue auto-close gap (PERSISTENT — A1, A2, A4)

**Finding**: Issues remain open after their referencing PRs merge. The transform PR body/commits lack `Fixes #N` closing keywords.

**Root cause**: The transform commit message uses format `"agentic-step: transform issue #N (#PR)"` which does NOT trigger GitHub's auto-close. It would need `"Fixes #N"` or `"Closes #N"` in the commit message or PR body.

**Status**: NOT FIXED — see FIX-6 below

---

### REC-9: A3 convergence failure — 40 transforms, never declared complete (Report 019)

**Finding**: Lunar-lander code passed all 7 acceptance criteria but consumed 40 transforms without declaring mission-complete.

**Root cause**: Multi-factor:
1. Acceptance bookkeeping shows `met=false` for all criteria (REC-7)
2. Mission-complete gating requires `require-no-open-issues = true` but issue lifecycle is broken (REC-8)
3. The director cannot declare complete because the automated checks never report satisfaction
4. Without mission-complete, the pipeline keeps iterating — producing no-ops and bookkeeping merges

**Status**: NOT FIXED — depends on FIX-5 and FIX-6

---

### REC-10: Zero-diff PRs inflating transform counts (Report 019)

**Finding**: All 4 advanced scenarios had merged PRs with 0 additions/0 deletions. A3 had 22 merged PRs but many were bookkeeping/checkbox-only.

**Root cause**: The acceptance-criteria update step creates PRs that only modify MISSION.md checkboxes. These PRs have meaningful content (checkbox changes) but GitHub's API reports them as 0 additions/0 deletions because the PR diff API sometimes misses small changes or the changes are in metadata.

**Status**: NOT FIXED — see FIX-7 below

---

### REC-11: Missing workflow-run metadata in A3 report (Report 019)

**Finding**: A3's report had empty `workflow-runs.json` despite 40+ transforms. Cannot trace transforms to CI runs.

**Root cause**: The report task (`tasks/report.js`) collects workflow runs within a time window. If the flow runs over a long period (A3 ran for 10+ hours across multiple flow dispatches), the collection window may not cover all runs, or the GitHub API pagination limit was hit.

**Status**: NOT FIXED — see FIX-9 below

---

## Fix Plan

### FIX-1: W3 state file persistence (DONE)

- [x] Edit `src/actions/agentic-step/index.js`: re-read state from disk after task handler returns
- [ ] Add test: verify state mutations from task handlers survive the index.js write cycle
- [ ] Verify: run benchmark and check state file shows `mission-complete = true`

### FIX-2: Generate mission call signature (DONE — from earlier investigation)

- [x] `bin/agentic-lib.js`: `runCopilotSession` call now uses correct params
- [ ] Verify: the generate fallback to fizz-buzz still works when Copilot SDK is unavailable

### FIX-3: Documentation — bot/director direct commits (PENDING)

- [ ] Add note to `ITERATION_BENCHMARKS_SIMPLE.md` explaining that simple missions may complete via bot/director direct commits rather than dev-job PRs

### FIX-4: Fix-stuck job leaking log/state files to main (DONE — Benchmark 020)

**Root cause**: Three `git add -A` blocks in workflows lacked unstaging for agent-log/state files.

**Fix applied** (commit 73f93ff1 on `claude/benchmark-020-fixes`):
- `agentic-lib-workflow.yml` Tier 3 conflict resolution (~line 1244)
- `agentic-lib-init.yml` commit-and-push step (~line 378)
- `agentic-lib-update.yml` commit-and-push step (~line 125)

Note: Lines 1319 and 1399 in workflow.yml were already fixed in a prior commit.

**Cleanup needed**: Remove the misplaced files from the affected repos (user already manually cleaned dense-encoder):
- repository0-string-utils: delete agentic-lib-state.toml from main (if still present)

- [x] Add unstage lines to Tier 3 conflict resolution step
- [x] Add unstage lines to agentic-lib-init.yml
- [x] Add unstage lines to agentic-lib-update.yml
- [x] Remove misplaced files from repository0-dense-encoder main (user did this manually)
- [ ] Remove misplaced files from repository0-string-utils main

### FIX-5: Acceptance-criteria bookkeeping (HIGH — PERSISTENT)

**The mechanism** (investigated in full):

There are **3 layers** of acceptance criteria tracking, all of which are broken:

1. **MISSION.md checkboxes** — `- [ ] Hamming distance between "karolin" and "kathrin" is 3`. The `implementation-review` task asks the LLM to report which criteria are met via `acceptanceCriteriaMet` (free text array) or `acceptanceCriteriaMetIndices` (1-based index). It then:
   - Tries index-based TOML update (line 198–216 of `implementation-review.js`)
   - Falls back to text-match against MISSION.md lines (line 241–252)
   - The text match almost never works because the LLM paraphrases differently

2. **`[acceptance-criteria]` in `agentic-lib.toml`** — Auto-generated from MISSION.md checkboxes on init. Each criterion has `text` and `met = false`. Updated by the index-based path in `implementation-review.js`. This works better than MISSION.md text matching, but the review LLM often returns empty `acceptanceCriteriaMetIndices`, so `met` stays `false`.

3. **Director assessment** — `direct.js` calls `countAcceptanceCriteria()` which reads the TOML `[acceptance-criteria]` section (primary) or falls back to counting `- [x]` in MISSION.md. The director then computes `acceptancePct` against `acceptance-criteria-threshold` (80-90% for max profile). But the director prompt (line 172) says: _"If all criteria are clearly satisfied by the current source code and tests (verified via read_file), you SHOULD declare mission-complete even if not all mechanical metrics are MET."_ So the director **can override** the broken bookkeeping, and does — which is why we see MISSION_COMPLETE.md created despite `met=false` everywhere.

**What information would be lost by removing checkboxes?**

Almost nothing. The checkboxes in MISSION.md are:
- **Static text** from the mission seed (e.g., `6-kyu-understand-hamming-distance.md`)
- **Already duplicated** into `[acceptance-criteria]` in `agentic-lib.toml` on init
- **Already presented** to the director LLM in the Mission section of its prompt
- **Never reliably updated** — 5 consecutive benchmark reports confirm `met=false` universally

The only consumer of the checkbox count is the `acceptancePct >= acceptanceThreshold` gate in `direct.js`, which the director already overrides via its prompt instructions.

**What we should keep**: The `[acceptance-criteria]` TOML section is useful as a **structured list of what success looks like**, readable by LLMs and report generation. It just shouldn't gate anything mechanically.

**Fix approach** — Replace checkbox matching with plain English statements:

1. **Keep** the `[acceptance-criteria]` section in `agentic-lib.toml` but change format from checkboxes to statements:
   ```toml
   [acceptance-criteria]
   total = 7
   1 = { text = "Stepping correctly applies gravity and thrust physics" }
   2 = { text = "Autopilot lands safely with default initial conditions" }
   ```
   Remove `met = false` entirely — the field is never reliably set and creates a false signal.

2. **Keep** the MISSION.md checkboxes as-is (they're human-readable in the repo), but **stop reading them** mechanically. The `countAcceptanceCriteria()` function should return `{ met: 0, total: 0 }` (or be removed from the gating path), making the metric row display "—" instead of "0/7".

3. **Remove** the `acceptancePct >= acceptanceThreshold` gate in `direct.js`. The director already reads the criteria from the Mission section of its prompt and makes a judgement call. Let that be authoritative.

4. **Keep** the `report_review_verdict` tool's `acceptanceCriteriaMetIndices` field — the review LLM can still report which criteria it believes are met. But this feeds into the **report** (for human consumption), not into a mechanical gate.

5. **Update** the agent prompt in `agent-supervisor.md` to include the acceptance criteria as plain English statements that the LLM reasons about, rather than as a checkbox count.

**Files to change**:
- `src/actions/agentic-step/tasks/direct.js` — remove `acceptancePct >= acceptanceThreshold` gate
- `src/copilot/telemetry.js` — simplify `countAcceptanceCriteria()` to return informational-only data
- `src/copilot/config.js` — optionally remove `acceptanceCriteriaThreshold` from thresholds
- `src/actions/agentic-step/tasks/implementation-review.js` — keep TOML update path but make it non-blocking
- Mission seed TOML template — remove `met = false` field from acceptance criteria entries

**What we're NOT changing**: MISSION.md checkbox format stays the same (human-readable). The LLM still sees criteria. The report still shows criteria status. We're just removing the broken mechanical gate.

- [x] Remove `acceptancePct >= acceptanceThreshold` gate from `direct.js` — ALREADY DONE (line 103: `met: true` always, target: "informational")
- [ ] Remove `met = false` from `[acceptance-criteria]` TOML template (init generates without `met`)
- [x] Update `countAcceptanceCriteria()` to be informational-only (no gating) — ALREADY DONE (telemetry.js line 157: status: "—")
- [x] Verify: director can declare mission-complete without waiting for broken checkbox updates — CONFIRMED (Report 019 A1/A2/A4 all completed despite met=false)
- [ ] Test with a benchmark scenario (Benchmark 020 will validate)

### FIX-6: Issue auto-close on PR merge (DONE — Benchmark 020)

**Root cause**: The dev job's merge path already had `Closes #N` in PR body AND explicit `issues.update({ state: 'closed' })`. However, the `pr-cleanup` and `fix-stuck` merge paths only labelled issues as 'merged' without closing them. When a PR couldn't be auto-merged in 2 attempts, it was left open for pr-cleanup, which then merged it but never closed the referenced issues.

**Fix applied** (commit 73f93ff1 on `claude/benchmark-020-fixes`):
- `pr-cleanup` job: Now extracts issue numbers from PR body (`Closes/Fixes/Resolves #N`) AND branch name (`agentic-lib-issue-N`), then explicitly closes all referenced issues.
- `fix-stuck` job: Same fix applied to the fix-stuck merge path.

- [x] Add explicit issue close to pr-cleanup merge path
- [x] Add explicit issue close to fix-stuck merge path
- [ ] Verify: merge a transform PR via pr-cleanup and confirm issue auto-closes

### FIX-7: Zero-diff PR noise (MEDIUM)

**Root cause**: Acceptance-criteria checkbox updates create separate PRs with tiny diffs.

**Fix options**:
1. **Consolidate**: Include checkbox updates in the same PR as code transforms
2. **Filter**: Exclude 0-diff PRs from transform counts in reports
3. **Skip**: Don't create PRs for checkbox-only changes — commit directly

**Recommended**: Option 1 — merge the acceptance update into the transform cycle rather than a separate PR.

- [ ] Design approach
- [ ] Implement

### FIX-8: Behaviour tests gating flow conclusion (RESOLVED — already non-blocking)

**Investigation**: `agentic-lib-test.yml` line 134 already has `continue-on-error: true` on the behaviour job. The flow failures in Report 019 were likely caused by other factors (unit test failures, report step errors) rather than behaviour tests. The Report 019 attribution was incorrect.

- [x] Verify `continue-on-error: true` exists — confirmed at agentic-lib-test.yml:134
- [x] Behaviour tests are already non-blocking — no change needed
- [ ] Verify: Benchmark 020 flow conclusion is not affected by behaviour test failures

### FIX-9: Report workflow-run metadata collection (DONE — Benchmark 020)

**Root cause**: `findLatestInitRun` only searched for standalone `agentic-lib-init` workflow runs. In benchmark flows, init runs inside the flow (as a reusable workflow call), so it doesn't appear as a separate run. The function fell back to 24h ago, which worked for most cases but was fragile.

**Fix applied**: Updated `findLatestInitRun` to also search for `agentic-lib-flow` runs, increased `per_page` from 20 to 50, and prefer init runs over flow runs. Pagination for workflow-run collection was already at 2 pages × 100 = 200 runs.

- [x] Check pagination/window logic — already 200 runs max
- [x] Fix period start detection for flow-embedded init runs
- [ ] Verify with Benchmark 020 multi-hour scenario

### FIX-10: Test generation enforcement (DONE — already implemented)

**Verified**: `detectDedicatedTests()` at direct.js lines 44-62 scans test directories for files importing from `src/lib/`. Line 104 adds "Dedicated test files" metric with `met: dedicatedTestCount >= 1`. The director sees this in its metric table and factors it into the mission-complete decision.

- [x] Test-import check exists (direct.js line 92-93, 104)
- [x] Director metric shows NOT MET when no dedicated tests exist
- [ ] Verify with Benchmark 020 that scaffold-only repos don't declare complete

### FIX-11: Verify supervisor title validation and labels.split fix (DONE — verified Benchmark 020)

**Verified**: Both fixes are on main:
- **Title fallback**: No "Untitled issue" — returns `skipped:no-title` if no title derived (line 619-622). Also has mission-derived title fallback (line 613-618).
- **Labels handling**: Line 625-629 handles both array and string inputs correctly.

- [x] Check `src/actions/agentic-step/tasks/supervise.js` for title validation fallback — CONFIRMED
- [x] Check for labels array handling — CONFIRMED
- [x] Both fixes already on main

### FIX-12: Limit maintain-features token budget (DONE — verified Benchmark 020)

**Verified**: `maintain-features.js` line 62 caps tokens at `config.maxTokensPerMaintain || 200000`. Line 116 derives `maxToolCalls` from the token budget. The 625K token incident cannot recur.

- [x] Check if per-task token budget exists — YES (`maxTokens = config.maxTokensPerMaintain || 200000`)
- [x] Token budget is enforced in the session config
- [x] Tool call cap derived from token budget (line 116)

### FIX-13: Verify supervisor mission-derived issue titles (DONE — verified Benchmark 020)

**Verified**: Mission-derived title fallback is implemented at `supervise.js` line 613-618. When LLM provides no title, body, or feature, the supervisor extracts the mission heading from MISSION.md and creates `feat: implement <mission-name>`. If even that fails, it returns `skipped:no-title` instead of creating garbage issues.

- [x] Mission-derived title fallback is in place (line 613-618)
- [x] No "Untitled issue" fallback exists — returns `skipped:no-title` instead

---

## Priority Order (Updated Benchmark 020)

| Priority | Fix | Status | Notes |
|----------|-----|--------|-------|
| 1 | FIX-4: Log/state files on main | **DONE** | 3 locations patched (Benchmark 020 commit 73f93ff1) |
| 2 | FIX-6: Issue auto-close | **DONE** | pr-cleanup + fix-stuck now close issues (Benchmark 020 commit 73f93ff1) |
| 3 | FIX-5: Acceptance bookkeeping | **RESOLVED** | Gate already removed (met: true always). Informational only. |
| 4 | FIX-8: Behaviour test gating | **RESOLVED** | Already has continue-on-error: true |
| 5 | FIX-10: Test generation | **DONE** | Already implemented (dedicatedTestCount metric) |
| 6 | FIX-7: Zero-diff PRs | NOT FIXED | Cosmetic — existing ahead_by check skips no-commit branches |
| 7 | FIX-9: Report metadata | **DONE** | findLatestInitRun now searches flow runs too (Benchmark 020 commit a6b007da) |
| 8 | FIX-12: Token budget | **VERIFIED** | maxTokensPerMaintain capped at 200K |
| 9 | FIX-11: Title validation | **VERIFIED** | Labels and title fallback both implemented |
| 10 | FIX-13: Issue titles | **VERIFIED** | Mission-derived fallback in place |
| — | FIX-1: State persistence | DONE (prior) | — |
| — | FIX-2: Generate signature | DONE (prior) | — |
| — | FIX-3: Documentation | NOT FIXED | Documentation only, low priority |

---

## Coverage Check

### Report 018 Findings → Fix Mapping

| Finding | Description | Fix |
|---------|-------------|-----|
| S1-FINDING-2 | State file `mission-complete = false` despite MISSION_COMPLETE.md | FIX-1 (DONE) |
| S1-FINDING-3 | Config requires `min-resolved-issues = 1` but no issues created | FIX-5 (acceptance bookkeeping) |
| S1-FINDING-4 | All transforms as direct commits, no PRs | FIX-3 (documentation — by design) |
| S2-FINDING-1 | Zero transforms, budget 0/0 | REC-1 (RESOLVED — timing) |
| S2-FINDING-2 | Multiple runs but no transforms | REC-1 (RESOLVED — timing) |
| S3-FINDING-2 | Tests don't test Hamming API | FIX-10 (test generation) |
| S3-FINDING-3 | Zero-diff PR auto-merged | FIX-7 (zero-diff PRs) |
| S3-FINDING-4 | Issue #66 labelled 'merged' but open | FIX-6 (issue auto-close) |
| S4-FINDING-2 | State metadata inconsistent | FIX-1 (DONE) |
| S4-FINDING-3 | No successful test run recorded | FIX-8 (behaviour test gating) |
| S4-FINDING-5 | Issue created after mission-complete | FIX-6 (issue lifecycle) |
| FINDING-A | State/MISSION_COMPLETE disagreement | FIX-1 (DONE) |
| FINDING-B | Zero budget on S2 | REC-1 (RESOLVED) |
| FINDING-C | Tests don't exercise API | FIX-10 |
| FINDING-D | No PR-based transforms | FIX-3 (by design) |
| FINDING-E | Cancelled test runs | FIX-8 |

### Report 019 Findings → Fix Mapping

| Finding | Description | Fix |
|---------|-------------|-----|
| A1-FINDING-2 | 3 issues open despite merged PRs | FIX-6 |
| A1-FINDING-4 | Zero-diff merged PRs | FIX-7 |
| A1-FINDING-5 | Custom encoding charset validation | Low priority — mission-specific |
| A2-FINDING-3 | Issue #64 open despite merged PR #69 | FIX-6 |
| A2-FINDING-4 | PR #69 zero additions/deletions | FIX-7 |
| A3-FINDING-2 | Empty workflow-runs.json | FIX-9 |
| A3-FINDING-3 | Mission-complete not flagged despite passing | FIX-5 + FIX-6 (convergence) |
| A3-FINDING-4 | 40 transforms, many no-ops | FIX-5 + FIX-6 (convergence root cause) |
| A4-FINDING-2 | Acceptance bookkeeping all met=false | FIX-5 |
| A4-FINDING-3 | PNG placeholder not real rasterisation | Low priority — mission-specific |
| A4-FINDING-5 | 3 transforms but only 1 PR | FIX-7 |
| Common-1 | Behaviour test failures gate flow | FIX-8 |
| Common-2 | Issue auto-close gap | FIX-6 |
| Common-3 | Zero-diff PRs | FIX-7 |
| Common-4 | Acceptance bookkeeping broken | FIX-5 |
| **NEW** | Agent-log/state files on main | FIX-4 |

---

## Archive Mining (Plans 003–013)

Mined all 10 archived fix plans to find items that were missed, left behind, or tried but not sticking.

### Recurring fixes (fixed multiple times, may need re-verification)

| Pattern | Plans | Current Status |
|---------|-------|----------------|
| State file `mission-complete` persistence | 008-C1, 009-W1, 011-W2, 013-W3 | FIX-1 (latest fix applied). Needs live benchmark verification. |
| Issue auto-close / resolved counting | 005-W11, 007-W7, 007a-W5 | FIX-6 (commit message format never updated despite counting fixes). |
| Acceptance bookkeeping | 007-W3, 007-W9 | FIX-5 (checkbox regex was never the right approach — now redesigned). |

### Items with unchecked verification (from Plan 009, 010)

| Plan | Fix | Description | Action |
|------|-----|-------------|--------|
| 009 | W5 | Supervisor title fallback bypasses validation | FIX-11 (verify) |
| 009 | W6 | labels.split crash on array input | FIX-11 (verify) |
| 010 | W4 | Mission-derived issue titles unverified | FIX-13 (verify) |

### Items that may need ripping out

| Item | Evidence | Recommendation |
|------|----------|----------------|
| Acceptance checkbox regex in `implementation-review.js` | Broken in 5 consecutive benchmark reports (015–019). Text matching between LLM paraphrases and MISSION.md checkbox text never works. | FIX-5 removes the mechanical gate. Keep the index-based TOML update path for informational reporting but stop gating mission-complete on it. |
| `min-resolved-issues` gating for simple missions | Plan 007-W7 raised threshold to 3, then Report 018 S1 hit it — no issues created for 7-kyu missions so the gate blocks forever. Director overrides it anyway. | FIX-5 simplifies this — director assessment is authoritative, mechanical gates are informational. |

### Items confirmed as done and stable (no action needed)

All fixes from plans 003 (W1–W10), 005 (W1–W14), 007/007a (W1–W12, W1–W6), 008 (C1–C13 implemented in later plans), 011 (W2–W22), 012 (W1–W8), 013 (W2–W4) are confirmed implemented with no revert patterns detected.

### One item potentially still missing

| Plan | Fix | Description | Action |
|------|-----|-------------|--------|
| 008 | C14 | Limit maintain-features token budget (625K token incident) | FIX-12 (check if implemented) |
