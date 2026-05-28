# Plan: Supervisor Service

## What the Supervisor Does

The supervisor is the composite of every skill needed to run benchmarks, diagnose issues, fix them, release fixes, and re-run benchmarks — end to end, without human intervention. It is defined by what a Claude Code session actually does today when executing ITERATION_BENCHMARKS_SIMPLE.md.

## Primary Use Case: Producer Schedule

Run init with `schedule=producer`. The producer handles all workflow executions through to posting a summary on the discussions thread. This is the "always-on" mode: init once, and the supervisor drives the mission to completion autonomously, then reports results.

```bash
# The primary use case — fully autonomous mission execution
npx @xn-intenton-z2a/agentic-lib supervise \
  --mission 6-kyu-understand-hamming-distance \
  --profile med \
  --schedule producer \
  --repo xn-intenton-z2a/repository0
```

The supervisor:
1. Dispatches init with purge
2. Watches the auto-dispatched workflow
3. On completion: reads state, checks mission signals, decides next action
4. If not complete: dispatches another workflow run
5. Repeats until mission-complete, mission-failed, or budget-exhausted
6. Posts a summary to the repository's Discussions thread
7. Generates a benchmark report if `--report` flag is set

## Other Use Cases

- **Run benchmarks**: `supervise --benchmarks ITERATION_BENCHMARKS_SIMPLE.md` — execute all scenarios, produce a numbered report
- **Continuous monitoring**: `supervise --watch` — respond to events, keep the pipeline healthy
- **Multi-repo**: Orchestrate across repository0 and other consumers

## Skills Observed Across Benchmark Sessions 014

These are the discrete capabilities exercised during the benchmark 014 session and fix cycle. The supervisor must implement all of them.

### Skill Group 1: Benchmark Execution

| Skill | What it does | Tools used today |
|-------|-------------|------------------|
| **Parse benchmark spec** | Read ITERATION_BENCHMARKS_SIMPLE.md, extract scenario matrix, objectives, procedures | File read |
| **Dispatch init** | `gh workflow run agentic-lib-init` with mission, profile, model, schedule=off | GitHub CLI |
| **Wait for init** | Poll `gh run list` until init completes | GitHub CLI + sleep |
| **Wait for workflow** | Watch auto-dispatched or manually dispatched workflow run until completion | `gh run watch` or polling |
| **Dispatch next iteration** | `gh workflow run agentic-lib-workflow` when mission not yet complete | GitHub CLI |
| **Read state file** | Fetch `agentic-lib-state.toml` from `agentic-lib-logs` branch via API | `gh api` + base64 decode |
| **Read agent logs** | List and fetch `agent-log-*.md` files from logs branch | `gh api` |
| **Read source code** | Fetch `src/lib/main.js` and other files from main branch | `gh api` |
| **Read test files** | List test directory contents | `gh api` |
| **Verify acceptance criteria** | Compare MISSION.md criteria against source code, tests, README | `gh api` + analysis |
| **Check mission signals** | Look for MISSION_COMPLETE.md or MISSION_FAILED.md on main | `gh api` |
| **Fetch website** | `curl` the GitHub Pages deployment | HTTP fetch |
| **Download screenshot** | Fetch SCREENSHOT_INDEX.png from logs branch | `gh api` + base64 |
| **Determine outcome** | Mission-complete / mission-failed / budget-exhausted / converged / timeout | State analysis |
| **Stop schedule** | `gh workflow run agentic-lib-schedule -f frequency=off` | GitHub CLI |

### Skill Group 2: Report Generation

| Skill | What it does |
|-------|-------------|
| **Pick report number** | Scan existing BENCHMARK_REPORT_NNN.md files, pick next number |
| **Write scenario config** | Record init run ID, time, parameters |
| **Write iteration table** | Map workflow runs to iterations with run IDs, times, durations, transforms, PRs |
| **Write acceptance table** | Verify each criterion and record PASS/FAIL with evidence |
| **Write state file section** | Paste final state file contents |
| **Write website assessment** | Describe screenshot contents, website HTML, rendering quality |
| **Write scenario summary** | Compute totals: iterations, transforms, tokens, time, acceptance pass rate |
| **Write findings** | Identify patterns: POSITIVE, CONCERN, REGRESSION with descriptions |
| **Write comparison** | Compare against baseline reports (007, 014) |
| **Write recommendations** | Actionable next steps derived from findings |

