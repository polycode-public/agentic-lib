# Benchmark Report 001

**Date**: 2026-03-07
**Operator**: Claude Code (claude-opus-4-6)
**agentic-lib version**: 7.1.76
**Previous report**: none

---

## Scenarios Run

| ID | Mission | Model | Profile | Budget | Outcome |
|----|---------|-------|---------|--------|---------|
| S1 | fizz-buzz | gpt-5-mini | recommended | 32 | **MISSION COMPLETE** — 28 min, 2 transforms, 17 tests passing |

---

## Scenario S1: fizz-buzz / gpt-5-mini / recommended

### Configuration

| Parameter | Value |
|-----------|-------|
| Mission seed | fizz-buzz |
| Model | gpt-5-mini |
| Profile | recommended |
| Budget | 32 |
| Init run | [22802517544](https://github.com/xn-intenton-z2a/repository0/actions/runs/22802517544) |
| Init time | 16:14 UTC |
| Init mode | purge |
| Schedule | continuous (`*/10 * * * *` + manual dispatches) |

### Iterations

| # | Run ID | Time | Duration | Transform? | PR | Source Lines | Tests | What Happened |
|---|--------|------|----------|------------|-----|-------------|-------|---------------|
| 1 | [22802576618](https://github.com/xn-intenton-z2a/repository0/actions/runs/22802576618) | 16:18 | 6m42s | YES | [#2667](https://github.com/xn-intenton-z2a/repository0/pull/2667) | 70 | 19 (1 file) | Maintain updated docs. Supervisor created issue #2666. Dev implemented full FizzBuzz in single PR. |
| 2 | [22802640249](https://github.com/xn-intenton-z2a/repository0/actions/runs/22802640249) | 16:22 | 7m9s | NO | -- | 70 | 19 (1 file) | Maintain added 3 feature files + 7 library descriptors. Dev found no new issue to work on. FizzBuzz code preserved. |
| 3 | [22802875189](https://github.com/xn-intenton-z2a/repository0/actions/runs/22802875189) | 16:38 | ~6m | NO | -- | 70 | 19 | Maintain added more library entries. Code preserved. |
| 4 | [22802877806](https://github.com/xn-intenton-z2a/repository0/actions/runs/22802877806) | 16:38 | ~6m | YES | [#2669](https://github.com/xn-intenton-z2a/repository0/pull/2669) | 70 | 17 tests (3 files) | Transform #2 — fixed tests to ESM, added comprehensive tests. **MISSION_COMPLETE.md written.** |
| 5-8 | (4 concurrent runs) | 16:39-16:52 | ~6m each | NO | -- | 70 | 17 tests | Subsequent runs — no further transforms needed. Mission already complete. |

### Job Breakdown — Iteration 1 (22802576618)

| Job | Start | End | Duration | Result | Notes |
|-----|-------|-----|----------|--------|-------|
| params | 16:18:56 | 16:18:58 | 2s | success | |
| telemetry | 16:19:01 | 16:19:08 | 7s | success | |
| maintain | 16:19:01 | 16:20:38 | 1m37s | success | Updated SOURCES.md, intention.md |
| pr-cleanup | 16:19:01 | 16:19:05 | 4s | success | |
| supervisor | 16:20:41 | 16:21:18 | 37s | success | Created issue #2666 |
| fix-stuck | 16:21:20 | 16:21:40 | 20s | success | No-op |
| review-features | 16:21:20 | 16:21:43 | 23s | success | No-op |
| dev | 16:21:45 | 16:25:27 | 3m42s | success | PR #2667 created and auto-merged |
| post-merge | 16:25:30 | 16:25:38 | 8s | success | |

### Job Breakdown — Iteration 2 (22802640249)

| Job | Start | End | Duration | Result | Notes |
|-----|-------|-----|----------|--------|-------|
| params | 16:22:56 | 16:23:00 | 4s | success | |
| telemetry | 16:23:02 | 16:23:09 | 7s | success | |
| maintain | 16:23:02 | 16:28:43 | 5m41s | success | Added FIZZBUZZ_CORE/CLI/WEB.md + 7 library entries |
| pr-cleanup | 16:23:02 | 16:23:05 | 3s | success | |
| supervisor | 16:28:45 | 16:29:17 | 32s | success | No new issue needed |
| fix-stuck | 16:29:19 | 16:29:37 | 18s | success | No-op |
| review-features | 16:29:19 | 16:29:29 | 10s | success | No-op |
| dev | 16:29:31 | 16:29:53 | 22s | success | No issue to work — fast exit |
| post-merge | 16:29:55 | 16:30:02 | 7s | success | |

### Token Usage (from activity log)

| Entry | Tokens (total) | Tokens (in) | Tokens (out) | Duration |
|-------|---------------|-------------|-------------|----------|
| maintain-features (iter 1) | ~60k | ~48k | ~12k | ~90s |
| supervisor (iter 1) | not logged separately | | | |
| transform #2666 (iter 1) | not logged separately | | | |
| maintain-features (iter 2) | ~72k | ~60k | ~12k | ~290s |
| maintain-library (iter 2) | ~70k | ~56k | ~14k | ~224s |

### Budget Tracking

| After Iteration | Budget Used | Budget Remaining |
|-----------------|------------|-----------------|
| 1 | 3/32 | 29 |
| 2 | 4/32 | 28 |

Note: Budget increments by more than 1 per iteration because maintain-features, maintain-library,
and transform each count as separate transformations.

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `fizzBuzz(15)` returns correct 15-element array ending with "FizzBuzz" | PASS | `src/lib/main.js` — correct loop and `fizzBuzzSingle` delegation |
| `fizzBuzzSingle(3)` returns "Fizz" | PASS | `n % 3 === 0` check present |
| `fizzBuzzSingle(5)` returns "Buzz" | PASS | `n % 5 === 0` check present |
| `fizzBuzzSingle(15)` returns "FizzBuzz" | PASS | `n % 15 === 0` check first (correct precedence) |
| `fizzBuzzSingle(7)` returns "7" | PASS | `String(n)` fallback |
| `fizzBuzz(0)` returns `[]` | PASS | Explicit `n === 0` check |
| All unit tests pass | PASS | 17 tests across 3 files. Transform #2 (PR #2669) fixed CJS to ESM imports. |
| README documents usage with examples | PASS | README updated with 85-line diff |

### Issues

| Issue | State | Title |
|-------|-------|-------|
| [#2666](https://github.com/xn-intenton-z2a/repository0/issues/2666) | closed | Implement FizzBuzz library: fizzBuzz and fizzBuzzSingle with tests, README, and docs |

### Files Changed in Implementation (PR #2667)

| File | Status | Changes |
|------|--------|---------|
| src/lib/main.js | modified | +39 lines (fizzBuzz + fizzBuzzSingle with error handling) |
| tests/unit/fizzbuzz.test.js | added | 19 lines (7 test cases) |
| README.md | modified | +85 lines |
| docs/evidence/fizzbuzz-15.json | added | 21 lines |
| docs/examples/fizzbuzz-15.txt | added | 15 lines |
| docs/index.html | modified | +8 lines |
| docs/lib-browser.js | added | 6 lines |
| docs/lib-meta.js | added | 3 lines |
| docs/reports/usage.txt | added | 11 lines |
| src/web/index.html | modified | +8 lines |
| src/web/lib-browser.js | added | 6 lines |

### Scenario Summary

| Metric | Value |
|--------|-------|
| Total iterations observed | ~8 (2 observed in detail + 4 bot-triggered + 2 scheduled) |
| Transforms (code-changing PRs) | 2 (#2667 implementation, #2669 test fixes) |
| Convergence | Iteration 4 — MISSION_COMPLETE.md written |
| Final source lines | 70 |
| Final test files | 3 (main.test.js, fizzbuzz.test.js, web.test.js) |
| Final test count | 17 tests passing |
| Acceptance criteria | 8/8 PASS |
| Mission complete declared | **YES** — 2026-03-07T16:44:36Z |
| Time from init to working code | ~9 min (transform #1) |
| Time from init to mission complete | **~28 min** (16:16 to 16:44) |
| Time for dev job (code gen) | 3m42s (transform #1) |
| Budget consumed | ~6/32 (estimated) |

---

## Findings

### FINDING-1: Single-iteration implementation (POSITIVE)

The FizzBuzz mission was fully implemented in a single dev job (3m42s of code generation).
The gpt-5-mini model on the recommended profile produced correct `fizzBuzz` and `fizzBuzzSingle`
functions with proper error handling (TypeError, RangeError) on the first attempt. This validates
the pipeline's ability to go from empty template to working code in one cycle.

### FINDING-2: Test quality gap self-corrected (POSITIVE)

The first transform generated tests using CommonJS `require()` importing from `src/web/lib-browser`
rather than the main ESM exports. However, the pipeline self-corrected in transform #2 (PR #2669),
which updated the tests to ESM imports and added comprehensive coverage (17 tests across 3 files).
The supervisor detected the test quality issue and created issue #2668 to fix it.

### FINDING-3: Maintain step no longer wipes code (POSITIVE)

In earlier cycles (pre-7.1.72), the maintain step consistently reset `src/lib/main.js` back to the
template skeleton, creating a Sisyphean loop where transform added FizzBuzz and maintain removed it.
In this cycle (7.1.76), the first maintain after init purge (commit `40a30f55`) still wiped the
code (0 fizzBuzz references), but after the transform restored it (commit `0712b612`), the second
maintain (commit `3a3af637`) preserved the FizzBuzz code and added feature/library files instead.
This suggests the maintain handler no longer overwrites code that was added by a transform —
but the first maintain after a purge may still reset to template because no transform has run yet.

### FINDING-4: Mission-complete declaration works (POSITIVE)

After the second transform fixed the tests, the pipeline wrote `MISSION_COMPLETE.md` at
16:44:36Z with the reason: "All tests passed (17 tests across 3 files)". The mission-complete
detection triggered correctly once all acceptance criteria were met — it just needed the test
fixes from transform #2 before it could declare success. This invalidates the earlier concern.

### FINDING-5: Budget tracking works but counts aggressively (CONCERN)

The transformation budget consumed 4 units across 2 workflow runs. Each maintain-features,
maintain-library, and transform counts as a separate transformation. On the recommended profile
(budget=32), this means the pipeline could run ~16 iterations before exhausting its budget,
even if most iterations produce no code changes. This may need tuning.

### FINDING-6: Issue dedup not tested (NEUTRAL)

Only one FizzBuzz issue (#2666) was created in this cycle. In historical cycles, near-identical
issues were created repeatedly (25 FizzBuzz issues across all cycles). The current cycle hasn't
run enough iterations to test whether the dedup guard prevents redundant issue creation.

### FINDING-7: SPDX header removed (CONCERN)

The transform PR (#2667) removed the SPDX license header (`// SPDX-License-Identifier: MIT`)
from `src/lib/main.js`. The init purge places this header, but the LLM-generated code omitted it.
This is a minor compliance issue that the review step should catch.

---

## Comparison with Previous Reports

No previous reports exist. This is the baseline.

---

## Recommendations

1. **Fix test generation**: The agentic-step transform should generate tests that import from the
   primary ESM exports (`src/lib/main.js`) and use vitest's API, matching the project's test
   framework configuration.

2. **Implement mission-complete detection**: The supervisor should check acceptance criteria
   against the current code state and declare mission complete when all criteria are met,
   writing `MISSION_COMPLETE.md` and setting the schedule to off.

3. **Preserve SPDX headers**: The transform prompt or post-processing should preserve license
   headers that exist in the template. Alternatively, the review step should flag their removal.

4. **Re-run as S9 (regression)**: After addressing the above, re-run the fizz-buzz scenario
   to confirm the fixes work and establish a comparison baseline.

5. **Continue to S3 (hamming-distance)**: Run the next tier of missions to test multi-function
   implementation and more complex acceptance criteria.

6. **Monitor budget consumption rate**: Track whether the 4-per-2-iterations rate is typical
   or whether it stabilises as the codebase matures.
