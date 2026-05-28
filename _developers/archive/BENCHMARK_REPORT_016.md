# Benchmark Report 016

**Date**: 2026-03-20
**Operator**: Claude Code (claude-opus-4-6)
**agentic-lib version**: 7.4.32
**Previous report**: BENCHMARK_REPORT_015.md

---

## Summary

Evaluated the first 20 hours of `repository0-plot-code-lib`, a new repository created at 01:39 UTC on 2026-03-20 using the `2-kyu-create-plot-code-lib` mission seed. The repository ran through three distinct phases: initial mission completion, a restart to re-verify, and sustained maintenance mode. The mission was completed **twice** (at 05:45 and 12:09 UTC). A dependency lockfile desync caused by an autonomous transform (PR #32 adding `sharp`) broke CI for ~3 hours in the afternoon until a manual re-init resolved it.

---

## Configuration

| Parameter | Value |
|-----------|-------|
| Repository | `xn-intenton-z2a/repository0-plot-code-lib` |
| Mission seed | `2-kyu-create-plot-code-lib` |
| Mission | JavaScript plotting library + CLI (SVG/PNG, CSV, expressions) |
| Model | gpt-5-mini |
| Profile | max |
| Budget | 128 (transformation-budget) |
| Init time | 02:01 UTC |
| agentic-lib version | 7.4.32 |

---

## Phase 1: Initial Mission (02:01 – 05:46 UTC)

### Timeline

| # | Time | Event | Commit | PR | What Happened |
|---|------|-------|--------|-----|---------------|
| — | 01:39 | Repo created | b2a0387 | — | Initial commit |
| — | 02:01 | Init purge | 55cf112 | — | agentic-lib@7.4.32 seeded with 2-kyu-create-plot-code-lib |
| 1 | 02:10 | Maintain | 3e6a58c | — | First autonomous maintain cycle |
| 2 | 02:38 | **Transform** | 9ca324d | #9 | Issues #5, #4, #7, #8 — initial expression parser, range evaluator, SVG renderer |
| 3 | 03:15 | Maintain | 41f6235 | — | Feature maintenance |
| 4 | 03:36 | **Transform** | cd59d2f | #11 | Issues #5, #4, #7, #8, #10 — CSV loader, PNG renderer, CLI framework |
| 5 | 04:19 | Maintain + AC | 519daa6 | — | Acceptance criteria checkbox update attempted |
| 6 | 04:40 | **Transform** | 7a99338 | #12 | Issues #10, #7, #8 — refinements to plotting pipeline |
| 7 | 05:09 | Maintain | fb481a8 | — | Feature maintenance |
| 8 | 05:29 | **Transform** | 26ada67 | #14 | Issues #10, #7, #8 — test coverage, SVG validation |
| 9 | 05:43 | Maintain | af01e81 | — | Final maintain |
| — | 05:45 | **MISSION-COMPLETE** | 006dc68 | — | "Core plotting library, CLI, SVG/PNG rendering, CSV loading..." |
| — | 05:46 | Schedule off | 5ed0e68 | — | Operator set schedule to off |

### Phase 1 Summary

| Metric | Value |
|--------|-------|
| Elapsed time | ~3h 45m |
| Iterations (maintain + transform) | 9 |
| Transforms | 4 |
| PRs merged | 4 (#9, #11, #12, #14) |
| Source lines (main.js) | ~48 |
| Test files | 8 unit + 1 behaviour |
| Tests passing | 28 unit + 3 behaviour |
| Mission complete | YES |

---

## Phase 2: Restart Verification (09:31 – 12:09 UTC)

The operator restarted the schedule to verify the mission would complete again after a reset.

| # | Time | Event | Commit | PR | What Happened |
|---|------|-------|--------|-----|---------------|
| — | 09:31 | Schedule hourly | b371c2a | — | Operator set hourly + maintenance mode with mission reset |
| 1 | 10:32 | Maintain | 24b5455 | — | Maintenance cycle |
| 2 | 10:48 | **Transform** | 897f3c1 | #16 | Issues #8, #13, #15 — additional refinements |
| 3 | 12:06 | Maintain | 0136a24 | — | Final maintain |
| — | 12:09 | **MISSION-COMPLETE** | a780c09 | — | "Core library, CLI, SVG/PNG rendering, CSV loader, and unit tests..." |
| — | 12:09 | Schedule off | 5b12853 | — | Operator set schedule to off |

### Phase 2 Summary

| Metric | Value |
|--------|-------|
| Elapsed time | ~2h 38m |
| Iterations | 3 |
| Transforms | 1 |
| PRs merged | 1 (#16) |
| Mission complete | YES (second time) |

---

## Phase 3: Maintenance Mode (12:42 – 21:57 UTC)

Operator enabled maintenance mode with a more frequent cron schedule. The system continued iterating — producing 8 more transforms before a dependency desync broke CI.

### Transforms

| # | Time | PR | Issues Resolved | What Changed |
|---|------|----|-----------------|--------------|
| 1 | 14:50 | #21 | #8, #19, #20 | Feature refinements |
| 2 | 15:35 | #23 | #8, #20, #22 | Test improvements |
| 3 | 16:00 | #25 | #22, #24 | Feature + maintenance |
| 4 | 16:29 | #27 | #26 | Bug fix |
| 5 | 16:58 | #29 | #26 | Continued fix |
| 6 | 17:22 | #31 | #26, #30 | Multi-issue resolution |
| 7 | 17:47 | **#32** | #26, #30 | **Added `sharp` dep without lockfile update** |
| 8 | 21:53 | #42 | #40, #39, #38, #41 | Post-reinit recovery transform |

### Workflow Run Results (Phase 3)

| Time Range | Workflow Runs | Success | Failure | Cancelled | Notes |
|------------|--------------|---------|---------|-----------|-------|
| 12:26–13:46 | 4 | 3 | 1 | 0 | One `review-features` flake |
| 14:24–17:21 | 8 | 2 | 4 | 2 | Mixed: `review-features` flakes + some successes |
| 17:37–21:13 | 14 | 0 | 10 | 4 | **All failures** — `sharp` lockfile desync |
| 21:27 | 1 | 1 | 0 | 0 | Post-reinit: **all green** |

### The sharp Incident

**Root cause**: PR #32 (merged 17:47 UTC) added `"sharp": "^0.32.3"` to `package.json` but did not regenerate `package-lock.json`. All subsequent `npm ci` calls failed with "Missing: sharp@0.32.6 from lock file".

**Impact**: 10 consecutive workflow failures over ~3 hours (18:13–21:13 UTC). Jobs affected: `fix-stuck`, `dev`, `post-commit-test/behaviour`, `post-commit-test/test`.

**Resolution**: Operator ran `init --purge` at 21:25 UTC, which reset project files (including package.json). The re-init removed the `sharp` dependency, restored lockfile sync, and the next workflow run succeeded.

**Structural issue**: The autonomous transform system can edit `package.json` to add dependencies but cannot run `npm install` to regenerate the lockfile. The `dispatch-fix` mechanism detected the instability (issue #40 filed) but couldn't fix it — the fix requires shell execution, not file editing. Meanwhile, `maintain` commits continued landing (they don't need `npm ci`), creating the illusion of activity while all code-path jobs were broken.

---

## Acceptance Criteria Assessment

| Criterion | Code Evidence | Checkbox Ticked |
|-----------|--------------|-----------------|
| Parsing `"y=Math.sin(x)"` returns callable function | `parseExpression()` in main.js:53-59 | NO |
| Evaluating range returns ~628 data points | `evaluateRange()` in main.js:63-95 | NO |
| SVG output contains `<polyline>` and `viewBox` | `renderSVG()` in main.js:116-152 | NO |
| PNG output starts with PNG magic bytes | `renderPNG()` in main.js:156-163 | NO |
| CLI `--expression` produces file | `cliMain()` in main.js:181-195 | NO |
| CLI `--help` prints usage | `cliMain()` in main.js:176-179 | NO |
| All unit tests pass | 28 unit tests passing | NO |
| README documents CLI usage | README has CLI section with examples | NO |

**All 8 criteria are satisfied in the code, but 0/8 checkboxes are ticked in MISSION.md.** The acceptance criteria update mechanism (`519daa6` at 04:19) ran but did not persist the checkbox changes. This confirms FINDING-5 from report 015 — the regex matching between LLM-reported criteria and MISSION.md checkbox text is unreliable.

---

## Aggregate Statistics

| Metric | Phase 1 | Phase 2 | Phase 3 | Total |
|--------|---------|---------|---------|-------|
| Duration | 3h 45m | 2h 38m | 9h 15m | 15h 38m |
| Transforms | 4 | 1 | 8 | 13 |
| Maintain commits | 5 | 2 | 14 | 21 |
| PRs merged | 4 | 1 | 9 (incl. dependabot) | 14 |
| Workflow runs (total) | ~8 | ~4 | ~27 | ~39 |
| Workflow failures | 0 | 0 | ~16 | ~16 |
| Mission complete declarations | 1 | 1 | 0 | 2 |
| Source lines (main.js) | 48 | 48 | 48 | 48 |
| Unit tests | 28 | 28 | 28 | 28 |
| Behaviour tests | 3 | 3 | 3 | 3 |
| Issues created | ~10 | ~2 | ~12 | ~24 |
| Issues resolved | ~10 | ~2 | ~8 | ~20 |
| Issues open (final) | — | — | 4 | 4 |

---

## Findings

### FINDING-1: 2-kyu mission completed in 4 transforms with max profile (POSITIVE)

The `2-kyu-create-plot-code-lib` mission — a multi-capability library requiring expression parsing, range evaluation, CSV loading, SVG rendering, PNG output, CLI, and comprehensive tests — was completed in 4 transforms (~3h 45m) on the first run. This is the most complex mission tested to date (previous benchmarks used 6-kyu and 4-kyu). The `max` profile with `gpt-5-mini` handled it effectively.

### FINDING-2: Autonomous dependency addition without lockfile update breaks CI (CRITICAL)

PR #32 added `sharp` to `package.json` without regenerating the lockfile. The LLM knew the mission required a PNG dependency (MISSION.md says "External dependencies allowed only for PNG rendering (e.g. `canvas`, `sharp`)") and correctly identified `sharp` as the right choice. But the transform mechanism can only edit files — it cannot run `npm install`. This is a **structural gap** in the autonomous pipeline.

The instability reporting system (issue #40) correctly diagnosed the problem but couldn't fix it. The `dispatch-fix` mechanism fired repeatedly but the fix requires a shell command, not a file edit.

### FINDING-3: Maintain commits mask broken CI (CONCERN)

During the 3-hour outage (18:13–21:13), maintain commits continued landing every ~20 minutes. These don't run `npm ci` and therefore appear successful. From the commit log alone, the repository looks healthy — you'd need to check workflow runs to see the failures. This creates a false sense of progress.

### FINDING-4: Mission completed despite zero acceptance criteria checkboxes (PERSISTENT — from report 015)

Both mission-complete declarations happened with 0/8 MISSION.md checkboxes ticked. The system declared mission-complete based on the director's assessment of the code, not the checkbox state. While the code genuinely satisfies all 8 criteria, the checkbox mechanism is not working. This persists from FINDING-5 in report 015.

### FINDING-5: review-features timeout is deterministic, not flaky (CRITICAL — INVESTIGATED)

**Symptom**: The `review-features` job failed in ~45% of Phase 3 workflow runs. Every failure is identical: `##[error]The action 'Review issues' has timed out after 10 minutes.`

**Root cause**: The `review-issue` task handler (`tasks/review-issue.js:241`) batch-reviews up to **3 issues** sequentially. Each review creates a new Copilot session (`copilot-session.js`, timeout=480s) that reads source files, analyses them against issue requirements, and calls `report_verdict`. Individual reviews take **2–5 minutes** depending on issue complexity and LLM response latency. With 3 issues, the total frequently exceeds the step's `timeout-minutes: 10` (workflow line 1406).

**Evidence from CI logs** (timestamps from `repository0-plot-code-lib`):

| Run ID | Issues | #1 Duration | #2 Duration | #3 Duration | Total | Result |
|--------|--------|-------------|-------------|-------------|-------|--------|
| 23345655168 | 3 (#8,#13,#15) | 2.2 min | 3.2 min | 3.0 min | **8.4 min** | SUCCESS (barely) |
| 23344363466 | 3 (#8,#13,#15) | 3.5 min | 3.7 min | killed@2.8 min | **10.0 min** | TIMEOUT |
| 23354425213 | 2 (#26,#30) | 4.0 min | 2.0 min | — | **6.0 min** | SUCCESS |
| 23355097220 | 3 (#26,#30,#33) | 4.6 min | 5.1 min | killed@0.25 min | **10.0 min** | TIMEOUT |
| 23361577234 | 3 (#26,#33,#35) | 3.7 min | 3.5 min | killed@2.7 min | **10.0 min** | TIMEOUT |

**Pattern**: Runs with **2 issues always succeed** (~6 min). Runs with **3 issues succeed only when individual reviews are fast** (~2.5 min each). The average review time is ~3.5 min, so 3 × 3.5 = 10.5 min — just over the timeout. It's not flaky; it's a race condition between batch size and timeout.

**Code path**: `agentic-lib-workflow.yml:1405` → `agentic-step` action → `tasks/review-issue.js:reviewIssue()` → `findUnreviewedIssues(limit=3)` → sequential loop calling `reviewSingleIssue()` for each → `runCopilotSession()` per issue.

**Fix**: Add a remaining-time guard in the batch loop at `review-issue.js:251`. Before starting the Nth review, check elapsed time; skip if < 4 minutes remain. This degrades gracefully (reviews 2 of 3 instead of timing out on all 3) and preserves the work already done on issues #1 and #2. Alternatively, increase `timeout-minutes` from 10 to 20 in the workflow, though this wastes runner time if a session truly hangs.

### FINDING-6: Post-completion maintenance generates diminishing-value transforms (OBSERVATION)

After mission-complete at 12:09, the system continued producing transforms through maintenance mode. Phase 3 produced 8 additional transforms but: (a) no new functionality was added, (b) the issues resolved were mostly "unused github issue" placeholders, and (c) one transform (PR #32) actually broke CI. The maintenance activity created busywork rather than value.

### FINDING-7: Re-init is an effective recovery mechanism (POSITIVE)

The `init --purge` at 21:25 immediately resolved the 3-hour CI outage. It reset package.json, restored lockfile sync, and the very next workflow run was all-green. This confirms that `init --purge` is the correct remediation for autonomous-system-induced breakage — it's a known-good reset.

### FINDING-8: "unused github issue" titles are intentional drain (OBSERVATION — BY DESIGN)

18 of 22 closed issues have the title "unused github issue". This is intentional: when purging an experiment between missions, stale issues are drained with this placeholder title to avoid pollution between mission runs. Issues that are genuinely created by the supervisor for the current mission (e.g., #41 "implementation-gap: implement core plotting library & CLI") receive descriptive titles. The pattern is working as designed.

---

## Comparison with Previous Missions

| Metric | Report 015 S1 (6-kyu, min) | Report 015 S2 (4-kyu, min) | Report 015 S4 (4-kyu, max) | **Report 016 (2-kyu, max)** |
|--------|---------------------------|---------------------------|---------------------------|---------------------------|
| Mission | hamming-distance | dense-encoding | dense-encoding | plot-code-lib |
| Difficulty | 6-kyu | 4-kyu | 4-kyu | **2-kyu** |
| Profile | min | min | max | **max** |
| Transforms to complete | 4 | 2 | ~3 | **4** |
| Time to complete | ~36min | ~24min | ~26min | **~3h 45m** |
| Source lines | 98 | 173 | 252 | **~200 (48 main + tests)** |
| Unit tests | 3 | 4 | 4 | **28** |
| Test files | 2 | 4 | 4 | **8 unit + 1 behaviour** |
| Acceptance criteria | 7/7 | 6/7 | 1/7 | **8/8 (in code, 0 ticked)** |

The 2-kyu mission required significantly more elapsed time (3h 45m vs 24-36min) but a similar number of transforms (4). The additional time is spent in maintain cycles between transforms. The output is substantially richer: 28 tests across 8 files vs 3-4 tests, and a working CLI with expression parsing, range evaluation, CSV loading, and dual SVG/PNG rendering.

---

## Recommendations

1. **Run `npm install` as a post-transform step** — The transform pipeline can edit `package.json` to add/remove dependencies but cannot regenerate the lockfile. Add an `npm install` step after `write_file` edits to `package.json` in the transform task handler, and commit the updated `package-lock.json` alongside the source changes. Apply this everywhere a transform touches `package.json` — in the `agentic-step` action's commit-if-changed flow. This would have prevented the 3-hour outage from PR #32.

2. **Add `focus` setting to schedule configuration** — Add `focus = "mission" # mission | maintenance` alongside the existing `supervisor` schedule setting in `agentic-lib.toml`. This should be settable via the schedule workflow dispatch and remembered across runs. In **mission** focus, the system prioritises achieving MISSION.md acceptance criteria — creating feature issues, transforming code, running tests. In **maintenance** focus, the system assumes the mission is substantially complete and explores how to add value to what exists — improving test coverage, documentation, code quality, dependency updates. The `focus` value should be available in all LLM prompts and agent guidance files (`.github/agents/*.md`).

3. **Switch acceptance criteria to structured TOML format** — This has been broken across reports 015 and 016. Replace the Markdown checkbox approach (`- [ ] criterion text`) with a structured TOML section in `agentic-lib.toml` or a dedicated `acceptance-criteria.toml` file. Each criterion gets a key, description, and checked boolean. The director and acceptance-criteria-update code can then match on keys rather than fragile regex against free-text checkbox labels.

4. **Enrich maintain commit messages with health detail** — In the commit log, both maintains and transforms appear as "agentic-step: maintain features and library" / "agentic-step: transform issue #N". Enrich maintain commit messages to include: test pass count, test file count, source line count, open issue count, and current mission-complete status. For example: `agentic-step: maintain (28 tests pass, 8 files, 48 src lines, 4 open issues, mission-complete=false)`. The primary action of the commit (the code change itself) stays prominent; the parenthetical metadata makes CI health visible from `git log --oneline`.

5. **Fix review-features batch timeout** — Add a remaining-time guard in `tasks/review-issue.js:251` (the batch loop). Before starting each subsequent issue review, check `Date.now() - startTime`; if less than 4 minutes remain of the 10-minute step timeout, skip remaining issues and return partial results. The existing results from issues #1 and #2 are preserved instead of being lost to a timeout. Also consider increasing `timeout-minutes` from 10 to 15 in the workflow as a safety margin. See FINDING-5 for full timing data.
