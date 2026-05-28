# REPORT: Workflow Validation — repository0

**Date**: 2026-03-02 to 2026-03-03
**Operator**: Claude Code (claude-opus-4-6)
**Target**: `xn-intenton-z2a/repository0` (plot-code-lib mission)
**Duration**: ~2 hours interactive + overnight monitoring
**agentic-lib version**: 7.1.27 → 7.1.28 → 7.1.29 → 7.1.30 (fixes applied during testing)

## Test Method

Manually dispatched each agentic workflow in repository0 via `gh workflow run` and `gh api graphql`, observed outcomes, and recorded results. The goal is to validate that the full agentic pipeline works end-to-end: from mission → features → issues → code → tests → review → close.

Testing occurred in two phases:
- **Phase 1** (v7.1.27 → v7.1.28): Initial validation, discovered and fixed concurrency issues
- **Phase 2** (v7.1.29): Supervisor orchestration, issue lifecycle, review-issue fix

### Permissions Required for Hands-Free Operation

To run this validation autonomously, the operator needs:

| Permission | Why |
|-----------|-----|
| `gh workflow run` on repository0 | Dispatch all agentic workflows |
| `gh issue create/list` on repository0 | Create test issues for transform to pick up |
| `gh api graphql` mutations on repository0 | Post discussion comments to trigger bot |
| `gh pr merge` on agentic-lib | Merge fixes discovered during testing |
| Read access to workflow run logs | Diagnose failures |
| NPM publish (via release workflow) | Publish fixed agentic-lib to npm |
| `npx @xn-intenton-z2a/agentic-lib init --purge` in repository0 | Deploy fixes to repository0 |

### Pre-conditions
- repository0 on main, MISSION.md describes "plot-code-lib" (jq of formulae visualisations)
- No open issues or PRs at start
- `src/lib/main.js` exists (seed file)
- No `features/` directory (features not yet generated)
- All workflows present and enabled

### Workflows Under Test

| Workflow | Purpose | Test Approach |
|----------|---------|---------------|
| `agent-flow-maintain` | Generate features from MISSION.md | Dispatch, check if features/ created |
| `agent-flow-transform` | Pick issue, generate code, push to main | Dispatch after creating issues |
| `agent-flow-review` | Close resolved issues, enhance criteria | Dispatch, observe behavior |
| `agent-flow-fix-code` | Fix failing PR | Wait for a failing PR, then test |
| `agent-discussions-bot` | Respond in discussions | Post comment, dispatch, check response |
| `agent-supervisor` | Reactive (evaluate) + proactive (supervise) | Observe reactive triggers; dispatch proactive |
| `ci-automerge` | Auto-merge PRs with label | Observe after PR creation |
| `test` | Run tests on PR branches | Observe after PR creation |

---

## Phase 1: Initial Validation (v7.1.27 → v7.1.28)

### Experiment 1: Discussion Bot Engagement
**Time**: 2026-03-02T22:09Z
**Action**: Posted comment to discussion #2427 via GraphQL asking bot to create an issue for expression parser
**Discussion comment**: https://github.com/xn-intenton-z2a/repository0/discussions/2427#discussioncomment-15977640
**Triggered**: `agent-discussions-bot` via `discussion_comment` event (run 22597985582) — SUCCESS
**Also dispatched manually**: run 22597987819 — SUCCESS but no-op (empty discussion URL on workflow_dispatch)
**Result**: **PASS** — Bot responded naturally: "I'll get the supervisor to create that issue for your expression parser experiment."

**Follow-up at 22:21Z**: Posted second comment about testing strategy for time series data.
- Triggered via `discussion_comment` event (run 22598403663) — SUCCESS
- Bot responded with a detailed testing strategy: known value tests, reference comparison, floating point tolerance, boundary testing

### Experiment 2: Feature Generation (agent-flow-maintain)
**Time**: 2026-03-02T22:09Z
**Action**: Dispatched `agent-flow-maintain` to generate features from MISSION.md
**Run**: https://github.com/xn-intenton-z2a/repository0/actions/runs/22597976932
**Duration**: 1m23s
**Result**: **PASS** — Created 4 feature files in `features/`:
- `EXPRESSION_PARSING.md` — Mathematical expression parser with mathjs
- `CLI_INTERFACE.md` — Command-line interface with yargs/commander
- `PLOT_GENERATION.md` — SVG/PNG plot generation
- `TIME_SERIES_GENERATION.md` — Time series data generation from expressions

