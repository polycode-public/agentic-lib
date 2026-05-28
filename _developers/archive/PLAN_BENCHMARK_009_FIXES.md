# Plan: Benchmark Report 009 Fixes

**Source**: BENCHMARK_REPORT_009.md (in progress)
**Created**: 2026-03-14
**Status**: in progress

---

## Fixes Applied (Pre-Benchmark)

### W1: State file not persisted to logs branch (PR #1946 — MERGED)

**Problem**: `agentic-lib-state.toml` was never pushed to `agentic-lib-logs` branch. Three-part failure: missing git fetch, push-to-logs.sh didn't include state file, commit-if-changed accidentally staged it for main.

**Fix**: Added git fetch before git show (5 locations), added state file to push-to-logs calls (5 locations), added unstage in commit-if-changed.

**Result**: State persistence verified working — seq 15, cumulative transforms 5, tokens 1.45M.

### W2: Duration not in Mission Metrics (PR #1946 — MERGED)

**Fix**: Added `total-duration-ms` to state, Duration rows to metrics table.

**Result**: Duration (this task) and Duration (cumulative) appearing correctly in logs.

### W3: Issue title validation in github-tools.js (PR #1946 — MERGED)

**Fix**: `createIssue` SDK tool now rejects empty/generic titles.

**Result**: Validation deployed but bypassed — see W4.

### W4: actions/github-script@v7 → @v8 (PR #1946 — MERGED)

**Fix**: Updated 13 occurrences across 6 workflow files.

---

## Fixes Found During Benchmark 009

### W5: Supervisor executeCreateIssue falls back to "Untitled issue" (branch: claude/benchmark-009-fixes)

**Problem**: `supervise.js:582` has `params.title || "Untitled issue"` — a DIFFERENT code path from the SDK tool's `create_issue`. This bypasses the github-tools.js title validation entirely.

**Fix**: Changed to return `skipped:no-title` when no title is provided instead of falling back to "Untitled issue".

### W6: params.labels.split crash when labels is array (branch: claude/benchmark-009-fixes)

**Problem**: `supervise.js:583` calls `params.labels.split(",")` but the LLM sometimes passes labels as an array. Same issue at line 619 in `executeLabelIssue`.

**Fix**: Both locations now handle string, array, and missing labels via type check.

### W7: Init purge state template missing total-duration-ms (FIXED — branch: claude/benchmark-009-fixes)

**Problem**: The `agentic-lib-state.toml` written during init purge (in `bin/agentic-lib.js`) was missing the `total-duration-ms` counter added in W2. This caused a mismatch between the init template and the runtime state module.

**Fix**: Added `total-duration-ms = 0` to the init purge state template.

**Note**: The original W7 hypothesis (logs branch not being reset) was incorrect — the init purge DOES delete and recreate the logs branch. The S1 context contamination was caused by the LLM confusing missions, not by stale logs.

### W8: Maintain job commit push failure after rebase (FIXED — branch: claude/benchmark-009-fixes)

**Problem**: The maintain job's commit-if-changed fails when the dev job has already pushed to main during the same workflow run. After rebase drops the local commit (changes already on remote), the script still tries to push and fails after 3 retries.

**Evidence**: Maintain job failed in S1 iterations 1 and 2 with "Failed to push after 3 attempts".

**Fix**: After successful rebase, check if HEAD matches origin/REF. If so, the rebase dropped our commit (changes are already on remote) — treat as success, skip push.

**Files**: `src/actions/commit-if-changed/action.yml`

---

## Verification

- [x] State file accumulates correctly across iterations (verified in S1: seq 27, transforms 12)
- [ ] After W5/W6 merge: supervisor no longer creates "Untitled issue"
- [ ] After W7 fix: init purge state includes total-duration-ms
- [ ] After W8 fix: maintain job no longer fails when dev job pushes first
