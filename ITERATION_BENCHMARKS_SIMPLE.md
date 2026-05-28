# Simple Iteration Benchmarks

Benchmarks for simple missions (5-7 kyu) at `max` profile across 4 repositories using `agentic-lib-flow`. See `MODELS.md § Benchmarking` for shared definitions (target repos, mission seeds, profiles, monitoring commands, conventions).

## Prompt

```text
Please read ITERATION_BENCHMARKS_SIMPLE.md and MODELS.md § Benchmarking.
Run scripts/all-repositories-benchmarks-simple.sh to dispatch the flow workflows.
Once complete, collect the BENCHMARK_REPORT_NNN.md committed in each tested repository
and synthesise them into a BENCHMARK_REPORT_SIMPLE_NNN.md in the agentic-lib project root.
The session should run hands free but you can start working on a fix plan like
_developers/archive/PLAN_BENCHMARK_015_FIXES.md and work on those fixes in a branch,
test, merge then use your release and init skill to have all 4 repos use it.
Re-use the same branch for multiple fixes as part of the same benchmarking session
and keep updating what has been found and/or fixed in the fixes plan document.
After benchmarks, restore repos to their default missions using scripts/all-repositories-init.sh.
```

## Quick Start

1. Read this file and `MODELS.md § Benchmarking`
2. Run **Pre-flight check** (below)
3. Execute `scripts/all-repositories-benchmarks-simple.sh`
4. Monitor flows (see `MODELS.md § Monitoring Commands`)
5. Collect committed reports from each repo (see `MODELS.md § Collecting Reports from Repos`)
6. Pick the next report number (check for existing `BENCHMARK_REPORT_SIMPLE_NNN.md` files)
7. Write consolidated report to `BENCHMARK_REPORT_SIMPLE_NNN.md` in the project root
8. Restore repos (see `MODELS.md § Restore After Benchmarks`)

---

## Objective

Establish "on-sight" doability benchmarks — the number of `agentic-lib-workflow` runs needed to reach mission-complete for each kyu tier, running all scenarios concurrently across 4 repos at `max` profile:

| Kyu | Target runs to mission-complete | Rationale |
|-----|--------------------------------|-----------|
| 8, 7, 6 | **1 run** | Simple missions should complete in a single workflow cycle. |
| 5, 4 | **3 runs** | Medium missions may need a review/maintain cycle and a second transform. |

A scenario **passes** if it reaches mission-complete within the target run count. A scenario **fails** if it exceeds the target or hits budget exhaustion / mission-failed.

**Note**: Simple missions (7-kyu, 6-kyu) often complete via bot/director direct commits to main rather than dev-job PRs. This is expected behaviour — the bot or director can implement trivial functions and declare mission-complete before the dev job's branch→PR→merge cycle fires. PR-less transforms in simple benchmarks are not a bug.

---

## Scenario Matrix

4 concurrent scenarios, one per repo. All use `gpt-5-mini` model and `max` profile.

| ID | Repo | Mission | Profile | Budget | Target Runs | Purpose |
|----|------|---------|---------|--------|-------------|---------|
| S1 | repository0-random | 6-kyu-understand-roman-numerals | max | 128 | 1 | 6-kyu with round-trip property, subtractive notation |
| S2 | repository0-string-utils | 5-kyu-apply-string-utils | max | 128 | 3 | Name affinity. 5-kyu medium complexity |
| S3 | repository0-dense-encoder | 6-kyu-understand-hamming-distance | max | 128 | 1 | 6-kyu with Unicode/BigInt edge cases |
| S4 | repository0-plot-code-lib | 6-kyu-understand-roman-numerals | max | 128 | 1 | 6-kyu with round-trip property |

---

## Pre-Flight Check

Before running the script, verify it matches the scenario matrix above and that restore will use the correct default missions.

**1. Verify script ↔ doc alignment:**

Read `scripts/all-repositories-benchmarks-simple.sh` and check each `gh workflow run` dispatch:

| Scenario | Script should dispatch | Mission seed | Repo |
|----------|----------------------|--------------|------|
| S1 | `repository0-random` | `6-kyu-understand-roman-numerals` | repository0-random |
| S2 | `repository0-string-utils` | `5-kyu-apply-string-utils` | repository0-string-utils |
| S3 | `repository0-dense-encoder` | `6-kyu-understand-hamming-distance` | repository0-dense-encoder |
| S4 | `repository0-plot-code-lib` | `6-kyu-understand-roman-numerals` | repository0-plot-code-lib |

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
scripts/all-repositories-benchmarks-simple.sh
```

This dispatches `agentic-lib-flow` to all 4 repos concurrently. Each flow runs: update → init (purge) → (test + bot + N×workflow) × rounds → verify → report.

**Monitor progress** using the commands in `MODELS.md § Monitoring Commands`.

**Wait for completion** — check flow run status:

```bash
REPOS="repository0-random repository0-string-utils repository0-dense-encoder repository0-plot-code-lib"

for REPO in $REPOS; do
  echo -n "$REPO: "
  gh run list -R xn-intenton-z2a/$REPO -w agentic-lib-flow -L 1 \
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

Reports are saved as `BENCHMARK_REPORT_SIMPLE_NNN.md` in the project root.

```markdown

# Benchmark Report NNN

**Date**: YYYY-MM-DD
**Operator**: Claude Code (model-id)
**agentic-lib version**: X.Y.Z
**Previous report**: BENCHMARK_REPORT_SIMPLE_MMM.md (or "none")
**Method**: `scripts/all-repositories-benchmarks-simple.sh` → per-repo `agentic-lib-report` enrichment

---

## Dashboard

| ID | Repo | Mission | Profile | Transforms | Budget | Outcome | Tokens |
|----|------|---------|---------|------------|--------|---------|--------|
| S1 | repository0-random | roman-numerals | max | N | N/128 | ... | N |
| S2 | repository0-string-utils | string-utils | max | N | N/128 | ... | N |
| S3 | repository0-dense-encoder | hamming | max | N | N/128 | ... | N |
| S4 | repository0-plot-code-lib | roman | max | N | N/128 | ... | N |

---

## Scenario S?: mission-name / repo / profile

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

## Findings

### FINDING-N: Title (POSITIVE / CONCERN / REGRESSION)

Description.

---

## Comparison with Previous Reports

Compare against baseline reports (archived in `_developers/archive/`):
- **BENCHMARK_REPORT_SIMPLE_018.md** (v7.4.52) — fizz-buzz, string-utils, hamming-distance, roman-numerals on `max`

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
```
