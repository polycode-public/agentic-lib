# Plan: Benchmark 012 Fixes (Workflow Failures 2026-03-18)

**Source**: Workflow run analysis from [repository0 Actions](https://github.com/xn-intenton-z2a/repository0/actions) on 2026-03-18
**Created**: 2026-03-18
**Status**: completed

---

## User Assertions

1. Review activities since init run at 09:26 UTC leading to workflow failures at 11:26 and 12:05
2. Explain why workflow runs recovered after the failures
3. Suggest fixes

---

## Timeline (2026-03-18, all times UTC)

| Time | Run | Event | Outcome | Root Cause |
|------|-----|-------|---------|------------|
| 08:48 | [#23236434245](https://github.com/xn-intenton-z2a/repository0/actions/runs/23236434245) | schedule: agentic-lib-workflow | **FAILURE** | `post-commit-test / test` failed: `edge-cases.test.js` has no test suite |
| 09:21 | [#23237669543](https://github.com/xn-intenton-z2a/repository0/actions/runs/23237669543) | workflow_dispatch: agentic-lib-flow (hamming, 2 runs) | **FAILURE** | Same `edge-cases.test.js` issue in `update/update`, `test-1/test`, `test-final/test`; also `test-final/behaviour` screenshot upload failed |
| 09:26 | [#23237859384](https://github.com/xn-intenton-z2a/repository0/actions/runs/23237859384) | workflow_dispatch: agentic-lib-init purge | **SUCCESS** | Init purge (agentic-lib@7.4.26) deleted `edge-cases.test.js` and 26 other files, reset to seed state |
| 09:28 | [#23237938188](https://github.com/xn-intenton-z2a/repository0/actions/runs/23237938188) | push: agentic-lib-test | **SUCCESS** | Tests pass after init purge |
| 09:55–11:03 | Multiple | schedule: agentic-lib-workflow | **SUCCESS** | Normal operation, maintain pushes succeeding |
| 11:21 | #1021 [#23242240683](https://github.com/xn-intenton-z2a/repository0/actions/runs/23242240683) | workflow_dispatch: agentic-lib-workflow | **SUCCESS** | Started immediately at 11:21:39, finished 11:38:05. |
| 11:26 | #1022 [#23242427323](https://github.com/xn-intenton-z2a/repository0/actions/runs/23242427323) | schedule: agentic-lib-workflow | **FAILURE** | **Pending 12 min** (11:26→11:38) behind #1021. `params` started 11:38:07. `maintain` step 13 rebase conflicts in `features/HAMMING_DISTANCE.md`, `HAMMING_TESTS.md`, `HAMMING_TYPES.md`. 3 retries all failed. Finished 12:13. |
| 11:48 | #1023 [#23243210585](https://github.com/xn-intenton-z2a/repository0/actions/runs/23243210585) | schedule: agentic-lib-workflow | **CANCELLED** | **Pending entire time** — `params` job never started. Cancelled at 12:05:42 when #1024 replaced it in the pending slot (GitHub "one pending" rule). |
| 12:05 | #1024 [#23243847993](https://github.com/xn-intenton-z2a/repository0/actions/runs/23243847993) | schedule: agentic-lib-workflow | **FAILURE** | **Pending 8 min** (12:05→12:13) behind #1022. `params` started 12:13:12. `maintain` step 13: rebase conflict in `features/HAMMING_BIGINT.md`. 3 retries all failed. |
| 12:32 | [#23244836341](https://github.com/xn-intenton-z2a/repository0/actions/runs/23244836341) | schedule: agentic-lib-workflow | **SUCCESS** | Maintain pushed successfully — conflicts resolved |

---

## Root Cause Analysis

### Finding 1: Empty test file created by autonomous agent

**Symptom**: vitest error `No test suite found in file .../edge-cases.test.js` failing the `post-commit-test / test` job.

**Cause**: A prior `agentic-step: transform` (commit `a75a6c214`) created `tests/unit/edge-cases.test.js` that had no `describe`/`test`/`it` blocks. vitest treats files matching `*.test.js` with zero test suites as failures.

**Impact**: Failed the 08:48 scheduled workflow and the 09:21 flow benchmark. The flow benchmark was cut short — the `update/update` step failed, preventing subsequent iterations.

**Resolution**: The init purge at 09:26 (commit `2267fe510`) deleted the file along with all other non-seed content.

### Finding 2: Stale checkout SHA causes rebase conflicts with previous serialized runs

**Symptom**: `maintain` job's "Commit and push changes" step fails with `CONFLICT (content): Merge conflict in features/HAMMING_*.md`. All 3 retry attempts fail with the same conflicts.

**Root cause**: The schedule trigger locks `GITHUB_SHA` at **workflow creation time**, not at job execution time. When a run sits in the concurrency queue pending, its checkout SHA goes stale. By the time the maintain job runs, the **previous serialized run** has already pushed changes to the same feature files.

**The conflicts are from previous runs of the same `agentic-lib-workflow`, not from "other workflows":**

**11:26 failure — maintain-vs-maintain (run #1021 vs run #1022):**
```
11:18:23  dbaaf5207  "schedule: set to off" ← HEAD of main when #1022 was created
11:26:49  #1022 created, GITHUB_SHA = dbaaf5207
11:29:54  0d36ae92d  "agentic-step: maintain features and library" ← pushed by #1021's maintain job
                     Modified: features/HAMMING_DISTANCE.md, HAMMING_TESTS.md, HAMMING_TYPES.md, SOURCES.md
11:38:14  #1022's maintain checks out stale dbaaf5207 (now 2 commits behind main)
11:44:38  #1022's maintain tries to push → rebase over 0d36ae92d → CONFLICT
          Both maintain runs edited the same feature files with different LLM outputs
```

**12:05 failure — transform-vs-maintain (run #1022 dev vs run #1024 maintain):**
```
11:48:27  bb5052034  "schedule: set to off" ← HEAD of main when #1024 was created
12:05:41  #1024 created, GITHUB_SHA = bb5052034
12:09:41  792d6fb4c  "agentic-step: transform issue #3105,3106 (#3107)" ← pushed by #1022's dev job
                     Modified: features/HAMMING_BIGINT.md (+14 other files)
12:13:18  #1024's maintain checks out stale bb5052034 (now 3+ commits behind main)
12:21:50  #1024's maintain tries to push → rebase over 792d6fb4c → CONFLICT
          Transform and maintain both edited features/HAMMING_BIGINT.md
```

**Key insight 1**: The retry logic is designed for **push races** (same content, different SHA), not for **content conflicts** (different LLM outputs in the same file sections). For content conflicts, retrying the same commit is futile.

**Key insight 2**: The stale SHA problem is amplified by the concurrency queue. The longer a run waits pending, the more commits accumulate on main from the previous run, and the more likely a content conflict becomes. In this case: 12 min pending for #1022, 8 min for #1024.

### Finding 3: Concurrency behavior is correct but misleading

**Apparent anomaly 1**: Runs #1021 (11:21, manual) and #1022 (11:26, schedule) appear concurrent in the Actions UI.

**Reality**: They did **not** run concurrently. #1022 was **pending** for 12 minutes. Its `params` job didn't start until 11:38:07 — two seconds after #1021 finished at 11:38:05. The UI shows `createdAt` (when triggered), not execution start time. The 46m 21s duration includes 12 min of queue time.

**Apparent anomaly 2**: Run #1023 (11:48) was cancelled at 12:05:42 despite `cancel-in-progress: false`.

**Reality**: `cancel-in-progress: false` only protects **running** runs from cancellation. GitHub enforces a **"one pending slot"** rule per concurrency group: when a new run is queued and a pending run already exists, the **pending** run is replaced (cancelled). #1023 was never running — its `params` job never started. When #1024 arrived at 12:05:41, it replaced #1023 in the pending slot.

From [GitHub docs](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs): *"When a workflow run is queued, if there is already a pending workflow run in the same concurrency group, the pending run will be cancelled."*

**Execution sequence** (verified by `params` job `startedAt`):

```
11:21:39  #1021 starts (immediate)
11:26:49  #1022 created → PENDING (behind #1021)
11:38:05  #1021 finishes
11:38:07  #1022 starts (2 sec after #1021 ended)
11:48:26  #1023 created → PENDING (behind #1022)
12:05:41  #1024 created → replaces #1023 in pending slot
12:05:42  #1023 CANCELLED (never ran)
12:13:10  #1022 finishes (failed)
12:13:12  #1024 starts (2 sec after #1022 ended)
12:28:10  #1024 finishes (failed)
```

**Implication**: The concurrency group is working correctly. The workflow runs are properly serialized. The failures are not caused by concurrent execution — they're caused by content conflicts with commits from **other workflows** (bot cycle, test triggers) that are in different concurrency groups and push to main independently.

### Finding 4: Push retry timing is too short

**Symptom**: The 3 retry attempts complete in ~13 seconds total (sleeps of 2, 4, 6 seconds).

**Cause**: The retry sleep is `attempt * 2` seconds. With concurrent pushes every ~3 minutes, a 2-6 second sleep doesn't meaningfully change the race condition. However, since the real problem is content conflicts (not timing), longer sleeps alone wouldn't fix this.

### Why Recovery Happened

The 12:32 run succeeded because it had a **shorter pending time**. It was created at ~12:28 (after #1024 finished at 12:28:10) and started promptly, so its checkout SHA was close to current HEAD of main. With fewer commits to rebase over and less divergence, the maintain LLM's output was compatible with what was on main.

The recovery was **partially deterministic** — shorter queue time → fresher checkout SHA → fewer conflicts. But it's also **fragile** — any queue delay reintroduces the stale SHA problem. The failure will recur whenever:
1. A run waits pending long enough for the previous run's maintain/dev jobs to push conflicting changes
2. The maintain LLM and a previous run's maintain/dev LLM independently edit the same feature files

---

## Work Items

All fixes target `agentic-lib/` (mastered here, distributed to repository0 via init).

### W1: Validate test files before committing (MEDIUM)

**Problem**: The transform agent can create empty test files (no `describe`/`test`/`it` blocks) that fail vitest. This breaks the post-commit-test gate and cascades to block the entire workflow.

**Fix**: In the `commit-if-changed` action or in the `dev` job's "Run tests before committing" step, add a pre-commit validation:
```bash
# Check all *.test.js files have at least one test
for f in $(git diff --cached --name-only --diff-filter=A -- '*.test.js'); do
  if ! grep -qE '(describe|test|it)\s*\(' "$f"; then
    echo "::warning::$f has no test suite — removing from commit"
    git reset HEAD "$f"
    rm "$f"
  fi
done
```
Alternatively, configure vitest with `passWithNoTests: true` in the consumer repo's vitest config — but this masks real problems. The pre-commit validation is safer.

**Files**: `src/actions/commit-if-changed/action.yml` or `.github/workflows/agentic-lib-workflow.yml` (dev job step 14)

**Status**: DONE

### W2: On rebase conflict, skip maintain commit instead of failing (HIGH)

**Problem**: The maintain job's commit is non-critical — it updates feature documentation and library references. When the rebase conflicts, the entire workflow fails. But the `dev`, `director`, `post-merge`, `post-commit-test` jobs don't depend on maintain's commit succeeding. The workflow failure is disproportionate.

**Fix**: Change the `commit-if-changed` action's conflict handling. After 3 failed rebase attempts, instead of `exit 1`, skip the push with a warning:
```bash
if [ "$PUSH_SUCCESS" != "true" ]; then
  echo "::warning::Failed to push after $MAX_RETRIES attempts — skipping maintain commit"
  git rebase --abort 2>/dev/null || true
  git checkout "$REF" 2>/dev/null || true
  # Don't exit 1 — let the workflow continue
fi
```

This requires a new input on the `commit-if-changed` action: `fail-on-conflict: true|false` (default `true`). The maintain job sets `fail-on-conflict: false`; the dev job keeps it `true` (dev commits are critical).

**Files**: `src/actions/commit-if-changed/action.yml`, `.github/workflows/agentic-lib-workflow.yml` (maintain step)

**Status**: DONE

### W3: Increase retry backoff with jitter (LOW)

**Problem**: Current sleep is `attempt * 2` (2, 4, 6 seconds). Too short for the push frequency.

**Fix**: Change to exponential backoff with jitter: `sleep $((attempt * 10 + RANDOM % 10))` — gives 10-19, 20-29, 30-39 seconds. This helps with push races but doesn't fix content conflicts.

**Files**: `src/actions/commit-if-changed/action.yml`

**Status**: DONE (subsumed into W4 tiered resolution)

### W4: Apply fix-stuck-style tiered conflict resolution to ALL commit+push locations (MEDIUM)

**Problem**: Five separate commit+push locations across the `agentic-lib*.yml` workflows all use the same brittle pattern: `rebase, rebase, rebase, exit 1`. Only the fix-stuck job (lines 1119-1221) has proper tiered resolution.

**Existing pattern (the model)**: The `fix-stuck` job already has a 3-tier developer-style conflict resolution strategy:

```
Tier 1: git merge origin/main --no-edit              (simple merge)
Tier 2: git merge origin/main -X theirs --no-edit    (prefer main for conflicts)
Tier 3: Save src/tests, reset to main, copy back     (nuclear)
```

**All commit+push locations needing the fix:**

| # | File | Lines | Push target | Current retry | Fix needed |
|---|------|-------|-------------|--------------|------------|
| 1 | `commit-if-changed/action.yml` | 52-85 | main or branch | 3x rebase-only | **Yes** — used by maintain (line 734) and dev (line 1608) |
| 2 | `agentic-lib-schedule.yml` | 272-285 | main | 3x rebase-only | **Yes** — schedule changes |
| 3 | `agentic-lib-init.yml` | 353-366 | main | 3x rebase-only | **Yes** — init pushes |
| 4 | `agentic-lib-update.yml` | 110-123 | main | 3x rebase-only | **Yes** — update pushes |
| 5 | `agentic-lib-flow.yml` | 695-696 | main | Single attempt, no retry | **Yes** — benchmark report |
| 6 | `agentic-lib-workflow.yml` fix-stuck sync | 1119-1221 | PR branch | 3-tier | No — already the model |
| 7 | `agentic-lib-workflow.yml` fix-stuck LLM push | 1274-1275 | PR branch | force-with-lease fallback | No — OK for PR branch |
| 8 | `agentic-lib-workflow.yml` fix main build | 1349-1350 | new branch | Single push | No — new branch, no conflicts |

**Fix**: Apply the same tiered strategy to locations 1-5. The cleanest approach is to fix `commit-if-changed` (location 1) since it's reusable, then refactor locations 2-5 to also use `commit-if-changed` instead of inline retry loops.

Proposed retry sequence for `commit-if-changed`:
```
Attempt 1: git pull --rebase origin $REF                      (cleanest — handles SHA races)
Attempt 2: git pull --no-rebase origin $REF                   (merge commit — handles non-overlapping changes)
Attempt 3: git pull -X theirs --no-rebase origin $REF         (accept remote on conflict — handles content conflicts)
Fallback:  controlled by fail-on-conflict input (exit 1 or warn and continue)
```

This mirrors the fix-stuck tier escalation: try the cleanest strategy first, escalate to more aggressive resolution only when needed. `-X theirs` (accept remote's version on conflict) is the right default for all these cases because main's content was pushed by a more recent, successful operation.

For locations 2-4 (schedule, init, update), the inline retry loops should be replaced with the `commit-if-changed` action or at minimum have the same 3-tier logic inlined. For location 5 (flow), add retry + tier logic (currently no retry at all).

**Files**: `src/actions/commit-if-changed/action.yml`, `.github/workflows/agentic-lib-schedule.yml`, `.github/workflows/agentic-lib-init.yml`, `.github/workflows/agentic-lib-update.yml`, `.github/workflows/agentic-lib-flow.yml`

**Status**: DONE

### ~~W5: Serialize maintain job pushes with concurrency group~~ — INVALID

**Reason**: The workflow-level concurrency group (`agentic-lib-workflow`, `cancel-in-progress: false`) already serializes all runs. Verified by job-level `startedAt` timestamps — maintain jobs do NOT run concurrently. The conflicts come from **previous serialized runs** of the same workflow whose commits landed on main before the current run's stale checkout SHA, not from external workflows.

**Status**: N/A

### W8: Fix stale checkout SHA — always use current HEAD across both workflows (HIGH)

**Problem**: This is the primary root cause of the rebase conflicts. The schedule trigger locks `GITHUB_SHA` at workflow creation time. When a run sits in the concurrency queue for 8-12 minutes, `actions/checkout@v6` checks out the stale SHA from creation time.

Verified from logs:
- Run #1022: created 11:26 → checked out `dbaaf5207` (from 11:18) → 2 commits behind main by execution time
- Run #1024: created 12:05 → checked out `bb5052034` (from 11:48) → 3+ commits behind main by execution time

**Principle**: Every checkout in `agentic-lib-workflow.yml` and `agentic-lib-bot.yml` should use the current branch HEAD, not the stale trigger SHA. Any SHA passed downstream should trace back to a fresh HEAD, not to `github.sha`.

**Current state** (15 `actions/checkout@v6` + 2 reusable workflow `ref:` params):

| Location | Current `ref:` | Pattern | Count |
|----------|---------------|---------|-------|
| workflow early jobs (params, behaviour-telemetry, telemetry, maintain, impl-review) | `inputs.ref \|\| github.sha` | **Stale when `inputs.ref` is empty** | 5 |
| workflow post-maintain jobs (director, supervisor, fix-stuck, review-features, dev, post-merge) | `needs.maintain.outputs.commit-sha \|\| github.sha` | Stale fallback when maintain fails/nops | 6 |
| workflow reusable calls (post-commit-test, update-schedule) | `needs.maintain.outputs.commit-sha \|\| github.sha` | Same stale fallback | 2 |
| bot workflow (params, respond) | `inputs.ref \|\| github.sha` | **Stale when `inputs.ref` is empty** | 2 |
| commit-if-changed `push-ref:` (line 737) | `github.ref_name` | Correct (branch name, not SHA) | 1 |
| maintain `get-sha` (line 741) | `git rev-parse HEAD` | Derived from checkout — correct if checkout is fixed | 1 |

**Fix**: Change the fallback from `github.sha` to `github.ref` everywhere in both workflows.

`github.ref` = `refs/heads/main` for schedule/push triggers. When `actions/checkout@v6` receives a branch ref, it fetches the **current HEAD** of that branch at checkout time — not a frozen SHA.

**Change 1 — Early jobs** (5 occurrences in workflow, 2 in bot):
```yaml
# Before:
ref: ${{ inputs.ref || github.sha }}
# After:
ref: ${{ inputs.ref || github.ref }}
```
When `inputs.ref` is empty (schedule trigger, direct workflow_dispatch), this resolves to `refs/heads/main` → current HEAD. When `inputs.ref` is set (called by another workflow with a specific ref), that ref is used as-is.

**Change 2 — Post-maintain jobs** (6 + 2 reusable calls = 8 occurrences):
```yaml
# Before:
ref: ${{ needs.maintain.outputs.commit-sha || github.sha }}
# After:
ref: ${{ needs.maintain.outputs.commit-sha || github.ref }}
```
When maintain succeeds and pushes, `commit-sha` is the fresh SHA of maintain's commit — correct. When maintain fails or nops, fallback to `github.ref` → current HEAD (not stale trigger SHA).

**Change 3 — Bot dispatches** (in `direct.js` and `supervise.js`) are already correct:
```javascript
ref: "main"  // Already uses branch name, resolves to current HEAD
```
These 6 `createWorkflowDispatch` calls in `direct.js` (lines 235, 248, 322, 335) and `supervise.js` (line 68) all use `ref: "main"`, so the bot workflow receives a fresh trigger. No change needed.

**Change 4 — Reusable workflow calls from workflow to test/schedule**: The `ref:` parameter passed to `agentic-lib-schedule.yml` and `agentic-lib-test.yml` (post-commit-test) uses the same `needs.maintain.outputs.commit-sha || github.sha` pattern — covered by Change 2.

**Note on `get-sha` (line 741)**: `echo "sha=$(git rev-parse HEAD)"` derives the SHA from the checkout. Once the checkout is fixed to use current HEAD, this output will also be fresh. No change needed.

**Note on `push-ref: ${{ github.ref_name }}` (line 737)**: This is `main` (branch name), used by `commit-if-changed` to push. Already correct — no change needed.

**Summary of changes**:

| File | Line(s) | Change |
|------|---------|--------|
| `agentic-lib-workflow.yml` | 142, 311, 354, 626, 765 | `inputs.ref \|\| github.sha` → `inputs.ref \|\| github.ref` |
| `agentic-lib-workflow.yml` | 833, 898, 983, 1369, 1424, 1725, 1818, 1827 | `needs.maintain.outputs.commit-sha \|\| github.sha` → `needs.maintain.outputs.commit-sha \|\| github.ref` |
| `agentic-lib-bot.yml` | 90, 119 | `inputs.ref \|\| github.sha` → `inputs.ref \|\| github.ref` |
| `direct.js` | 235, 248, 322, 335 | No change (already `ref: "main"`) |
| `supervise.js` | 68 | No change (already `ref: "main"`) |
| `commit-if-changed` | 737, 741 | No change (already correct) |

**Total**: 15 lines changed across 2 files. All `github.sha` → `github.ref`.

**Impact**: Eliminates the 8-12 minute staleness gap from concurrency queueing. Every job in both workflows starts from the current branch HEAD. The SHA passthrough chain (`maintain.outputs.commit-sha`) is preserved for precision when maintain succeeds; the fallback is now fresh HEAD instead of stale trigger SHA.

**Edge case — `inputs.ref` as a SHA**: When a calling workflow passes a specific SHA as `inputs.ref`, that SHA is used directly (no change). This is correct because the caller is responsible for passing a fresh ref. The bot dispatches from `direct.js`/`supervise.js` pass `ref: "main"`, so the bot workflow's `inputs.ref` is empty and falls through to `github.ref`.

**Files**: `.github/workflows/agentic-lib-workflow.yml`, `.github/workflows/agentic-lib-bot.yml`

**Status**: DONE

### W6: Reduce bot cycle push frequency (LOW)

**Problem**: The bot cycle pushes "schedule: set to off" and "mission-complete" commits every cycle (~3 minutes), creating steady push contention on main.

**Fix**: Only push "schedule: set to off" when the schedule was actually changed (check current state first). Similarly, only push "mission-complete" once (not every cycle — the file persists). This reduces main branch churn from ~20 pushes/hour to ~5-10.

**Files**: `.github/workflows/agentic-lib-workflow.yml` (schedule-off step), `src/actions/agentic-step/tasks/direct.js` (mission-complete dedup)

**Status**: DONE

### W7: Flow benchmark should tolerate pre-existing test failures (LOW)

**Problem**: The flow benchmark (`agentic-lib-flow`) at 09:21 failed because it inherited the broken `edge-cases.test.js` from the pre-init state. The flow's `update/update` step runs tests before committing, and the test failure aborted the entire multi-run benchmark.

**Fix**: The flow's `update` job should handle pre-existing test failures more gracefully. If the `init --purge` step succeeds but tests fail, the test failure should not abort the update — the init reset the code, and the next iteration should be allowed to fix remaining issues.

**Files**: `.github/workflows/agentic-lib-flow.yml` (update job)

**Status**: DONE

---

## Implementation Order

| # | Work Item | Priority | Dependencies | Status |
|---|-----------|----------|--------------|--------|
| 1 | W8 | HIGH | None | DONE |
| 2 | W2 | HIGH | None | DONE |
| 3 | W4 | MEDIUM | W2 | DONE |
| 4 | W1 | MEDIUM | None | DONE |
| 5 | ~~W5~~ | — | — | N/A (invalid — already serialized) |
| 6 | W3 | LOW | W2 | DONE |
| 7 | W6 | LOW | None | DONE |
| 8 | W7 | LOW | None | DONE |

**Branch**: `claude/benchmark-012-fixes`

---

## Summary

Two distinct failure modes:

1. **Empty test file** (08:48, 09:21) — Agent-created `edge-cases.test.js` with no tests. Fixed by init purge. Preventable with pre-commit validation (W1).

2. **Stale checkout SHA + maintain push conflicts** (11:26, 12:05) — The schedule trigger locks `GITHUB_SHA` at workflow creation time. When a run queues behind the concurrency group for 8-12 minutes, it checks out a stale SHA. The previous serialized run's maintain/dev jobs push changes to the same feature files during the queue wait. The current run's maintain LLM independently edits those same files, creating content conflicts at push time. At 11:26: run #1021's maintain vs run #1022's maintain. At 12:05: run #1022's dev vs run #1024's maintain. Self-resolved at 12:32 when queue time was shorter. Preventable by checking out fresh main (W8), making maintain push non-fatal (W2), and improving the conflict fallback strategy (W4).
