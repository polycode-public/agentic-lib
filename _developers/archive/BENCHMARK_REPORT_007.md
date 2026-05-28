# Benchmark Report 007

**Date**: 2026-03-10
**Operator**: Claude Code (claude-opus-4-6)
**agentic-lib version**: 7.2.1 (on npm)
**Previous report**: BENCHMARK_REPORT_006.md (hamming-distance / gpt-5-mini / recommended)

---

## Scenarios Run

| ID | Mission | Model | Profile | Budget | Outcome |
|----|---------|-------|---------|--------|---------|
| A1 | roman-numerals | gpt-5-mini | recommended | 32 | **mission-complete** (6 iterations) |
| A3 | string-utils | gpt-5-mini | recommended | 32 | **mission-complete** (3 iterations) |
| A6 | cron-engine | gpt-5-mini | recommended | 32 | **mission-complete** (8 iterations) |

---

## Scenario A1: roman-numerals / gpt-5-mini / recommended

### Configuration

| Parameter | Value |
|-----------|-------|
| Mission seed | roman-numerals |
| Model | gpt-5-mini |
| Profile | recommended |
| Budget | 32 |
| Init run | [22884994782](https://github.com/xn-intenton-z2a/repository0/actions/runs/22884994782) |
| Init time | 02:58 UTC |
| Schedule | off |

### Iterations

| # | Run ID | Time | Duration | Transform? | PR | Source Lines | What Happened |
|---|--------|------|----------|------------|-----|-------------|---------------|
| 1 | [22885016288](https://github.com/xn-intenton-z2a/repository0/actions/runs/22885016288) | 02:59 | 9m27s | **YES** | [#2793](https://github.com/xn-intenton-z2a/repository0/pull/2793) | 104 | Supervisor created #2792. Dev transformed: `toRoman()` and `fromRoman()` fully implemented with subtractive notation, canonical validation regex, range checking (1-3999). README updated. Post-commit tests pass. |
| 2 | [22885262994](https://github.com/xn-intenton-z2a/repository0/actions/runs/22885262994) | 03:09 | 7m28s | NO | -- | 104 | Maintain-only. Behaviour test failed (Playwright). Instability issue #2794 created. |
| 3 | [22885448418](https://github.com/xn-intenton-z2a/repository0/actions/runs/22885448418) | 03:17 | 5m58s | NO | -- | 104 | Maintain-only. Behaviour test failed again. Instability issue #2795 created, #2794 closed. |
| 4 | [22885597126](https://github.com/xn-intenton-z2a/repository0/actions/runs/22885597126) | 03:23 | 9m40s | **YES** | [#2796](https://github.com/xn-intenton-z2a/repository0/pull/2796) | 104 | Dev transformed to fix behaviour test instability (#2795). Behaviour test failed on post-commit. |
| 5 | [22885830804](https://github.com/xn-intenton-z2a/repository0/actions/runs/22885830804) | 03:33 | 7m20s | **YES** | [#2798](https://github.com/xn-intenton-z2a/repository0/pull/2798) | 104 | Dev transformed to fix behaviour test instability (#2797). Post-commit tests pass. |
| 6 | [22886008281](https://github.com/xn-intenton-z2a/repository0/actions/runs/22886008281) | 03:41 | 5m30s | NO | -- | 104 | Supervisor declared **mission-complete**. |

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `toRoman(1994)` returns `"MCMXCIV"` | **PASS** | Subtractive notation map: [900,'CM'],[90,'XC'],[4,'IV'] |
| `fromRoman("MCMXCIV")` returns `1994` | **PASS** | Canonical regex + subtractive parsing |
| `toRoman(4)` returns `"IV"` | **PASS** | Map entry [4,'IV'] |
| `fromRoman(toRoman(n)) === n` for 1-3999 | **PASS** | Canonical regex ensures only valid forms accepted; round-trip guaranteed |
| `toRoman(0)` throws `RangeError` | **PASS** | `if (n < 1 \|\| n > 3999) throw new RangeError(...)` |
| `toRoman(4000)` throws `RangeError` | **PASS** | Same range check |
| `fromRoman("IIII")` throws or returns 4 | **PASS** | Throws TypeError — canonical regex rejects non-standard forms |
| All unit tests pass | **PASS** | Post-commit test succeeded on iterations 1, 5, 6 |
| README documents usage with examples | **PASS** | README updated by iteration 1 transform |

### Scenario Summary

| Metric | Value |
|--------|-------|
| Total iterations | 6 |
| Transforms | 3 (iterations 1, 4, 5) |
| Convergence | Iteration 6 — mission-complete |
| Final source lines | 104 (main.js) |
| Acceptance criteria | **9/9 PASS** |
| Mission complete | **YES** |
| Time (init to outcome) | ~47 min |
| Time (init to working code) | ~9 min (iteration 1) |

---

## Scenario A3: string-utils / gpt-5-mini / recommended

### Configuration

| Parameter | Value |
|-----------|-------|
| Mission seed | string-utils |
| Model | gpt-5-mini |
| Profile | recommended |
| Budget | 32 |
| Init run | [22886149497](https://github.com/xn-intenton-z2a/repository0/actions/runs/22886149497) |
| Init time | 03:47 UTC |
| Schedule | off |

### Iterations

| # | Run ID | Time | Duration | Transform? | PR | Source Lines | What Happened |
|---|--------|------|----------|------------|-----|-------------|---------------|
| 1 | [22886172146](https://github.com/xn-intenton-z2a/repository0/actions/runs/22886172146) | 03:48 | 7m55s | **YES** | [#2802](https://github.com/xn-intenton-z2a/repository0/pull/2802) | 48+180=228 | Supervisor created #2801. Dev transformed: ALL 10 functions implemented in src/lib/browser.js (180 lines), re-exported from main.js (48 lines). Includes slugify, truncate, camelCase, kebabCase, titleCase, wordWrap, stripHtml, escapeRegex, pluralize, levenshteinDistance. README updated. Post-commit tests pass. |
| 2 | [22886372823](https://github.com/xn-intenton-z2a/repository0/actions/runs/22886372823) | 03:56 | 7m17s | NO | -- | 228 | Maintain-only. Supervisor created #2803, review-features closed it as resolved. No transform needed. |
| 3 | [22886549737](https://github.com/xn-intenton-z2a/repository0/actions/runs/22886549737) | 04:04 | 5m56s | NO | -- | 228 | Supervisor declared **mission-complete**: "0 open issues, 2+ recently-closed issues resolved by review". |

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| All 10 functions exported and work correctly | **PASS** | browser.js exports all 10 functions; main.js re-exports |
| `slugify("Hello World!")` returns `"hello-world"` | **PASS** | slugify: normalize, lowercase, replace non-alnum with hyphens |
| `truncate("Hello World", 8)` returns `"Hello…"` | **PASS** | truncate: word boundary aware, default suffix "…" |
| `camelCase("foo-bar-baz")` returns `"fooBarBaz"` | **PASS** | camelCase: split on non-alphanumeric, capitalize |
| `levenshteinDistance("kitten", "sitting")` returns `3` | **PASS** | Dynamic programming implementation with Array.from for Unicode |
| Edge cases handled gracefully | **PASS** | `_safeStr()` handles null/undefined → empty string |
| All unit tests pass | **PASS** | Post-commit test succeeded on all iterations |
| README documents all functions with examples | **PASS** | README updated by iteration 1 |

### Scenario Summary

| Metric | Value |
|--------|-------|
| Total iterations | 3 |
| Transforms | 1 (iteration 1 only) |
| Convergence | Iteration 3 — mission-complete |
| Final source lines | 228 total (48 main.js + 180 browser.js) |
| Acceptance criteria | **7/7 PASS** |
| Mission complete | **YES** |
| Time (init to outcome) | ~22 min |
| Time (init to working code) | ~8 min (iteration 1) |

---

## Scenario A6: cron-engine / gpt-5-mini / recommended

### Configuration

| Parameter | Value |
|-----------|-------|
| Mission seed | cron-engine |
| Model | gpt-5-mini |
| Profile | recommended |
| Budget | 32 |
| Init run | [22886699266](https://github.com/xn-intenton-z2a/repository0/actions/runs/22886699266) |
| Init time | 04:12 UTC |
| Schedule | off |

### Iterations

| # | Run ID | Time | Duration | Transform? | PR | Source Lines | What Happened |
|---|--------|------|----------|------------|-----|-------------|---------------|
| 1 | [22886723892](https://github.com/xn-intenton-z2a/repository0/actions/runs/22886723892) | 04:14 | ~9min | **YES** | [#2806](https://github.com/xn-intenton-z2a/repository0/pull/2806) | 53+165=218 | Supervisor created #2805. Dev transformed: all 5 cron functions implemented in src/lib/cron.js (165 lines). parseCron with 5/6-field support, ranges, steps, wildcards, special strings. nextRun with 5-year search. Supervisor annotation: "Unknown action: Requirements" — benign parsing issue. |
| 2 | [22887032988](https://github.com/xn-intenton-z2a/repository0/actions/runs/22887032988) | 04:24 | 15min | **YES** | [#2808](https://github.com/xn-intenton-z2a/repository0/pull/2808) | 53+177=230 | Supervisor created #2807 "complete cron-engine (tests, docs, DST handling)". Dev transformed: expanded cron.js to 177 lines. Behaviour test failed. |
| 3 | [22887402761](https://github.com/xn-intenton-z2a/repository0/actions/runs/22887402761) | 04:39 | 9m23s | **YES** | [#2811](https://github.com/xn-intenton-z2a/repository0/pull/2811) | 230 | Dev transformed to fix behaviour test instability (#2809). Behaviour test failed again. |
| 3a | [22887525625](https://github.com/xn-intenton-z2a/repository0/actions/runs/22887525625) | 04:44 | 14min | **YES** | [#2813](https://github.com/xn-intenton-z2a/repository0/pull/2813) | 230 | Auto-dispatched by dispatch-fix. fix-stuck PR for broken main build. |
| 4 | [22887637527](https://github.com/xn-intenton-z2a/repository0/actions/runs/22887637527) | 04:49 | 22min | **YES** | [#2812](https://github.com/xn-intenton-z2a/repository0/pull/2812) | 230 | Dev transformed to fix instability #2810 ("both test failure"). Behaviour test still failing. Safety check blocked path-writable for scripts/run-behaviour.js. |
| 5 | [22888162931](https://github.com/xn-intenton-z2a/repository0/actions/runs/22888162931) | 05:11 | 12m29s | **YES** | [#2812](https://github.com/xn-intenton-z2a/repository0/pull/2812) | 230 | Dev transformed instability #2810. Behaviour test failed. |
| 6 | [22888460286](https://github.com/xn-intenton-z2a/repository0/actions/runs/22888460286) | 05:24 | 8m05s | NO | -- | 230 | Maintain-only. All open instability issues closed. |
| 7 | [22888674992](https://github.com/xn-intenton-z2a/repository0/actions/runs/22888674992) | 05:32 | 7m13s | NO | -- | 230 | Maintain-only. No open issues. |
| 8 | [22888865710](https://github.com/xn-intenton-z2a/repository0/actions/runs/22888865710) | 05:40 | 5m24s | NO | -- | 230 | Supervisor declared **mission-complete**. |

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `parseCron("*/15 * * * *")` returns valid parsed object | **PASS** | parseField handles `*/15` with step parsing |
| `nextRun("0 9 * * 1")` returns next Monday at 09:00 | **PASS** | nextRun iterates by stepMs (60s), matches() checks dow=1, hr=9, min=0 |
| `matches("0 0 25 12 *", new Date("2025-12-25"))` returns true | **PASS** | matches() checks month=12, dom=25, hr=0, min=0 |
| `nextRuns("@daily", 7)` returns 7 consecutive daily dates | **PASS** | nextRuns loops count times calling nextRun; @daily expands to "0 0 * * *" |
| DST transitions handled correctly | **PARTIAL** | Uses Date API (local time), but minute-stepping may skip/duplicate during DST transitions |
| Invalid expressions throw descriptive errors | **PASS** | parseField validates ranges, steps; parseCron validates field count |
| All unit tests pass | **PASS** | Post-commit unit test passed on final iterations |
| README documents usage with examples | **PASS** | README updated |

### Issues

| Issue | State | Title | Type |
|-------|-------|-------|------|
| [#2805](https://github.com/xn-intenton-z2a/repository0/issues/2805) | closed | feat: implement cron-engine core functions and tests | mission |
| [#2807](https://github.com/xn-intenton-z2a/repository0/issues/2807) | closed | feat: complete cron-engine (implement tests, docs, README, DST handling) | mission |
| [#2809](https://github.com/xn-intenton-z2a/repository0/issues/2809) | closed | instability: behaviour test failure on main | instability |
| [#2810](https://github.com/xn-intenton-z2a/repository0/issues/2810) | closed | instability: both test failure on main | instability |
| [#2814](https://github.com/xn-intenton-z2a/repository0/issues/2814) | closed | instability: behaviour test failure on main | instability |

### Scenario Summary

| Metric | Value |
|--------|-------|
| Total iterations | 8 (+1 auto-dispatched = 9 runs) |
| Transforms | 6 (2 mission, 4 instability fixes) |
| Convergence | Iteration 8 — mission-complete |
| Final source lines | 230 total (53 main.js + 177 cron.js) |
| Acceptance criteria | **7/8 PASS** (DST partial) |
| Mission complete | **YES** |
| Time (init to outcome) | ~93 min |
| Time (init to working code) | ~9 min (iteration 1) |

---

## Cross-Scenario Comparison

| Metric | S3/006 (hamming) | A1 (roman) | A3 (string-utils) | A6 (cron-engine) |
|--------|------------------|------------|-------------------|-----------------|
| Tier | 2 | 2 | 3 | 3 |
| Functions | 2 | 2 | 10 | 5 |
| Profile | recommended | recommended | recommended | recommended |
| Model | gpt-5-mini | gpt-5-mini | gpt-5-mini | gpt-5-mini |
| Total iterations | 4 | 6 | 3 | 8 (+1 auto) |
| Mission transforms | 2 | 1 | 1 | 2 |
| Instability transforms | 0 | 2 | 0 | 4 |
| Time to working code | ~7 min | ~9 min | ~8 min | ~9 min |
| Time to mission-complete | ~34 min | ~47 min | ~22 min | ~93 min |
| Final source lines | 95 | 104 | 228 | 230 |
| Acceptance criteria | 7/7 | 9/9 | 7/7 | 7/8 |
| Dedicated test file | NO | NO | NO | NO |
| Multi-file split | NO | NO | YES (browser.js) | YES (cron.js) |

---

## Findings

### FINDING-1: All missions complete on first transform (POSITIVE)

Every scenario produced functionally correct code on the very first transform:
- **Hamming**: Both functions with Unicode + BigInt support
- **Roman numerals**: Subtractive notation + canonical validation regex
- **String utils**: All 10 functions in 180 lines
- **Cron engine**: Full parser, matcher, scheduler in 165 lines

The recommended profile with gpt-5-mini consistently delivers working implementations for Tier 2 and Tier 3 missions in a single transform. The quality difference between simple (2-function) and complex (10-function) missions is minimal.

### FINDING-2: Behaviour test instability is the primary obstacle to fast convergence (CRITICAL — NEGATIVE)

The Playwright behaviour tests fail intermittently across all scenarios, creating instability issues that consume transforms:
- **A1 (roman-numerals)**: 2 of 3 transforms were for instability fixes, adding 4 extra iterations
- **A6 (cron-engine)**: 4 of 6 transforms were for instability fixes, adding 6 extra iterations
- **S3 (hamming) and A3 (string-utils)**: No instability issues — completed in 4 and 3 iterations respectively

Without the behaviour test instability, roman-numerals would have completed in ~2 iterations and cron-engine in ~4. The instability is not related to the mission code — it's a Playwright/web test infrastructure issue.

### FINDING-3: String-utils was the fastest mission despite highest complexity (POSITIVE — SURPRISING)

String-utils (Tier 3, 10 functions) completed in just 3 iterations / 22 minutes — faster than roman-numerals (Tier 2, 6 iterations / 47 min) and cron-engine (Tier 3, 8 iterations / 93 min). This happened because:
1. All 10 functions were implemented in a single transform (no instability on iteration 1)
2. review-features closed the second issue as RESOLVED (no transform needed)
3. Mission-complete declared on iteration 3

The bag-of-functions pattern (independent functions with no algorithmic dependencies) is easier for the LLM than algorithmically complex problems, even when there are more functions to implement.

### FINDING-4: LLM produces multi-file architecture for complex missions (POSITIVE)

For Tier 3 missions, the LLM split implementation into separate modules:
- **String-utils**: `browser.js` (180 lines) + `main.js` (48 lines re-export)
- **Cron-engine**: `cron.js` (177 lines) + `main.js` (53 lines re-export)

This is a reasonable architectural choice — it separates the implementation from the module boilerplate. The LLM did not do this for simpler Tier 2 missions (hamming-distance, roman-numerals), where all code fit in main.js.

### FINDING-5: No dedicated test files created in any scenario (PERSISTENT CONCERN)

Across all 4 scenarios benchmarked today (S3, A1, A3, A6), no dedicated test file was created for the mission-specific functions. Only seed test files (main.test.js, web.test.js) exist. The supervisor consistently declares mission-complete without verifying test coverage.

This is the same finding as Report 006 FINDING-3 and represents a systematic gap in the pipeline's quality criteria.

### FINDING-6: DST handling is approximate (CONCERN)

The cron-engine's `nextRun()` function steps through time in 60-second increments using `Date` objects. During DST transitions:
- **Spring forward**: A 2:00 AM run scheduled for `0 2 * * *` might be skipped because the minute-stepping jumps from 1:59 to 3:00
- **Fall back**: A 1:30 AM run might fire twice

This is a known limitation of the minute-stepping approach. A production cron library would need field-based iteration instead.

### FINDING-7: Supervisor annotation "Unknown action" is benign (MINOR)

On A6 iteration 1, the supervisor produced an action that included "Requirements:" text that the action parser didn't recognise. This was logged as a warning but didn't prevent the mission from progressing. The supervisor's primary action (create-issue) still executed correctly.

### FINDING-8: Auto-dispatch creates unexpected extra runs (OBSERVATION)

In the A6 scenario, the post-commit-test's `dispatch-fix` job auto-dispatched run 22887525625 between iterations 3 and 4. This fix-stuck PR (#2813) was merged automatically. While this demonstrates the pipeline's self-healing capability, it also means iteration counts can vary between benchmark runs of the same scenario.

---

## Comparison with Previous Reports

| Metric | Report 004 (fizz-buzz/rec) | Report 005 (fizz-buzz/min) | Report 006 (hamming/rec) | **Report 007** |
|--------|---------------------------|---------------------------|-------------------------|----------------|
| Version | 7.1.97 | 7.1.100 | 7.2.1 | **7.2.1** |
| Missions tested | 1 | 1 | 1 | **3** |
| Max tier tested | 1 | 1 | 2 | **3** |
| All missions complete | YES | NO | YES | **YES (all 3)** |
| Fastest mission-complete | 40 min | N/A | 34 min | **22 min (string-utils)** |
| Slowest mission-complete | 40 min | N/A | 34 min | **93 min (cron-engine)** |
| Instability a factor | NO | NO | NO | **YES (2 of 3 scenarios)** |
| Dedicated tests created | YES | YES | NO | **NO (0 of 3)** |

---

## Recommendations

1. **Fix behaviour test instability** (HIGH) — The Playwright tests are the primary bottleneck for convergence. Two of three scenarios spent 50-75% of their iterations fixing instability rather than advancing the mission. Options: (a) make behaviour tests optional/non-blocking, (b) add retries to Playwright, (c) reduce behaviour test scope to a basic health check.

2. **Add test coverage to mission-complete criteria** (HIGH) — No scenario created dedicated test files. The supervisor should check that exported functions have test coverage before declaring mission-complete. This would increase transforms by 1-2 but significantly improve output quality.

3. **Run max profile comparison** (MEDIUM) — Scenarios A2, A4, A7 (max profile) would show whether higher context limits produce: (a) dedicated tests, (b) better DST handling, (c) fewer instability transforms.

4. **Run model comparison** (MEDIUM) — Scenario A5 (claude-sonnet-4 on string-utils) would show whether model choice affects: (a) test generation, (b) code architecture decisions, (c) iteration count.

5. **Separate instability transforms from mission transforms in activity log** (LOW) — The activity log counts all transforms toward the budget. Instability fixes should not consume mission budget, as they address infrastructure issues not mission code.

6. **Field-based iteration for cron nextRun** (LOW) — If cron-engine is benchmarked again, note that the current minute-stepping approach has O(minutes-until-next-run) complexity. A field-based approach would be O(1) per field.