### Skill Group 3: Diagnosis

| Skill | What it does |
|-------|-------------|
| **Identify failing metric** | Notice when acceptance criteria counter shows 0/N, state file shows wrong value, screenshot missing |
| **Trace root cause** | Read source code, workflow YAML, shell scripts to find where the bug is |
| **Assess impact** | Determine if the bug affects benchmark accuracy or just reporting |
| **Prioritise fixes** | Rank by impact: HIGH (affects outcomes) > MEDIUM (affects accuracy) > LOW (cosmetic) |

### Skill Group 4: Fix Implementation

| Skill | What it does |
|-------|-------------|
| **Create fix branch** | `git checkout -b claude/<description>` from fresh main |
| **Edit source files** | Modify JS, YAML, shell scripts to fix identified issues |
| **Edit workflow YAML** | Add inputs, change conditions, pass parameters between jobs |
| **Edit shell scripts** | Fix merge strategies, add post-rebase recovery |
| **Edit LLM prompts** | Add instructions to agent prompts, extend tool schemas |
| **Run tests** | `npm test` to verify no regressions |
| **Commit changes** | Stage specific files, write descriptive commit messages |
| **Push branch** | `git push -u origin` |
| **Create PR** | `gh pr create` with summary, test plan |
| **Watch CI** | Monitor PR checks until pass/fail |
| **Fix CI failures** | Diagnose workflow file issues, amend commits |

### Skill Group 5: Release and Deploy

| Skill | What it does |
|-------|-------------|
| **Merge PR** | After CI passes (needs explicit permission today) |
| **Wait for release** | Monitor release.yml for auto-version-bump and npm publish |
| **Init repository0** | `gh workflow run agentic-lib-init -f mode=purge` to distribute new code |
| **Verify deployment** | Run a quick benchmark scenario to confirm fixes work |

### Skill Group 6: Documentation and State

| Skill | What it does |
|-------|-------------|
| **Update benchmark docs** | Modify ITERATION_BENCHMARKS_SIMPLE.md with new scenarios, objectives, comparison baselines |
| **Write fix plan** | Create PLAN_BENCHMARK_NNN_FIXES.md documenting issues found and fixes applied |
| **Archive reports** | Move completed reports to `_developers/archive/` |
| **Update PLAN_SUPERVISOR.md** | Capture learnings and evolve the supervisor design |

## What the Supervisor Session Looks Like (Benchmark 014 Trace)

This is the actual sequence of events from the benchmark 014 session, numbered as a supervisor would execute them:

```
 1. Read ITERATION_BENCHMARKS_SIMPLE.md
 2. Read previous report (007) for comparison baseline
 3. For each scenario in matrix:
    a. Dispatch init (mission, model, profile, schedule=off)
    b. Wait for init completion
    c. Wait for auto-dispatched workflow
    d. While not (mission-complete or budget-exhausted or converged):
       i.   Wait for current workflow run to complete
       ii.  Read state file from logs branch
       iii. Read latest agent logs
       iv.  Check for MISSION_COMPLETE.md / MISSION_FAILED.md
       v.   If not complete: dispatch next iteration
    e. Collect final data:
       - State file, source code, tests, issues, PRs
       - Website HTML, screenshot
       - Verify each acceptance criterion
    f. Write scenario section to report
 4. Write findings section (compare patterns across scenarios)
 5. Write comparison section (vs baseline reports)
 6. Write recommendations
 7. For each HIGH-priority finding:
    a. Investigate root cause (read code, trace flow)
    b. Create fix branch
    c. Implement fix
    d. Run tests
    e. Push, create PR, wait for CI
    f. If CI fails: diagnose and fix
 8. Release and init:
    a. Merge PR (with permission)
    b. Wait for npm release
    c. Init repository0 with new version
 9. Re-run affected scenarios to verify fixes
10. Update report with fix verification results
```