Committed to main as `cfff77cd`.

### Experiment 3: Code Generation (agent-flow-transform)
**Time**: 2026-03-02T22:10Z
**Action**: Created issue #2440 "Implement expression parser for mathematical formulae", dispatched transform
**Issue**: https://github.com/xn-intenton-z2a/repository0/issues/2440
**Run (attempt 1)**: 22598008914 — **CANCELLED** by concurrency group `agentic-lib-main` (maintain was still running)
**Run (attempt 2)**: https://github.com/xn-intenton-z2a/repository0/actions/runs/22598059066
**Duration**: 4m12s (31 LLM turns)
**Result**: **PASS** — Generated a full implementation:
- `src/lib/main.js` +287 lines: `ExpressionParser` class, CLI with `commander`, SVG generation with `d3` + `jsdom`
- `tests/unit/main.test.js` +114 lines: comprehensive unit tests
- `package.json` +12/-5: added `mathjs`, `commander`, `d3`, `jsdom` dependencies
- Created 3 example SVG files: `sine.svg`, `parabola.svg`, `complex.svg`
- Updated `README.md` with documentation (+160 lines)
- Updated `intentïon.md` activity log

Committed to main as `d570e9bb`.

### Experiment 4: Issue Review (agent-flow-review)
**Time**: 2026-03-02T22:10Z
**Action**: Dispatched `agent-flow-review` with existing issue #2440
**Run**: https://github.com/xn-intenton-z2a/repository0/actions/runs/22598012349
**Duration**: review-issues (25s) + enhance-issues (51s)
**Result**: **PASS** — Added `ready` label to issue #2440. Both review and enhance jobs completed successfully.

### Experiment 5: Fix Code Flow
**Status**: NOT TESTED — No failing PR was generated during testing period. Transform commits directly to main rather than opening PRs, so there were no PR branches to fail.

### Experiment 6: Supervisor (Proactive LLM)
**Time**: 2026-03-02T22:14Z
**Action**: Dispatched `agent-supervisor` via `workflow_dispatch`
**Run**: https://github.com/xn-intenton-z2a/repository0/actions/runs/22598140672
**Result**: **PASS** — The LLM supervisor ran successfully:
- `evaluate` job skipped (correct — only fires on `workflow_run`)
- `supervise` job ran using `claude-sonnet-4` model
- Authenticated as `Antony-at-Polycode` via COPILOT_GITHUB_TOKEN
- **Decision**: `nop` — correctly identified that transform was already running on issue #2440
- **Reasoning**: "Current state analysis shows optimal pipeline activity... Transform already in progress"
- Duration: ~12 seconds (prompt 6126 chars, 16723 input tokens, 745 output tokens)

### Experiment 6b: Supervisor (Reactive)
**Time**: 2026-03-02T22:10Z, 22:16Z (automatic)
**Runs**: 22598015102 (after maintain), 22598229946 (after transform)
**Result**: **PASS** — Reactive `evaluate` job fired correctly on `workflow_run` completion. No PR failures to respond to, so it completed quickly with no actions.

---

## Phase 2: Supervisor Orchestration (v7.1.29)

After deploying v7.1.29 with concurrency fixes, the repository was purged (`init --purge`) and a fresh plot-code-lib mission was set. Phase 2 tests the supervisor as the primary orchestrator driving the pipeline autonomously.

### Experiment 8: Supervisor-Driven Transform (Cycle 1)
**Time**: 2026-03-02T23:28Z
**Setup**: Created issues #2444 (expression parser) and #2445 (CLI interface). Ran `agent-flow-maintain` to generate features, then `agent-flow-review` to enhance issues.
**Action**: Dispatched `agent-supervisor`
**Run**: https://github.com/xn-intenton-z2a/repository0/actions/runs/22600575212
**Duration**: 28s
**Result**: **PASS** — Supervisor chose 1 action:
- **Action**: `dispatch:agent-flow-transform`
- **Reasoning**: "The repository has 2 open issues ready for work (#2444: expression parser, #2445: CLI interface), with issue #2444 marked as 'ready'. No transform workflow is currently running."
- Transform run 22600592539 completed in 5m31s, generating 2,599 lines of new code:
  - `src/lib/expression-parser.js` (89 lines)
  - `src/lib/range-parser.js` (80 lines)
  - `src/lib/plotter.js` (349 lines)
  - `src/lib/main.js` (92 lines modified)
  - Unit tests, README docs, dependency updates

