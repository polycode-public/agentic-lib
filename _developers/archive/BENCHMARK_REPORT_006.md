# Benchmark Report 006

**Date**: 2026-03-10
**Operator**: Claude Code (claude-opus-4-6)
**agentic-lib version**: 7.2.1 (on npm)
**Previous report**: BENCHMARK_REPORT_005.md (fizz-buzz / gpt-5-mini / min + recommended)

---

## Scenarios Run

| ID | Mission | Model | Profile | Budget | Outcome |
|----|---------|-------|---------|--------|---------|
| S3 | hamming-distance | gpt-5-mini | recommended | 32 | **mission-complete** |

---

## Scenario S3: hamming-distance / gpt-5-mini / recommended

### Configuration

| Parameter | Value |
|-----------|-------|
| Mission seed | hamming-distance |
| Model | gpt-5-mini |
| Profile | recommended |
| Budget | 32 |
| Init run | [22883939237](https://github.com/xn-intenton-z2a/repository0/actions/runs/22883939237) |
| Init time | 02:14 UTC |
| Schedule | off |

### Iterations

| # | Run ID | Time | Duration | Transform? | PR | Source Lines | Tests | What Happened |
|---|--------|------|----------|------------|-----|-------------|-------|---------------|
| 1 | [22883962547](https://github.com/xn-intenton-z2a/repository0/actions/runs/22883962547) | 02:15 | 7m25s | **YES** | [#2788](https://github.com/xn-intenton-z2a/repository0/pull/2788) | 93 | seed only | Supervisor created #2787. Dev transformed: `hammingDistance()` and `hammingDistanceBits()` fully implemented with Unicode support via `Array.from()`, BigInt handling, input validation (TypeError/RangeError). README updated with API docs and examples. Post-commit tests pass. |
| 2 | [22884146677](https://github.com/xn-intenton-z2a/repository0/actions/runs/22884146677) | 02:23 | 6m45s | NO | -- | 93 | seed only | Supervisor chose `nop`. Dev: "No ready issues found". Maintain-only cycle. |
| 3 | [22884312872](https://github.com/xn-intenton-z2a/repository0/actions/runs/22884312872) | 02:30 | 10m26s | **YES** | [#2790](https://github.com/xn-intenton-z2a/repository0/pull/2790) | 95 | seed only | Supervisor created #2789 "Implement Hamming distance library". Dev transformed — minor refinements (comments, documentation). Post-commit tests pass. |
| 4 | [22884569666](https://github.com/xn-intenton-z2a/repository0/actions/runs/22884569666) | 02:41 | 7m26s | NO | -- | 95 | seed only | Supervisor declared **mission-complete**: "All acceptance criteria implemented". MISSION_COMPLETE.md committed. Schedule already off — no dispatch needed. |

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `hammingDistance("karolin", "kathrin")` returns `3` | **PASS** | main.js:48-52: `Array.from()` iteration, character comparison |
| `hammingDistance("", "")` returns `0` | **PASS** | main.js: empty arrays → 0 differences |
| `hammingDistance("a", "bb")` throws `RangeError` | **PASS** | main.js:46: `if (pa.length !== pb.length) throw new RangeError(...)` |
| `hammingDistanceBits(1, 4)` returns `2` | **PASS** | main.js:82-87: BigInt XOR + Kernighan bit-count |
| `hammingDistanceBits(0, 0)` returns `0` | **PASS** | main.js: `0n ^ 0n = 0n`, while loop doesn't execute → 0 |
| All unit tests pass | **PASS** | Post-commit test job succeeded on all 4 iterations |
| README documents usage with examples | **PASS** | README.md: API docs, code examples, `hammingDistance('karolin','kathrin')` example |

### Issues

| Issue | State | Title |
|-------|-------|-------|
| [#2787](https://github.com/xn-intenton-z2a/repository0/issues/2787) | closed | feature: implement hamming-distance library (hammingDistance, hammingDistanceBits) |
| [#2789](https://github.com/xn-intenton-z2a/repository0/issues/2789) | closed | Implement Hamming distance library (hammingDistance, hammingDistanceBits) |

### Scenario Summary

| Metric | Value |
|--------|-------|
| Total iterations | 4 |
| Transforms | 2 (iterations 1 and 3) |
| Convergence | Iteration 4 — mission-complete declared |
| Final source lines | 95 |
| Final test count | seed tests only (main.test.js, web.test.js) |
| Acceptance criteria | **7/7 PASS** |
| Mission complete | **YES** |
| Time (init to outcome) | ~34 min (4 iterations) |
| Time (init to working code) | ~7 min (iteration 1) |

---

## Findings

### FINDING-1: Hamming distance implemented correctly on first transform (POSITIVE)

The first iteration produced both `hammingDistance()` and `hammingDistanceBits()` with correct implementations:
- Unicode-aware string comparison using `Array.from()` (code points, not UTF-16 code units)
- BigInt support for arbitrarily large integers
- Kernighan's bit-counting algorithm (`xor &= xor - 1n`)
- Input validation with appropriate TypeError/RangeError

This is a Tier 2 mission (expected 2-4 transforms) and was functionally complete after just 1 transform.

### FINDING-2: Mission complete declared on iteration 4 — fast convergence (POSITIVE)

The supervisor declared mission-complete after 4 iterations (2 transforms, 1 nop, 1 mission-complete). Total time from init to mission-complete: ~34 minutes. This is the fastest mission-complete for a Tier 2 mission.

The nop on iteration 2 shows the supervisor correctly assessed there was nothing to do. Iteration 3's transform made minor refinements. Iteration 4 reviewed the final state and declared completion.

### FINDING-3: No hamming-specific test file created (CONCERN)

Despite the MISSION.md requiring "comprehensive unit tests covering normal cases, edge cases, and error cases", no dedicated hamming distance test file was created. Only the seed test files (main.test.js, web.test.js) exist. The seed main.test.js tests basic module identity (name, version) but not the hamming functions.

The acceptance criterion "All unit tests pass" is technically PASS (the existing tests pass), but the spirit of the requirement — comprehensive testing of hamming functions — is not met. The supervisor declared mission-complete without verifying test coverage of the specific functions.

### FINDING-4: Supervisor created near-duplicate issue on iteration 3 (MINOR CONCERN)

Issue #2787 ("feature: implement hamming-distance library") was created by iteration 1 and closed by its PR. Issue #2789 ("Implement Hamming distance library") was created by iteration 3 — essentially the same title and scope. The dedup guard did not block this because #2787 was already closed with a merged PR, and the guard checks recently-closed issues with similarity matching.

This is a borderline case — the dedup logic correctly allowed it (the first issue was resolved), but the supervisor could have been smarter about recognizing the implementation was already present and creating a more targeted refinement issue instead.

### FINDING-5: Schedule-already-off handling works correctly (POSITIVE)

On mission-complete, the supervisor correctly detected that the schedule was already "off" and did not dispatch a redundant schedule update:
```
Schedule already "off" — not changing on mission-complete
```
This validates the W13 fix from Report 005's addendum.

### FINDING-6: Profile=recommended confirmed in logs (POSITIVE)

All iterations show correct profile in tuning logs:
```
[copilot] Creating client (model=gpt-5-mini, promptLen=28313, writablePaths=0, tuning=medium, profile=recommended)
[tuning] reasoningEffort=medium profile=recommended model=gpt-5-mini
```
The profile=unknown bug (Reports 004) remains fixed.

### FINDING-7: Recommended profile avoids code/test inconsistency (POSITIVE — contrast with Report 005)

Unlike Report 005 (min profile) where the LLM produced internally inconsistent code and tests over 5 transforms, the recommended profile maintained consistency across both transforms. No test failures were observed in any iteration. This confirms Report 005's conclusion that the recommended profile's larger context (8000 source chars, 5000 test chars) prevents the code/test mismatch problem.

---

## Comparison with Previous Reports

| Metric | Report 004 (fizz-buzz/rec) | Report 005 S1 (fizz-buzz/min) | Report 005 Addendum (fizz-buzz/rec) | **This Report (hamming/rec)** |
|--------|---------------------------|-------------------------------|--------------------------------------|-------------------------------|
| agentic-lib version | 7.1.97 | 7.1.100 | 7.1.102 + W9-W14 | **7.2.1** |
| Mission | fizz-buzz | fizz-buzz | fizz-buzz | **hamming-distance** |
| Tier | 1 (trivial) | 1 (trivial) | 1 (trivial) | **2 (simple)** |
| Profile | recommended | min | recommended | **recommended** |
| Time to working code | ~19 min | ~4 min | ~9 min | **~7 min** |
| Total iterations | 5 | 6 | 22 | **4** |
| Transforms | 1 | 5 | 22 | **2** |
| Mission complete | YES (40 min) | NO | YES (~2 hrs) | **YES (34 min)** |
| Acceptance criteria | 8/8 | 7/8 | 8/8 | **7/7** |
| Test failures | None | 3 of 7 | None | **None** |
| Dedicated test file | YES | YES (with failures) | YES | **NO** |
| Issues created | 5 | 5 | Multiple | **2** |

**Key observations:**

1. **Tier 2 mission completed efficiently** — 4 iterations, 2 transforms, ~34 minutes. Faster than most fizz-buzz benchmarks despite being a harder mission. The hamming-distance implementation (Unicode, BigInt, validation) is more complex than fizz-buzz but was produced correctly in a single transform.

2. **Fewer iterations = less churn** — Only 2 issues created vs 5+ in previous reports. The supervisor correctly identified work completion earlier, avoiding unnecessary refinement cycles.

3. **v7.2.1 improvements visible** — Clean mission-complete detection, no profile bugs, no schedule dispatch errors. The pipeline is more mature than in earlier reports.

4. **Missing dedicated tests** — The one gap: no hamming-specific test file. The supervisor declared mission-complete based on the code satisfying acceptance criteria but did not verify that dedicated tests existed. This suggests the mission-complete evaluation weights code correctness over test coverage.

---

## Recommendations

1. **Add test coverage check to mission-complete criteria** (MEDIUM) — The supervisor should verify that the mission's functions have dedicated test coverage before declaring mission-complete. Check that test files reference the exported function names, not just that generic seed tests pass.

2. **Run S4 next** (LOW) — Scenario S4 (hamming-distance / claude-sonnet-4 / recommended) would provide a direct model comparison. Does claude-sonnet-4 produce dedicated tests where gpt-5-mini did not?

3. **Test Tier 3+ missions** (MEDIUM) — With S3 completing so efficiently, test S6 (string-utils) or S7 (cron-engine) to see how the pipeline handles multi-function and algorithmic complexity.

4. **Investigate nop → create-issue → nop pattern** (LOW) — Iteration 2 was nop, iteration 3 created a near-duplicate issue. The supervisor may benefit from a "refinement mode" that creates targeted issues (e.g., "add unit tests for hammingDistance") rather than re-scoping the entire mission.