## Architecture: What Changes

The supervisor is NOT a new codebase. It is the **extraction of the Claude Code session into a repeatable, autonomous process**. The skills above map to concrete tool calls:

| Skill Group | Implementation |
|-------------|---------------|
| Benchmark Execution | `gh` CLI commands, `gh api` calls, HTTP fetches — all scriptable |
| Report Generation | Template-driven markdown writing — deterministic |
| Diagnosis | LLM analysis of code + metrics — needs intelligence |
| Fix Implementation | Code editing + git operations — needs intelligence |
| Release and Deploy | `gh` CLI commands — scriptable, needs permission gates |
| Documentation | File writing — deterministic |

**Only Groups 3 and 4 need LLM intelligence.** Everything else is mechanical.

## Proposed Interface

```bash
# Run all scenarios from a benchmark spec
npx @xn-intenton-z2a/agentic-lib supervise \
  --benchmarks ITERATION_BENCHMARKS_SIMPLE.md \
  --repo xn-intenton-z2a/repository0 \
  --report BENCHMARK_REPORT_015.md

# Run a single mission
npx @xn-intenton-z2a/agentic-lib supervise \
  --mission 6-kyu-understand-hamming-distance \
  --profile med \
  --repo xn-intenton-z2a/repository0

# Run benchmarks with fix mode (diagnose + fix + re-run)
npx @xn-intenton-z2a/agentic-lib supervise \
  --benchmarks ITERATION_BENCHMARKS_SIMPLE.md \
  --fix \
  --repo xn-intenton-z2a/repository0
```

## Implementation Phases

### Phase 1: Scriptable Benchmark Runner (no LLM needed)

Extract the mechanical parts of the benchmark session into a CLI command:

1. Parse benchmark spec (scenario matrix, objectives)
2. For each scenario: dispatch init → poll → dispatch iterations → poll → collect data
3. Generate report from collected data using template
4. Compare against baseline reports
5. Output: `BENCHMARK_REPORT_NNN.md` with all scenario data filled in

**What's missing:** Findings, recommendations, acceptance criteria verification (these need judgement). Leave those sections as `(to be filled by reviewer)`.

**Estimated effort:** ~200 lines of JS in `src/bin/cli.js`. Uses existing `gh` commands.

### Phase 2: Intelligent Report Writer (cheap LLM)

Add a single LLM call after data collection to:
1. Verify acceptance criteria against source code
2. Identify findings (compare patterns across scenarios)
3. Write comparison with baseline reports
4. Generate recommendations

**Model:** gpt-5-mini (cheap, fast). One call per report, not per iteration.

### Phase 3: Fix Mode (full LLM)

When `--fix` is passed:
1. After report generation, analyse HIGH-priority findings
2. Investigate root causes by reading source code
3. Create fix branch, implement fixes, run tests
4. Push, create PR, wait for CI
5. (Optionally) merge, release, re-init, re-run

**Model:** gpt-5-mini for investigation, or claude-sonnet-4 for complex fixes.

### Phase 4: Always-On Mode

For `--watch` mode:
1. Listen for workflow_run.completed events (via polling or webhook)
2. On each event: read state, decide next action
3. Auto-dispatch next iteration if needed
4. Detect stuck pipelines and intervene

## Benchmark 014 Fixes (Applied This Session)

