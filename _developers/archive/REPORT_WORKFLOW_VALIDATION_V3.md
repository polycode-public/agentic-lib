# REPORT: Workflow Validation V3 — Overnight Autonomous Run

**Date**: 2026-03-04
**Operator**: Claude Code (claude-opus-4-6)
**Target**: `xn-intenton-z2a/repository0` (plot-code-lib mission)
**agentic-lib version**: 7.1.39 → 7.1.40
**Observation window**: 2026-03-03T22:29Z – 2026-03-04T17:56Z (~19.5 hours)
**Previous report**: REPORT_WORKFLOW_VALIDATION_V2.md (v7.1.32 supervisor tuning)

---

## Executive Summary

The autonomous pipeline ran for ~19.5 hours, producing **29 transform commits**, 1 maintain commit, and 11 review runs. All 100 workflow runs succeeded (zero failures). However, **the pipeline is churning rather than building** — it's rewriting the same ~240-line file repeatedly, with 31% of transforms producing no code change at all, and the remaining 69% frequently refactoring or rewriting existing code rather than implementing new features from the 6 open issues.

### Key Metrics

| Metric | Value |
|--------|-------|
| Total workflow runs | 100 |
| Failures | 0 |
| Supervisor runs | 35 |
| Transform dispatches | 29 (23 success, 6 cancelled by concurrency) |
| Review dispatches | 16 (11 success, 5 cancelled by concurrency) |
| Maintain dispatches | 1 |
| Transform commits | 29 |
| Commits with actual code changes | 20 (69%) |
| Commits with log-only (no code) | 9 (31%) |
| Total tokens consumed | ~4.86M (4.73M in, 130K out) |
| Total LLM duration | 47.8 minutes |
| Issues closed | 0 (today); ~15 closed overnight 03→04 March |
| Issues opened (automated) | 6 (#2482–#2487) |
| Issues currently open | 6 (only 1 has `ready` label) |
| Final test count | 5 passing |
| Final main.js size | 241 lines |
| Final test file size | 40 lines |
| intentïon.md log size | 448 lines |

---

## Timeline

### Phase 1: Init Purge + Fresh Start (22:29Z – 01:35Z, ~3 hours)

- **22:29Z**: Init purge from agentic-lib@7.1.35 — wipes features and resets code
- **22:36Z**: Schedule set to continuous
- **22:38Z – 23:09Z**: 3 transforms rebuild the basic code + .gitignore additions
- **01:18Z**: Manual cleanup commit ("remove plotting features and CLI from main.js")
- **01:23Z – 01:30Z**: Two more init purges (7.1.38, 7.1.39) — further resets
- **01:30Z**: Schedule set to hourly
- **01:34Z**: First substantive transform: implements expression parser, evaluator, CLI (136 lines added to main.js)

### Phase 2: Hourly Cadence (01:35Z – 09:11Z, ~7.5 hours)

Only 3 transforms in this window (hourly schedule):
- **03:04Z**: Adds test runner (run-tests.js) and more tests
- **04:40Z**: Restructures README, adds example SVG
- **05:19Z**: Log-only commit (no code change)
- **09:01Z**: Schedule changed back to continuous

### Phase 3: Continuous Grind (09:11Z – 17:56Z, ~8.75 hours)

22 transforms in ~8.75 hours at the `*/15` schedule. The supervisor consistently dispatched transform every cycle. Pattern:

| Time | Code Changed? | What Happened |
|------|--------------|---------------|
| 09:03Z | Log only | No code change |
| 09:13Z | Log only | No code change |
| 09:35Z | **Yes** | Major: added npm deps (package-lock +671 lines), rewrote main.js with proper parser |
| 10:03Z | **Yes** | Tweaked package.json, added to run-tests.js |
| 10:24Z | **Yes** | Rewrote main.js and tests (~330 lines changed, net zero growth) |
| 10:50Z | **Yes** | Updated README, added example SVG |
| 11:16Z | **Yes** | Rewrite README, fix 2 test assertions |
| 11:33Z | Log only | No code change |
| 11:57Z | **Yes** | Rewrote main.js, tests, simplified run-tests.js |
| 12:22Z | **Yes** | Rewrote main.js and tests (~310 lines changed, net zero) |
| 12:55Z | Log only | No code change |
| 13:32Z | Log only | No code change |
| 14:05Z | **Yes** | Updated README, removed code from main.js |
| 14:18Z | **Yes** | Added functions to main.js, expanded tests |
| 14:34Z | **Yes** | Added to main.js, modified tests |
| 14:54Z | Log only | No code change |
| 15:22Z | Log only | No code change |
| 15:52Z | **Yes** | Rewrote main.js and tests (~360 lines changed) |
| 16:23Z | **Yes** | Modified tests |
| 16:51Z | Log only | No code change |
| 17:24Z | **Yes** | Added to tests |
| 17:52Z | **Yes** | Rewrote main.js and tests (~350 lines changed) |
| 17:56Z | **Yes** | README and docs updates |

### Phase 4: Shutdown (17:50Z)

Schedule set to off, model changed to gpt-5-mini.

---

## Workflow Dispatch Summary (last 100 runs)

| Workflow | Success | Cancelled | Failed | Total |
|----------|---------|-----------|--------|-------|
| agent-supervisor | 35 | 0 | 0 | 35 |
| agent-flow-transform | 23 | 6 | 0 | 29 |
| agent-flow-review | 11 | 5 | 0 | 16 |
| agent-flow-maintain | 1 | 0 | 0 | 1 |
| ci-automerge | 5 | 1 | 0 | 6 |
| test | 5 | 0 | 0 | 5 |
| init | 2 | 0 | 0 | 2 |
| agent-discussions-bot | 3 | 0 | 0 | 3 |
| agent-supervisor-schedule | 2 | 0 | 0 | 2 |

**Zero failures across 100 runs** — the pipeline is mechanically robust.

**11 cancelled runs** — all from concurrency group throttling (transforms and reviews that overlapped). This is expected and correct behaviour.

---

## Sub-Optimal Behaviours Identified

### ISSUE-13: Transform Churn — Rewriting Without Progress (Severity: HIGH)

**Symptom**: main.js was rewritten 8+ times in ~8 hours. Many transforms show ~250 insertions / ~250 deletions — net-zero changes that rearrange code without adding new capability. The file stayed at ~241 lines throughout.

**Evidence**:
- 10:24Z: 231+ / 162- in main.js (net +69, but next cycle reverses it)
- 12:22Z: 232+ / 153- in main.js
- 15:52Z: 247+ / 196- in main.js
- 17:52Z: 250+ / 165- in main.js

Each transform "claims success" in the log, often rewriting the same functions with slightly different implementations (e.g., `buildEvaluator` was rewritten 4+ times with minor variations).

**Root Cause**: The transform prompt doesn't have memory of what the previous transform did. Each run reads the current code and the issue, and decides to "improve" it, even when the issue is already substantially addressed. There's no concept of "this issue is done, move on."

**Proposed Fix**:
1. **Issue-level progress tracking**: After a successful transform, add a comment to the issue documenting what was done. The next transform should read issue comments before deciding to work on the same issue.
2. **Transform guard**: Before committing, compare the diff size against a threshold. If the transform is >80% rewrite of existing code with <10% net growth, it should flag this as churn rather than progress.
3. **Close issues faster**: Review should close issues when the code already satisfies the acceptance criteria, preventing transform from picking them up again.

### ISSUE-14: 31% of Transforms Produce No Code Change (Severity: MEDIUM)

**Symptom**: 9 of 29 transform commits only wrote to `intentïon.md` (the log file) with no changes to source, tests, or docs.

**Evidence**: Commits at 05:19, 09:03, 09:13, 12:55, 13:32, 14:54, 15:22, 16:51 — all have `1 file changed, 11 insertions(+)` to intentïon.md only.

**Root Cause**: The transform runs, decides there's nothing to do (or fails silently to produce a diff), but still commits a log entry saying "transformed". The `commit-if-changed` action commits the intentïon.md even when no source files were modified.

**Proposed Fix**:
1. **Don't commit log-only transforms**: If the only changed file is `intentïon.md`, skip the commit. The log entry is not useful without an accompanying code change.
2. **Log a different outcome**: Instead of `transformed`, log `no-op` or `skipped` when no code files are changed. This makes the log useful for debugging.

### ISSUE-15: Review Runs Not Closing Today's Issues (Severity: MEDIUM)

**Symptom**: 11 review runs succeeded today, but 0 issues were closed. All 6 open issues (#2482–#2487) remain open. Only 1 (#2482) has the `ready` label.

**Evidence**: The review workflow ran at 09:00, 10:00, 10:20, 12:19, 12:50, 12:54, 14:30, 15:21, 16:50, 17:52. None of them resulted in closing issues or adding `ready` labels to the 5 issues that lack them.

**Root Cause**: The review workflow appears to be running but not progressing the issue lifecycle. Issues #2483–#2487 have `enhancement, automated` labels but no `ready` label, so transform won't pick them up. Review should be adding the `ready` label to mature issues but isn't doing so.

**Impact**: The pipeline is bottlenecked — transform keeps working on the sole `ready` issue (#2482), while 5 other issues starve. This contributes to the churn in ISSUE-13.

**Proposed Fix**:
1. **Audit the review handler**: Check what the review LLM is doing when it runs — is it reading the issues correctly? Is it using the GitHub tools to add labels?
2. **Supervisor should notice the bottleneck**: When 5/6 open issues lack the `ready` label and review has run 11 times without adding it, the supervisor should escalate or try a different approach.

### ISSUE-16: Only 1 Ready Issue Creates a Transform Bottleneck (Severity: MEDIUM)

**Symptom**: With only 1 `ready` issue (#2482 — "Add README CLI examples"), every transform run picks up this same issue and either rewrites the code for it or produces no change.

**Root Cause**: Linked to ISSUE-15. The pipeline's issue lifecycle is stuck: issues are created but never marked `ready`, so transform has no variety of work to do.

**Proposed Fix**: Same as ISSUE-15. Additionally, the supervisor prompt could be enhanced to detect this pattern and proactively add `ready` labels to issues that have been open for multiple supervisor cycles.

### ISSUE-17: Test Coverage Declining (Severity: MEDIUM)

**Symptom**: Tests went from a proper vitest suite to 5 tests using Node's built-in test runner. The test framework was switched mid-run and test count dropped.

**Evidence**:
- At 16:23Z, transform replaced vitest with node:test
- Final state: 5 passing tests for a 241-line module with 9 exported functions
- Test file is only 40 lines

**Root Cause**: Transform is "helping" by switching test frameworks and simplifying tests. This is destructive churn that reduces coverage.

**Proposed Fix**:
1. **Lock the test framework**: Add an assertion in the seed/config that specifies vitest as the test runner. The transform prompt should not be allowed to switch test frameworks.
2. **Test count guard**: Track the test count across transforms. If it drops by >20%, flag as regression.

### ISSUE-18: intentïon.md Growing Unbounded (Severity: LOW)

**Symptom**: The log file is 448 lines and growing by ~15 lines per transform. At the continuous rate (~2 transforms/hour), it will reach 1000+ lines within a day.

**Impact**: This file is committed to the repo and included in the transform context window, consuming tokens. At ~4.86M tokens for 29 transforms, the growing log file contributes to increasing input token counts.

**Proposed Fix**:
1. **Rotate the log**: Keep only the last N entries (e.g., 20) in intentïon.md. Archive older entries or drop them.
2. **Summarise instead of append**: Instead of appending every transform's details, maintain a summary section (total transforms, last 5 entries).

### ISSUE-19: High Token Consumption (Severity: LOW)

**Symptom**: 4.86M tokens consumed across 29 transforms. Average of 167K tokens per transform.

**Evidence**: Some transforms used up to 368K tokens (17:52Z). Even log-only transforms used ~66–151K input tokens.

**Root Cause**: The transform context includes the full intentïon.md (448 lines), all features, README, source, tests, and issue content. As the log grows, token usage increases.

**Proposed Fix**: Linked to ISSUE-18 (log rotation). Additionally, consider trimming what the transform prompt includes — e.g., only the relevant issue, not all open issues.

### ISSUE-20: Concurrency Cancellations Waste Actions Minutes (Severity: LOW)

**Symptom**: 11 workflow runs were cancelled due to concurrency group conflicts (6 transforms, 5 reviews). These runs consumed Actions queue time before being cancelled.

**Evidence**: At 12:54Z, the supervisor dispatched 4 transform + 4 review runs simultaneously (from multiple reactive triggers after an init), and most were cancelled by the concurrency group.

**Root Cause**: Reactive `workflow_run` triggers fire for each completed workflow, which can produce bursts of supervisor runs that all dispatch the same workflow.

**Proposed Fix**:
1. **Debounce reactive triggers**: The supervisor's reactive path should check if a workflow is already queued or running before dispatching another.
2. **This is mostly working**: The concurrency groups correctly prevent duplicate execution. The waste is the Actions minute consumed to start and then cancel. Low severity.

---

## Productivity Assessment

### What Went Well

1. **Zero failures** — the pipeline is mechanically sound
2. **Supervisor consistently dispatches transform** — the V2 fix to prioritise transform over maintain held up
3. **Code is valid** — tests pass at the end, the module exports 9 functions, the CLI works
4. **Issue creation** — the supervisor created 6 new issues from features
5. **Init system** — two init runs (7.1.39 → 7.1.40) worked cleanly

### What Went Poorly

1. **Output:input ratio is terrible** — 29 transform cycles, 4.86M tokens consumed, result is a 241-line file that was substantially the same after the first few transforms
2. **The pipeline spins its wheels** — same issue picked up repeatedly, code rewritten with minor variations
3. **Review is non-functional** — 11 runs, 0 labels added, 0 issues closed
4. **Net code quality declined** — test framework downgraded, test count dropped, code was repeatedly refactored sideways

### Effective Hourly Rate

| Metric | Value |
|--------|-------|
| Wall-clock time | ~19.5 hours |
| Productive wall-clock (Phases 1+2) | ~10 hours |
| Unproductive churn (Phase 3) | ~8.75 hours |
| Unique code produced | ~200 lines (main.js + tests) |
| Unique docs produced | ~100 lines (README + docs) |
| Total tokens spent on churn | ~3M+ (estimated 60% of total) |

---

## Proposed Solutions (Priority Order)

### P0: Fix Issue Lifecycle (addresses ISSUE-15, ISSUE-16, ISSUE-13)

The root problem is that review doesn't progress issues through the lifecycle. Fix the review handler to:
1. Add `ready` label to issues with clear acceptance criteria
2. Close issues when the code satisfies the criteria
3. This unblocks transform from its single-issue bottleneck

### P1: Prevent Transform Churn (addresses ISSUE-13, ISSUE-14)

1. Add issue-level progress comments after each transform
2. Skip commits that only change intentïon.md
3. Add a diff heuristic: if >80% of changes are rewrites (insertions ≈ deletions), prompt the LLM to justify why
4. Consider a "cooldown" — don't work on the same issue two transforms in a row

### P2: Stabilise Test Infrastructure (addresses ISSUE-17)

1. Pin vitest as the test framework in config
2. Add a minimum test count assertion in the CI pipeline
3. Prevent transform from modifying the test runner setup

### P3: Reduce Token Waste (addresses ISSUE-18, ISSUE-19)

1. Rotate intentïon.md to last 20 entries
2. Trim transform context to only the active issue
3. Consider capping transform input tokens

---

## Comparison with V2 Results

| Metric | V2 (33 min) | V3 (19.5 hrs) | Trend |
|--------|-------------|---------------|-------|
| Maintain % | 0% | 3% (1 run) | ✅ Stable |
| Transform % | 25% | 63% (29 runs) | ⚠️ Over-indexed |
| Review % | 75% | 24% (11 runs) | ⚠️ Under-indexed |
| Productive work | 100% | ~40% | ❌ Degraded |
| Issues closed | 2 | 0 (today) | ❌ Stalled |
| Failures | 0 | 0 | ✅ Stable |

V2's 33-minute window showed promise. V3's extended run revealed that the pipeline lacks the feedback loops needed for sustained autonomous operation. The supervisor dispatches work, but doesn't verify that the work produces useful outcomes.

---

## Fixes Applied

The following changes were made in agentic-lib to address the issues identified above:

1. **Fix enhance-issues pagination** (ISSUE-15, ISSUE-16): Changed `per_page: 1` to `per_page: 20` in `agent-flow-review.yml` find-issue step. The old value meant only the oldest issue was fetched, and if it already had `ready`, the filter returned empty — blocking all other issues from being enhanced.

2. **Fix review-issue iteration** (ISSUE-15): Changed `per_page: 1` to `per_page: 5` in `review-issue.js` and added logic to skip issues that already have a recent automated review comment (< 24h old). This prevents the reviewer from getting stuck on the same issue every cycle.

3. **Skip log-only commits** (ISSUE-14): Added a guard in `commit-if-changed/action.yml` that checks if only log files (intentïon.md) changed. If so, the commit is skipped entirely, eliminating the 31% of commits that produced no code change.

4. **Add log rotation** (ISSUE-18, ISSUE-19): Added rotation logic in `logging.js` to cap the activity log at 30 entries. When the log exceeds 30 entries, older entries are truncated, keeping token consumption bounded.

5. **Supervisor stale-issue guidance** (ISSUE-16): Added guidance to `agent-supervisor.md` instructing the supervisor to directly label stale issues (>1 day old without `ready`) using `github:label-issue`, rather than waiting for review to do it.

6. **Remove dead `tier` config** (cleanup): Removed the `tier = "schedule-1"` config from TOML seeds, config-loader, bin CLI, supervise.js context, agents YAML, and all tests. The tier concept was never used by any workflow — only `supervisor` frequency matters.

7. **Updated this report** with this Fixes Applied section.

---

## Recommendations for Next Steps

1. **Investigate review handler** — read the agent-flow-review logs to understand why it's not adding labels
2. **Add transform outcome validation** — don't just check "did it commit?", check "did it make meaningful progress?"
3. **Implement issue cooldown** — after working on an issue, mark it "in-progress" and move to the next ready issue
4. **Consider reducing schedule** — `*/15` continuous is too frequent when there's only 1 ready issue; `*/30` or hourly would reduce waste
5. **Run a focused test** — fix the review handler, mark 3 issues as ready, and observe whether the pipeline can work on distinct issues in parallel cycles
