# Plan: Benchmark Report 007 Fixes

**Source**: [BENCHMARK_REPORT_007.md](BENCHMARK_REPORT_007.md)
**Created**: 2026-03-10
**Status**: implemented — all 12 work items done (W1-W12)

---

## User Assertions

1. Fix all issues identified in BENCHMARK_REPORT_007.md
2. Behaviour test instability is the #1 priority — it's wasting 50-75% of iterations in affected scenarios
3. Mission-complete should require dedicated test files
4. Instability transforms should not consume mission budget

---

## Analysis of Benchmark 007 Results

### What went well

All 3 missions (roman-numerals, string-utils, cron-engine) completed successfully. Every scenario produced correct code on the first transform — the LLM is reliable for Tier 2-3 missions with gpt-5-mini/recommended. String-utils (10 functions) was the fastest at 22 minutes despite being the most complex, showing that "bag-of-functions" missions are easier than algorithmically complex ones.

### What went wrong

**Behaviour test instability consumed most of the pipeline's effort.** In roman-numerals, 2 of 3 transforms (67%) fixed instability. In cron-engine, 4 of 6 transforms (67%) fixed instability. Without instability, roman-numerals would have converged in ~2 iterations (not 6) and cron-engine in ~4 (not 8+1).

**No dedicated test files were created** — the same finding as Report 006 FINDING-3. The supervisor declares mission-complete based on issue closure, not on test quality. This is a systematic gap that has persisted across 4 consecutive benchmark reports.

**DST handling in cron-engine is approximate** — minute-stepping can skip or duplicate runs during DST transitions. Not blocking for MVP but a known quality gap.

**Supervisor annotation parsing** — "Unknown action: Requirements" in A6 iteration 1 was benign but indicates the supervisor prompt can produce output the action parser doesn't handle.

---

## Work Items

All fixes target `agentic-lib/` (mastered here, distributed to repository0 via init).

### W1: Add Playwright retry logic to behaviour tests (HIGH — FINDING-2, Recommendation #1)

**Problem**: Playwright behaviour tests fail intermittently, generating instability issues that consume transforms. Two of three Report 007 scenarios were affected. The failures are infrastructure-related (timing, DOM readiness, network), not caused by the mission code.

**Fix**: Add retry configuration to the behaviour test execution. Three layers:

1. **Playwright config**: Add `retries: 2` to `playwright.config.js` seed so new missions get retries by default
2. **Workflow step**: In `agentic-lib-test.yml` behaviour job, wrap the test command with retry logic: run up to 2 times if the first attempt fails
3. **Pre-commit gate**: In `agentic-lib-workflow.yml` dev job's `pre-commit-behaviour-test` step (added in Report 005 W1), add the same retry logic

**Files**:
- `src/seeds/zero-playwright.config.js` (add `retries: 2`)
- `.github/workflows/agentic-lib-test.yml` (behaviour job retry)
- `.github/workflows/agentic-lib-workflow.yml` (pre-commit-behaviour-test retry)

### W2: Reduce behaviour test flakiness via explicit waits (HIGH — FINDING-2, Recommendation #1)

**Problem**: The behaviour test script (`scripts/run-behaviour.js` or seed equivalent) may assert on DOM elements before they're fully rendered. Timing-sensitive assertions are the most common Playwright failure mode.

**Fix**: Review and update the behaviour test seed to:
1. Use `waitForSelector` or `locator.waitFor()` before assertions
2. Add `networkidle` wait state where applicable
3. Increase default timeout for navigation actions
4. Use `toBeVisible()` instead of element count assertions where appropriate

**Files**:
- `src/seeds/zero-run-behaviour.js` (or equivalent behaviour test seed)
- `src/scripts/run-behaviour.js`

### W3: Add test coverage requirement to mission-complete criteria (HIGH — FINDING-5, Recommendation #2)

**Problem**: Across all 4 scenarios in Reports 006-007, no dedicated test files were created. The supervisor declares mission-complete based on issue closure and "0 open issues" — there's no check for test quality.

**Fix**: Update the `supervise.js` mission-complete evaluation to include a test coverage check:

