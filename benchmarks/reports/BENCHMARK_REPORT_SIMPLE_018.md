# Benchmark Report 018

**Date**: 2026-03-22
**Operator**: Claude Code (claude-opus-4-6)
**agentic-lib version**: 7.4.52
**Previous report**: BENCHMARK_REPORT_017.md
**Method**: `scripts/all-repositories-benchmarks-simple.sh` → per-repo `agentic-lib-report` enrichment

---

## Dashboard

| ID | Repo | Mission | Profile | Transforms | Budget | Outcome | Tokens |
|----|------|---------|---------|------------|--------|---------|--------|
| S1 | repository0 | 7-kyu-understand-fizz-buzz | max | 3 | 3/128 | **mission-complete** | 1,472,853 |
| S2 | repository0-string-utils | 5-kyu-apply-string-utils | max | 0 | 0/0 | **not started** | 0 |
| S3 | repository0-dense-encoder | 6-kyu-understand-hamming-distance | max | 5 | 5/128 | **incomplete** | 2,809,663 |
| S4 | repository0-plot-code-lib | 6-kyu-understand-roman-numerals | max | 3 | 3/128 | **mission-complete** | 1,135,997 |

---

## Scenario S1: 7-kyu-understand-fizz-buzz / repository0 / max

### Summary

Mission complete. FizzBuzz API and unit tests implemented in 3 transforms. All 8 acceptance criteria PASS. Schedule set to off. ~10 minutes wall clock.

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `fizzBuzz(15)` returns correct 15-element array | PASS | tests/unit/fizzbuzz.test.js asserts correct array; src/lib/main.js implements fizzBuzz→fizzBuzzSingle |
| `fizzBuzzSingle(3)` returns "Fizz" | PASS | tests/unit/fizzbuzz.test.js asserts fizzBuzzSingle(3) === 'Fizz' |
| `fizzBuzzSingle(5)` returns "Buzz" | PASS | tests/unit/fizzbuzz.test.js asserts fizzBuzzSingle(5) === 'Buzz' |
| `fizzBuzzSingle(15)` returns "FizzBuzz" | PASS | tests/unit/fizzbuzz.test.js asserts fizzBuzzSingle(15) === 'FizzBuzz' |
| `fizzBuzzSingle(7)` returns "7" | PASS | tests/unit/fizzbuzz.test.js asserts fizzBuzzSingle(7) === '7' |
| `fizzBuzz(0)` returns `[]` | PASS | tests/unit/fizzbuzz.test.js asserts fizzBuzz(0) === [] |
| All unit tests pass | PASS | agentic-lib-test run 23391316010 concluded success |
| README documents usage | PASS | README.md contains FizzBuzz Library section with examples |

### Findings

- **FINDING-1 (POSITIVE)**: Core API implemented and covered by unit tests in 3 transforms.
- **FINDING-2 (CONCERN)**: `agentic-lib-state.toml` shows `mission-complete = false` despite MISSION_COMPLETE.md existing. State file and commit messages disagree.
- **FINDING-3 (CRITICAL)**: Config requires `min-resolved-issues = 1` but no issues were created or resolved. The state machine cannot auto-declare complete via the normal path — the director bypassed this by writing MISSION_COMPLETE.md directly.
- **FINDING-4 (CONCERN)**: All transforms landed as direct commits, no PRs opened. Reduces auditability.

### Scenario Summary

| Metric | Value |
|--------|-------|
| Transforms | 3 |
| Budget | 3/128 |
| Mission complete | YES |
| Acceptance criteria | 8/8 PASS |
| Total tokens | 1,472,853 |

---

## Scenario S2: 5-kyu-apply-string-utils / repository0-string-utils / max

### Summary

Mission **not started**. Zero transforms, zero tokens. The pipeline ran init/purge and produced scaffold code but no transform PRs or implementation commits. The repo remains in zero-state with only metadata exports. All 8 acceptance criteria FAIL.

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| All 10 functions exported and work | FAIL | src/lib/main.js is scaffold-only: exports name, version, getIdentity. No string utils. |
| slugify("Hello World!") → "hello-world" | FAIL | No slugify function exists |
| truncate("Hello World", 8) → "Hello…" | FAIL | No truncate function exists |
| camelCase("foo-bar-baz") → "fooBarBaz" | FAIL | No camelCase function exists |
| Levenshtein("kitten","sitting") → 3 | FAIL | No levenshtein function exists |
| Edge cases handled | FAIL | No functions to handle edge cases |
| All unit tests pass | FAIL | CI passed but only tests scaffold metadata, not mission functions |
| README documents all functions | FAIL | README has no API documentation for string utilities |

### Findings