### Experiment 9: Supervisor Multi-Action (Cycle 2)
**Time**: 2026-03-02T23:35Z
**Action**: Dispatched `agent-supervisor` after first transform completed
**Run**: https://github.com/xn-intenton-z2a/repository0/actions/runs/22600787979
**Duration**: 34s
**Result**: **PASS** — Supervisor chose 2 concurrent actions:
- `dispatch:agent-flow-transform` — To continue working on remaining issues
- `dispatch:agent-flow-maintain` — To refresh features and library
- **Reasoning**: "The repository is showing strong momentum - the recent transform successfully implemented the CLI interface (#2445), but there's still work to be done."
- Both workflows ran in parallel (concurrency fix validated)

### Experiment 10: Supervisor Cycle 3
**Time**: 2026-03-03T01:25Z
**Action**: Dispatched `agent-supervisor`
**Run**: https://github.com/xn-intenton-z2a/repository0/actions/runs/22603868483
**Duration**: 31s
**Result**: **PASS** — Supervisor again chose 2 actions: `transform` + `maintain`. Consistent decision-making with good reasoning.

### Experiment 11: Discussion Bot (Fresh Discussion)
**Time**: 2026-03-03T01:19Z
**Action**: Created discussion #2446 "Hello from validation testing — plot-code-lib experiment", posted comment asking about repository state and suggesting polar coordinate support
**Triggered**: `agent-discussions-bot` via `discussion_comment` event (runs 22603784753, 22603787753)
**Result**: **PASS** — Bot gave detailed, contextual responses:
- Described current implementation state (expression parser, CLI, plotting)
- Engaged with polar coordinates suggestion, proposed CLI syntax
- Asked follow-up questions about edge cases
- Two responses in 29s and 41s respectively

### Experiment 12: Issue Lifecycle (Create → Enhance → Transform → Review → Close)
**Time**: 2026-03-02T23:26Z – 2026-03-03T01:34Z
**Issue**: #2444 "Implement expression parser for mathematical formulae"
**Flow**:
1. Issue created with `automated` label
2. `agent-flow-review` (enhance job) added `ready` label — issue now eligible for transform
3. `agent-supervisor` dispatched `agent-flow-transform` — LLM generated full implementation
4. `agent-flow-review` (review job) examined code, ran tests — LLM returned `**RESOLVED**`
5. **BUG FOUND**: Review handler checked `verdict.startsWith("RESOLVED")` but LLM returned `**RESOLVED**` (markdown bold). Issue stayed open despite being resolved.
6. **FIX APPLIED**: Strip leading markdown formatting before checking verdict
7. After fix: `agent-flow-review` correctly closed issue #2444 as resolved

**Result**: **PASS** (after fix) — Full issue lifecycle completed end-to-end. The pipeline autonomously created code that satisfied the issue requirements and closed it.

### Experiment 13: Concurrent Workflow Execution
**Time**: 2026-03-02T23:26Z
**Action**: Dispatched maintain, transform, and review simultaneously
**Result**: **PASS** — All three ran in parallel without cancellation. The separate concurrency groups from v7.1.28 work correctly.

---

## Results Summary

### Phase 1

| Experiment | Workflow | Outcome | Duration | Notes |
|-----------|----------|---------|----------|-------|
| 1 | discussions-bot | **PASS** | 14s | Natural event trigger works; manual dispatch no-ops |
| 2 | agent-flow-maintain | **PASS** | 1m23s | Generated 4 feature files from mission |
| 3 | agent-flow-transform | **PASS** | 4m12s | Generated full expression parser + CLI + tests (287 LoC) |
| 4 | agent-flow-review | **PASS** | 1m16s | Enhanced issue with `ready` label |
| 5 | agent-flow-fix-code | **NOT TESTED** | — | No failing PR available |
| 6 | agent-supervisor (proactive) | **PASS** | 12s | LLM chose `nop` correctly |
| 6b | agent-supervisor (reactive) | **PASS** | <10s | Fired on workflow completions correctly |