These fixes were identified during the benchmark 014 session and implemented on branch `claude/benchmark-014-fixes` (PR #1969):

### Fix #1: Screenshot Persistence
- **Problem:** SCREENSHOT_INDEX.png not pushed to logs branch on manual dispatches (only on schedule runs)
- **Root cause:** `Push screenshot to log branch` step in agentic-lib-test.yml required `github.event_name == 'schedule'` or `inputs.push-screenshot == 'true'`. Post-commit-test didn't pass `push-screenshot`.
- **Fix:** Pass `push-screenshot: "true"` and `log-branch` from post-commit-test to agentic-lib-test. Added `log-branch` as a declared input to the test workflow.
- **Files:** `agentic-lib-workflow.yml`, `agentic-lib-test.yml`

### Fix #2: State File mission-complete Persistence
- **Problem:** `agentic-lib-state.toml` on logs branch shows `mission-complete = false` after MISSION_COMPLETE.md exists on main
- **Root cause:** Race condition — post-merge director pushes stale state (read before director's update) that overwrites the director's `true` value. The W3 conflict merge only works on rebase conflicts, not clean pushes with old data.
- **Fix:** After successful rebase in push-to-logs.sh, re-apply boolean `true` values from saved local state. If any values were downgraded from true to false, amend the commit.
- **Files:** `push-to-logs.sh`

### Fix #6: Acceptance Criteria Counter Always 0/N
- **Problem:** All agent logs show `Acceptance criteria | 0/N` even when criteria are met
- **Root cause:** `countAcceptanceCriteria()` in telemetry.js counts `- [x]` vs `- [ ]` checkboxes in MISSION.md. Nobody updates the checkboxes — the LLM implements the code but doesn't check the boxes.
- **Fix:** Added `acceptanceCriteriaMet` field to the `report_implementation_review` tool schema. The LLM reports which criteria it verified as implemented+tested. The handler updates MISSION.md checkboxes (`- [ ]` → `- [x]`). The telemetry counter then reads accurate values.
- **Files:** `implementation-review.js`

## Achievability Assessment for Current Benchmarks

Based on benchmark 014 data, with the fixes above:

| Scenario | Target | Assessment | Limiting Factor |
|----------|--------|-----------|-----------------|
| S1: hamming/min/1 run | 1 run | **Unlikely** | Pipeline has structural 2-run minimum: implement → verify+declare. Post-merge director has never declared mission-complete on the same run as the first transform. |
| S2: dense-encoding/min/3 runs | 3 runs | **Unlikely** | min profile (20K read-chars) too small for 4-kyu multi-scheme encoding. LLM may not implement all schemes in one transform. |
| S3: dense-encoding/med/3 runs | 3 runs | **Possible** | 50K read-chars is enough. 3 runs = implement + refine + declare. Matches 6-kyu pattern but 4-kyu may need more. |
| S4: dense-encoding/max/3 runs | 3 runs | **Best chance** | 100K read-chars, 128 budget. Most likely to one-shot implementation. |

### Structural Bottleneck: 2-Run Minimum

The biggest limiting factor is not the fixes — it's that the pipeline needs at least 2 workflow runs to complete any mission:

1. **Run 1:** Review finds nothing → supervisor creates issue → dev transforms → PR merges → post-merge director says "in-progress" (because it hasn't verified tests and acceptance criteria in the merged code yet)
2. **Run 2:** Review finds everything implemented → director evaluates → declares mission-complete

To achieve 1-run completion for 6-kyu, the post-merge director needs to be more decisive — if all metrics are MET and the implementation-review found no gaps, declare complete immediately. Fix #6 (acceptance criteria) helps here: if the director sees 7/7 criteria met instead of 0/7, it has stronger evidence to declare complete in run 1.

### What Would Make 1-Run Achievable

1. Fix #6 lands (acceptance criteria counter) ✓ (in PR #1969)
2. Post-merge director prompt is updated to: "If all mechanical metrics are MET AND acceptance criteria > 50% met AND implementation review shows no critical gaps → declare mission-complete"
3. The 6-kyu mission seed is simple enough that one transform covers everything (already true for hamming-distance in report 014)

### What Would Make 3-Run Achievable for 4-kyu

1. Single transform covers core functionality (run 1)
2. Second transform covers edge cases, tests, website (run 2)
3. Third run: review + declare mission-complete (run 3)
4. This requires no Playwright instability issues (fixed since report 007)
5. And sufficient context for the LLM (med or max profile)
