# Benchmark 009 — Hamming Distance Implementation Summary

## Scenario

**Mission**: 6-kyu-understand-hamming-distance
**Model**: gpt-5-mini (recommended profile)
**Trigger**: Manual `agentic-lib-update` dispatch at 2026-03-14T22:05:16Z
**Completed**: 2026-03-14T22:26:24Z (21 minutes wall-clock)
**Budget used**: 5 of 32 transformation cycles
**Total tokens**: 976,514
**Total agent duration**: 577s (~9.6 minutes of LLM time)

## Mission Statement

> A JavaScript library for computing Hamming distances — between equal-length strings (character positions that differ) and between non-negative integers (differing bits).

### Acceptance Criteria

- Hamming distance between `"karolin"` and `"kathrin"` is `3`
- Hamming distance between `""` and `""` is `0`
- Hamming distance between strings of different lengths throws `RangeError`
- Bit-level Hamming distance between `1` and `4` is `2`
- Bit-level Hamming distance between `0` and `0` is `0`
- All unit tests pass
- README documents usage with examples

## What Happened

### Phase 1: Update and Init Purge (22:05–22:08)

| Time | Event | Details |
|------|-------|---------|
| 22:05:16 | `agentic-lib-update` | Pulled agentic-lib@7.4.17 — commit `489dc75` |
| 22:05:44 | Update commit | Added SOURCES.md, 3 feature spec stubs (CORE_API, UNICODE_SUPPORT, VALIDATION_AND_TESTS) — commit `efbed16` |
| 22:06:39 | `agentic-lib-init purge` | Reset repository to seed state with hamming-distance mission. Deleted the 3 stubs from the update (they were premature — init purge overwrites everything). Set `agentic-lib.toml` to mission `6-kyu-understand-hamming-distance` — commit `8a98d4f` |

After init purge, the repository had only the seed skeleton: identity-only `src/lib/main.js` (49 lines), basic tests, and the hamming-distance `MISSION.md`.

### Phase 2: First Workflow Run (22:08–22:17)

Dispatched as `agentic-lib-workflow`. All 19 jobs succeeded.

| Seq | Task | Duration | Tokens | Outcome | What It Did |
|-----|------|----------|--------|---------|-------------|
| 001 | maintain-features | 64s | 61K | features-maintained | Created 4 feature specs: HAMMING_BITS, HAMMING_STRINGS, LIBRARY_API, VALIDATION_ERRORS |
| 001 | implementation-review | 88s | 169K | implementation-reviewed | Full gap analysis: all 8 elements NOT IMPLEMENTED. Identified missing functions, tests, README, website updates |
| 002 | maintain-library | 38s | 36K | sources-discovered | Populated SOURCES.md with authoritative URLs for Hamming distance, popcount, Unicode code points, JS bit/validation guidance |
| 003 | direct | 59s | 58K | directed | Evaluated gaps, concluded mission in-progress with 6 critical unimplemented features, provided prioritized next steps |
| 004 | supervise | 35s | 39K | supervised:2-actions | Created Issue #2996 "Implement Hamming distance library with tests, docs, and website updates" and dispatched a dev transform |
| 005 | transform | 124s | 410K | transformed | **The main implementation step.** 17 tool calls, 5 files written in 122s. Implemented `hammingString()` and `hammingBits()` in main.js, added unit tests, updated README, updated website demo, created PR #2997 which auto-merged |

Commit `c0c667cd0` (maintain): Added SOURCES.md + 4 feature specs (118 insertions)
Commit `775af14c3` (transform): The implementation — 7 files, 205 insertions, 100 deletions. PR #2997 merged automatically.

Post-commit tests all passed (unit + behaviour).

### Phase 3: Second Workflow Run (22:21–22:27)

Dispatched as `agentic-lib-workflow`. All jobs succeeded. Supervisor skipped (no action needed).

| Seq | Task | Duration | Tokens | Outcome | What It Did |
|-----|------|----------|--------|---------|-------------|
| 006 | maintain-features | 93s | 241K | features-maintained | Clarified and unified feature specs, created short verification plan |
| 006 | implementation-review | 99s | 193K | implementation-reviewed | Confirmed all 7 elements now implemented. Noted minor gap: no explicit supplementary Unicode tests |
| 007 | maintain-library | 111s | 69K | library-maintained | Wrote 7 technical library documents from SOURCES.md URLs |
| 008 | direct | 54s | 63K | **mission-complete** | Declared mission complete — all metrics MET |