- **FINDING-1 (CRITICAL)**: Zero transforms executed. `transformation-budget = 0/0` — the budget was not set (0 cap means unlimited, but 0 used means nothing ran). The init produced scaffold but the agentic-lib-workflow never produced a transform.
- **FINDING-2 (CONCERN)**: Multiple workflow runs occurred (10) but all were init, test, pages-build, and report — no `agentic-lib-workflow` transform cycle ran during the flow window.
- **FINDING-3 (OBSERVATION)**: The flow produced benchmark report commits but no implementation commits. Pipeline is executing reporting flows rather than code transforms.

### Scenario Summary

| Metric | Value |
|--------|-------|
| Transforms | 0 |
| Budget | 0/0 |
| Mission complete | NO |
| Acceptance criteria | 0/8 PASS |
| Total tokens | 0 |

---

## Scenario S3: 6-kyu-understand-hamming-distance / repository0-dense-encoder / max

### Summary

Mission incomplete after 5 transforms. The `hammingString` and `hammingBits` functions are correctly implemented with Unicode support and BigInt, and the README documents them. However, unit tests do not exercise the Hamming API at all — they only check scaffold metadata. PR #67 was merged with zero code changes. Mission not declared complete.

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| hammingString("karolin","kathrin") → 3 | PASS | src/lib/main.js: hammingString using [...a] code-point expansion |
| hammingString("","") → 0 | PASS | Empty arrays produce diff=0 |
| Unequal-length strings throw RangeError | PASS | Explicit length check and RangeError throw in hammingString |
| hammingBits(1,4) → 2 | PASS | BigInt XOR + Kernighan bit count |
| hammingBits(0,0) → 0 | PASS | XOR of 0 and 0 is 0 |
| All unit tests pass | FAIL | tests/unit/main.test.js only checks identity/exports, not Hamming functions |
| README documents usage | PASS | README has Hamming API section with examples |

### Findings

- **FINDING-1 (POSITIVE)**: Correct implementations of both hammingString and hammingBits exist in source.
- **FINDING-2 (CRITICAL)**: Unit tests don't test the Hamming API at all. Tests only check scaffold metadata. This is the blocking gap for mission completion.
- **FINDING-3 (CONCERN)**: PR #67 merged with 0 additions / 0 deletions — a zero-diff transform was auto-merged. This is a process gap in the pipeline.
- **FINDING-4 (CONCERN)**: Issue #66 labelled 'merged' but remains open (closed_at null). Issue lifecycle management is broken.

### Scenario Summary

| Metric | Value |
|--------|-------|
| Transforms | 5 |
| Budget | 5/128 |
| Mission complete | NO |
| Acceptance criteria | 5/7 PASS (tests and mission-complete missing) |
| Total tokens | 2,809,663 |

---

## Scenario S4: 6-kyu-understand-roman-numerals / repository0-plot-code-lib / max

### Summary

Mission complete. `toRoman` and `fromRoman` implemented with strict subtractive notation validation (ROMAN_REGEX). Comprehensive test suite includes full 1–3999 round-trip loop. All criteria verified in source. However, no successful CI test run was recorded (the test run was cancelled), and the state file shows `mission-complete = false` despite MISSION_COMPLETE.md existing.

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| toRoman(1994) → "MCMXCIV" | PASS | src/lib/main.js ROMAN_MAP; tests/unit/roman.test.js asserts |
| fromRoman("MCMXCIV") → 1994 | PASS | src/lib/main.js ROMAN_REGEX parser; tests/unit/roman.test.js |
| toRoman(4) → "IV" | PASS | ROMAN_MAP includes [4,'IV']; test asserts |
| Round-trip 1–3999 | PASS | tests/unit/roman.test.js: loop `for (let n=1; n<=3999; n++)` |
| toRoman(0) throws RangeError | PASS | Explicit check num < 1; test asserts |
| toRoman(4000) throws RangeError | PASS | Explicit check num > 3999; test asserts |
| fromRoman("IIII") throws TypeError | PASS | ROMAN_REGEX rejects; test asserts |
| All unit tests pass | NOT TESTED | agentic-lib-test run 23391301592 was cancelled; no passing run recorded |
| README documents usage | PASS | README has Roman numerals API section with examples and table |

### Findings

- **FINDING-1 (POSITIVE)**: Excellent implementation with strict subtractive-notation validation via regex and comprehensive test coverage including full 1–3999 round-trip.
- **FINDING-2 (CRITICAL)**: State metadata inconsistent — commit 3cc919e1 says 'mission-complete' but `agentic-lib-state.toml` shows `mission-complete = false` and all `acceptance_criteria` entries show `met = false`.
- **FINDING-3 (CONCERN)**: No successful test run recorded. The agentic-lib-test run was cancelled. Mission was declared complete without CI verification.
- **FINDING-4 (CONCERN)**: Transforms landed directly on main with no PRs (pull-requests.json empty).
- **FINDING-5 (OBSERVATION)**: Issue #112 created after the mission-complete commit — an ordering bug where issue creation lags behind implementation.

