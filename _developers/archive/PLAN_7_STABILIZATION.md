# PLAN_7_STABILIZATION.md — Post-Benchmark-008 Stabilization

Fixes derived from the 21st log entry observation and review of all workflow executions and log events after `agentic-lib-init #87` on repository0 (2026-03-14).

---

## Issues Found & Fixes Applied

### W1: State file not persisted to logs branch (CRITICAL)

**Symptom:** Cumulative totals (transforms, budget, tokens) all wrong. Sequence numbers always 001.

**Root cause (3-part failure):**
1. `actions/checkout` doesn't fetch `agentic-lib-logs` branch, so `git show origin/agentic-lib-logs:agentic-lib-state.toml` silently creates an empty file
2. `push-to-logs.sh` was called with `agent-log-*.md` only — never pushed `agentic-lib-state.toml`
3. `commit-if-changed` did `git add -A` without unstaging `agentic-lib-state.toml`, accidentally committing it to main

**Fix:**
- Added `git fetch origin "${LOG_BRANCH}" 2>/dev/null || true` BEFORE every `git show` that reads from the logs branch (5 locations in `agentic-lib-workflow.yml`)
- Added `agentic-lib-state.toml` to all 5 `push-to-logs.sh` calls
- Added `git reset HEAD -- agentic-lib-state.toml` to `commit-if-changed/action.yml`

**Files:** `agentic-lib-workflow.yml`, `commit-if-changed/action.yml`

### W2: Sequence always 001 (CRITICAL)

**Symptom:** All 30 log files show sequence 001 or 002, never incrementing.

**Root cause:** Same as W1 — state not persisted, so `log-sequence` always defaults to 0 and increments to 1.

**Fix:** Same as W1. Once state persists correctly, sequence will increment.

### W3: Duration not in Mission Metrics

**Symptom:** Log body has `**Duration:** 38s` in summary but Mission Metrics table has no Duration rows.

**Fix:**
- Added `total-duration-ms` counter to `state.js` default state
- `updateStateAfterTask()` now accepts `durationMs` and accumulates it
- `buildMissionMetrics()` now includes "Duration (this task)" and "Duration (cumulative)" rows
- `index.js` passes `durationMs` to both state update and task costs

**Files:** `state.js`, `telemetry.js`, `index.js`

### W4: Issue created without title

**Symptom:** Issue #2986 was created with title "Untitled issue" despite having a detailed body.

**Fix:** Added title validation to `createIssue` tool in `github-tools.js`. Rejects empty/generic titles (untitled, no title, new issue, etc.) with an error message prompting a specific title.

**Files:** `github-tools.js`

### W5: actions/github-script@v7 deprecation

**Symptom:** Node.js 20 deprecation warnings on every workflow run. Deadline: June 2, 2026.

**Fix:** Updated all `actions/github-script@v7` to `@v8` across all 6 workflow files (13 occurrences total).

**Files:** `agentic-lib-workflow.yml`, `agentic-lib-init.yml`, `agentic-lib-schedule.yml`, `agentic-lib-test.yml`, `agentic-lib-update.yml`, `release.yml`

---

## Remaining Observations (Not Fixed Here)

| Observation | Severity | Notes |
|-------------|----------|-------|
| Acceptance criteria stuck at 0/8 | MEDIUM | MISSION.md checkbox parsing may be correct but checkboxes aren't being ticked by transforms. Will self-correct once state persists and transforms can track progress. |
| Transform ran 0 test runs | MEDIUM | The transform task (358K tokens) wrote 6 files but never validated with tests. May need a guard or prompt change to require test-passing before PR creation. |
| Issues resolved target never met (1/2) | LOW | Pipeline only created+resolved 1 issue before mission-failed. Budget/cadence issue, not a code bug. |
| mission-failed declared despite code working | HIGH | Core issue is cumulative transforms showing 0 (state bug). With W1 fixed, this should not recur. |

---

## Verification

- 568 unit tests pass (2 new for duration tracking)
- 8 workflow YAML files validate cleanly
- No `actions/github-script@v7` references remain
- `agentic-lib-state.toml` excluded from main commits, included in logs branch pushes