Commit `3ac8e5eec` (maintain): 11 files — refined 4 feature specs + 7 new library docs (392 insertions)
Commit `715fddcfb` (mission-complete): Created `MISSION_COMPLETE.md` marker file

### Issue Lifecycle

| # | Title | Created | Closed | Lifecycle |
|---|-------|---------|--------|-----------|
| #2996 | Implement Hamming distance library with tests, docs, and website updates | 22:13:04 | 22:16:49 | 3m 45s |
| #2997 | fix: resolve issue #2996 (PR) | 22:16:35 | 22:16:48 | 13s |

## What Was Delivered

### Source Code (`src/lib/main.js` — 95 lines)

Two new exported functions added to the existing identity module:

- **`hammingString(a, b)`** — Computes Hamming distance between equal-length strings using `Array.from()` for correct Unicode code point iteration (not UTF-16 code units). Throws `TypeError` for non-strings, `RangeError` for unequal lengths.

- **`hammingBits(a, b)`** — Computes bit-level Hamming distance between non-negative integers using `BigInt` XOR and popcount loop. Accepts both `Number` (integer) and `BigInt`. Throws `TypeError` for non-integers, `RangeError` for negatives.

### Unit Tests (`tests/unit/main.test.js` — 10 tests)

- 3 existing identity tests preserved
- 4 new `hammingString` tests: acceptance example (karolin/kathrin=3), empty strings, unequal length RangeError, non-string TypeError
- 3 new `hammingBits` tests: acceptance example (1 vs 4=2), zero, non-integer TypeError, negative RangeError, BigInt equality

### Website (`src/web/index.html`)

Updated to import and demo both Hamming functions with live computed examples showing all four acceptance values.

### README

Rewritten with API documentation, usage examples, and project structure.

### Supporting Artefacts

- 4 feature specs in `features/` (HAMMING_BITS, HAMMING_STRINGS, LIBRARY_API, VALIDATION_ERRORS)
- 7 library documents in `library/` (reference material from SOURCES.md)
- SOURCES.md with authoritative URLs
- MISSION_COMPLETE.md marker

## Metrics at Completion

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Open issues | 0 | 0 | MET |
| Open PRs | 0 | 0 | MET |
| Issues resolved | 1 | >= 1 | MET |
| Source TODO count | 0 | <= 0 | MET |
| Cumulative transforms | 5 | >= 1 | MET |
| Budget used | 5/32 | < 32 | OK |
| Post-commit tests | PASS | PASS | MET |
| Mission complete | YES | — | DECLARED |

## Observations

1. **Fast completion**: 21 minutes wall-clock, 2 workflow runs, 5 transform cycles. The mission was tractable for gpt-5-mini at the recommended profile.

2. **Init purge cleaned up premature artefacts**: The update commit added 3 feature stubs (CORE_API, UNICODE_SUPPORT, VALIDATION_AND_TESTS) — presumably from a prior run. Init purge correctly removed them and reset to seed state.

3. **Single transform did all the work**: Step 005 (transform) used 410K tokens and 124s to implement both functions, tests, README, and website in one pass (17 tool calls, 0 test runs within the agent, 5 files written). Tests were validated post-merge by the workflow's post-commit-test job.

4. **Second run was verification only**: The second workflow run (22:21–22:27) did no code changes — it refined documentation and declared mission complete. The supervisor skipped because there were no gaps to address.

5. **Implementation review caught real gaps**: The first review (seq 001) correctly identified all 8 elements as NOT IMPLEMENTED. The second review (seq 006) confirmed all 7 were implemented, noting only that supplementary Unicode character tests were missing (a minor non-blocking gap).

6. **No failures**: All workflow jobs succeeded across both runs. No retries, no stuck states, no "Untitled issue" problems (the W5 fix from PLAN_BENCHMARK_009_FIXES is working).

7. **Acceptance criteria coverage**: All 7 acceptance criteria from MISSION.md are covered by unit tests and the website demo. The agent correctly mapped karolin/kathrin=3, empty strings=0, unequal length=RangeError, 1 vs 4=2, 0 vs 0=0 into both test assertions and live demo output.