### Scenario Summary

| Metric | Value |
|--------|-------|
| Transforms | 3 |
| Budget | 3/128 |
| Mission complete | YES |
| Acceptance criteria | 8/9 PASS, 1 NOT TESTED (CI run cancelled) |
| Total tokens | 1,135,997 |

---

## Cross-Scenario Findings

### FINDING-A: State file / MISSION_COMPLETE.md disagreement (CRITICAL — S1, S4)

Both completed scenarios (S1 fizz-buzz, S4 roman-numerals) show `agentic-lib-state.toml` with `mission-complete = false` while `MISSION_COMPLETE.md` exists on disk. The director writes the file but the state update doesn't persist to the logs branch. This is a known issue (BENCHMARK_REPORT_014.md FINDING: "W3 bug: not persisted on logs branch") that persists.

### FINDING-B: Zero transforms on string-utils despite max profile (CRITICAL — S2)

The 5-kyu-apply-string-utils scenario produced zero transforms. The transformation-budget shows `0/0` (budget not set), suggesting the flow's init phase may not have correctly configured the budget from the `max` profile. This needs investigation — the profile should set `transformation-budget = 128` but the state file shows 0.

### FINDING-C: Tests don't exercise the implemented API (PERSISTENT — S3)

The hamming-distance scenario (S3) has correct implementations but scaffold-only tests. After 5 transforms and 2.8M tokens, the pipeline still hasn't generated dedicated unit tests for the Hamming functions. This pattern — implementing functions without corresponding tests — has been observed across multiple benchmark runs.

### FINDING-D: No PR-based transforms (PERSISTENT — S1, S3, S4)

All three repos that had transforms (S1, S3, S4) applied changes via direct commits rather than PRs. `pull-requests.json` is empty for S1 and S4; S3 has one PR (#67) but it was a zero-diff merge. The `skipMaintain=true` flag used in the benchmark scripts may be contributing by bypassing the normal workflow cycle that creates PRs.

### FINDING-E: Cancelled test runs (CONCERN — S4)

The plot-code-lib test run was cancelled (23391301592), likely the same Docker container startup failure observed in the dense-encoder flow run earlier. This prevented CI verification of the mission-complete declaration.

---

## Comparison with Previous Reports

| Metric | Report 014 (v7.4.31, med) | Report 016 (v7.4.32, max) | This Report (v7.4.52, max) |
|--------|--------------------------|--------------------------|---------------------------|
| Fizz-buzz transforms | 2 | — | 3 |
| Fizz-buzz time to complete | ~12 min | — | ~10 min |
| Fizz-buzz acceptance | 8/8 | — | 8/8 |
| Roman-numerals transforms | 2 | — | 3 |
| Roman-numerals acceptance | 8/8 | — | 8/9 (1 NOT TESTED) |
| Hamming-distance transforms | 2 | — | 5 (incomplete) |
| String-utils transforms | — | — | 0 (not started) |

---

## Recommendations

1. **Investigate S2 zero-budget**: The string-utils scenario had `transformation-budget = 0/0`. Check whether the flow correctly passes the `max` profile to init and whether init sets the budget in `agentic-lib.toml` before the workflow cycle starts.
2. **Fix state file persistence**: The W3 bug (state file `mission-complete` not updated on logs branch) has persisted since Report 014. The director writes `MISSION_COMPLETE.md` but the state file doesn't reflect it.
3. **Enforce test generation**: Add a check in the transform pipeline that requires at least one test file importing from `src/lib/` before declaring mission-complete. Currently the pipeline can declare complete with scaffold-only tests (S3 pattern).
4. **Investigate PR-less transforms**: Determine whether `skipMaintain=true` causes the pipeline to bypass the normal branch→PR→merge cycle. If so, document this as expected benchmark behaviour or change the flag.
5. **Add Docker container retry**: The cancelled test runs (S4) from container startup failures should be retried automatically. Consider adding `continue-on-error: true` or a retry wrapper to the behaviour test job.

---

## Restoration Checklist

| Repo | Restored? | Verified? |
|------|-----------|-----------|
| repository0 | PENDING | PENDING |
| repository0-string-utils | PENDING | PENDING |
| repository0-dense-encoder | PENDING | PENDING |
| repository0-plot-code-lib | PENDING | PENDING |
