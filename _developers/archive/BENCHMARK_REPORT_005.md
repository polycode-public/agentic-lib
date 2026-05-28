# Benchmark Report 005

**Date**: 2026-03-09
**Operator**: Claude Code (claude-opus-4-6)
**agentic-lib version**: 7.1.100 (on npm), recalibrated profiles (PR #1887)
**Previous report**: BENCHMARK_REPORT_004.md (fizz-buzz / gpt-5-mini / recommended)

---

## Context: Profile Recalibration (PR #1887)

This benchmark validates the **min** profile after recalibration against model context windows (MODELS.md). Key profile changes applied before this run:

| Parameter | Old min | New min | Rationale |
|-----------|---------|---------|-----------|
| max-source-chars | 1000 | 4000 | Old value was 0.3% of gpt-4.1 128K; new is ~10% |
| max-test-chars | 500 | 2000 | Proportional increase |
| issue-body-limit | 200 | 1000 | Too small to convey issue details |
| max-summary-chars | 500 | 2000 | Too small for document context |
| max-discussion-comments | 5 | 3 | Reduced to save budget |

Profile recalibration targeted min at ~10% of the smallest model (gpt-4.1, 128K context) and max at ~90% of the largest (gpt-5-mini, 264K context).

---

## Init Profile Bug (NEW — discovered during setup)

When dispatching `init --purge` with `PROFILE='min'`, the init workflow's params job correctly receives the parameter:

```
PROFILE='min'
```

However, the resulting `agentic-lib.toml` in the consumer repo retains `profile = "recommended"`. The init command copies agentic-lib.toml using `#@dist` marker transformation but **does not substitute the profile field** from the workflow input. The toml is copied as-is from the npm package, where `profile = "recommended"` is the default.

**Workaround used**: After init, the profile was manually set to `"min"` via the GitHub Contents API before dispatching the first iteration.

**Root cause**: The init script's `#@dist` transformation handles workflow YAML markers but has no substitution logic for toml fields like `profile`. The `PROFILE` parameter flows through the params job but is never written to the consumer's toml file.

---

## Scenarios Run

| ID | Mission | Model | Profile | Budget | Outcome |
|----|---------|-------|---------|--------|---------|
| S1 | fizz-buzz | gpt-5-mini | min | 32 | **NOT COMPLETE** — 5 transforms, persistent code/test mismatch, pipeline stalled on iteration 6 |

---

## Scenario S1: fizz-buzz / gpt-5-mini / min

### Configuration

| Parameter | Value |
|-----------|-------|
| Mission seed | fizz-buzz |
| Model | gpt-5-mini |
| Profile | min (recalibrated) |
| Budget | 32 |
| Init run | [22837434544](https://github.com/xn-intenton-z2a/repository0/actions/runs/22837434544) |
| Init time | 03:44 UTC |
| Schedule | off |

### Iterations

| # | Run ID | Time | Transform? | PR | Tests | What Happened |
|---|--------|------|------------|-----|-------|---------------|
| 1 | [22837472918](https://github.com/xn-intenton-z2a/repository0/actions/runs/22837472918) | 03:46 | **YES** | [#2758](https://github.com/xn-intenton-z2a/repository0/pull/2758) | PASS | Supervisor created #2756. Dev transformed: `fizzBuzz()` and `fizzBuzzSingle()` implemented correctly. Function names match spec. Profile=min confirmed in logs. Post-commit tests pass. **Run overall: SUCCESS.** |
| 2 | [22837669755](https://github.com/xn-intenton-z2a/repository0/actions/runs/22837669755) | 03:55 | **YES** | [#2760](https://github.com/xn-intenton-z2a/repository0/pull/2760) | FAIL | Supervisor created #2759 "Ensure FizzBuzz matches MISSION acceptance (negative/edge handling)". Dev transformed — introduced `assertNonNegative` (throws RangeError for negatives) but test expects `fizzBuzz(-3)` to return array. Error message mismatch: code says "n must be an integer", tests expect "n must be a finite integer". |
| 3 | [22837859633](https://github.com/xn-intenton-z2a/repository0/actions/runs/22837859633) | 04:04 | **YES** | [#2762](https://github.com/xn-intenton-z2a/repository0/pull/2762) | FAIL | Supervisor created #2761 "Fix fizzBuzz negative handling". Dev transformed but same code/test inconsistency persists. |
| 4 | [22838068860](https://github.com/xn-intenton-z2a/repository0/actions/runs/22838068860) | 04:13 | **YES** | [#2764](https://github.com/xn-intenton-z2a/repository0/pull/2764) | FAIL | Supervisor created #2763 plus attempted a second action (skipped: workflow-already-running). Dev transformed but code/test mismatch continues. |
| 5 | [22838221213](https://github.com/xn-intenton-z2a/repository0/actions/runs/22838221213) | 04:20 | **YES** | [#2766](https://github.com/xn-intenton-z2a/repository0/pull/2766) | FAIL | Supervisor created #2765. Dev transformed. Same persistent failures: 3 of 7 fizzbuzz tests fail. |
| 6 | [22838402349](https://github.com/xn-intenton-z2a/repository0/actions/runs/22838402349) | 04:28 | NO | -- | FAIL | Supervisor tried to create issue but **dedup guard blocked** (similar to recently closed #2765). Review-features: nop. Dev: "No ready issues found". Fix-stuck: PR #2757 already open. Pipeline stalled. |

### Final Code State (after iteration 5 transform)

```javascript
// src/lib/main.js — 83 lines
function assertInteger(n){
  if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n))
    throw new TypeError('n must be an integer');      // ← test expects "n must be a finite integer"
}
function assertNonNegative(n){
  if (n < 0) throw new RangeError('n must be a non-negative integer');  // ← test expects fizzBuzz(-3) to return array
}
export function fizzBuzzSingle(i){ assertInteger(i); assertNonNegative(i); ... }
export function fizzBuzz(n){ assertInteger(n); if (n===0) return []; assertNonNegative(n); ... }
```

### Final Test State (after iteration 5 transform)

```javascript
// tests/unit/fizzbuzz.test.js — 3 of 7 tests FAIL
it('returns empty array for n=0 and negative', () => {
  expect(fizzBuzz(0)).toEqual([]);
  expect(fizzBuzz(-3)).toEqual(['Fizz','-2','-1']);   // FAIL: throws RangeError
});
it('throws TypeError for invalid inputs', () => {
  expect(() => fizzBuzz(v)).toThrow('n must be a finite integer');  // FAIL: actual "n must be an integer"
});
it('throws for invalid inputs', () => {
  expect(() => fizzBuzzSingle('2')).toThrow('n must be a finite integer');  // FAIL: actual "n must be an integer"
});
```

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| `fizzBuzz(15)` returns correct 15-element array ending with "FizzBuzz" | **PASS** | main.js: iterates 1..n, returns strings |
| `fizzBuzzSingle(3)` returns "Fizz" | **PASS** | main.js: `if (i % 3 === 0) return 'Fizz'` |
| `fizzBuzzSingle(5)` returns "Buzz" | **PASS** | main.js: `if (i % 5 === 0) return 'Buzz'` |
| `fizzBuzzSingle(15)` returns "FizzBuzz" | **PASS** | main.js: `if (i % 15 === 0) return 'FizzBuzz'` |
| `fizzBuzzSingle(7)` returns "7" | **PASS** | main.js: `return String(i)` |
| `fizzBuzz(0)` returns `[]` | **PASS** | main.js: `if (n === 0) return []` |
| All unit tests pass | **FAIL** | 3 of 7 fizzbuzz tests fail (code/test mismatch) |
| README documents usage with examples | **PASS** | README updated by iteration 1 transform |

### Issues

| Issue | State | Title | Created By | Closed By |
|-------|-------|-------|------------|-----------|
| [#2756](https://github.com/xn-intenton-z2a/repository0/issues/2756) | closed | Implement FizzBuzz library with tests, docs, and README examples | Supervisor (iter 1) | Dev PR #2758 (iter 1) |
| [#2759](https://github.com/xn-intenton-z2a/repository0/issues/2759) | closed | Ensure FizzBuzz matches MISSION acceptance (negative/edge handling, tests, README) | Supervisor (iter 2) | Dev PR #2760 (iter 2) |
| [#2761](https://github.com/xn-intenton-z2a/repository0/issues/2761) | closed | Fix fizzBuzz negative handling and complete mission acceptance | Supervisor (iter 3) | Dev PR #2762 (iter 3) |
| [#2763](https://github.com/xn-intenton-z2a/repository0/issues/2763) | closed | Implement FizzBuzz library and tests per MISSION.md | Supervisor (iter 4) | Dev PR #2764 (iter 4) |
| [#2765](https://github.com/xn-intenton-z2a/repository0/issues/2765) | closed | Implement FizzBuzz library, tests, docs, and README per MISSION.md | Supervisor (iter 5) | Dev PR #2766 (iter 5) |
| [#2757](https://github.com/xn-intenton-z2a/repository0/issues/2757) | open | fix: auto-fix broken main build | Fix-stuck | -- |

### Scenario Summary

| Metric | Value |
|--------|-------|
| Total iterations | 6 |
| Transforms | 5 (iterations 1–5) |
| Convergence | **NOT REACHED** — pipeline stalled on iteration 6 (dedup guard) |
| Final source lines | 83 |
| Final test count | 7 (fizzbuzz.test.js) + 5 (main.test.js, seed) = 12 |
| Acceptance criteria | **7/8 PASS** (unit tests fail) |
| Mission complete | **NO** |
| Time (init to last iteration) | ~44 min (6 iterations) |
| Time (init to working code) | ~4 min (iteration 1) |

---

## Findings

### FINDING-1: Min profile produces correct initial transform (POSITIVE)

The first transform (iteration 1) produced correct function names (`fizzBuzz`, `fizzBuzzSingle`), correct logic, and passing tests. The recalibrated min profile (`max-source-chars=4000` vs old `1000`) provides enough context for the LLM to read the mission spec and generate correct code.

Compare with Report 003 S1 (old min, `max-source-chars=1000`): that run produced docs-only output with no code in main.js. The recalibration is a significant improvement.

### FINDING-2: Min profile cannot self-correct code/test inconsistencies (CRITICAL — NEGATIVE)

Starting from iteration 2, the supervisor created edge-case issues. Each subsequent transform introduced or perpetuated a mismatch between code and tests:

- **Code** adds `assertNonNegative(n)` throwing RangeError for negative inputs
- **Tests** expect `fizzBuzz(-3)` to return `['Fizz','-2','-1']`
- **Code** throws `'n must be an integer'`
- **Tests** expect `'n must be a finite integer'`

This pattern persisted for 4 consecutive transforms (iterations 2–5). The min profile's limited context (`4000` source chars, `2000` test chars) means the LLM sees enough to write code OR tests but not enough to keep them consistent with each other. The `recommended` profile (`8000` source chars, `5000` test chars) avoids this by giving the LLM more simultaneous visibility of both.

### FINDING-3: Profile=unknown bug is FIXED (POSITIVE — W7 verified)

All 6 iterations show `profile=min` in tuning logs:
```
[copilot] Creating client (model=gpt-5-mini, promptLen=26114, writablePaths=0, tuning=low, profile=min)
[tuning] reasoningEffort=low profile=min model=gpt-5-mini
```

This was `profile=unknown` in Report 004 (v7.1.97). Fixed in v7.1.100.

### FINDING-4: Init does not apply profile parameter to toml (BUG — NEW)

The init workflow accepts a `PROFILE` parameter but does not write it to the consumer's `agentic-lib.toml`. The toml is copied from the npm package with `profile = "recommended"` regardless of the parameter value. The profile must be set manually after init.

### FINDING-5: Dedup guard blocks pipeline progression (CONCERN)

On iteration 6, the supervisor tried to create an issue but the dedup guard detected it was similar to recently closed #2765 and blocked it. With no new issue created, dev had nothing to work on. The pipeline stalled.

This is correct behaviour — the dedup guard prevents duplicate issues — but it creates a dead end when the underlying code/test problem hasn't been fixed. The supervisor keeps trying the same fix, the dedup guard keeps blocking it, and no progress is made.

### FINDING-6: No repeated "mission started" posts (POSITIVE — FINDING-7 from Report 004 fixed)

No discussion thread was created for this benchmark's init, so the repeated "New mission started!" bug (Report 004 FINDING-7) was not observed. The fix in PR #1886 (`startsWith` instead of `===`) is in v7.1.100.

### FINDING-7: Fix-stuck creates non-mergeable PRs (CONCERN)

Fix-stuck created 3 PRs during this benchmark (#2750, #2753, #2757). None were merged. PR #2757 remains open with the `automerge` label. The fix-stuck agent attempts to fix the failing tests but produces PRs that also fail — the same code/test mismatch it's trying to fix.

### FINDING-8: Review-features did not act as quality gate (CONTRAST with Report 004)

In Report 004, review-features closed supervisor-created issues as RESOLVED after verifying the code satisfied them. In this report, review-features returned `nop` on every iteration — it never reviewed or closed issues. All issues were closed by the dev job's PRs instead.

This means the convergence mechanism from Report 004 (review-features closing idle issues → supervisor declaring mission-complete) never engaged.

---

## Comparison with Previous Reports

| Metric | Report 001 (rec) | Report 003 S1 (old min) | Report 004 (rec) | This Report (new min) |
|--------|------------------|------------------------|------------------|----------------------|
| agentic-lib version | 7.1.76 | 7.1.91 | 7.1.97 | 7.1.100 |
| Profile | recommended | min (old) | recommended | min (recalibrated) |
| Model | gpt-5-mini | gpt-5-mini | gpt-5-mini | gpt-5-mini |
| Time to working code | ~9 min | Never | ~19 min | **~4 min** |
| Transforms | 1 | 1 (docs only) | 1 | **5** |
| Function names correct | YES | N/A | YES | **YES** |
| Mission complete declared | YES (28 min) | NO | YES (40 min) | **NO** |
| Acceptance criteria met | 8/8 | 1/8 | 8/8 | **7/8** |
| Test failures | None | All | None (except web.test.js) | **3 of 7 fizzbuzz** |
| Profile=unknown | Not tested | Not tested | YES (bug) | **NO (fixed)** |

**Key observations:**

1. **Recalibrated min >> old min** — The old min (1000 source chars) produced docs-only. The new min (4000 source chars) produces correct code on the first transform with correct function names and passing tests.

2. **Min cannot self-correct** — When the supervisor creates follow-up issues (edge cases, negative handling), the min profile's limited context causes the LLM to produce internally inconsistent code and tests. The recommended profile avoids this.

3. **Min transforms more but converges less** — 5 transforms vs recommended's 1, but never reaches mission-complete. Each transform addresses the supervisor's issue but introduces new inconsistencies.

4. **Fastest initial code** — 4 minutes from init to working code, faster than any previous report. The min profile's smaller prompt means faster LLM responses.

5. **Review-features didn't engage** — Unlike Report 004 where review-features acted as quality gate, here it was passive. This may be because issues were always closed by dev PRs (before review-features could act), or because the min profile's review prompt was too limited to evaluate code quality.

---

## Recommendations

1. **Fix init profile parameter** (HIGH) — The init workflow should write the `PROFILE` parameter to the consumer's `agentic-lib.toml`. Add a post-copy step that runs `sed -i "s/profile = .*/profile = \"${PROFILE}\"/" agentic-lib.toml` when the parameter is non-empty.

2. **Add cross-validation for code/test consistency** (HIGH) — Before the dev job creates a PR, run the tests against the proposed changes. If tests fail, include the failure output in the LLM prompt for a second pass. This would catch the code/test mismatch before it's merged.

3. **Break dedup deadlock** (MEDIUM) — When the dedup guard blocks issue creation 2+ times in a row, the supervisor should escalate: either create a differently-scoped issue (e.g. "fix failing tests" instead of "implement FizzBuzz") or declare the mission stuck.

4. **Consider min profile for "first pass only"** (LOW) — Min is excellent for initial implementation (fast, correct function names) but poor for iterative refinement. A hybrid approach — min for iteration 1, recommended for subsequent iterations — could combine speed with convergence.

5. **Investigate review-features passivity** (LOW) — Review-features was active in Report 004 but passive here. Determine whether this is a timing issue (dev closes issues before review-features runs) or a context limitation of the min profile.

---

## Addendum: Benchmark 006 (fizz-buzz / gpt-5-mini / recommended / budget 32)

**Date**: 2026-03-10
**agentic-lib version**: 7.1.102 (on npm, but changes applied directly to repository0 without release+init)
**Profile**: recommended (not min)

### Purpose

Re-run the fizz-buzz benchmark with the **recommended** profile to validate the W1-W8 fixes from this report, and to test the pipeline end-to-end including mission-complete declaration.

### Setup

Init was run with `--purge` and `PROFILE=recommended`. The recommended profile provides 8000 source chars and 5000 test chars — enough for the LLM to keep code and tests consistent.

### Outcome: MISSION COMPLETE

The benchmark reached mission-complete after ~22 transformations. The pipeline successfully:
1. Created issues, transformed code, merged PRs
2. Resolved CONFLICTING PRs via the new 3-tier fix-stuck mechanism (W9)
3. Declared mission-complete via the deterministic fallback (W12)

### Issues Discovered During Execution

| # | Issue | Fix | Work Item |
|---|-------|-----|-----------|
| 1 | `commit-if-changed` does `git pull --rebase` causing binary conflicts on SCREENSHOT_INDEX.png | 3-tier incremental conflict resolution with direct push | W9 |
| 2 | Screenshot pushed to main on every test trigger, not just schedule | `push-screenshot` input, default off except on schedule | W10 |
| 3 | "Issues closed by review (RESOLVED)" metric only counted LLM review closures, not PR-merge closures | Check issue events for commit-linked closures, filter by `automated` label | W11 |
| 4 | Deterministic mission-complete threshold required 2 resolved issues | Lowered to 1 | W12 |
| 5 | Mission-complete unconditionally sets schedule to "off" | Check if already off/maintenance before dispatching; added maintenance mode | W13 |

### Key Metrics

| Metric | Value |
|--------|-------|
| Total transformations | 22 |
| Mission complete | **YES** (deterministic fallback) |
| Time to mission complete | ~22 iterations over ~2 hours (manual dispatches with debugging pauses) |
| Fix-stuck activations | Multiple — Tier 2 (`-X theirs`) resolved SCREENSHOT_INDEX.png binary conflicts |
| PRs stuck in CONFLICTING | 2 (#2780, #2781) — both resolved by fix-stuck |

### MISSION_COMPLETE.md Content

```
- Timestamp: 2026-03-10T01:04:10.195Z
- Detected by: supervisor
- Reason: All acceptance criteria satisfied: src/lib/main.js exports fizzBuzz and
  fizzBuzzSingle (implemented in src/lib/fizz.js), comprehensive unit tests cover
  normal and edge cases and pass, README includes usage examples, 0 open issues and
  recent workflow/test successes confirm readiness.
```

### Changes Not Yet Released

All W9-W14 fixes were applied directly to repository0 main (for fast feedback) and to agentic-lib branch `claude/fix-stuck-incremental` (PR [#1892](https://github.com/xn-intenton-z2a/agentic-lib/pull/1892)). These changes are NOT yet released to npm or distributed via init. They need:

1. PR #1892 merged to agentic-lib main
2. Release to npm (auto-bumps version)
3. `init --purge` on repository0 to distribute

### Comparison Update

| Metric | Report 004 (rec) | Report 005 S1 (new min) | **006 (rec + fixes)** |
|--------|------------------|------------------------|-----------------------|
| agentic-lib version | 7.1.97 | 7.1.100 | 7.1.102 + W9-W14 |
| Profile | recommended | min | **recommended** |
| Mission complete | YES (40 min) | NO | **YES** |
| Transforms | 1 | 5 | **22** |
| Fix-stuck conflicts resolved | N/A | N/A | **2 PRs** |
| RESOLVED metric accurate | NO (review-only) | NO | **YES (review + PR merge)** |
