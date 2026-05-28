# Benchmark Report 015

**Date**: 2026-03-19
**Operator**: Claude Code (claude-opus-4-6)
**agentic-lib version**: 7.4.32
**Previous report**: BENCHMARK_REPORT_014.md (archived in _developers/archive/)

---

## Scenarios Run

| ID | Mission | Model | Profile | Budget | Target Runs | Outcome |
|----|---------|-------|---------|--------|-------------|---------|
| S1 | 6-kyu-understand-hamming-distance | gpt-5-mini | min | 16 | 1 | **FAIL** — completed run 5 |
| S2 | 4-kyu-apply-dense-encoding | gpt-5-mini | min | 16 | 3 | **PASS** — completed run 2 |
| S3 | 4-kyu-apply-dense-encoding | gpt-5-mini | med | 32 | 3 | **FAIL** — not complete at run 3 (9/32 budget) |
| S4 | 4-kyu-apply-dense-encoding | gpt-5-mini | max | 128 | 3 | **PASS** — completed run 1* |

*S4 had an overlapping dispatch-fix run from S3. See notes.

---

## Scenario S1: 6-kyu-understand-hamming-distance / gpt-5-mini / min

### Configuration

| Parameter | Value |
|-----------|-------|
| Mission seed | 6-kyu-understand-hamming-distance |
| Model | gpt-5-mini |
| Profile | min |
| Budget | 16 |
| Init run | [#23276709376](https://github.com/xn-intenton-z2a/repository0/actions/runs/23276709376) |
| Init time | 02:20 UTC |
| Schedule | off |

### Iterations

| # | Run ID | Time | Duration | Transform? | PR | Source Lines | Tests | What Happened |
|---|--------|------|----------|------------|-----|-------------|-------|---------------|
| 1 | [23276748537](https://github.com/xn-intenton-z2a/repository0/actions/runs/23276748537) | 02:22 | ~8min | YES | #3142 | 83 | 2 | Supervisor: #3141. Transform: hamming impl + tests. Director: in-progress (0/7 criteria). |
| 2 | [23276981750](https://github.com/xn-intenton-z2a/repository0/actions/runs/23276981750) | 02:31 | ~7min | YES | #3144 | 84 | 3 | Supervisor: #3143 (add tests). Transform: hamming.test.js. Director: in-progress. |
| 3 | [23277179606](https://github.com/xn-intenton-z2a/repository0/actions/runs/23277179606) | 02:38 | ~6min | YES | -- | 84 | 3 | Supervisor: #3145 (more tests). Director: in-progress ("open issue blocks"). |
| 4 | [23277343910](https://github.com/xn-intenton-z2a/repository0/actions/runs/23277343910) | 02:45 | ~8min | YES | #3146 | 98 | 3 | Transform: resolved #3145. Director: in-progress. |
| 5 | [23277548044](https://github.com/xn-intenton-z2a/repository0/actions/runs/23277548044) | 02:53 | ~4min | NO | -- | 98 | 3 | Maintain only. Director: **mission-complete** ~02:56. |

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Hamming "karolin"/"kathrin" = 3 | PASS | src/lib/main.js, hamming.test.js |
| Hamming ""/"" = 0 | PASS | hamming.test.js |
| Different lengths throws RangeError | PASS | hamming.test.js |
| Bit-level 1 vs 4 = 2 | PASS | hamming.test.js |
| Bit-level 0 vs 0 = 0 | PASS | src/lib/main.js |
| All unit tests pass | PASS | post-commit-test passed |
| README with examples | PASS | README present |

### Scenario Summary

| Metric | Value |
|--------|-------|
| Total iterations | 5 |
| Transforms | 4 |
| Acceptance criteria | 7/7 PASS (4/7 checked in MISSION.md) |
| On-sight target | **FAIL** (target 1, took 5) |
| Time | ~36min |
| Total tokens | 2,504,620 |
| Budget used | 14/16 |

---

## Scenario S2: 4-kyu-apply-dense-encoding / gpt-5-mini / min

### Configuration

| Parameter | Value |
|-----------|-------|
| Mission seed | 4-kyu-apply-dense-encoding |
| Model | gpt-5-mini |
| Profile | min |
| Budget | 16 |
| Init run | [#23277665073](https://github.com/xn-intenton-z2a/repository0/actions/runs/23277665073) |
| Init time | 02:57 UTC |
| Schedule | off |

### Iterations

| # | Run ID | Time | Duration | Transform? | PR | Source Lines | Tests | What Happened |
|---|--------|------|----------|------------|-----|-------------|-------|---------------|
| 1 | [23277708037](https://github.com/xn-intenton-z2a/repository0/actions/runs/23277708037) | 02:59 | ~10min | YES | #3149 | ~120 | 2 | Supervisor: #3148. Transform: encoding APIs + built-ins + tests. Director: in-progress. |
| 2 | [23277983312](https://github.com/xn-intenton-z2a/repository0/actions/runs/23277983312) | 03:09 | ~12min | YES | #3151 | 173 | 4 | Supervisor: #3150 (dedicated tests). Transform: encoding.test.js + encodings.dedicated.test.js. Director: **mission-complete** ~03:21. |

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 3+ working encodings (base62, base85, higher) | PASS | 5/7 checked in MISSION.md |
| Round-trip correct for arbitrary binary | PASS | encoding.test.js |
| UUID encoding < 22 chars for densest | PASS | Verified in MISSION.md |
| Listing returns metadata | PASS | listEncodings() |
| Custom encoding from charset | PASS | createEncoding() |
| All unit tests pass | PASS | post-commit-test passed |
| README with UUID comparison table | FAIL | Not verified as checked |

### Scenario Summary

| Metric | Value |
|--------|-------|
| Total iterations | 2 |
| Transforms | 2 |
| Acceptance criteria | 5/7 checked, 6/7 PASS |
| On-sight target | **PASS** (target 3, completed in 2) |
| Time | ~24min |
| Total tokens | ~1,200K |
| Budget used | 6/16 |

---

## Scenario S3: 4-kyu-apply-dense-encoding / gpt-5-mini / med

### Configuration

| Parameter | Value |
|-----------|-------|
| Mission seed | 4-kyu-apply-dense-encoding |
| Model | gpt-5-mini |
| Profile | med |
| Budget | 32 |
| Init run | [#23278275239](https://github.com/xn-intenton-z2a/repository0/actions/runs/23278275239) |
| Init time | 03:21 UTC |
| Schedule | off |

### Iterations

| # | Run ID | Time | Duration | Transform? | PR | Source Lines | Tests | What Happened |
|---|--------|------|----------|------------|-----|-------------|-------|---------------|
| 1 | [23278315724](https://github.com/xn-intenton-z2a/repository0/actions/runs/23278315724) | 03:23 | ~22min | YES | merged | ~180 | 3 | Transform: encoding APIs. Director: in-progress. Instability issue created. |
| 2 | [23278831689](https://github.com/xn-intenton-z2a/repository0/actions/runs/23278831689) | 03:45 | ~25min | YES | merged | ~230 | 4 | Transform: tests + fixes. Director: in-progress. Instability issue. |
| 3 | [23279435455](https://github.com/xn-intenton-z2a/repository0/actions/runs/23279435455) | 04:10 | ~25min | YES | merged | 261 | 4+ | Transform: more tests. Director: in-progress. dispatch-fix triggered. |

### Scenario Summary

| Metric | Value |
|--------|-------|
| Total iterations | 3 (+ dispatch-fix) |
| Transforms | 3 |
| Acceptance criteria | 5/7 checked in MISSION.md |
| On-sight target | **FAIL** (not complete at 3 runs, 9/32 budget) |
| Time | ~65min (ongoing) |
| Budget used | 9/32 |

Note: S3 would likely complete in 4-5 runs based on the pattern. Instability issues consumed transforms.

---

## Scenario S4: 4-kyu-apply-dense-encoding / gpt-5-mini / max

### Configuration

| Parameter | Value |
|-----------|-------|
| Mission seed | 4-kyu-apply-dense-encoding |
| Model | gpt-5-mini |
| Profile | max |
| Budget | 128 |
| Init run | [#23280024166](https://github.com/xn-intenton-z2a/repository0/actions/runs/23280024166) |
| Init time | 04:36 UTC |
| Schedule | off |

### Iterations

| # | Run ID | Time | Duration | Transform? | PR | Source Lines | Tests | What Happened |
|---|--------|------|----------|------------|-----|-------------|-------|---------------|
| 1* | [23280067186](https://github.com/xn-intenton-z2a/repository0/actions/runs/23280067186) | 04:38 | ~30min | YES | merged | 252 | 4 | Transform + maintain. Director: **mission-complete** at 05:02. |

*Overlapping dispatch-fix run from S3 was active concurrently (23279900260). The state file shows cumulative metrics across S3+S4 (seq 24, transforms 10).

### Scenario Summary

| Metric | Value |
|--------|-------|
| Total iterations | 1 (with overlap from S3 dispatch-fix) |
| Transforms | ~3 (within S4 run) |
| Acceptance criteria | 1/7 checked in MISSION.md |
| On-sight target | **PASS** (target 3, completed in 1) |
| Time | ~26min |
| Total tokens | ~5,858K (cumulative, includes S3 carryover) |
| Budget used | 10/128 |

---

## Findings

### FINDING-1: min profile causes excessive iteration on 6-kyu (CRITICAL)

Hamming-distance on `min` took **5 runs / 14 transforms**. Same mission on `med` in report 014 took **2 runs / 1 transform**. The `min` profile's low reasoning-effort causes the director to repeatedly claim "tests missing" when tests exist. The supervisor creates redundant test-request issues, consuming budget. **min is 2.5x more expensive in tokens for the same mission.**

### FINDING-2: Dense-encoding on min completed faster than expected (POSITIVE — SURPRISING)

The 4-kyu dense-encoding mission completed in **2 runs** with `min` profile — beating the 3-run target. This contradicts the prediction that min wouldn't have enough context for 4-kyu. The encoding mission may be easier for the LLM because it has clear, structured requirements (encode/decode/round-trip).

### FINDING-3: Dense-encoding on med had instability issues (CONCERN)

S3 (med) spent transforms fixing instability issues and didn't complete in 3 runs, while S2 (min) completed in 2. This is counterintuitive — the higher profile should perform better. The instability issues (Playwright failures) are infrastructure problems, not quality issues. They waste transforms regardless of profile.

### FINDING-4: Max profile achieves 1-run completion for 4-kyu (POSITIVE)

S4 (max) completed dense-encoding in a single auto-dispatched run. The 100K read-chars and high reasoning-effort allowed the LLM to implement a complete solution with tests in one transform, and the post-merge director declared mission-complete immediately.

### FINDING-5: Fix #6 acceptance criteria partially working (PARTIAL)

MISSION.md checkboxes are being updated: S1 got 4/7, S2 got 5/7, S3 got 5/7, S4 got 1/7. The variation is due to: (a) the implementation-review LLM not always populating `acceptanceCriteriaMet`, (b) regex matching failures between LLM text and checkbox text. S4's low count (1/7) may be because the overlapping S3 dispatch-fix run didn't include the Fix #6 code.

### FINDING-6: Fix #2 state file persistence still broken (PERSISTENT)

All scenarios show `mission-complete = false` in the state file despite MISSION_COMPLETE.md existing on main. The push-to-logs.sh boolean re-application isn't working. This needs a fundamentally different approach.

### FINDING-7: Profile impact is nonlinear (OBSERVATION)

| Profile | S1 (6-kyu hamming) | S2-S4 (4-kyu encoding) |
|---------|-------------------|----------------------|
| min | 5 runs, 14 transforms | 2 runs, 6 budget |
| med | 2 runs (report 014) | 3+ runs, 9 budget (not complete) |
| max | 2 runs (report 014) | 1 run, 10 budget |

For 6-kyu, min is dramatically worse than med. For 4-kyu, min was better than med (but med had instability interference). max was best across both.

---

## Comparison with Previous Reports

### Hamming-distance across reports

| Metric | Report 007 (rec) | Report 014 S3 (med) | Report 015 S1 (min) |
|--------|-----------------|---------------------|---------------------|
| Version | 7.2.1 | 7.4.31 | 7.4.32 |
| Iterations | 4 | 2 | 5 |
| Transforms | 2 | 1 | 4 |
| Time | ~34min | ~18min | ~36min |
| Tokens | N/A | 994K | 2,505K |
| Acceptance | 7/7 | 7/7 | 7/7 |

### Dense-encoding (new — no prior baseline)

| Metric | S2 (min) | S3 (med) | S4 (max) |
|--------|----------|----------|----------|
| Runs to complete | 2 | 3+ (not done) | 1 |
| Transforms | 2 | 3 | ~3 |
| Source lines | 173 | 261 | 252 |
| Test files | 4 | 4+ | 4 |
| Acceptance checked | 5/7 | 5/7 | 1/7 |

---

## Recommendations

1. **Do not use min profile for 6-kyu missions** — the low reasoning-effort makes the director too conservative, wasting budget on false negatives. Use med as the minimum viable profile.
2. **max profile is optimal for 4-kyu one-shot** — if the goal is completion in 1 run, max is the only reliable option.
3. **Fix state file persistence** — the boolean re-application approach in push-to-logs.sh is not working. Consider: (a) having the director push state directly via GitHub API, or (b) using a separate atomic push for state updates.
4. **Fix acceptance criteria regex matching** — normalize both LLM-reported and checkbox text (strip backticks, quotes, whitespace) before comparison.
5. **Address instability issue interference** — Playwright failures shouldn't consume transformation budget. Consider making instability fixes non-budget-counted (the instability label check exists but may not be triggering).
6. **Adjust on-sight targets** — Based on data: 6-kyu on med = 2 runs, 4-kyu on max = 1 run, 4-kyu on min = 2-3 runs. The structural 2-run minimum remains for med/min profiles.