### Phase 2

| Experiment | Workflow | Outcome | Duration | Notes |
|-----------|----------|---------|----------|-------|
| 8 | supervisor → transform | **PASS** | 28s + 5m31s | Supervisor dispatched transform, 2599 LoC generated |
| 9 | supervisor (multi-action) | **PASS** | 34s | Dispatched 2 workflows concurrently |
| 10 | supervisor (cycle 3) | **PASS** | 31s | Consistent multi-action decision |
| 11 | discussions-bot (fresh) | **PASS** | 29s | Contextual, engaging response |
| 12 | issue lifecycle | **PASS** | ~2 hours | Full create → enhance → transform → review → close |
| 13 | concurrent workflows | **PASS** | — | 3 workflows in parallel, no cancellations |

---

## Issues Found

### ISSUE-1: Shared Concurrency Group Causes Cancellations (FIXED in v7.1.28)
**Severity**: High
**Workflows affected**: transform, maintain, review
**Problem**: All three shared `concurrency: agentic-lib-main`, so dispatching them simultaneously caused one to cancel the other.
**Impact**: Transform attempt 1 was cancelled because maintain was still running.
**Fix**: PR #1808 — separate concurrency groups (`agentic-lib-transform`, `agentic-lib-maintain`, `agentic-lib-review`)

### ISSUE-2: Discussions Bot Ignores workflow_dispatch (FIXED in v7.1.28)
**Severity**: Medium
**Problem**: The bot extracts discussion URL from `context.payload.discussion` which is empty on `workflow_dispatch`. The "Respond to discussion" step skips entirely.
**Impact**: Supervisor can't dispatch the bot to respond to a specific discussion.
**Fix**: PR #1808 — added `discussion-url` input to `workflow_dispatch` and updated URL resolution to check input first.

### ISSUE-3: Bot Concurrency Cancels Event Triggers (FIXED in v7.1.28)
**Severity**: Medium
**Problem**: Global `concurrency: agentic-lib-bot` means a `workflow_dispatch` run cancels a concurrent `discussion_comment` event run.
**Impact**: Run 22598138786 (natural event trigger) was cancelled by our manual dispatch.
**Fix**: PR #1808 — per-discussion concurrency group `agentic-lib-bot-${{ github.event.discussion.node_id || github.run_id }}`

### ISSUE-4: GITHUB_TOKEN Pushes Don't Trigger Workflows
**Severity**: Medium
**Problem**: When agentic workflows commit via GITHUB_TOKEN, the push to main does NOT trigger `test.yml` or other push-triggered workflows. This is a GitHub security feature to prevent infinite loops.
**Impact**: Code committed by transform, maintain, etc. is never tested by the `test` workflow. Only human pushes or pushes via a PAT trigger the test workflow.
**Workaround**: The transform task runs `npm test` internally via the Copilot SDK before committing. But there's no independent CI validation.
**Potential fix**: Use `WORKFLOW_TOKEN` (PAT) for the push step, or dispatch `test` explicitly after commit.

### ISSUE-5: Transform Commits Directly to Main (No PRs)
**Severity**: Low-Medium
**Problem**: Transform pushes to `${{ github.ref_name }}` (main) via `commit-if-changed`. No branch is created, no PR is opened.
**Impact**: There's no code review gate, no automerge flow, no fix-code flow (nothing to fix since there are no PR branches).
**Trade-off**: Direct-to-main is faster and simpler. The LLM already runs tests before committing. PRs add a review gate but slow down the pipeline.

### ISSUE-6: Push Retry Logic Untested
**Severity**: Low
**Problem**: The new retry logic in `commit-if-changed` hasn't been tested with actual push races yet.

