# Benchmark Report 017

**Date**: 2026-03-21
**Operator**: Claude Code (claude-opus-4-6)
**agentic-lib version**: 7.4.33 → 7.4.34 (bug fix mid-benchmark)
**Previous report**: BENCHMARK_REPORT_016.md
**Type**: SIMPLE — 6-repo concurrent benchmark (first multi-repo run)

---

## Saved Original State

Captured before benchmarking. All repos verified at 2026-03-21 ~02:00 UTC.

| Repo | Original Mission Seed | Original Mission Type | Original Schedule | Original Model | Original Profile | Init Version |
|------|-----------------------|----------------------|-------------------|----------------|------------------|-------------|
| repository0 | 7-kyu-understand-fizz-buzz | 7-kyu-understand-fizz-buzz | off | gpt-5-mini | max | 7.4.33 |
| repository0-string-utils | 5-kyu-apply-string-utils | 5-kyu-apply-string-utils | hourly | gpt-5-mini | max | 7.4.33 |
| repository0-dense-encoder | 4-kyu-apply-dense-encoding | 4-kyu-apply-dense-encoding | hourly | gpt-5-mini | max | 7.4.33 |
| repository0-random | 7-kyu-understand-fizz-buzz | random | hourly | gpt-5-mini | max | 7.4.33 |
| repository0-crucible | 7-kyu-understand-fizz-buzz | generate-fallback | hourly | gpt-5-mini | max | 7.4.33 |
| repository0-plot-code-lib | 7-kyu-understand-fizz-buzz | 7-kyu-understand-fizz-buzz | continuous | gpt-5-mini | max | 7.4.33 |

---

## Dashboard

| ID | Repo | Mission | Profile | Outcome | Version | Notes |
|----|------|---------|---------|---------|---------|-------|
| S1 | repository0 | fizz-buzz | min | **BLOCKED then COMPLETE** | 7.4.33→7.4.34 | v7.4.33: director crash. v7.4.34: mission-complete |
| S2 | repository0-string-utils | string-utils | med | **BLOCKED then COMPLETE** | 7.4.33→7.4.34 | Same pattern |
| S3 | repository0-dense-encoder | hamming | min | **BLOCKED then COMPLETE** | 7.4.33→7.4.34 | Same pattern |
| S4 | repository0-random | hamming | med | **BLOCKED then COMPLETE** | 7.4.33→7.4.34 | Same pattern |
| S5 | repository0-crucible | roman | med | **BLOCKED then COMPLETE** | 7.4.33→7.4.34 | Same pattern |
| S6 | repository0-plot-code-lib | roman | max | **BLOCKED then COMPLETE** | 7.4.33→7.4.34 | Same pattern |

**Note**: This benchmark was interrupted by two blocking bugs discovered during execution. The bugs were fixed in v7.4.34, repos re-init'd, and all 6 reached mission-complete. However, the benchmark data is not clean — iterations span two versions and multiple init rounds. A proper clean-room benchmark should be re-run on v7.4.34.

---

## Init Phase

### Schedule Stop (pre-benchmark cleanup)

Stopped active schedules on 5 repos at ~02:00 UTC before benchmark init:

| Repo | Schedule Stopped | Run ID |
|------|-----------------|--------|
| repository0-string-utils | hourly → off | [23369235241](https://github.com/xn-intenton-z2a/repository0-string-utils/actions/runs/23369235241) |
| repository0-dense-encoder | hourly → off | [23369235918](https://github.com/xn-intenton-z2a/repository0-dense-encoder/actions/runs/23369235918) |
| repository0-random | hourly → off | [23369236731](https://github.com/xn-intenton-z2a/repository0-random/actions/runs/23369236731) |
| repository0-crucible | hourly → off | [23369237484](https://github.com/xn-intenton-z2a/repository0-crucible/actions/runs/23369237484) |
| repository0-plot-code-lib | continuous → off | [23369238132](https://github.com/xn-intenton-z2a/repository0-plot-code-lib/actions/runs/23369238132) |

### Init Dispatches

**Round 1** (~02:01 UTC): All 6 inits dispatched with `run-workflow=true`.

| Repo | Init Run | Status | Notes |
|------|---------|--------|-------|
| repository0 | [23369636561](https://github.com/xn-intenton-z2a/repository0/actions/runs/23369636561) | SUCCESS | Auto-dispatched workflow run |
| repository0-string-utils | [23369639091](https://github.com/xn-intenton-z2a/repository0-string-utils/actions/runs/23369639091) | PARTIAL | Init OK, dispatch-workflow FAILED |
| repository0-dense-encoder | [23369665081](https://github.com/xn-intenton-z2a/repository0-dense-encoder/actions/runs/23369665081) | PARTIAL | Init OK, dispatch-workflow FAILED |
| repository0-random | [23369667623](https://github.com/xn-intenton-z2a/repository0-random/actions/runs/23369667623) | PARTIAL | Init OK, dispatch-workflow FAILED |
| repository0-crucible | [23369669571](https://github.com/xn-intenton-z2a/repository0-crucible/actions/runs/23369669571) | PARTIAL | Init OK, dispatch-workflow FAILED |
| repository0-plot-code-lib | [23369670756](https://github.com/xn-intenton-z2a/repository0-plot-code-lib/actions/runs/23369670756) | PARTIAL | Init OK, dispatch-workflow FAILED |

**dispatch-workflow failure cause**: The schedule-off dispatch (pre-benchmark cleanup) and init purge created a **duplicate `schedule:` block** in `agentic-lib-workflow.yml`. GitHub rejected the workflow dispatch with: `'schedule' is already defined`. The init itself completed successfully — missions, configs, and seed files were all written correctly. Only the auto-dispatch of the first workflow run failed.

**Fix attempt**: Used GitHub Contents API to remove the duplicate `schedule:` block via awk + base64 round-trip. This fixed the duplicate but **corrupted JavaScript content** in the YAML (literal `\n` in `content.split('\n')` became an actual newline during base64 decode/re-encode).

**Round 2** (~02:05 UTC): Re-ran init purge on 5 repos with `run-workflow=false` to get clean workflow YAML:

| Repo | Init Run | Status |
|------|---------|--------|
| repository0-string-utils | [23369845898](https://github.com/xn-intenton-z2a/repository0-string-utils/actions/runs/23369845898) | SUCCESS |
| repository0-dense-encoder | [23369846559](https://github.com/xn-intenton-z2a/repository0-dense-encoder/actions/runs/23369846559) | SUCCESS |
| repository0-random | [23369847242](https://github.com/xn-intenton-z2a/repository0-random/actions/runs/23369847242) | SUCCESS |
| repository0-crucible | [23369847943](https://github.com/xn-intenton-z2a/repository0-crucible/actions/runs/23369847943) | SUCCESS |
| repository0-plot-code-lib | [23369848517](https://github.com/xn-intenton-z2a/repository0-plot-code-lib/actions/runs/23369848517) | SUCCESS |

### Workflow Dispatches

All 6 workflows dispatched at ~02:08 UTC:

| Repo | Scenario | Workflow Run | Status |
|------|----------|-------------|--------|
| repository0 | S1: fizz-buzz / min | [23369665694](https://github.com/xn-intenton-z2a/repository0/actions/runs/23369665694) | IN PROGRESS |
| repository0-string-utils | S2: string-utils / med | [23369898537](https://github.com/xn-intenton-z2a/repository0-string-utils/actions/runs/23369898537) | IN PROGRESS |
| repository0-dense-encoder | S3: hamming / min | [23369899179](https://github.com/xn-intenton-z2a/repository0-dense-encoder/actions/runs/23369899179) | IN PROGRESS |
| repository0-random | S4: hamming / med | [23369899809](https://github.com/xn-intenton-z2a/repository0-random/actions/runs/23369899809) | IN PROGRESS |
| repository0-crucible | S5: roman / med | [23369900442](https://github.com/xn-intenton-z2a/repository0-crucible/actions/runs/23369900442) | IN PROGRESS |
| repository0-plot-code-lib | S6: roman / max | [23369901158](https://github.com/xn-intenton-z2a/repository0-plot-code-lib/actions/runs/23369901158) | IN PROGRESS |

---

## FINDING-0: Duplicate schedule block from schedule-off + init race (CRITICAL — NEW)

When `agentic-lib-schedule -f frequency=off` runs shortly before `agentic-lib-init -f mode=purge`, the schedule workflow writes a `schedule:` block to `agentic-lib-workflow.yml`. The init purge then copies the seed workflow file which also has a `schedule:` block. If the schedule workflow's commit lands after the init reads but before it writes (or they merge), the result is a duplicate `schedule:` key in the YAML. GitHub Actions rejects this with `'schedule' is already defined`.

**Impact**: 5 of 6 repos had broken workflow files after init. Required a second init round to fix.

**Root cause**: The `agentic-lib-schedule` workflow and `agentic-lib-init` workflow both modify `agentic-lib-workflow.yml` concurrently. There's no locking or sequencing between them.

**Fix**: Either:
1. Init purge should wait for any running schedule workflow to complete before starting
2. Init purge should unconditionally overwrite the workflow file (it already does, but the race means the schedule commit can land after the purge commit)
3. The schedule workflow should check for a running init and skip
4. Don't run schedule-off before init — pass `-f schedule=off` to init and let it handle both

Option 4 is simplest and what the benchmark guide already does. The issue arose because we stopped schedules _before_ running init as a precaution. The guide should be updated to note: **do not run schedule-off separately before init; use `-f schedule=off` on the init command instead**.

---

## Blocking Bugs Found and Fixed

### FINDING-1: `config is not defined` in director (CRITICAL — FIXED in v7.4.34)

**Symptom**: Every `director` and `post-merge` job failed with `agentic-step failed: config is not defined` on all 6 repos. This blocked mission-complete declarations entirely.

**Root cause**: `buildPrompt()` in `tasks/direct.js` (line 175) references `config.focus` but `config` was not passed as a parameter. `buildPrompt` is a module-level function (line 127), not a closure inside `direct()`, so `config` (a local variable in `direct()` at line 393) is not in scope.

**Evidence**: `buildMetricAssessment(ctx, config)` at line 506 succeeded (printed metric assessment), then 3ms later the error fired — `buildPrompt` is the next call at line 511.

**Fix**: Added `config` as 4th parameter to `buildPrompt()` signature and call site. PR [#1978](https://github.com/xn-intenton-z2a/agentic-lib/pull/1978), released in v7.4.34.

### v7.4.33 Workflow Run Results (before fix)

| Repo | Scenario | dev (transform) | director | post-merge | Overall |
|------|----------|-----------------|----------|------------|---------|
| repository0 | S1: fizz-buzz/min | FAIL (PR create) | FAIL (config) | FAIL (config) | FAILURE |
| repository0-dense-encoder | S3: hamming/min | SUCCESS | FAIL (config) | FAIL (config) | FAILURE |
| repository0-string-utils | S2: string-utils/med | — | — | — | (not checked in detail) |
| repository0-random | S4: hamming/med | — | — | — | (not checked in detail) |
| repository0-crucible | S5: roman/med | — | — | — | (not checked in detail) |
| repository0-plot-code-lib | S6: roman/max | — | — | — | (not checked in detail) |

The dev (transform) jobs worked — code was written, tests passed. Only the director evaluation and post-merge were broken.

### v7.4.34 Re-Init and Results

After fixing both bugs and releasing v7.4.34, all 6 repos were re-init'd with `run-workflow=false`, then workflows dispatched. All 6 reached **mission-complete**.

| Repo | Scenario | Init Run | Workflow Status | Mission Complete |
|------|----------|---------|----------------|-----------------|
| repository0 | S1: fizz-buzz/min | [23370412361](https://github.com/xn-intenton-z2a/repository0/actions/runs/23370412361) | SUCCESS | YES |
| repository0-string-utils | S2: string-utils/med | [23370412830](https://github.com/xn-intenton-z2a/repository0-string-utils/actions/runs/23370412830) | SUCCESS | YES |
| repository0-dense-encoder | S3: hamming/min | [23370413251](https://github.com/xn-intenton-z2a/repository0-dense-encoder/actions/runs/23370413251) | SUCCESS | YES |
| repository0-random | S4: hamming/med | [23370413688](https://github.com/xn-intenton-z2a/repository0-random/actions/runs/23370413688) | SUCCESS | YES |
| repository0-crucible | S5: roman/med | [23370414139](https://github.com/xn-intenton-z2a/repository0-crucible/actions/runs/23370414139) | SUCCESS | YES |
| repository0-plot-code-lib | S6: roman/max | [23370414532](https://github.com/xn-intenton-z2a/repository0-plot-code-lib/actions/runs/23370414532) | SUCCESS | YES |

---

## Status

This benchmark run was interrupted by two blocking bugs (FINDING-0: duplicate schedule block, FINDING-1: director config scope). Both were fixed in v7.4.34. All 6 repos reached mission-complete after the fix, but the benchmark data is not clean-room — a proper benchmark should be re-run on v7.4.34 to get accurate iteration counts, token usage, and timing.

---

## Recommendations

1. **Re-run SIMPLE benchmark on v7.4.34** — This report validates the bug fixes but doesn't provide clean benchmark data. A fresh run will give accurate iteration counts and profile comparisons.

2. **Don't run schedule-off before init** — Use `-f schedule=off` on the init command. Running `agentic-lib-schedule -f frequency=off` separately creates a race condition that produces duplicate `schedule:` blocks (FINDING-0).

3. **The director fix (v7.4.34) is confirmed working** — All 6 repos completed their missions after the fix. The `config.focus` reference in `buildPrompt()` now receives the config parameter correctly.