1. **Detection**: Check if any test file exists that imports from the mission's source files (not just the seed `main.test.js`). Pattern: `tests/*.test.js` or `__tests__/*.test.js` that imports from `src/lib/`.
2. **Metric**: Add "Dedicated test file exists" as a mission-complete criterion in the supervisor's evaluation.
3. **Prompt update**: Update `agent-supervisor.md` to instruct the supervisor: "Before declaring mission-complete, verify that dedicated test files exist for mission-specific functions. If no dedicated test file exists, create an issue requesting test coverage."
4. **Fallback**: If the supervisor would otherwise declare mission-complete but no test file exists, instead create an issue: "feat: add dedicated test coverage for [mission] functions" with `ready` label.

**Files**:
- `src/lib/supervise.js` (add test file detection to mission-complete check)
- `src/agents/agent-supervisor.md` (add test coverage requirement to prompt)

### W4: Separate instability budget from mission budget (MEDIUM — FINDING-2, Recommendation #5)

**Problem**: The `transformation-budget` in `agentic-lib.toml` counts ALL transforms, including instability fixes. A scenario with budget=32 that spends 4 transforms on instability has only 28 left for mission work. Instability fixes address infrastructure issues, not mission code.

**Fix**: Track two counters in the activity log:
1. `mission-transforms`: transforms where the dev job worked on a non-instability issue
2. `instability-transforms`: transforms where the dev job worked on an `instability`-labelled issue

Only `mission-transforms` count against the `transformation-budget`. This means infrastructure fixes don't starve the mission of budget.

**Implementation**:
1. In the dev job's transform step, after selecting the target issue, check if it has the `instability` label
2. If instability, increment `instability-transforms` in the activity log but do NOT increment the budget counter
3. In the supervisor's budget check, only count non-instability transforms

**Files**:
- `.github/workflows/agentic-lib-workflow.yml` (dev job — tag transform type)
- `src/lib/supervise.js` (budget check — exclude instability transforms)
- `src/lib/activity.js` (or equivalent — track separate counters)

### W5: Harden supervisor action parsing (LOW — FINDING-7)

**Problem**: Supervisor output "Unknown action: Requirements" in A6 iteration 1. The supervisor included a "Requirements:" section in its response that the action parser didn't recognise. While benign (the primary action still executed), this generates confusing log output.

**Fix**: Update the action parser to:
1. Ignore unrecognised sections after the primary action has been extracted
2. Log unrecognised sections as `debug` (not `warning`)
3. Only warn if NO recognisable action was found in the response

**Files**:
- `src/lib/supervise.js` (action parsing logic)

### W6: Document auto-dispatch iteration counting (LOW — FINDING-8)

**Problem**: Auto-dispatched fix runs (from `dispatch-fix`) create unexpected extra iterations that make benchmark comparisons inconsistent. In A6, run 22887525625 was auto-dispatched between iterations 3 and 4.

**Fix**: No code change needed. Add a note to the benchmark execution guide and the activity log that:
1. Auto-dispatched runs should be counted separately (e.g. "3a" as done in Report 007)
2. The "Total iterations" metric should note auto-dispatched runs: "8 (+1 auto)"
3. For cross-scenario comparison, use "effective iterations" = total minus auto-dispatched

**Files**:
- Update benchmark execution documentation (if it exists)
- No workflow changes

---

## Implementation Order

| # | Work Item | Priority | Dependencies | Files Changed |
|---|-----------|----------|--------------|---------------|
| 1 | W1 | HIGH | None | `zero-playwright.config.js`, `agentic-lib-test.yml`, `agentic-lib-workflow.yml` |
| 2 | W2 | HIGH | None | `zero-run-behaviour.js`, `run-behaviour.js` |
| 3 | W3 | HIGH | None | `supervise.js`, `agent-supervisor.md` |
| 4 | W4 | MEDIUM | None | `agentic-lib-workflow.yml`, `supervise.js`, `activity.js` |
| 5 | W5 | LOW | None | `supervise.js` |
| 6 | W6 | LOW | None | Documentation only |

