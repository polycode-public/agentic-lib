# Plan: Benchmark Report 011 Fixes

**Source**: [BENCHMARK_REPORT_011.md](BENCHMARK_REPORT_011.md)
**Created**: 2026-03-17
**Status**: in progress

---

## User Assertions

1. Fix issues identified in BENCHMARK_REPORT_011.md
2. Use a single branch (`claude/benchmark-011-fixes`) for all fixes
3. Release, then init to have repository0 use the fixes
4. W1 rejected by user — maintain tasks should count against budget

---

## Analysis of Benchmark 011 Results

### What went well

Both missions (fizz-buzz, hamming-distance) completed successfully with all acceptance criteria passing. Working code delivered in iteration 1 for both. Seed issues accelerated the pipeline start. Dedicated test files were created (10-11 per scenario) — a significant improvement over Reports 006-007 where no dedicated tests were created.

### What went wrong

1. **Budget burn from maintain tasks** — 55-57% of budget consumed by maintain-features/maintain-library, not dev transforms.
2. **State file not updated on mission-complete** — Director writes MISSION_COMPLETE.md but doesn't update agentic-lib-state.toml.
3. **Schedule not disabled after mission-complete** — S3 had 9 wasted schedule runs (~60 min CI) after mission was done.
4. **Duplicate issue churn** — S3 had 5 identical "dedicated tests" issues.
5. **Behaviour test failure churn** — S1 had 3 behaviour failure issues.

---

## Work Items

All fixes target `agentic-lib/` (mastered here, distributed to repository0 via init).

### W1: ~~Exclude maintain transforms from budget~~ — REJECTED

**Decision**: User decided against this. Maintain tasks should count against the transformation budget. Change was reverted.

### W2: Director updates state file on mission-complete (HIGH — FINDING-3)

**Status**: DONE

### W3: Director disables schedule on mission-complete (HIGH — FINDING-4)

**Status**: DONE

### W4: Workflow-level mission-complete early exit (MEDIUM — FINDING-4)

**Problem**: Even after MISSION_COMPLETE.md exists, workflow runs proceed through all jobs. S1 iteration 6 was only cancelled by concurrency, not by design. S3 had 9 wasted schedule runs.

**Fix**: In the `params` job, add sparse-checkout of `MISSION_COMPLETE.md` and `MISSION_FAILED.md`. Check for their existence and output `mission-complete=true`. Gate `behaviour-telemetry`, `telemetry`, `maintain`, `implementation-review`, and `director` jobs on `needs.params.outputs.mission-complete != 'true'`. Only `pr-cleanup` and `post-merge` continue running (for cleanup).

**Files**: `.github/workflows/agentic-lib-workflow.yml`

**Status**: DONE

### W5: Deduplicate issue creation (MEDIUM — FINDING-5)