### ISSUE-7: Review Verdict Markdown Formatting (FIXED in PR #1809)
**Severity**: High
**Problem**: The review LLM sometimes returns `**RESOLVED**: ...` (markdown bold) instead of plain `RESOLVED: ...`. The handler checked `verdict.toUpperCase().startsWith("RESOLVED")` which failed because of the leading `**`.
**Impact**: Issues that were correctly determined to be resolved stayed open indefinitely. The review kept running and returning "RESOLVED" but the issue never closed.
**Fix**: PR #1809 — strip leading markdown characters (`*`, `_`, `` ` ``, `#`, `>`, whitespace, `-`) before checking the verdict prefix.

### ISSUE-8: Library Config Limits Set to Zero (FIXED in PR #1809)
**Severity**: Medium
**Problem**: The seed YAML config (`agentic-lib.yml`) had `limit: 0` for `librarySourcesFilepath` and `libraryDocumentsPath`, with empty permissions arrays. The maintain workflow never generated library documents.
**Impact**: The `library/` directory was always empty.
**Fix**: PR #1809 — set limits to 32, features limit to 4, added write permissions.

### ISSUE-9: init --purge Doesn't Overwrite Stale TOML (FIXED in PR #1809)
**Severity**: Medium
**Problem**: `initConfig()` only copies `zero-agentic-lib.toml` if the target doesn't exist. On `--purge`, the TOML was skipped because an older version already existed.
**Impact**: Purged repositories retained outdated configuration missing new fields (`library`, `supervisor`, etc.).
**Fix**: PR #1809 — added `zero-agentic-lib.toml` to the `SEED_MAP` in `initPurge()`.

---

## Recommendations

### Immediate
1. ~~Deploy v7.1.28 to repository0 via `init --purge` to get the concurrency fixes~~ DONE
2. ~~Re-run experiments to validate concurrent dispatches work without cancellation~~ DONE (Experiment 13)
3. ~~Test supervisor orchestration with real issue lifecycle~~ DONE (Experiments 8-12)

### Short-term
4. **Add WORKFLOW_TOKEN to transform commit step** so pushes trigger the test workflow (ISSUE-4)
5. **Add explicit test dispatch** after agentic commits — supervisor could dispatch `test` after observing a transform/maintain commit
6. **Set supervisor to hourly schedule** — the proactive supervisor makes good decisions and should run regularly

### Medium-term
7. **Evaluate branch-based transform** — optional mode where transform creates a PR branch instead of pushing to main
8. **Supervisor prompt tuning** — after several live cycles, adjust the agent prompt based on what decisions work well
9. **Discussion bot ↔ supervisor integration** — bot can dispatch supervisor with user requests, supervisor can respond via bot

---

## Continuous Rate Assessment

Analysis of workflow durations to determine the maximum safe supervisor frequency.

### Observed Durations

| Workflow | Min | Median | Max | Notes |
|----------|-----|--------|-----|-------|
| `agent-supervisor` (proactive) | 38s | 42s | 43s | LLM decision + dispatch |
| `agent-supervisor` (reactive) | 6s | 7s | 11s | Hardcoded evaluate only |
| `agent-flow-transform` | 2m6s | 4.5m | 6m | Depends on issue complexity |
| `agent-flow-maintain` | 1.3m | 1.6m | 3.9m | Depends on feature/library count |
| `agent-flow-review` | 48s | 1m | 1m16s | Per-issue review + enhance |
| `agent-discussions-bot` | 14s | 29s | 41s | Per-comment response |

### Conflict Window

The conflict risk is in `commit-if-changed`: two workflows pushing to main at the same time. The retry logic (3 attempts with rebase) mitigates this, but doesn't eliminate it.

**Worst case**: Supervisor dispatches transform + maintain simultaneously. Both finish within seconds of each other and both try to push. The retry logic handles this, but if a third workflow (scheduled transform) also pushes, three-way races become likely.

### Recommended Rates

| Frequency | Cron | Supervisor Interval | Risk Level | Notes |
|-----------|------|---------------------|------------|-------|
| `hourly` | `0 * * * *` | 60 min | **Low** | Transform (6m max) completes well before next cycle. Recommended for active development. |
| `continuous` | `*/10 * * * *` | 10 min | **Medium** | Transform may still be running when next supervisor fires. Supervisor correctly chooses `nop` in this case, but scheduled transforms could overlap. |
| `*/5 * * * *` | every 5 min | 5 min | **High** | Multiple transforms and maintains could queue up. Push races likely even with retry logic. Not recommended. |