**Non-conflicting groups** (can be implemented in parallel):
- Group A: W1 + W3 (different files, except both touch supervise.js — but different sections)
- Group B: W2 (standalone — seed/script files)
- Group C: W4 + W5 (both touch supervise.js — must be sequenced)
- Group D: W6 (documentation only)

---

## Implementation Notes

### W1: Playwright retry logic — DONE
- `zero-playwright.config.js`: Added `retries: 2` so Playwright automatically retries failing tests up to 2 times
- `agentic-lib-test.yml`: Behaviour job now runs `npm run test:behaviour || { sleep 2; npm run test:behaviour }` — retries once on failure
- `agentic-lib-workflow.yml`: Pre-commit behaviour test step now retries once on failure before setting `tests-passed=false`

### W2: Explicit waits in behaviour test seed — DONE
- `zero-behaviour.test.js`: Added `waitUntil: "networkidle"` to `page.goto()`, and `timeout: 10000` to all `toBeVisible()` assertions. This reduces flakiness from DOM-timing races.

### W3: Test coverage requirement in mission-complete — DONE
- `supervise.js` (`gatherContext`): Added `hasDedicatedTests` / `dedicatedTestFiles` detection. Scans `tests/` and `__tests__/` for files that import from `src/lib/`, excluding seed tests (main.test.js, web.test.js, behaviour.test.js).
- `supervise.js` (`buildPrompt`): Added "### Test Coverage" section showing dedicated test file status.
- `supervise.js` (deterministic mission-complete): When `hasDedicatedTests` is false, blocks mission-complete and creates a "feat: add dedicated test coverage" issue with `automated,ready` labels instead.
- `agent-supervisor.md`: Added test coverage check to MANDATORY FIRST CHECK and added condition #4 to Mission Accomplished criteria requiring dedicated test files.

### W4: Separate instability budget — DONE
- `index.js`: After determining `transformationCost`, checks if the target issue has the `instability` label. If so, sets `transformationCost = 0` — instability transforms don't count against the mission budget.
- `supervise.js` (`buildPrompt`): Budget display now notes that instability transforms are excluded.

### W5: Harden action parsing — DONE
- `supervise.js` (`executeAction`): Changed `core.warning("Unknown action: ...")` to `core.debug("Ignoring unrecognised action: ...")`. Only emits debug-level log for benign unrecognised sections.
- `supervise.test.js`: Added `debug: vi.fn()` to the `@actions/core` mock.

### W6: Document auto-dispatch counting — DONE (in PLAN file)
- No code change. Auto-dispatched runs should be counted as "N (+M auto)" in benchmark reports, as done in Report 007 (A6: "8 (+1 auto)"). For comparison, use "effective iterations" = total minus auto-dispatched.

---

## Success Criteria

1. Playwright tests have retry logic — a single transient failure does not generate an instability issue
2. Behaviour test seed uses explicit waits, reducing DOM-timing failures
3. Supervisor requires dedicated test file before declaring mission-complete
4. Instability transforms do not count against the mission transformation budget
5. Supervisor action parser does not warn on benign extra sections
6. All existing tests pass (429+ unit tests in agentic-lib)
7. Workflow lint passes (`npm run lint:workflows`)
8. Re-run roman-numerals or cron-engine benchmark and verify fewer instability iterations (target: 0-1 instability transforms per scenario)
9. Resolved issues threshold is 3 (not 1) — pipeline must resolve 3 issues before declaring mission-complete
10. Init purge creates "Initial unit tests" and "Initial web layout" issues with MISSION.md content
11. Mission-complete metrics include Source TODO count (must be 0)
12. Supervisor LLM prompt includes full Mission-Complete Metrics table (same data as intentïon.md)
13. All mission-complete thresholds are externalised in `[mission-complete]` section of agentic-lib.toml

---

## Work Items (W7-W11)

### W7: Raise resolved issues threshold from 1 to 3 (HIGH — Recommendation)

**Problem**: Deterministic mission-complete declared with only 1 resolved issue. A single-issue mission might declare victory too early.