**Problem**: S3 had 5 near-identical "dedicated tests" issues (#3070-#3074). The supervisor creates issues without checking for existing open duplicates.

**Fix**: Added open-issue dedup guard in `executeCreateIssue()`. Before creating, fetches open issues with `automated` label, checks for title prefix overlap (30-char prefix match, bidirectional). Skips creation if a similar open issue exists. This complements the existing closed-issue dedup guard.

**Files**: `src/actions/agentic-step/tasks/supervise.js`

**Status**: DONE

### W6: Supervisor should open as many distinct issues as needed (MEDIUM)

**Problem**: The supervisor tends to open one narrow issue at a time. For missions with clear multi-part gaps, it should create as many distinct issues as needed — ideally one comprehensive issue covering the full gap, or multiple issues if the work is naturally separable. Up to what's achievable in a single tool loop.

**Fix**: Update the supervisor agent prompt (`src/agents/agent-supervisor.md` / `.github/agents/agent-supervisor.md`) to instruct the LLM to assess the full gap between current state and mission, then create issues covering the entire gap. Also update the `report_supervisor_plan` tool description to encourage multiple `github:create-issue` actions. Review `featureIssuesWipLimit` — ensure it doesn't artificially cap issue creation below what's useful.

**Files**: `.github/agents/agent-supervisor.md`, `src/actions/agentic-step/tasks/supervise.js`

**Status**: pending

### W7: Dev job should work on multiple open issues concurrently (MEDIUM)

**Problem**: The dev job picks a single `ready`-labelled issue and works on it. If multiple issues are ready, it only addresses one per workflow run.

**Fix**: In the `dev` job of `agentic-lib-workflow.yml`, change the "Find target issue" step to collect all ready issues (up to a configured concurrency limit from `max-feature-issues`). Use a matrix strategy or sequential loop to resolve multiple issues in one run. Each issue gets its own branch and PR.

**Files**: `.github/workflows/agentic-lib-workflow.yml`, possibly `src/actions/agentic-step/tasks/transform.js`

**Status**: pending

### W8: Add behaviour test dry-run tool for Copilot (MEDIUM)

**Problem**: Copilot has no way to check if code would pass behaviour tests without actually running Playwright in a browser container. This leads to wasted cycles when behaviour tests fail after commit.

**Fix**: Add a `defineTool("dry_run_behaviour_tests", ...)` custom tool in the transform/fix-code task handlers. The tool reads the test files (e.g. `tests/behaviour/*.spec.js`), extracts expected behaviours, reads the relevant source code, and uses the LLM's reasoning to confirm whether the code would satisfy those test expectations. Returns a structured pass/fail analysis. This acts as a fast pre-check before the real Playwright run.

**Files**: `src/copilot/github-tools.js` or `src/actions/agentic-step/tasks/transform.js`

**Status**: pending

### W9: Include worktree file listing in Copilot session prompts (LOW)

**Problem**: Copilot tasks operate without a complete picture of what files exist in the worktree. The model must discover files via `list_files` tool calls, which consumes tool budget.

**Fix**: Before each Copilot session (transform, fix-code, maintain-*, etc.), generate a listing of all non-ignored files in the working directory (using `git ls-files` or equivalent) and include it in the prompt. Cap at reasonable size (e.g. 200 files, 5000 chars).

**Files**: `src/actions/agentic-step/copilot.js` (new helper), `src/actions/agentic-step/tasks/transform.js`, `src/actions/agentic-step/tasks/supervise.js`

**Status**: pending

### W10: Include explicit writable/available paths in session prompts (LOW)

**Problem**: Copilot sessions have writable-path restrictions enforced by tools, but the model doesn't see an explicit list of what paths are writable vs read-only. This leads to wasted attempts to write outside allowed paths.

**Fix**: In the prompt assembly for each task handler, add a section listing the writable paths (already passed to `runCopilotSession`) and read-only paths explicitly. Mirror the tool-level setting in the prompt so the model can plan accordingly. Note: `formatPathsSection()` in `copilot.js` already does this for transform — ensure all task handlers use it consistently.

**Files**: `src/actions/agentic-step/copilot.js`, all task handlers in `src/actions/agentic-step/tasks/`

**Status**: pending

### W11: Add 10-minute timeout for LLM tool-loop steps (HIGH)

**Problem**: Copilot SDK sessions can loop indefinitely on tool calls. The existing `timeoutMs` default is 600000ms (10 min) in `copilot-session.js`, but individual workflow steps and jobs don't have explicit timeouts. A runaway session could consume the entire 6-hour GitHub Actions job limit.

**Fix**: Add `timeout-minutes: 10` to all workflow steps that invoke `agentic-step` with LLM tasks (transform, fix-code, supervise, direct, maintain-*, review-issue, enhance-issue, implementation-review). Also verify the `copilot-session.js` timeoutMs is enforced correctly.

**Files**: `.github/workflows/agentic-lib-workflow.yml`, `src/copilot/copilot-session.js`

**Status**: pending

### W12: Add code coverage check to npm test (MEDIUM)

**Problem**: No code coverage metrics are collected. The LLM has no visibility into test coverage when making changes, and there's no quality gate.

**Fix**: Configure vitest to collect coverage (c8/istanbul provider) against `src/lib/` files. Set a basic threshold (e.g. 50% lines, 30% branches). Include coverage in `npm test` output. Add line/branch coverage as completeness metrics in the mission-complete evaluation. State the coverage level in all prompts where code is being changed (transform, fix-code agent prompts).

**Files**: `vitest.config.js` or `package.json` (vitest config), `.github/agents/agent-issue-resolution.md`, `.github/agents/agent-apply-fix.md`, `agentic-lib.toml`

**Status**: pending

### W13: Add code coverage threshold to agentic-lib.toml goals (MEDIUM)

**Problem**: No coverage standard is configured or communicated to the LLM agents.

**Fix**: Add a `[goals]` section to `agentic-lib.toml` with `min-line-coverage` and `min-branch-coverage` thresholds. Read these values in the config loader. Include them prominently in the prompts for all code-changing tasks (transform, fix-code). The prompt should state: "Required code coverage: ≥X% lines, ≥Y% branches. Run tests with coverage to verify."

**Files**: `agentic-lib.toml`, `src/actions/agentic-step/config-loader.js`, `src/actions/agentic-step/copilot.js`, agent prompt files

**Status**: pending

### W14: Post-merge director evaluation (HIGH)

**Problem**: The director runs before the dev job merges PRs. After a PR merge that resolves the final issue, the mission may be complete — but no director check runs until the next full workflow cycle. This wastes a whole scheduled run.

**Fix**: Add a post-merge director step to the `post-merge` job. After dev and pr-cleanup complete, if the mission isn't already complete and we're not in dry-run mode, run the same `agentic-step` with `task: "direct"` and fresh context. The `direct()` function already gathers its own context from the GitHub API (issues, PRs, metrics) and handles mission-complete execution (signal file, state update, schedule disable). No refactoring of `direct.js` needed — it's fully self-contained.

**Files**: `.github/workflows/agentic-lib-workflow.yml`

**Status**: DONE

### W15: Skip expensive jobs when no work exists (MEDIUM — WASTE)

**Problem**: Several jobs run full setup (checkout, node, npm ci, agentic-step install) even when there's nothing to do: `review-features` when there are no open issues, `fix-stuck` when there are no automerge PRs, `behaviour-telemetry` when there's no `playwright.config.js`, `post-commit-test` when dev nop'd.

**Fix**: Add early-exit conditions to these jobs. For `review-features` and `fix-stuck`, have the telemetry job output issue/PR counts so downstream jobs can gate on them. For `behaviour-telemetry`, move the `hashFiles` check from the step to the job `if` condition. For `post-commit-test`, gate on dev having produced changes (add an output from the dev job).

**Files**: `.github/workflows/agentic-lib-workflow.yml`

**Status**: pending

### W16: Bot notification on mission-complete and mission-failed (MEDIUM — LIFECYCLE)

**Problem**: Neither `executeMissionComplete()` nor `executeMissionFailed()` notifies the discussion bot. The user's first indication that the mission ended is seeing the schedule go quiet. The supervisor has lifecycle posts but they run before the director's decision.

**Fix**: In `executeMissionComplete()` and `executeMissionFailed()` in `direct.js`, after writing the signal file and disabling the schedule, dispatch the bot workflow with a summary message ("Mission complete: {reason}" / "Mission failed: {reason}"). Use the same `dispatchBot` pattern from `supervise.js`, or call the bot workflow directly via `createWorkflowDispatch`.

**Files**: `src/actions/agentic-step/tasks/direct.js`

**Status**: pending

### W17: Pass implementation-review results to the dev/transform task (MEDIUM — CONTEXT)

**Problem**: The `implementation-review` job produces `review-advice` and `review-gaps` which are passed to `director` and `supervisor` via env vars, but NOT to the `dev` (transform) job. The agent writing code can't see what the implementation review found is missing — it has to rediscover gaps via tool calls.

**Fix**: Add `REVIEW_ADVICE` and `REVIEW_GAPS` env vars to the "Run transformation" step in the dev job, sourced from `needs.implementation-review.outputs`. Update the transform prompt to include a "## Implementation Review" section (similar to what the supervisor prompt already does).

**Files**: `.github/workflows/agentic-lib-workflow.yml`, `src/actions/agentic-step/tasks/transform.js`

**Status**: pending

### W18: Pass review results to W14 post-merge director (LOW — CONTEXT)

**Problem**: The pre-dev director receives `REVIEW_ADVICE`/`REVIEW_GAPS` from the implementation-review job, but the W14 post-merge director doesn't. It evaluates mission-complete without knowing about critical implementation gaps, which could lead to premature mission-complete declarations.

**Fix**: Add `REVIEW_ADVICE` and `REVIEW_GAPS` env vars to the W14 post-merge director step, sourced from `needs.implementation-review.outputs`. The `implementation-review` job needs to be added to the `post-merge` job's `needs` list.

**Files**: `.github/workflows/agentic-lib-workflow.yml`

**Status**: pending

### W19: Pass telemetry test output to the transform agent (LOW — CONTEXT)

**Problem**: The telemetry job captures live unit test output and behaviour test results, but this data only reaches the supervisor prompt. The transform agent has to burn tool calls running tests itself to discover what's currently failing — it could be told upfront.

**Fix**: Pass the telemetry test results (unit test exit code, pass/fail counts, and optionally truncated output) to the dev job via the telemetry outputs. Include a "## Current Test State" section in the transform prompt showing what tests pass/fail before any changes.

**Files**: `.github/workflows/agentic-lib-workflow.yml`, `src/actions/agentic-step/tasks/transform.js`

**Status**: pending

### W20: Fix-stuck should immediately attempt merge after resolving conflicts (MEDIUM — THROUGHPUT)

**Problem**: After fix-stuck resolves a PR's conflicts (Tier 1/2/3), it pushes the fix but then relies on the next pr-cleanup cycle to actually merge the PR. This wastes a full cycle.

**Fix**: After successfully pushing conflict resolution, immediately attempt to merge the PR in the same step (wait for checks, then squash-merge). Use the same merge logic as pr-cleanup. If merge succeeds, also label the associated issue with `merged`.

**Files**: `.github/workflows/agentic-lib-workflow.yml`

**Status**: pending

### W21: Change default profile to max, rename recommended → med (HIGH)

**Problem**: The default distributed profile is `recommended`, which is conservative. With gpt-5-mini's large context window, the `max` profile's higher limits (30 issues, 128 budget, 8 features, 64 library) are safe and give the LLM more to work with. Also, "recommended" is verbose — rename to "med" for consistency with "min" and "max".

**Fix**:
1. Change the `#@dist` marker on the profile setting from `"recommended"` to `"max"`.
2. Rename `[profiles.recommended]` to `[profiles.med]` in `agentic-lib.toml`.
3. Update all references to `"recommended"` profile name: `PROFILE_LIMITS` in `agentic-lib-workflow.yml`, `FALLBACK_TUNING`/`FALLBACK_LIMITS` in `config.js`, and `profiles` section in `agentic-lib-flow.yml`.
4. Verify all truncation points are safe for gpt-5-mini context with max profile.

**Files**: `agentic-lib.toml`, `src/copilot/config.js`, `.github/workflows/agentic-lib-workflow.yml`, `.github/workflows/agentic-lib-flow.yml`

**Status**: DONE

### W22: Make LLM-facing truncation limits profile-configurable (HIGH)

**Problem**: Several truncation limits that directly affect what the LLM can reason about are hardcoded, sized conservatively for an era when context windows were small. gpt-5-mini has **264K token context** (~900K chars for code). Current limits waste most of this capacity:

| Limit | Current | Location | Impact |
|-------|---------|----------|--------|
| `MAX_READ_CHARS` | 20,000 | copilot-session.js:195 | A 500-line source file gets chopped. LLM can't see the code it's modifying. |
| Test output | 4,000 | copilot-session.js:299 | Failing test error messages get lost. |
| File listing | 30 files | transform.js:35 | Larger repos miss files. |
| Library index | 2,000 chars | transform.js:57 | Reference material truncated. |
| Fix-code test output | 8,000 | fix-code.js:35 | Diagnosis info chopped. |

**Fix**: Add these as profile-configurable values in `agentic-lib.toml`, parsed in `config.js`, passed through to task handlers and `copilot-session.js`.

Proposed profile values (sized against model context windows from MODELS.md):

| Limit | min | med | max | Reasoning |
|-------|-----|-----|-----|-----------|
| `max-read-chars` | 20,000 | 50,000 | 100,000 | Max ≈ 25K tokens, ~10% of gpt-5-mini's 264K context. Allows full view of any normal source file. |
| `max-test-output` | 4,000 | 10,000 | 20,000 | Max ≈ 5K tokens. Enough for full error traces. |
| `max-file-listing` | 30 | 100 | 0 (unlimited) | Filenames are tiny (~50 chars each). Even 200 files is ~10K chars. No reason to cap at max. |
| `max-library-index` | 2,000 | 5,000 | 10,000 | Reference material summaries. 10K ≈ 2.5K tokens. |
| `max-fix-test-output` | 8,000 | 15,000 | 30,000 | Fix-code needs full diagnosis. 30K ≈ 7.5K tokens. |

For gpt-4.1 (128K context), users should use min or med profile. For claude-sonnet-4 (216K context), med is safe. Max is sized for gpt-5-mini (264K) with headroom.

**Implementation**:
1. Add `[profiles.*.context-limits]` section to `agentic-lib.toml` with the 5 values above
2. Parse in `config.js` → `resolveTuning()` or new `resolveContextLimits()`
3. Pass `config.contextLimits` to `runCopilotSession()` (for `MAX_READ_CHARS` and test output)
4. Pass to task handlers (for file listing, library index, fix-test output)
5. Update MODELS.md with context window guidance per profile

**Files**: `agentic-lib.toml`, `src/copilot/config.js`, `src/copilot/copilot-session.js`, `src/actions/agentic-step/tasks/transform.js`, `src/actions/agentic-step/tasks/fix-code.js`, `src/actions/agentic-step/tasks/maintain-library.js`, `src/actions/agentic-step/tasks/maintain-features.js`, `MODELS.md`

**Status**: pending

---

## Overarching Theme

**"Try and do everything you can to complete the mission at each stage."**

Tackle the coarsest grain where success can reasonably be expected. Every job should ask: "can I advance the mission further right now?" rather than "is my specific step done?" This means:
- Don't waste cycles on work that's already done (W2/W3/W4/W11/W14/W15)
- Don't create work that already exists (W5/W6)
- Give the LLM all available context upfront (W8/W9/W10/W12/W13/W17/W18/W19)
- Do more per cycle (W7/W20)
- Close the loop immediately when the mission is done (W14/W16)
- Use the most capable settings available (W21)

---

## Implementation Order

| # | Work Item | Priority | Dependencies | Status |
|---|-----------|----------|--------------|--------|
| 1 | ~~W1~~ | ~~HIGH~~ | — | REJECTED |
| 2 | W2 | HIGH | None | DONE |
| 3 | W3 | HIGH | W2 | DONE |
| 4 | W4 | MEDIUM | None | DONE |
| 5 | W5 | MEDIUM | None | DONE |
| 6 | W6 | MEDIUM | None | DONE |
| 7 | W7 | MEDIUM | W6 | DONE |
| 8 | W8 | MEDIUM | None | DONE |
| 9 | W9 | LOW | None | DONE |
| 10 | W10 | LOW | None | DONE (already present in code-writing handlers) |
| 11 | W11 | HIGH | None | DONE |
| 12 | W12 | MEDIUM | None | DONE (seed already has @vitest/coverage-v8) |
| 13 | W13 | MEDIUM | W12 | DONE |
| 14 | W14 | HIGH | W4 | DONE |
| 15 | W15 | MEDIUM | None | DONE |
| 16 | W16 | MEDIUM | None | DONE |
| 17 | W17 | MEDIUM | None | DONE |
| 18 | W18 | LOW | W14, W17 | DONE |
| 19 | W19 | LOW | None | DONE |
| 20 | W20 | MEDIUM | None | DONE |
| 21 | W21 | HIGH | None | DONE |
| 22 | W22 | HIGH | W21 | DONE |

**Branch**: `claude/benchmark-011-fixes`

---

## Implementation Notes

### W1: Exclude maintain transforms from budget — REJECTED

User decided against this change. Reverted `COST_TASKS` in both `src/copilot/telemetry.js` and `src/actions/agentic-step/index.js` back to `["transform", "fix-code", "maintain-features", "maintain-library"]`.

### W2: Director updates state file on mission-complete — DONE

Added state update block to `executeMissionComplete()` in `src/actions/agentic-step/tasks/direct.js`. Now sets `state.status["mission-complete"] = true` and `state.schedule["auto-disabled"] = true`. Mirrors the existing logic in `executeMissionFailed()`.

### W3: Director disables schedule on mission-complete — DONE

Added schedule dispatch to `executeMissionComplete()` in `src/actions/agentic-step/tasks/direct.js`. Now dispatches `agentic-lib-schedule.yml` with `frequency: "off"` on mission-complete. Mirrors the pattern in `executeMissionFailed()` but uses "off" instead of "weekly".

### W4: Workflow-level mission-complete early exit — DONE

Added mission-complete check to the `params` job in `agentic-lib-workflow.yml`:
- Extended sparse-checkout to include `MISSION_COMPLETE.md` and `MISSION_FAILED.md`
- New `mission-check` step reads supervisor mode from config, checks for signal files
- New `mission-complete` output from params job
- Added `needs.params.outputs.mission-complete != 'true'` gate to: `behaviour-telemetry`, `telemetry`, `maintain`, `implementation-review`, `director`
- Downstream jobs (`supervisor`, `dev`, `review-features`, `fix-stuck`) are transitively skipped via their dependency chains
- `pr-cleanup` and `post-merge` remain ungated (cleanup should always run)

### W5: Deduplicate issue creation — DONE

Added open-issue dedup guard to `executeCreateIssue()` in `src/actions/agentic-step/tasks/supervise.js`:
- Before creating, fetches up to 20 open issues with `automated` label
- Compares first 30 chars of title (bidirectional — new title prefix in existing, or existing prefix in new)
- Skips creation with `skipped:duplicate-open-#N` if match found
- This runs before the existing closed-issue dedup guard
- Combined with the W10 (from Report 010) same-session dedup in `report_supervisor_plan`, there are now 3 layers of dedup: same-session, open issues, recently-closed issues

### W14: Post-merge director evaluation — DONE

Added a post-merge director check to the `post-merge` job in `agentic-lib-workflow.yml`:
- After dev and pr-cleanup complete, the post-merge job now runs the director (`task: "direct"`)
- Gated on: `mission-complete != 'true'` (from W4 params check), `dry-run != 'true'`, not SDK repo
- Steps: fetch log/state from log branch → setup-node → self-init → install agentic-step deps → run director → push logs
- The `direct()` function gathers its own fresh context from the GitHub API, so no telemetry job dependency needed
- Can fully declare mission-complete: writes `MISSION_COMPLETE.md`, updates state, disables schedule, dispatches bot
- **No refactoring of `direct.js` needed** — it's completely self-contained and designed for exactly this use case
- Eliminates the "wasted cycle" problem where the mission is complete but only detected on the next scheduled run

### W21: Change default profile to max — DONE

Two changes:

**1. Default profile changed to max**: Changed `#@dist` marker from `"recommended"` to `"max"`.

Truncation analysis — what actually reaches the LLM prompt vs what doesn't:

LLM-facing truncations (these limit what the model can reason about):
- `MAX_READ_CHARS = 20000` in copilot-session.js — per-file read cap. Most impactful: large source files get chopped. Conservative for gpt-5-mini's 264K token context (~900K chars).
- `initialTestOutput.substring(0, 4000)` — test output in mission-mode prompt
- File listing `.slice(0, 30)` — caps directory listings at 30 files
- Library index cap at 2000 chars
- Fix-code test output at 8000 chars
- Supervisor recent activity: last 40 lines from 5 log files

NOT in LLM prompts (workflow outputs / logging only — safe to ignore):
- `PROFILE_LIMITS.max = 60000` — workflow step output, NOT injected into LLM
- `agentMessage.substring(0, 500)` — return value, not session content
- `analysis/reasoning.substring()` — log entries and step outputs

With `infiniteSessions: true` and gpt-5-mini's 264K token context (~900K chars), all LLM-facing truncations are very conservative. The 20K per-file-read is the most likely to cost us — a 500-line source file gets truncated. W22 addresses this by making all limits profile-configurable.

Max profile values now distributed to consumer repos:
- `reasoning-effort: "high"` (gpt-5-mini supports this)
- `transformation-budget: 128`
- `max-issues: 30`, `max-feature-issues: 4`, `max-maintenance-issues: 2`
- `max-attempts-per-branch: 5`, `max-attempts-per-issue: 4`
- `features-limit: 8`, `library-limit: 64`

**2. Renamed `recommended` → `med`**: For consistency with `min` and `max`. Updated:
- `agentic-lib.toml`: `[profiles.recommended]` → `[profiles.med]`, comment updated
- `src/copilot/config.js`: fallback profile `"recommended"` → `"med"`
- 4 workflow files: profile choice options `recommended` → `med`
- `agentic-lib-workflow.yml`: `PROFILE_LIMITS` key and fallback
- 3 test files: assertions and fixtures updated