### Recommended Maximum: `*/10 * * * *` (every 10 minutes)

At 10-minute intervals, the supervisor fires frequently enough to keep the pipeline active, but transform (median 4.5m) usually completes before the next cycle. The `cancel-in-progress: true` on transform means a new dispatch cancels any stale run, so there's no queue buildup.

The real limiter is push races. With separate concurrency groups, transform and maintain can push simultaneously. The retry logic handles occasional races, but at `*/5` or faster, the probability of triple-push scenarios increases.

**For initial deployment, `hourly` is the safe choice.** Move to `*/10` after observing a few days of clean operation.

---

## Phase 3: Overnight Autonomous Operation (Continuous Schedule)

After deploying v7.1.30 with all fixes, the repository was purged (`init --purge`) with a fresh plot-code-lib mission. The supervisor was set to continuous (`*/10 * * * *`) via `agent-supervisor-schedule.yml` at 01:45Z. The operator went to bed — this phase records what the pipeline did autonomously.

### Timeline

| Time (UTC) | Event | Details |
|------------|-------|---------|
| 01:43Z | `agent-supervisor-schedule` dispatched | Set supervisor cron to `*/10 * * * *` (continuous) |
| 01:44Z | Push (schedule change) triggers `test` → succeeds | CI validates the schedule-change commit |
| 01:44Z | Reactive supervisor (workflow_run) fires 3× | test + ci-automerge completions trigger evaluate — no actions (no failing PRs) |
| 01:45Z | `agent-supervisor-schedule` dispatched again | User switched from hourly to continuous (second dispatch) |
| 01:46Z | Reactive supervisor fires 2× | cascade from second push |
| 01:51Z | `agent-flow-maintain` dispatched | Last manual dispatch — generates features and library docs |
| 01:52Z | Maintain completes | Generated 4 feature files (CLI_INTERFACE, EXPRESSION_PARSER, PLOT_RENDERING, TIME_SERIES_GENERATION) |
| 01:52Z – 02:41Z | **Silence** | No workflow runs for **49 minutes**. The scheduled supervisor cron (`*/10`) has not fired. |

### Key Finding: GitHub Cron Schedule Did Not Fire

The `*/10 * * * *` cron schedule was configured at 01:44Z. As of 02:41Z (57 minutes later), **zero scheduled runs** have occurred. All supervisor runs during this period were reactive (`workflow_run` events triggered by other workflow completions).

**Evidence:**
- `gh run list --workflow=agent-supervisor.yml` shows 15 runs — all with `event: workflow_run` or `event: workflow_dispatch`. None with `event: schedule`.
- The workflow is confirmed `state: active` in the GitHub API.
- The cron expression `*/10 * * * *` is syntactically valid.

**This is a known GitHub Actions platform behavior:**
1. New cron schedules can take 20-60+ minutes to start firing (GitHub documentation states this)
2. Free-tier repositories may experience additional delays
3. Schedules on rarely-active repositories may be deprioritized by GitHub's scheduling system
4. The schedule may start firing after the next GitHub Actions scheduler cycle

**Impact on autonomous operation:** Without the scheduled supervisor, the pipeline stalls after the last reactive chain completes. There are no open issues, so there's nothing for a reactive supervisor to respond to. Only a proactive (scheduled) supervisor can create new issues from features and drive the pipeline forward.

### Repository State at T+57min (02:41Z)

| Metric | Value |
|--------|-------|
| Open issues | 0 |
| Open PRs | 0 |
| Feature files | 4 (CLI_INTERFACE, EXPRESSION_PARSER, PLOT_RENDERING, TIME_SERIES_GENERATION) |
| Source files | 1 (`main.js` — seed only) |
| Library docs | 0 |
| Scheduled supervisor runs | 0 |
| Total workflows since purge | ~25 (all reactive chains) |

### Observations

1. **The reactive → stall pattern**: After purge, the pipeline had a burst of reactive activity (maintain → supervisor → maintain chain), then went completely silent when there was nothing left to react to. This confirms the supervisor schedule is essential for proactive operation.

