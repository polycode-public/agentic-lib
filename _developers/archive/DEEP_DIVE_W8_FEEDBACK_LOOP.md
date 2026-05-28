# Deep Dive: W8 — Feedback Loop Storm (2026-03-08)

## Executive Summary

On 2026-03-08, repository0 experienced a runaway feedback loop that produced **572 commits** and **hundreds of workflow runs** over ~10 hours. The loop accelerated from a ~5 minute cycle to sub-minute bursts before being stopped by manually disabling 3 workflows. The root cause is structural: the dispatch graph contains an unguarded cycle between `agentic-lib-test` and `agentic-lib-workflow`, amplified by the absence of concurrency control and the supervisor's repeated `set-schedule:off` dispatches.

---

## 1. Timeline Reconstruction

### Phase 1: Normal operations (00:00 – 10:35)

Healthy hourly cadence. 8 issue transforms completed (#2698–#2734), benchmarking configured (S1–S4), init purges ran. Commits roughly every 45–60 minutes.

### Phase 2: Loop locks in (13:28 – 16:39)

Starting at 13:28, the pattern becomes a rigid alternating pair:
```
agentic-step: maintain features and library   (every ~4 min)
schedule: set to off, model gpt-5-mini        (immediately after)
```
One genuine commit at 16:39 (`feat: merge zero-handling...`), then back to the pair.

### Phase 3: Acceleration (16:40 – 23:00)

Cycle tightens. Each maintain commit generates 2–3 schedule-off commits. Interval drops to ~3–4 minutes. Commits per hour increase from ~15 to ~30+.

### Phase 4: Peak storm (23:00 – 23:33)

**41 commits in 33 minutes** (1.24/min). 91 workflow runs in the 23:20–23:33 window alone:

| Workflow | Runs (23:20–23:33) |
|----------|-------------------|
| agentic-lib-bot | 23 |
| pages build and deployment | 21 |
| agentic-lib-schedule → off | 17 |
| agentic-lib-test | 16 |
| agentic-lib-workflow | 14 |
| **Total** | **91** |

Peak density: **68 runs in 10 minutes** (23:2x bucket).

### Phase 5: Manual intervention

User disabled `agentic-lib-test`, `agentic-lib-bot`, and `agentic-lib-workflow`. Storm stopped.

### Full-day commit breakdown

| Count | Message |
|-------|---------|
| 361 | `schedule: set to off, model gpt-5-mini` |
| 178 | `agentic-step: maintain features and library` |
| 8 | Issue transforms |
| 6 | `init purge` |
| 19 | Other (benchmarks, docs, features) |
| **572** | **Total** |

---

## 2. The Complete Dispatch Graph

Every path through which one workflow triggers another:

```
                    ┌──────────────────────────────┐
                    │     cron (hourly, if set)     │
                    └──────────┬───────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  agentic-lib-workflow.yml                        │
│                                                                 │
│  maintain ──push──▶ main     ◀── NO test gate                  │
│  dev ──────push──▶ branch ──merge──▶ main                      │
│  fix-stuck ─push─▶ branch ──PR──▶ main                         │
│  update-schedule ──workflow_call──▶ agentic-lib-schedule.yml    │
│                                                                 │
│  supervisor ──dispatchBot()──▶ agentic-lib-bot.yml             │
│  supervisor ──executeSetSchedule()──▶ agentic-lib-schedule.yml │
│  supervisor ──executeDispatch()──▶ any workflow (guarded*)      │
│                                                                 │
│  * Guard: skips if agentic-lib-workflow already in_progress     │
│    BUT only for dispatch:agentic-lib-workflow actions            │
│    NOT for dispatch-fix path                                    │
│                                                                 │
│  ⚠ CONCURRENCY: NONE (block is commented out, no #@dist)       │
└─────────────────────────────────────────────────────────────────┘
         │ push to main                    │ dispatchBot()
         ▼                                 ▼
┌────────────────────────┐   ┌─────────────────────────────────┐
│  agentic-lib-test.yml  │   │    agentic-lib-bot.yml          │
│                        │   │                                 │
│  on: push to main      │   │  respond ─outputs─▶ action     │
│  on: schedule (hourly) │   │                                 │
│  on: workflow_call     │   │  dispatch-supervisor ──dispatch─▶│
│  on: workflow_dispatch │   │    agentic-lib-workflow.yml     │
│                        │   │    (if action==request-supervisor│
│  test job              │   │     AND message=='')            │
│  behaviour job ─push─▶ │   │                                 │
│    main (screenshot)   │   │  ⚠ CONCURRENCY: per-discussion  │
│                        │   │    (#@dist — active in consumers)│
│  dispatch-fix ─────────┼───┘─────────────────────────────────┘
│    ──dispatch──▶       │
│    agentic-lib-workflow │   ┌─────────────────────────────────┐
│                        │   │  agentic-lib-schedule.yml        │
│  Condition:            │   │                                  │
│    test OR behaviour   │   │  update-schedule ──push──▶ main  │
│    failed AND on main  │   │    (workflow YAML + toml)        │
│    AND event !=        │   │                                  │
│    'pull_request'      │   │  Uses WORKFLOW_TOKEN (can push   │
│                        │   │  workflow files)                 │
│  ⚠ NO circuit breaker  │   │                                  │
│  ⚠ NO concurrency      │   │  ⚠ NO concurrency               │
└────────────────────────┘   └─────────────────────────────────┘
```

---

## 3. The Primary Loop

The loop that drove the storm:

```
                    ┌──────────────────────────────────────┐
                    │                                      │
                    ▼                                      │
           agentic-lib-workflow                            │
                    │                                      │
                    │ maintain job pushes to main           │
                    │ (no test gate, always pushes)         │
                    ▼                                      │
              push to main                                 │
                    │                                      │
                    │ on.push trigger                       │
                    ▼                                      │
           agentic-lib-test                                │
                    │                                      │
                    │ test + behaviour both FAIL            │
                    ▼                                      │
             dispatch-fix job                              │
                    │                                      │
                    │ gh workflow run                       │
                    │ agentic-lib-workflow.yml              │
                    │ mode=full                             │
                    │                                      │
                    └──────────────────────────────────────┘
                         ~60 seconds per cycle
```

### Why it's unbreakable from inside

1. **maintain always pushes** — it updates features/library docs, commits, and pushes. No test gate.
2. **Tests always fail** — two bugs existed in the code (`assert` vs `with` in Node 24, CJS `require()` in ESM project). The workflow doesn't run these tests itself, so it doesn't know.
3. **dispatch-fix always fires** — its only guards are: on main, not a PR, not agentic-lib repo. All true. No rate limit, no cooldown, no attempt counter.
4. **No concurrency control** — multiple instances of both workflows run in parallel, each producing their own commits.

---

## 4. The Secondary Loop (schedule-off spam)

A second, parallel loop explains the 361 `schedule: set to off` commits:

```
agentic-lib-workflow
    │
    ├── supervisor job
    │       │
    │       │ LLM sees "tests failing" in telemetry
    │       │ LLM chooses: set-schedule:off
    │       │
    │       ▼
    │   executeSetSchedule()
    │       │
    │       │ createWorkflowDispatch("agentic-lib-schedule.yml", {frequency: "off"})
    │       ▼
    │   agentic-lib-schedule.yml
    │       │
    │       │ Edits agentic-lib-workflow.yml (stamps date)
    │       │ Edits agentic-lib.toml
    │       │ Commits + pushes to main
    │       ▼
    │   push to main ──▶ triggers agentic-lib-test ──▶ fails ──▶ dispatch-fix ──▶ back to top
    │
    └── maintain job
            │
            │ pushes to main (separate commit)
            ▼
        push to main ──▶ triggers agentic-lib-test ──▶ fails ──▶ dispatch-fix ──▶ back to top
```

The supervisor sees failing tests in its telemetry, rationally decides to set the schedule to off, and dispatches `agentic-lib-schedule.yml`. But this doesn't help because:
1. The schedule wasn't the trigger — dispatch-fix was.
2. The schedule workflow stamps the file with a new date every time (line 123: `new Date().toISOString()`), ensuring a non-empty commit even when the schedule is already "off".
3. That commit pushes to main, triggering another test run, another failure, another dispatch-fix.

**The schedule-off dispatch is itself a loop amplifier.** Each supervisor run produces a schedule commit, which produces a test failure, which produces another workflow run.

---

## 5. Why Concurrency Control Was Missing

In the source file `agentic-lib/.github/workflows/agentic-lib-workflow.yml`, lines 14-16:

```yaml
#concurrency:
#  group: agentic-lib-workflow
#  cancel-in-progress: false
```

These are plain `#` comments — **no `#@dist` markers**. Compare with the bot workflow (`agentic-lib-bot.yml`), line 14:

```yaml
#@dist concurrency:
#@dist   group: agentic-lib-bot-${{ github.event.discussion.node_id || github.run_id }}
#@dist   cancel-in-progress: false
```

The `#@dist` markers mean init uncomments these lines in consumer repos. The bot gets concurrency control; the workflow does not. The workflow's concurrency block is dead code — it exists as a reference but is never activated.

**Consequence**: Unlimited parallel instances of `agentic-lib-workflow` can run simultaneously. During the storm, up to 14 were active in a 13-minute window, each generating their own commits.

### The test workflow also has no concurrency

`agentic-lib-test.yml` has no concurrency block at all. Multiple test runs triggered by rapid pushes run in parallel, each independently running dispatch-fix.

---

## 6. The Existing Guard That Didn't Help

The supervisor's `executeDispatch()` function (supervise.js:500-516) has a guard:

```javascript
if (workflowFile === "agentic-lib-workflow.yml") {
  const { data: runs } = await octokit.rest.actions.listWorkflowRuns({
    ...repo, workflow_id: "agentic-lib-workflow.yml",
    status: "in_progress", per_page: 1,
  });
  if (runs.total_count > 0) {
    core.info("Workflow already running — skipping dispatch");
    return "skipped:workflow-already-running";
  }
}
```

This only applies to LLM-chosen `dispatch:agentic-lib-workflow` actions. It does NOT apply to:
- `dispatch-fix` in `agentic-lib-test.yml` (completely separate code path, uses `gh workflow run`)
- The schedule cron trigger
- Manual workflow_dispatch

The dispatch-fix job is the primary loop driver and has zero awareness of other running instances.

---

## 7. Why the Workflow Succeeded While Tests Failed

Run [22832372642](https://github.com/xn-intenton-z2a/repository0/actions/runs/22832372642) (workflow) — **success**.
Run [22832427737](https://github.com/xn-intenton-z2a/repository0/actions/runs/22832427737) (test) — **failure**.

### What the workflow runs

| Job | Tests it runs | What happens on failure |
|-----|--------------|----------------------|
| maintain | None | Always pushes to main |
| supervisor | None | Readonly analysis |
| fix-stuck | LLM tool loop reads [execution].test | `set +e` + `exit 0` — soft gate, job succeeds |
| dev | `[execution].test` pre-commit | `set +e` + `exit 0` — skips commit, job succeeds |
| review-features | None | Readonly |

The dev job (supervise.js lines 852-870):
```bash
set +e
eval "$TEST_CMD" 2>&1 | tail -30
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -ne 0 ]; then
  echo "tests-passed=false" >> $GITHUB_OUTPUT
  echo "WARNING: Unit tests failed (exit $EXIT_CODE) — skipping commit and PR"
  exit 0  # ← EXITS WITH SUCCESS
fi
```

All test failures are soft — they skip downstream steps but never fail the job. The overall workflow always succeeds.

### What the test workflow runs

| Job | Tests it runs | What happens on failure |
|-----|--------------|----------------------|
| test | `[execution].test` (unit tests) | Job fails |
| behaviour | `npm run test:behaviour` (Playwright) | Job fails |
| dispatch-fix | N/A — dispatches workflow | Runs if either test or behaviour failed |

Both test types fail hard. The two bugs:
- `cli.test.js` — `import pkg from '../../package.json' assert { type: 'json' }` — Node 24 requires `with` not `assert`, crashes with exit code 1
- `roman.spec.js` — `const { test, expect } = require('@playwright/test')` — `require()` in ESM project

These bugs are expected in a coding experiment. The problem is not the bugs — it's the system's response to them.

---

## 8. Root Causes (Structural)

| # | Root Cause | Impact |
|---|-----------|--------|
| RC1 | `agentic-lib-workflow` concurrency block has no `#@dist` markers | Unlimited parallel instances |
| RC2 | `dispatch-fix` has no circuit breaker | Unconditional re-dispatch on every failure |
| RC3 | `dispatch-fix` condition uses blacklist (`!= 'pull_request'`) not whitelist | Fires for workflow_dispatch, workflow_call, schedule — not just push |
| RC4 | `maintain` pushes to main without any test gate | Every workflow run produces a push regardless of code health |
| RC5 | Schedule-off dispatch produces a commit (date stamp guarantees non-empty) | Each supervisor's rational "stop the schedule" action adds fuel |
| RC6 | `agentic-lib-test` has no concurrency block | Multiple test runs fire dispatch-fix independently |
| RC7 | Workflow test failures are soft (exit 0) | Workflow can't detect it left things broken |

---

## 9. Proposed Fixes

### Fix 1: Enable concurrency on the workflow (RC1)

Change the concurrency block in `agentic-lib-workflow.yml` from plain `#` to `#@dist`:

```yaml
# Before (dead code):
#concurrency:
#  group: agentic-lib-workflow
#  cancel-in-progress: false

# After (activated in consumers via init):
#@dist concurrency:
#@dist   group: agentic-lib-workflow
#@dist   cancel-in-progress: false
```

**Effect**: Only one workflow instance runs at a time in consumer repos. New dispatches queue (cancel-in-progress: false preserves in-flight work).

**Risk**: If the workflow takes a long time (it can — supervisor + dev + fix-stuck is ~10 min), queued dispatches wait. This is better than the current state. Could consider `cancel-in-progress: true` to always run the latest, but that risks cancelling a successful fix mid-flight.

### Fix 2: Circuit breaker on dispatch-fix (RC2)

Add a check before dispatching: count recent workflow dispatches and skip if above threshold.

```yaml
  dispatch-fix:
    needs: [test, behaviour]
    if: >-
      !cancelled()
      && github.ref == 'refs/heads/main'
      && (github.event_name == 'push' || github.event_name == 'schedule')
      && github.repository != 'xn-intenton-z2a/agentic-lib'
      && (needs.test.result == 'failure' || needs.behaviour.result == 'failure')
    runs-on: ubuntu-latest
    steps:
      - name: Check circuit breaker
        id: breaker
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Count agentic-lib-workflow dispatches in last 30 minutes
          SINCE=$(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-30M +%Y-%m-%dT%H:%M:%SZ)
          COUNT=$(gh run list \
            --repo "${{ github.repository }}" \
            --workflow agentic-lib-workflow.yml \
            --json createdAt \
            --jq "[.[] | select(.createdAt >= \"$SINCE\")] | length")
          echo "recent-dispatches=$COUNT"
          if [ "$COUNT" -ge 3 ]; then
            echo "Circuit breaker tripped: $COUNT dispatches in last 30 min"
            echo "tripped=true" >> $GITHUB_OUTPUT
          else
            echo "tripped=false" >> $GITHUB_OUTPUT
          fi

      - name: Dispatch agentic-lib-workflow to fix broken build
        if: steps.breaker.outputs.tripped != 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          echo "Tests failed on main — dispatching agentic-lib-workflow to fix"
          gh workflow run agentic-lib-workflow.yml \
            --repo "${{ github.repository }}" \
            -f mode=full \
            -f message="Build broken on main: agentic-lib-test run ${{ github.run_id }} failed. Please fix."
```

**Effect**: Maximum 3 fix dispatches in any 30-minute window. After that, the loop stops and waits for human intervention or the next hourly test cron.

### Fix 3: Whitelist dispatch-fix event types (RC3)

Change from:
```yaml
&& github.event_name != 'pull_request'
```
To:
```yaml
&& (github.event_name == 'push' || github.event_name == 'schedule')
```

**Effect**: dispatch-fix only fires for genuine external triggers (push, hourly cron). Does NOT fire when called via workflow_call (from post-commit test, W9) or workflow_dispatch (manual runs, dispatches from supervisor).

### Fix 4: Suppress schedule-off stamp when already off (RC5)

In `agentic-lib-schedule.yml`, the date stamp at line 123 ensures a non-empty commit every time. When the schedule is already off and frequency=off is dispatched again, this still produces a commit.

Option A — Skip commit if schedule is already set to the requested frequency:
```javascript
// Before editing, check if the frequency is already set
const currentFreq = /* parse from agentic-lib.toml [schedule].supervisor */;
if (currentFreq === frequency) {
  core.info(`Schedule already set to ${frequency} — no change needed`);
  // Skip writing, commit will be empty, push step skips
  return;
}
```

Option B — Remove the date stamp and rely on actual content changes.

**Effect**: Eliminates the 361 redundant schedule-off commits. The first `set-schedule:off` works; subsequent calls are no-ops.

### Fix 5: Add concurrency to the test workflow (RC6)

```yaml
#@dist concurrency:
#@dist   group: agentic-lib-test-${{ github.ref_name }}
#@dist   cancel-in-progress: true
```

**Effect**: Rapid pushes to main cancel previous test runs (only the latest matters). Combined with the circuit breaker, this prevents dispatch-fix from firing N times for N rapid pushes.

### Fix 6: Post-commit test delegation (W9, addresses RC7)

Add a final job to `agentic-lib-workflow.yml` that calls `agentic-lib-test.yml` via `workflow_call`. This makes the workflow aware of the true branch status — if its commits broke things, the workflow itself shows red.

See W9 in the plan for full details. The key interaction with W8: the dispatch-fix whitelist (Fix 3) prevents this workflow_call from re-entering the loop.

---

## 10. Fix Priority and Dependencies

```
Fix 1 (concurrency) ──── standalone, immediate relief
Fix 2 (circuit breaker) ── standalone, prevents escalation
Fix 3 (event whitelist) ── prerequisite for W9 (post-commit test)
Fix 4 (schedule no-op) ── standalone, eliminates amplifier
Fix 5 (test concurrency) ── standalone, reduces parallel dispatch-fix
Fix 6 (post-commit test) ── depends on Fix 3
```

Fixes 1–5 can be done in any order. Fix 6 requires Fix 3 first.

**Minimum fix to prevent recurrence**: Fix 1 + Fix 2. Concurrency limits parallelism to 1; circuit breaker limits loop iterations to 3 per 30 minutes.

**Full fix**: All 6. Eliminates the loop entirely and makes the workflow self-aware of its impact on branch health.

---

## 11. What Triggered the Storm

The storm was not triggered by any single event. The loop was always latent in the system — it activates whenever:

1. Tests fail on main (any test, unit or behaviour), AND
2. `agentic-lib-workflow` is enabled, AND
3. The workflow pushes to main (maintain job runs)

Before 2026-03-08, the tests on main were passing, so dispatch-fix never fired. When the LLM introduced the two bugs (assert syntax, CJS require), tests started failing, and the loop engaged.

The gradual acceleration (Phase 2→3→4) is explained by overlapping cycles. Each cycle takes ~60s. Without concurrency control, a new cycle starts before the previous one finishes. By Phase 4, multiple cycles were running simultaneously, each producing commits that triggered more cycles.

---

## 12. Impact Assessment

| Metric | Value |
|--------|-------|
| Duration | ~10 hours (13:28 – 23:33) |
| Total commits | 572 |
| Waste commits (schedule-off + maintain) | 539 (94%) |
| Productive commits | 33 (6%) |
| Workflow runs (peak 13 min) | 91 |
| GitHub Actions minutes consumed | ~150+ (estimated) |
| API calls (schedule dispatches, bot dispatches) | ~500+ |
| Manual intervention required | Yes (disable 3 workflows) |
| Data loss | None |
| Repository state after | Functional but noisy git history |
