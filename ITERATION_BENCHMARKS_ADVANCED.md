# Advanced Iteration Benchmarks

Benchmarks for higher complexity missions (2-4 kyu) at `max` profile across 4 repositories using `agentic-lib-flow`. See `MODELS.md § Benchmarking` for shared definitions (target repos, mission seeds, profiles, monitoring commands, conventions).

## Prompt

```text
Please read ITERATION_BENCHMARKS_ADVANCED.md and MODELS.md § Benchmarking.
Run scripts/all-repositories-benchmarks-advanced.sh to dispatch the flow workflows.
Once complete, collect the BENCHMARK_REPORT_NNN.md committed in each tested repository
and synthesise them into a BENCHMARK_REPORT_ADVANCED_NNN.md in the agentic-lib project root.
The session should run hands free but you can start working on a fix plan like
_developers/archive/PLAN_BENCHMARK_007_FIXES.md and work on those fixes in a branch,
test, merge then use your release and init skill to have all 4 repos use it.
Re-use the same branch for multiple fixes as part of the same benchmarking session
and keep updating what has been found and/or fixed in the fixes plan document.
After benchmarks, restore repos to their default missions using scripts/all-repositories-init.sh.
```

## Quick Start

1. Read this file and `MODELS.md § Benchmarking`
2. Run **Pre-flight check** (below)
3. Execute `scripts/all-repositories-benchmarks-advanced.sh`
4. Monitor flows (see `MODELS.md § Monitoring Commands`)
5. Collect committed reports from each repo (see `MODELS.md § Collecting Reports from Repos`)
6. Pick the next report number (check for existing `BENCHMARK_REPORT_ADVANCED_NNN.md` files)
7. Write consolidated report to `BENCHMARK_REPORT_ADVANCED_NNN.md` in the project root
8. Restore repos (see `MODELS.md § Restore After Benchmarks`)

---

## Objective

Establish complexity-scaling benchmarks — how does the pipeline handle missions above 5-kyu? Same 4 repos, higher-kyu missions, all at `max` profile:

| Kyu | Target runs to mission-complete | Rationale |
|-----|--------------------------------|-----------|
| 4 | **3 runs** | Medium missions may need review/maintain cycles and multiple transforms. |
| 3 | **5 runs** | Hard missions. Physics simulation requires iterative convergence. |
| 2 | **5 runs** | Very hard. Multi-output library. Regression test vs Report 016. |

A scenario **passes** if it reaches mission-complete within the target run count. A scenario **fails** if it exceeds the target or hits budget exhaustion / mission-failed.

---

## What We're Testing

1. **Kyu scaling** — How does iteration count, token cost, and success rate change from 4 kyu → 3 kyu → 2 kyu?
2. **Mission type difficulty** — Which missions are hardest for the LLM: encoding schemes (dense-encoding), structural analysis (json-schema-diff), domain-specific algorithms (lunar-lander), or multi-output libraries (plot-code-lib)?
3. **Test generation quality** — Do harder missions prompt better test coverage than simple ones?
4. **Convergence behaviour** — Do 3-2 kyu missions converge or get stuck in code/test mismatch loops?
5. **Regression** — Does A4 (plot-code-lib) match or improve on Benchmark 016 results?

**Built-in comparisons:**
- **A1 vs A2**: Two different 4-kyu missions — does mission type affect convergence?
- **A3**: 3-kyu stress test — how does the pipeline handle domain-specific physics algorithms?
- **A4 vs Report 016**: Plot-code-lib rerun — regression test against the prior benchmark

---

## Scenario Matrix

4 concurrent scenarios across 4 repos. All use `gpt-5-mini` model and `max` profile.

| ID | Repo | Mission | Profile | Budget | Target Runs | Purpose |
|----|------|---------|---------|--------|-------------|---------|
| A1 | repository0-random | 4-kyu-apply-dense-encoding | max | 128 | 3 | 4-kyu: multiple encoding schemes, round-trip correctness |
| A2 | repository0-string-utils | 4-kyu-analyze-json-schema-diff | max | 128 | 3 | 4-kyu: structural diffing, path tracking |
| A3 | repository0-dense-encoder | 3-kyu-analyze-lunar-lander | max | 128 | 5 | 3-kyu stress test: physics simulation |
| A4 | repository0-plot-code-lib | 2-kyu-create-plot-code-lib | max | 128 | 5 | Name affinity. Regression test vs Benchmark 016 |