**Fix**: Changed threshold from `resolvedCount >= 1` to `resolvedCount >= minResolved` (default 3, configurable via `[mission-complete].min-resolved-issues` in agentic-lib.toml).

**Files**: `supervise.js`, `index.js`, `agentic-lib.toml`, `config-loader.js`

### W8: Init creates seed issues (HIGH — NEW)

**Problem**: After `init --purge`, there are no issues for the pipeline to work on. The supervisor has to create issues from scratch, wasting an iteration.

**Fix**: Added a step to `agentic-lib-init.yml` that creates two seed issues after purge:
- W8a: "Initial unit tests" — requests test stubs with TODOs for each mission feature
- W8b: "Initial web layout" — requests homepage layout showcasing mission features
Both issues include the full MISSION.md content in the body and are labelled `automated,ready`.

**Files**: `.github/workflows/agentic-lib-init.yml`

### W9: TODO count in mission-complete metrics (HIGH — NEW)

**Problem**: The pipeline could declare mission-complete while source code still has TODO placeholders.

**Fix**: Added `countSourceTodos()` that recursively scans `./src` for `TODO` comments in .js/.ts/.mjs files. Count is:
1. Included in `buildMissionMetrics` (logged to intentïon.md)
2. Included in `gatherContext` (sent to supervisor LLM)
3. Checked in deterministic mission-complete (blocks if count > `max-source-todos`)

**Files**: `index.js`, `supervise.js`

### W10: Full metrics in LLM prompt (MEDIUM — Consistency)

**Problem**: The supervisor LLM saw partial mission status (open issues, PRs, budget) but not the structured metrics table that gets logged to intentïon.md.

**Fix**: Added `### Mission-Complete Metrics` table to `buildPrompt()` in supervise.js. The LLM now sees the exact same metrics (with MET/NOT MET status) that are logged. Also updated `agent-supervisor.md` to reference the metrics table.

Additionally, `buildMissionMetrics` in index.js now includes dedicated test files and TODO count, and `buildMissionReadiness` uses all NOT MET conditions to build its narrative.

**Files**: `supervise.js`, `index.js`, `agent-supervisor.md`

### W11: Externalise mission-complete thresholds (HIGH — Architecture)

**Problem**: Mission-complete thresholds were hardcoded in JS. Changing them required code changes.

**Fix**: Added `[mission-complete]` section to `agentic-lib.toml`:
```toml
[mission-complete]
min-resolved-issues = 3
require-dedicated-tests = true
max-source-todos = 0
```
Updated `config-loader.js` to parse this section and expose `missionCompleteThresholds` on the config object. All consumers (supervise.js deterministic check, index.js metrics, buildPrompt) now read from config.

**Files**: `agentic-lib.toml`, `config-loader.js`, `supervise.js`, `index.js`

---

## Implementation Notes (W7-W11)

### W7: Resolved issues threshold — DONE
Changed deterministic mission-complete in supervise.js from `resolvedCount >= 1` to `resolvedCount >= minResolved` where `minResolved` comes from `config.missionCompleteThresholds.minResolvedIssues` (default 3). Same in `buildMissionMetrics` target column.

### W8: Init seed issues — DONE
Added `actions/github-script@v8` step to `agentic-lib-init.yml` after commit-and-push. Only runs on purge mode (not update/reseed). Creates two issues with `automated,ready` labels, each with MISSION.md content appended. Ensures labels exist before creating issues.

### W9: TODO count — DONE
Added `countSourceTodos()` in `index.js` (exported for reuse). Scans recursively from `./src`, skipping `node_modules` and dotfiles. Counts case-insensitive `TODO` matches. Added inline equivalent in supervise.js `gatherContext()` (avoids circular import). Added to `buildMissionMetrics` with configurable threshold. Added to deterministic mission-complete blockers check.

### W10: Full metrics in LLM prompt — DONE
`buildPrompt()` now accepts `config` parameter. Builds a Mission-Complete Metrics table inline using the same thresholds as the deterministic check. Includes all 6 metrics: open issues, open PRs, resolved count, dedicated tests, TODO count, budget. Updated `agent-supervisor.md` to reference the metrics table in mandatory first check, mission accomplished criteria, and stability detection.

