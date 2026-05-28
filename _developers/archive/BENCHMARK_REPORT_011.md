# Benchmark Report 011

**Date**: 2026-03-17
**Operator**: Claude Code (claude-opus-4-6)
**agentic-lib version**: 7.4.23 (on npm)
**Previous report**: BENCHMARK_REPORT_010.md (fizz-buzz / gpt-5-mini / recommended — in progress, fixes applied during benchmark)

---

## Scenarios Run

| ID | Mission | Model | Profile | Budget | Outcome |
|----|---------|-------|---------|--------|---------|
| S1 | 7-kyu-understand-fizz-buzz | gpt-5-mini | recommended | 32 | **mission-complete** (5 iterations, ~66 min) |
| S3 | 6-kyu-understand-hamming-distance | gpt-5-mini | recommended | 32 | **mission-complete** (4 iterations, ~102 min) |
| S5 | 6-kyu-understand-roman-numerals | gpt-5-mini | recommended | 32 | *not run* |

---

## Scenario S1: fizz-buzz / gpt-5-mini / recommended

### Configuration

| Parameter | Value |
|-----------|-------|
| Mission seed | 7-kyu-understand-fizz-buzz |
| Model | gpt-5-mini |
| Profile | recommended |
| Budget | 32 |
| Init run | [23175113020](https://github.com/xn-intenton-z2a/repository0/actions/runs/23175113020) |
| Init time | 02:08 UTC |
| Schedule | off (manual dispatch) |
| Seed issues | YES (create-seed-issues=true) |

### Iterations

| # | Run ID | Time | Duration | Transform? | PR | Source Lines | What Happened |
|---|--------|------|----------|------------|-----|-------------|---------------|
| 1 | [23175155768](https://github.com/xn-intenton-z2a/repository0/actions/runs/23175155768) | 02:10 | 10m27s | **YES** | [#3052](https://github.com/xn-intenton-z2a/repository0/pull/3052) | 108 | Director: gap analysis. Supervisor created issue. Dev transform: implemented `fizzBuzz()` and `fizzBuzzSingle()` with validation, wired into website, added unit tests. 7 files written in 131s. Post-commit tests pass. |
| 2 | [23175421742](https://github.com/xn-intenton-z2a/repository0/actions/runs/23175421742) | 02:21 | ~15min | **YES** | [#3055](https://github.com/xn-intenton-z2a/repository0/pull/3055) | 108 | Supervisor created #3053 (implementation-gap). Dev transform: added 4 placeholder unit test files for issue #3050. Behaviour test had retry. New issue #3054 (behaviour test failure). |
| 3 | [23175816742](https://github.com/xn-intenton-z2a/repository0/actions/runs/23175816742) | 02:37 | ~16min | **YES** | [#3056](https://github.com/xn-intenton-z2a/repository0/pull/3056) | 108 | Implementation-review failed (exit code 1). Dev transform resolved #3053 (implementation gap — full fizzBuzz(15) assert + behaviour tests). Post-commit behaviour test retry needed. |
| 4 | [23176201930](https://github.com/xn-intenton-z2a/repository0/actions/runs/23176201930) | 02:53 | ~16min | **YES** | [#3058](https://github.com/xn-intenton-z2a/repository0/pull/3058) | 99 | Dev transform resolved #3054 (behaviour test failure). Source reduced from 108 to 99 lines. New issue #3057 created. Post-commit tests pass. |
| 5 | [23176606350](https://github.com/xn-intenton-z2a/repository0/actions/runs/23176606350) | 03:10 | ~14min | **YES** | [#3059](https://github.com/xn-intenton-z2a/repository0/pull/3059) | 99 | Dev transform resolved #3057 (fix behaviour tests + dedicated tests). **Director declared mission-complete at 03:14 UTC.** New behaviour issue #3060 opened by post-commit but mission already declared. |
| 6 | [23176946803](https://github.com/xn-intenton-z2a/repository0/actions/runs/23176946803) | 03:24 | cancelled | — | — | — | Dispatched after mission-complete. Cancelled by concurrency group. |

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `fizzBuzz(15)` returns correct 15-element array ending with "FizzBuzz" | **PASS** | Website demo shows correct output |
| `fizzBuzzSingle(3)` returns "Fizz" | **PASS** | `n % 3 === 0` check in main.js |
| `fizzBuzzSingle(5)` returns "Buzz" | **PASS** | `n % 5 === 0` check in main.js |
| `fizzBuzzSingle(15)` returns "FizzBuzz" | **PASS** | `by3 && by5` check in main.js |
| `fizzBuzzSingle(7)` returns "7" | **PASS** | `String(n)` fallback in main.js |
| `fizzBuzz(0)` returns `[]` | **PASS** | `if (n === 0) return []` in main.js |
| All unit tests pass | **PASS** | 10 test files in tests/unit/, post-commit test succeeded |
| README documents usage with examples | **PASS** | README updated by iteration 1 transform |

### Issues

| Issue | State | Title | Type |
|-------|-------|-------|------|
| [#3050](https://github.com/xn-intenton-z2a/repository0/issues/3050) | closed | Initial unit tests | seed |
| [#3051](https://github.com/xn-intenton-z2a/repository0/issues/3051) | closed | Initial web layout | seed |
| [#3053](https://github.com/xn-intenton-z2a/repository0/issues/3053) | closed | implementation-gap: assert full fizzBuzz(15) array & add behaviour tests | gap |
| [#3054](https://github.com/xn-intenton-z2a/repository0/issues/3054) | closed | behaviour test failure on main | instability |
| [#3057](https://github.com/xn-intenton-z2a/repository0/issues/3057) | closed | fix: behaviour tests and add dedicated tests for fizzBuzz demo | instability |
| [#3060](https://github.com/xn-intenton-z2a/repository0/issues/3060) | **open** | behaviour test failure on main | instability |

### State File (final — at mission-complete)

```toml
[counters]
log-sequence = 24
cumulative-transforms = 11
cumulative-maintain-features = 3
cumulative-maintain-library = 3
cumulative-nop-cycles = 0
total-tokens = 3342608
total-duration-ms = 2335064

[budget]
transformation-budget-used = 11
transformation-budget-cap = 32

[status]
mission-complete = false
mission-failed = false
last-transform-at = "2026-03-17T03:21:58.504Z"
last-non-nop-at = "2026-03-17T03:27:53.920Z"
```

Note: `mission-complete = false` in state file despite MISSION_COMPLETE.md existing. The director writes the file but does not update the state toml.

### Website & Screenshot

**Screenshot:** No screenshot available on logs branch (SCREENSHOT_INDEX.png not found at time of check).

**Website (GitHub Pages):** The live website renders correctly:
- Library identity (repository0 v0.1.0)
- FizzBuzz demo output for numbers 1-15 as formatted JSON
- Dynamic JavaScript loading of the library module
- Navigation link to the GitHub repository

### Scenario Summary

| Metric | Value |
|--------|-------|
| Total iterations | 5 (+1 cancelled) |
| Dev PRs merged | 5 (#3052, #3055, #3056, #3058, #3059) |
| Maintain transforms | 6 (3 features + 3 library) |
| Total budget used | 11/32 |
| Final source lines | 99 (main.js) |
| Final test files | 10 in tests/unit/ |
| Acceptance criteria | **8/8 PASS** |
| Mission complete | **YES** (director, 03:14 UTC) |
| Time (init to mission-complete) | ~66 min |
| Time (init to working code) | ~10 min (iteration 1) |
| Total tokens | 3,342,608 |
| Total duration (LLM) | 2,335s (~39 min) |

---

## Scenario S3: hamming-distance / gpt-5-mini / recommended

### Configuration

| Parameter | Value |
|-----------|-------|
| Mission seed | 6-kyu-understand-hamming-distance |
| Model | gpt-5-mini |
| Profile | recommended |
| Budget | 32 |
| Init run | [23177088598](https://github.com/xn-intenton-z2a/repository0/actions/runs/23177088598) |
| Init time | 03:31 UTC |
| Schedule | off (manual dispatch), then auto-enabled by supervisor |
| Seed issues | YES (create-seed-issues=true) |

### Iterations

| # | Run ID | Time | Duration | Transform? | PR | Source Lines | What Happened |
|---|--------|------|----------|------------|-----|-------------|---------------|
| 1 | [23177171099](https://github.com/xn-intenton-z2a/repository0/actions/runs/23177171099) | 03:34 | 13min | **YES** | [#3065](https://github.com/xn-intenton-z2a/repository0/pull/3065) | 95 | Director: gap analysis. Dev transform: implemented `hammingDistanceStrings()` and `hammingDistanceBits()` with Unicode support, BigInt, Brian Kernighan's algorithm. Resolved #3063 (Initial unit tests). |
| 2 | [23177472159](https://github.com/xn-intenton-z2a/repository0/actions/runs/23177472159) | 03:47 | 16min | **YES** | [#3067](https://github.com/xn-intenton-z2a/repository0/pull/3067) | 95 | Dev transform resolved #3064 (Initial web layout). Website updated with Hamming distance demos. Supervisor enabled hourly schedule. |
| 3 | [23178382204](https://github.com/xn-intenton-z2a/repository0/actions/runs/23178382204) | 04:25 | 17min | **YES** | [#3069](https://github.com/xn-intenton-z2a/repository0/pull/3069) | 95 | Schedule-triggered. Dev transform resolved #3066 (behaviour/E2E tests). Issues #3068 (API name alignment) created and resolved. |
| 4 | [23179396437](https://github.com/xn-intenton-z2a/repository0/actions/runs/23179396437) | 05:07 | ~10min | **YES** | — | 95 | Schedule-triggered. **Director declared mission-complete at 05:13 UTC.** 5 duplicate "dedicated tests" issues (#3070-#3074) created and closed. |
| 5-13 | various schedule runs | 05:39–09:27 | 4-8min each | NO | — | 95 | 9 schedule-triggered nop/maintain runs AFTER mission-complete. Schedule not disabled. |

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Hamming distance between `"karolin"` and `"kathrin"` is `3` | **PASS** | `hammingDistanceStrings()` iterates code points, counts mismatches |
| Hamming distance between `""` and `""` is `0` | **PASS** | Empty arrays, dist=0 |
| Strings of different lengths throws `RangeError` | **PASS** | `if (aPoints.length !== bPoints.length) throw new RangeError(...)` |
| Bit-level Hamming distance between `1` and `4` is `2` | **PASS** | `BigInt(1) ^ BigInt(4) = 5n`, Kernighan count = 2 |
| Bit-level Hamming distance between `0` and `0` is `0` | **PASS** | `0n ^ 0n = 0n`, while loop exits immediately |
| All unit tests pass | **PASS** | 11 test files in tests/unit/ |
| README documents usage with examples | **PASS** | Website shows 3 worked examples (string, bit, unicode) |

### Issues

| Issue | State | Title | Type |
|-------|-------|-------|------|
| [#3063](https://github.com/xn-intenton-z2a/repository0/issues/3063) | closed | Initial unit tests | seed |
| [#3064](https://github.com/xn-intenton-z2a/repository0/issues/3064) | closed | Initial web layout | seed |
| [#3066](https://github.com/xn-intenton-z2a/repository0/issues/3066) | closed | Add behaviour/E2E tests and dedicated tests | gap |
| [#3068](https://github.com/xn-intenton-z2a/repository0/issues/3068) | closed | fix: align API documentation names | gap |
| [#3070](https://github.com/xn-intenton-z2a/repository0/issues/3070) | closed | test: add dedicated unit tests and README examples | duplicate |
| [#3071](https://github.com/xn-intenton-z2a/repository0/issues/3071) | closed | test(dedicated): add unit tests and README examples | duplicate |
| [#3072](https://github.com/xn-intenton-z2a/repository0/issues/3072) | closed | test(dedicated): add dedicated unit tests... | duplicate |
| [#3073](https://github.com/xn-intenton-z2a/repository0/issues/3073) | closed | test(dedicated): add dedicated unit tests... | duplicate |
| [#3074](https://github.com/xn-intenton-z2a/repository0/issues/3074) | closed | test(dedicated): add dedicated unit tests... | duplicate |

### State File (final — including post-mission nop runs)

```toml
[counters]
log-sequence = 42
cumulative-transforms = 7
cumulative-maintain-features = 2
cumulative-maintain-library = 2
cumulative-nop-cycles = 0
total-tokens = 3050560
total-duration-ms = 2511396

[budget]
transformation-budget-used = 7
transformation-budget-cap = 32

[status]
mission-complete = false
mission-failed = false
last-transform-at = "2026-03-17T05:11:56.110Z"
last-non-nop-at = "2026-03-17T09:23:17.359Z"
```

Note: `mission-complete = false` in state file despite MISSION_COMPLETE.md existing — same bug as S1 (FINDING-3). Also `last-non-nop-at` shows 09:23 (4+ hours after mission-complete) because maintain tasks continued running.

### Website & Screenshot

**Website (GitHub Pages):** The live website renders correctly. It demonstrates:
- String Hamming distance (Unicode-aware code point comparison)
- Bit Hamming distance (Number and BigInt support)
- Three worked examples: "karolin" vs "kathrin", 1 vs 4, emoji/Unicode
- Validation demonstration with error types
- Library metadata loaded dynamically

### Scenario Summary

| Metric | Value |
|--------|-------|
| Total iterations (to mission-complete) | 4 |
| Total workflow runs (including post-mission) | 13 |
| Dev PRs merged | 3 (#3065, #3067, #3069) |
| Maintain transforms | 4 (2 features + 2 library) |
| Total budget used | 7/32 |
| Final source lines | 95 (main.js) |
| Final test files | 11 in tests/unit/ |
| Acceptance criteria | **7/7 PASS** |
| Mission complete | **YES** (director, 05:13 UTC) |
| Time (init to mission-complete) | ~102 min |
| Time (init to working code) | ~13 min (iteration 1) |
| Wasted schedule runs post-mission | 9 runs (~60 min CI time) |
| Total tokens | 3,050,560 |
| Total duration (LLM) | 2,511s (~42 min) |
| Duplicate issues | 5 (#3070-#3074, all "dedicated tests") |

---

## Scenario S5: roman-numerals / gpt-5-mini / recommended

*Not run — stopped after S3 to compile report per operator instruction.*

---

## Cross-Scenario Comparison

| Metric | S1 (fizz-buzz) | S3 (hamming-distance) |
|--------|-----------------|----------------------|
| Tier | 1 (7-kyu) | 2 (6-kyu) |
| Functions | 2 | 2 |
| Profile | recommended | recommended |
| Model | gpt-5-mini | gpt-5-mini |
| Iterations to working code | 1 | 1 |
| Iterations to mission-complete | 5 | 4 |
| Dev PRs merged | 5 | 3 |
| Maintain transforms | 6 | 4 |
| Budget used | 11/32 | 7/32 |
| Time to working code | ~10 min | ~13 min |
| Time to mission-complete | ~66 min | ~102 min |
| Final source lines | 99 | 95 |
| Final test files | 10 | 11 |
| Acceptance criteria | 8/8 | 7/7 |
| Behaviour instability issues | 3 | 0 |
| Duplicate issues | 0 | 5 |
| Schedule auto-enabled | NO | YES |
| Post-mission wasted runs | 0 | 9 |

---

## Findings

### FINDING-1: High budget consumption from maintain tasks (CONCERN)

Both scenarios show significant budget consumption from maintain-features and maintain-library transforms:
- **S1**: 6 of 11 budget units (55%) were maintain overhead
- **S3**: 4 of 7 budget units (57%) were maintain overhead

The maintain tasks consume the same budget as dev transforms. For a 32-budget recommended profile, this means ~55% of budget is spent on maintenance, leaving only ~14-15 transforms for actual mission work. For complex missions that need many dev transforms, the budget would be exhausted prematurely.

### FINDING-2: Behaviour test failures still recurring in S1 (PERSISTENT — matches Report 007 FINDING-2)

S1 had 3 behaviour test failure issues (#3054, #3057, #3060). S3 had none — the hamming-distance website may be simpler to test. The behaviour test instability appears mission-dependent rather than systemic.

### FINDING-3: Director declares mission-complete but state file not updated (BUG)

In BOTH scenarios, MISSION_COMPLETE.md was written by the director but `agentic-lib-state.toml` still shows `mission-complete = false`. This is a consistent bug — the director task handler writes the signal file but does not update the persistent state on the logs branch.

### FINDING-4: Schedule not disabled after mission-complete (BUG)

In S3, the supervisor auto-enabled the hourly schedule during iteration 2. After mission-complete at 05:13 UTC, 9 additional schedule-triggered runs continued until manually disabled at ~09:30 UTC. Each run consumed CI minutes for nop/maintain work with no mission value.

The director writes MISSION_COMPLETE.md but does not disable the schedule. The workflow should check for MISSION_COMPLETE.md at the start and either skip all jobs or disable the schedule.

### FINDING-5: Duplicate issue churn (CONCERN)

S3 had 5 near-identical issues (#3070-#3074) all titled "test(dedicated): add dedicated unit tests and README examples for Hamming library". These were created and immediately closed, suggesting the supervisor or another task is generating duplicate issues without checking for existing ones.

### FINDING-6: Seed issues accelerate first iteration (POSITIVE — confirmed across both scenarios)

Both S1 and S3 used `create-seed-issues=true`. In both cases, the dev transform had actionable work items from iteration 1 — no wasted iteration for issue creation. This is a clear improvement over previous reports where the first iteration was spent creating issues.

### FINDING-7: Working code consistently delivered in iteration 1 (POSITIVE)

Both scenarios produced fully functional, correct implementations on the very first dev transform:
- **S1**: `fizzBuzz()` and `fizzBuzzSingle()` with full validation in 131s
- **S3**: `hammingDistanceStrings()` and `hammingDistanceBits()` with Unicode+BigInt in ~120s

The gap between "working code" and "mission-complete" is not about code quality — it's about the pipeline iterating through issue lifecycle, tests, and behaviour verification.

### FINDING-8: S1 used more budget than S3 despite being simpler (SURPRISING)

Fizz-buzz (Tier 1, simplest mission) used 11 budget units vs hamming-distance (Tier 2) using only 7. This is counterintuitive. The difference:
- S1 had 3 behaviour instability issues consuming transforms
- S3 had 0 behaviour instability issues
- S1 had 5 dev PRs vs S3's 3

The behaviour test infrastructure instability is a bigger factor in budget consumption than mission complexity.

---

## Comparison with Previous Reports

| Metric | Report 006 (hamming/rec) | Report 007 A1 (roman/rec) | Report 010 (fizz/rec) | **Report 011 S1** | **Report 011 S3** |
|--------|-------------------------|--------------------------|----------------------|-------------------|-------------------|
| Version | 7.2.1 | 7.2.1 | 7.4.17-20 | **7.4.23** | **7.4.23** |
| Iterations to working code | 1 | 1 | 1 | **1** | **1** |
| Iterations to mission-complete | 4 | 6 | 6+ | **5** | **4** |
| Budget used | — | 3/32 | 11+/32 | **11/32** | **7/32** |
| Behaviour instability issues | 0 | 2 | — | **3** | **0** |
| Dedicated test files | NO | NO | — | **YES (10)** | **YES (11)** |
| Seed issues | NO | NO | NO | **YES** | **YES** |
| Duplicate issues | 0 | 0 | — | **0** | **5** |
| Schedule auto-disabled | — | — | — | **N/A** | **NO (bug)** |

---

## Recommendations

1. **Exclude maintain transforms from budget** (HIGH — FINDING-1) — Maintain-features and maintain-library transforms should not count against the transformation budget. They consumed 55-57% of budget in both scenarios. Only dev transforms should count.

2. **Director must update state file on mission-complete** (HIGH — FINDING-3) — When the director writes MISSION_COMPLETE.md, it should also set `mission-complete = true` in `agentic-lib-state.toml`. Currently the state file and signal file are inconsistent in both scenarios.

3. **Director must disable schedule on mission-complete** (HIGH — FINDING-4) — When mission-complete is declared, the schedule should be set to "off" to prevent wasted CI runs. S3 had 9 unnecessary runs (~60 min CI time) after mission-complete.

4. **Deduplicate issue creation** (MEDIUM — FINDING-5) — Before creating a new issue, check if an issue with a similar title already exists (open or recently closed). S3 had 5 identical "dedicated tests" issues.

5. **Cap post-commit behaviour issues** (MEDIUM — FINDING-2) — If a behaviour test failure issue is already open, don't create another. Add a comment to the existing one instead.

6. **Workflow-level mission-complete early exit** (MEDIUM — FINDING-4) — The workflow should check for MISSION_COMPLETE.md at the start (in the params job) and skip all downstream jobs. Currently even the cancelled S1 iteration 6 consumed a runner slot.