---

## Pre-Flight Check

Before running the script, verify it matches the scenario matrix above and that restore will use the correct default missions.

**1. Verify script ↔ doc alignment:**

Read `scripts/all-repositories-benchmarks-advanced.sh` and check each `gh workflow run` dispatch:

| Scenario | Script should dispatch | Mission seed | Repo |
|----------|----------------------|--------------|------|
| A1 | `repository0-random` | `4-kyu-apply-dense-encoding` | repository0-random |
| A2 | `repository0-string-utils` | `4-kyu-analyze-json-schema-diff` | repository0-string-utils |
| A3 | `repository0-dense-encoder` | `3-kyu-analyze-lunar-lander` | repository0-dense-encoder |
| A4 | `repository0-plot-code-lib` | `2-kyu-create-plot-code-lib` | repository0-plot-code-lib |

If the script doesn't match, prompt the user: _"The script dispatches `<mission>` to `<repo>` but the doc says `<other-mission>`. Update the script, update the doc, or proceed as-is?"_

**2. Verify restore script uses default missions** (from `MODELS.md § Target Repositories`):

| Repo | Default Mission (restore target) |
|------|----------------------------------|
| repository0-random | `random` |
| repository0-string-utils | `5-kyu-apply-string-utils` |
| repository0-dense-encoder | `4-kyu-apply-dense-encoding` |
| repository0-plot-code-lib | `2-kyu-create-plot-code-lib` |

Check that `scripts/all-repositories-init.sh` dispatches these missions.

**3. Verify script common parameters:**

The benchmark script should use: `mode=purge`, `schedule=off`, `generate_report=true`.

---

## Execution

```bash
scripts/all-repositories-benchmarks-advanced.sh
```

This dispatches `agentic-lib-flow` to all 4 repos concurrently. Each flow runs: update → init (purge) → (test + bot + N×workflow) × rounds → verify → report.

**Monitor progress** using the commands in `MODELS.md § Monitoring Commands`.

For advanced scenarios (3-2 kyu), additionally watch for:
- **Convergence stalls** — Rising `cumulative-nop-cycles` with no `cumulative-transforms` increase.
- **Token consumption scaling** — Compare `total-tokens` across kyu levels. A3-A4 may use 5-10x more tokens than A1-A2.
- **Multi-file source growth** — Check for files in `src/lib/` beyond main.js:
  ```bash
  gh api repos/polycode-public/REPO_NAME/contents/src/lib -q '.[].name'
  ```
- **Lockfile desync** — Report 016 found the LLM adding dependencies without `npm install` breaks CI. Watch for `npm ci` failures.
- **Acceptance bookkeeping** — Does `agentic-lib-state.toml` mark criteria as `met=true`? Prior reports show this is consistently broken.

**Wait for completion:**

```bash
REPOS="repository0-random repository0-string-utils repository0-dense-encoder repository0-plot-code-lib"

for REPO in $REPOS; do
  echo -n "$REPO: "
  gh run list -R polycode-public/$REPO -w agentic-lib-flow -L 1 \
    --json status,conclusion --jq '.[0] | "\(.status) \(.conclusion)"'
done
```

---

## Report Collection

Once all flows complete, each repo will have a `BENCHMARK_REPORT_NNN.md` committed to its main branch. Collect and synthesise these into the consolidated report using the procedure in `MODELS.md § Collecting Reports from Repos`.

---

## Restore

After collecting all benchmark data, restore repos to their default missions:

```bash
scripts/all-repositories-init.sh
```

Then verify using the commands in `MODELS.md § Restore After Benchmarks`.

---

## Report Template

Reports are saved as `BENCHMARK_REPORT_ADVANCED_NNN.md` in the project root.

````markdown

# Benchmark Report NNN

**Date**: YYYY-MM-DD
**Operator**: Claude Code (model-id)
**agentic-lib version**: X.Y.Z
**Previous report**: BENCHMARK_REPORT_ADVANCED_MMM.md (or "none")
**Method**: `scripts/all-repositories-benchmarks-advanced.sh` → per-repo `agentic-lib-report` enrichment