### W11: Externalised thresholds — DONE
Added `[mission-complete]` section to `agentic-lib.toml`. Updated `config-loader.js` to parse it into `missionCompleteThresholds` with safe defaults. All 3 thresholds (min-resolved-issues, require-dedicated-tests, max-source-todos) are consumed by: supervise.js deterministic check, buildPrompt metrics table, buildMissionMetrics in index.js. Centrally computed `hasDedicatedTests` in index.js (not just supervise task).

---

## W12: Director Job (DONE)

**Status**: implemented — all steps complete

### Concept

Add a **director** job to `agentic-lib-workflow.yml` that runs immediately **before** the supervisor. The director has a single responsibility: evaluate mission readiness and produce a structured statement.

### Responsibilities

1. **Mission complete** — if all metrics are MET, declare it
2. **Mission failed** — if budget is exhausted or pipeline is stuck
3. **Gap analysis** — "Where we are now and the remaining gaps between now and what would need to be in place for mission-complete"

### What Changes

| Current | Proposed |
|---------|----------|
| Supervisor does LLM-based mission-complete detection | Director does this exclusively |
| Deterministic fallback in supervise.js fires after LLM | Removed — director replaces it |
| Supervisor prompt includes mission-complete metrics | Director consumes all metrics instead |
| Mission-complete/failed written by supervisor | Director writes these signals |
| Supervisor is both strategist and evaluator | Supervisor is pure strategist (dispatch/issues/schedule) |

### Architecture

```
agentic-lib-workflow.yml
│
├── params (normalise inputs)
├── telemetry (gather metrics, instability check)
├── director (NEW — runs src/agents/agent-director.md via agentic-step task "direct")
│     Input: all telemetry, mission metrics, TODO count, test coverage, activity log
│     Output: mission-complete | mission-failed | gap-analysis statement
│     Writes to intentïon.md
│     If mission-complete → skip supervisor + all downstream
│     If mission-failed → skip supervisor + all downstream
│     If gap-analysis → pass statement to supervisor as context
├── supervisor (existing — now pure strategist, receives director's gap analysis)
├── maintain / review / dev / pr-cleanup (existing)
```

### New Files

- `src/agents/agent-director.md` — director prompt
- `src/actions/agentic-step/tasks/direct.js` — director task handler

### Design Decisions (approved)

1. **LLM-based director** — accepted extra cost. Director uses LLM for gap analysis.
2. **Mechanical check becomes advisory** — the deterministic mission-complete check (W7/W9/W11) stays as a metric-based assessment, captured in telemetry and passed to the director as "Metric based mission complete assessment: ...". Also written to intentïon.md. Director makes the actual decision.
3. **Remove mission-complete from supervisor** — `agent-supervisor.md` no longer mentions mission-complete/failed. Supervisor becomes pure strategist. Remove `mission-complete` and `mission-failed` from supervisor's available actions. Remove the deterministic mission-complete fallback from supervise.js.
4. **Director writes to intentïon.md** — director's gap-analysis statement is a new entry type in the activity log.
5. **Ordering** — director runs before supervisor. If director declares mission-complete/failed, supervisor and all downstream jobs are skipped.

### Implementation Steps

1. Create `src/agents/agent-director.md` — director prompt
2. Create `src/actions/agentic-step/tasks/direct.js` — director task handler
3. Register `direct` task in `index.js` TASKS map
4. Add `director` job to `agentic-lib-workflow.yml` before supervisor
5. Convert deterministic mission-complete check to advisory metric string
6. Pass advisory metric string to director via telemetry
7. Write advisory metric string to intentïon.md
8. Remove mission-complete/failed from supervisor prompt and actions
9. Remove deterministic mission-complete fallback from supervise.js
10. Director outputs: `mission-complete`, `mission-failed`, or gap-analysis statement
11. If mission-complete/failed → skip supervisor + downstream jobs
12. If gap-analysis → pass to supervisor as context