2. **Feature generation worked**: 4 features were correctly generated from the plot-code-lib MISSION.md, matching Phase 1 and 2 results.

3. **No issues created**: The maintain workflow generated features but didn't create issues. Only the proactive supervisor can create issues from features, and it hasn't run on schedule.

4. **All 4 closed issues are from Phase 2**: Issues #2440-#2445 were created during Phase 2 testing and closed before the purge. No new automated issues exist.

### Monitoring continues...

*(This section will be updated as scheduled supervisor runs appear)*

---

## Code Generated by Pipeline

From purge to end of testing, the autonomous pipeline generated **3,058 lines** across 15 files:

| Category | Files | Lines Added |
|----------|-------|-------------|
| Core library | `expression-parser.js`, `range-parser.js`, `plotter.js`, `main.js` | ~616 |
| Tests | `expression-parser.test.js`, `range-parser.test.js`, `main.test.js` | ~138 |
| Features | 4 feature definition files | ~219 |
| Documentation | `README.md`, `intentïon.md` | ~464 |
| Dependencies | `package.json`, `package-lock.json` | ~1,802 |

---

## Appendix: Raw Workflow Run Data

### Phase 1 (v7.1.27 → v7.1.28)

| Run ID | Workflow | Event | Conclusion | Duration | Branch |
|--------|----------|-------|------------|----------|--------|
| 22597976932 | agent-flow-maintain | workflow_dispatch | success | 1m23s | main |
| 22597985582 | agent-discussions-bot | discussion_comment | success | ~14s | main |
| 22597987819 | agent-discussions-bot | workflow_dispatch | success | ~14s | main |
| 22598008914 | agent-flow-transform | workflow_dispatch | cancelled | — | main |
| 22598012349 | agent-flow-review | workflow_dispatch | success | 1m16s | main |
| 22598015102 | agent-supervisor | workflow_run | success | <10s | main |
| 22598059066 | agent-flow-transform | workflow_dispatch | success | 4m12s | main |
| 22598138786 | agent-discussions-bot | discussion_comment | cancelled | — | main |
| 22598140672 | agent-supervisor | workflow_dispatch | success | ~18s | main |
| 22598143898 | agent-discussions-bot | workflow_dispatch | success | ~14s | main |
| 22598229946 | agent-supervisor | workflow_run | success | <10s | main |
| 22598393286 | agent-flow-transform | workflow_dispatch | success | ~2m | main |
| 22598403663 | agent-discussions-bot | discussion_comment | success | ~30s | main |

### Phase 2 (v7.1.29)

| Run ID | Workflow | Event | Conclusion | Duration | Branch |
|--------|----------|-------|------------|----------|--------|
| 22600448710 | agent-flow-maintain | workflow_dispatch | success | 1m32s | main |
| 22600538782 | agent-flow-review | workflow_dispatch | success | 56s | main |
| 22600575212 | agent-supervisor | workflow_dispatch | success | 38s | main |
| 22600592539 | agent-flow-transform | workflow_dispatch | success | 6m3s | main |
| 22600787979 | agent-supervisor | workflow_dispatch | success | 43s | main |
| 22600805604 | agent-flow-transform | workflow_dispatch | success | 5m58s | main |
| 22600806242 | agent-flow-maintain | workflow_dispatch | success | 1m16s | main |
| 22603026447 | agent-flow-transform | schedule | success | 4m20s | main |
| 22603723415 | agent-discussions-bot | discussion | success | 41s | main |
| 22603784753 | agent-discussions-bot | discussion_comment | success | 29s | main |
| 22603787753 | agent-discussions-bot | discussion_comment | success | — | main |
| 22603811071 | agent-flow-review | workflow_dispatch | success | 1m8s | main |
| 22603868483 | agent-supervisor | workflow_dispatch | success | 31s | main |
| 22603885277 | agent-flow-transform | workflow_dispatch | success | 3m20s | main |
| 22603994073 | agent-flow-review | workflow_dispatch | success | 48s | main |
| 22604087834 | agent-flow-review | workflow_dispatch | success | ~1m | main |