---

## Dashboard

| ID | Repo | Mission | Profile | Transforms | Budget | Outcome | Tokens |
|----|------|---------|---------|------------|--------|---------|--------|
| A1 | repository0-random | dense-encoding | max | N | N/128 | ... | N |
| A2 | repository0-string-utils | json-schema-diff | max | N | N/128 | ... | N |
| A3 | repository0-dense-encoder | lunar-lander | max | N | N/128 | ... | N |
| A4 | repository0-plot-code-lib | plot-code-lib | max | N | N/128 | ... | N |

---

## Kyu Scaling

| Metric | A1 (4-kyu) | A2 (4-kyu) | A3 (3-kyu) | A4 (2-kyu) |
|--------|-----------|-----------|-----------|-----------|
| Transforms | N | N | N | N |
| Budget used | N/128 | N/128 | N/128 | N/128 |
| Tokens | N | N | N | N |
| Source lines | N | N | N | N |
| Test files | N | N | N | N |
| PRs merged | N | N | N | N |
| Acceptance | N/M | N/M | N/M | N/M |
| Mission complete | YES/NO | YES/NO | YES/NO | YES/NO |
| Flow wall clock | Xmin | Xmin | Xmin | Xmin |

---

## Regression: plot-code-lib (A4 vs Report 016)

| Metric | Report 016 (v7.4.32) | A4 (vX.Y.Z) |
|--------|---------------------|-------------|
| Transforms to complete | 4 | N |
| Time to complete | ~3h 45m | Xmin |
| Unit tests | 28 | N |
| Acceptance criteria | 8/8 in code, 0 ticked | N/M |
| Lockfile desync | YES (PR #32) | YES / NO |

---

## Scenario A?: mission-name / repo / profile

### Summary

Brief description of outcome.

### Acceptance Criteria

| Criterion | Status | Evidence |
|-----------|--------|----------|
| criterion text | PASS / FAIL / NOT TESTED | file:line or description |

### Findings

- **FINDING-N (POSITIVE / CONCERN / REGRESSION)**: Description.

### Scenario Summary

| Metric | Value |
|--------|-------|
| Transforms | N |
| Budget | N/128 |
| Mission complete | YES / NO |
| Acceptance criteria | N/M PASS |
| Total tokens | N |

---

## Cross-Scenario Analysis

### Mission Type Difficulty

| Mission | Kyu | Transforms | Tokens | Time | Verdict |
|---------|-----|------------|--------|------|---------|
| dense-encoding | 4 | N | N | Xmin | ... |
| json-schema-diff | 4 | N | N | Xmin | ... |
| lunar-lander | 3 | N | N | Xmin | ... |
| plot-code-lib | 2 | N | N | Xmin | ... |

### Test Generation Quality

| Scenario | Test Files | Test Approach | Quality |
|----------|-----------|---------------|---------|
| A1 | N | ... | ... |
| A2 | N | ... | ... |
| A3 | N | ... | ... |
| A4 | N | ... | ... |

### Convergence Behaviour

Description of convergence patterns across scenarios.

---

## Findings

### FINDING-N: Title (POSITIVE / CONCERN / REGRESSION)

Description.

---

## Comparison with Previous Reports

Compare against these archived reports:
- **BENCHMARK_REPORT_016.md** (v7.4.32) — plot-code-lib 2-kyu on max (primary regression target)
- **BENCHMARK_REPORT_SIMPLE_018.md** (v7.4.52) — fizz-buzz, string-utils, hamming-distance, roman-numerals on `max`
- **BENCHMARK_REPORT_ADVANCED_019.md** (v7.4.56) — dense-encoding, json-schema-diff, lunar-lander, plot-code-lib on `max`

| Metric | Prior Report | This Report |
|--------|-------------|-------------|
| metric | value | value |

---

## Recommendations

Numbered list of actionable next steps.

---

## Restoration Checklist

| Repo | Restored? | Verified? |
|------|-----------|-----------|
| repository0-random | YES / NO | YES / NO |
| repository0-string-utils | YES / NO | YES / NO |
| repository0-dense-encoder | YES / NO | YES / NO |
| repository0-plot-code-lib | YES / NO | YES / NO |
````
