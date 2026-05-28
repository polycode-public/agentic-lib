# Plan: Benchmark 013 Fixes (Post-W9 Observation 2026-03-18)

**Source**: Workflow run analysis from [repository0 Actions](https://github.com/xn-intenton-z2a/repository0/actions) on 2026-03-18 22:28–23:23 UTC
**Created**: 2026-03-18
**Status**: DONE (W2, W3, W4 implemented; W1 deferred as operator behaviour)

---

## User Assertions

1. Review activities since init at 22:28 leading to mission-complete at 23:23
2. Suggest fixes and optimisations

---

## Timeline (2026-03-18, all times UTC)

| Time | Event | Detail |
|------|-------|--------|
| 22:28:31 | Init purge (agentic-lib@7.4.29) | [#23270174178](https://github.com/xn-intenton-z2a/repository0/actions/runs/23270174178). Includes W9 `dispatch-workflow` job. |
| 22:29:49 | Init `dispatch-workflow` completes | Auto-dispatched `agentic-lib-workflow` (W9 feature). |
| 22:29:56 | **Workflow run #1 starts** | [#23270223104](https://github.com/xn-intenton-z2a/repository0/actions/runs/23270223104). `workflow_dispatch` from init. |
| 22:30–22:35 | maintain | Pushed features + library docs (`e5b69ed79`). |
| 22:35–22:37 | director | Decision: **in-progress** — all Hamming functions missing. |
| 22:37–22:39 | supervisor | Created issue [#3119](https://github.com/xn-intenton-z2a/repository0/issues/3119) "feat: implement Hamming distance functions, tests, and README". |
| 22:39–22:42 | dev | Transformed #3119 → merged PR [#3120](https://github.com/xn-intenton-z2a/repository0/pull/3120) (`87a073971`). |
| 22:42–22:43 | post-merge director | Decision: **in-progress** — used stale review context from 22:30 (pre-transform). |
| 22:43–22:44 | post-commit-test | All tests pass. |
| 22:44:26 | **Workflow run #1 ends** | SUCCESS. Schedule still "off". |
| 22:44–23:08 | **24-minute gap** | No workflow runs. Schedule=off, no auto-dispatch of next cycle. |
| 23:08:56 | **Workflow run #2 starts** | [#23271517639](https://github.com/xn-intenton-z2a/repository0/actions/runs/23271517639). Manual `workflow_dispatch`. |
| 23:09:27 | Schedule set to continuous | Manual dispatch. |
| 23:09–23:16 | maintain | Pushed features + library docs (`3de0153fa`). |
| 23:16–23:19 | director | Decision: **mission-complete**. Dispatched schedule-off + bot. |
| 23:19:38 | MISSION_COMPLETE.md created | `cab6b2a92` — first director writes it. |
| 23:19:39 | schedule-off dispatched | By director. Commits `07c09dbac` — **does NOT delete MISSION_COMPLETE.md** (W9 fix confirmed). |
| 23:20–23:23 | post-merge director | Decision: **mission-complete** again. Dispatches schedule-off + bot AGAIN. |
| 23:23:17 | MISSION_COMPLETE.md re-created | `c290e7430` — post-merge director writes it again. |
| 23:23:18 | schedule-off dispatched again | By post-merge director. Commits `70b46823c` — does NOT delete MISSION_COMPLETE.md. |
| 23:23:52 | `src/index.js` deleted | Manual cleanup by user (`0faa56a1b`). |
| 23:23:59 | **Workflow run #2 ends** | "Cancelled" — only `post-commit-test / behaviour` was cancelled; all other jobs succeeded. |

---

## What Went Well

1. **W9 `dispatch-workflow` works**: Init at 22:28 auto-dispatched the first workflow at 22:29. No manual Step 2 needed.
2. **W9 `MISSION_COMPLETE.md` survives**: The schedule-off at 23:19 and 23:23 both preserved `MISSION_COMPLETE.md` (the `git rm` is now guarded behind maintenance mode).
3. **Single-transform completion**: Issue #3119 created by supervisor, resolved by dev in one transform, merged as PR #3120. Mission completed in just 2 workflow cycles.
4. **Efficient pipeline**: Init → first workflow (13 min) → 24 min gap → second workflow (15 min) → mission-complete. Total active time ~28 min.
5. **Tiered push resolution**: No rebase conflicts observed. The maintain pushes succeeded on first attempt.
6. **W4 mission-complete gate (from Plan 011)**: The dev job in run #2 correctly detected `MISSION_COMPLETE.md` and skipped transformation.

---

## Findings

### F1: 24-minute gap between cycles (CONCERN)

After the first workflow completed at 22:44, nothing happened until the user manually dispatched at 23:08. With `schedule=off` (benchmark mode), the workflow doesn't auto-dispatch the next cycle.

The init `dispatch-workflow` job only fires once (after init). After the first workflow run, there's no mechanism to trigger the next cycle except: (a) manual dispatch, or (b) setting a schedule.

**Impact**: 24 minutes of idle time. The mission could have completed ~10 minutes earlier if the second cycle started automatically.

### F2: Double mission-complete dispatch (CONCERN)

Both the director (23:19) and post-merge director (23:23) independently declared mission-complete, each dispatching:
- `agentic-lib-schedule.yml` with `frequency=off`
- `agentic-lib-bot.yml` with mission-complete message

The W6 dedup check (read `agentic-lib.toml` to see if schedule is already off) **did not prevent the second dispatch** because the post-merge director runs in the same workflow checkout — its local `agentic-lib.toml` doesn't reflect the schedule change pushed by the first director's dispatch.

**Impact**: 2x schedule-off dispatches, 2x bot notifications, 2x `MISSION_COMPLETE.md` commits. Harmless but wasteful (4 extra commits + 4 extra workflow runs).

### F3: State file `mission-complete` flag not persisted (CONCERN)

The logs-branch `agentic-lib-state.toml` shows:
```toml
[status]
mission-complete = false
[schedule]
auto-disabled = false
```

Despite two directors writing `mission-complete = true` and `auto-disabled = true` to the state. The `MISSION_COMPLETE.md` file exists on main (correct), but the state file on the logs branch doesn't reflect it. Either the push-to-logs step failed silently or was overwritten by a later task's push.

**Impact**: Future workflow runs that check the state file (not `MISSION_COMPLETE.md`) would see `mission-complete = false`. The W4 mission-complete gate checks the file on main, not the state, so this doesn't affect the gate — but it means telemetry is inaccurate.

### F4: Post-merge director uses stale review context (KNOWN)

The implementation-review job ran at 22:30 (parallel with maintain), capturing gaps before the dev transform. The post-merge director at 22:42 received this stale review showing "all Hamming functions missing" even though PR #3120 had just been merged with the implementation.

This caused the post-merge director to incorrectly decide "in-progress" in run #1. Not a regression — this is the known limitation from Plan 011 (W17/W18).

### F5: Workflow shows "cancelled" despite success (COSMETIC)

Run #2 shows conclusion=`cancelled` in the Actions UI because `post-commit-test / behaviour` was cancelled (likely by the schedule change push creating a new test run that superseded it). All substantive jobs (maintain, director, dev, post-merge) completed successfully.

### F6: Issue #3121 created after mission-complete (LOW)

Issue #3121 "test: add dedicated unit tests for Hamming distance utilities" was created at 23:39, after mission-complete. This appears to be from a review-features job or a subsequent run. It's labelled `ready` but won't be worked on since the mission is complete. Not a bug — the issue is valid improvement work — but it represents wasted LLM tokens.

---

## Work Items

### W1: Auto-dispatch next cycle when mission is not complete (MEDIUM)

**Problem**: With `schedule=off`, the workflow doesn't auto-dispatch the next cycle. After the first run completes without mission-complete, there's a gap until the next manual dispatch or scheduled cron.

**Fix**: In the `post-merge` job (or a new `dispatch-next` job at the end), if the mission is not complete and `schedule=off`, dispatch `agentic-lib-workflow` to start the next cycle immediately. This creates a self-sustaining loop that only stops when mission-complete or mission-failed is declared.

Gate: only dispatch if (a) mission not complete, (b) not dry-run, (c) budget not exhausted, (d) no stuck pipeline detected.

**Files**: `.github/workflows/agentic-lib-workflow.yml` (new job or step in post-merge)

**Status**: N/A (operator behaviour)

### W2: Prevent double mission-complete dispatch (LOW)

**Problem**: Both director and post-merge director declare mission-complete independently, each dispatching schedule-off + bot. The W6 dedup reads local `agentic-lib.toml` which doesn't reflect changes pushed by the first dispatch.

**Fix**: After the director declares mission-complete, set a workflow output (`director.outputs.decision == 'mission-complete'`). The post-merge director step should check this output and skip its own mission-complete execution if the pre-merge director already handled it.

Alternatively, the `executeMissionComplete` function could check if `MISSION_COMPLETE.md` already exists on main (via git or API) before writing it again.

**Files**: `.github/workflows/agentic-lib-workflow.yml` (post-merge job condition), `src/actions/agentic-step/tasks/direct.js` (optional dedup)

**Status**: DONE

### W3: Fix state file mission-complete persistence (MEDIUM)

**Problem**: The logs-branch `agentic-lib-state.toml` shows `mission-complete = false` after the director set it to `true`. The state update may be lost during the push-to-logs race.

**Fix**: Investigate the push-to-logs flow. The director writes `mission-complete = true` to local `agentic-lib-state.toml`, then `push-to-logs.sh` pushes it to the logs branch. If another task (post-merge director) also pushes to the logs branch, the later push may overwrite the earlier one without the mission-complete flag (if it read the state before the director updated it).

Potential fix: ensure the push-to-logs script does a fetch + merge before pushing, or use the tiered push strategy (the logs branch push currently uses a simpler approach).

**Files**: `src/scripts/push-to-logs.sh`, possibly `src/actions/agentic-step/tasks/direct.js`

**Status**: DONE

### W4: Skip review-features when mission is complete (LOW)

**Problem**: Issue #3121 was created after mission-complete. The review-features job should be gated on mission-complete.

**Fix**: The review-features job already has `needs.params.outputs.mission-complete != 'true'` in its `if` condition (from Plan 011 W4). However, the params job checks for `MISSION_COMPLETE.md` at workflow start. If mission-complete is declared MID-run (by the director), the review-features job has already been queued with the old params output. The issue creation at 23:39 was from a LATER run, not from run #2 — so this may not need a fix. Verify whether the issue was created by a run that started after mission-complete.

**Files**: `.github/workflows/agentic-lib-workflow.yml` (review-features condition)

**Status**: DONE

---

## Implementation Order

| # | Work Item | Priority | Dependencies | Status |
|---|-----------|----------|--------------|--------|
| 1 | W1 | MEDIUM | None | N/A (operator behaviour) |
| 2 | W3 | MEDIUM | None | DONE |
| 3 | W2 | LOW | None | DONE |
| 4 | W4 | LOW | None | DONE |

**Branch**: `claude/benchmark-013-fixes`

---

## Summary

The init → workflow → mission-complete pipeline completed successfully in 2 cycles (~28 min active time). The W9 fixes confirmed working: init auto-dispatched the first cycle, and `MISSION_COMPLETE.md` survived schedule-off. The main opportunity is **W1: auto-dispatch the next cycle** to eliminate the 24-minute idle gap when schedule is off. Secondary issues are the double mission-complete dispatch (W2), state file persistence (W3), and post-mission-complete issue creation (W4).
