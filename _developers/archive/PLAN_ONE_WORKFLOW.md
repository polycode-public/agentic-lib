# Plan: Collapse Pipeline into 5 Workflows

## User Assertions (verbatim, non-negotiable)

- Collapse 8 src/workflows + 2 src/seeds into 5 workflows
- The 5 workflows: `agentic-lib-workflow.yml`, `agentic-lib-bot.yml`, `agentic-lib-schedule.yml`, `agentic-lib-test.yml`, `agentic-lib-init.yml`
- Keep the discussions bot separate — it checks thread and repository context, responds, and calls `agentic-lib-workflow.yml` supervisor if more action than a response is needed
- The bot's message can be a parameter to `agentic-lib-workflow.yml`
- Do telemetry gathering that isn't event-triggered (e.g. always check for unresponded discussions, not just on post)
- Conditionally executed jobs within the single workflow
- Always do PR cleanup (merge/abandon/make mergeable)
- Always gather issues, discussions, workflow status
- Always try library maintenance
- Always add to/elaborate/review features after library maintenance finishes
- Open issues if below cap, ready issues if needed
- Supervisor picks the best issue to work on next, plus other issues that are not blocked or would be unblocked by ones already in progress
- 1 dev job making code changes (not 4 concurrent) — supervisor gives it a prioritized list like "Do 1. that and 2. that"
- Each issue: push branch, run tests, catch up to main, attempt merge (retry couple times on conflict)
- If not merged, the next agent run will handle it
- Reusable workflows or composite actions for internals instead of multiple top-level workflows
- `agentic-lib-test.yml` triggered on push, also callable and waited on by the main workflow
- The main workflow has all parameters from all current workflows, all supervisor intelligence, all features
- A discussion post would be one trigger for the bot, but the bot also proactively checks
- Consolidate workflow reports, tests, and implementation details in `_developers/WORKFLOWS.md`
- repository0 is the test bed — we can roll back git easily in either repo

## Problem Statement

### Quantified Waste (last 100 runs on repository0, 2026-03-05)

| Workflow | Total | Cancelled | Cancel Rate |
|----------|-------|-----------|-------------|
| agent-supervisor | 46 | 23 | 50% |
| ci-automerge | 18 | 6 | 33% |
| agent-flow-transform | 15 | 4 | 26% |
| test | 11 | 0 | 0% |
| agent-flow-review | 5 | 2 | 40% |
| init | 4 | 0 | 0% |
| **Total** | **100** | **35** | **35%** |

### Root Cause: Workflow Cascade Amplification

The fundamental problem is `workflow_run` event-chaining. When init runs:

```
init completes
  -> supervisor fires (workflow_run: init)
  -> init push triggers test
     -> test completes -> supervisor fires (workflow_run: test)
     -> test push may trigger ci-automerge (PR)
        -> ci-automerge completes -> supervisor fires (workflow_run: ci-automerge)
  -> supervisor dispatches transform
     -> transform completes -> supervisor fires (workflow_run: transform)
        -> supervisor dispatches review
           -> review completes -> supervisor fires (workflow_run: review)
```

One init run can produce 5+ supervisor runs. Each supervisor queues (cancel-in-progress: false), consuming Actions minutes even when they duplicate decisions. With a 15-minute cron schedule on top, the supervisor fires ~6x/hour scheduled + N reactive = cascade.

### Additional Problems (from V3 Report + Pipeline Improvements Plan)

1. **Transform churn** — Same issue picked up repeatedly, code rewritten sideways (V3 ISSUE-13)
2. **Review bottleneck** — Processes one issue per run, doesn't add `ready` labels (V3 ISSUE-15)
3. **No branch isolation** — Transform pushes to main or creates conflicting branches (Pipeline C1)
4. **Concurrency groups fight** — Separate groups per workflow type means transform cancels transform, but supervisor keeps dispatching more
5. **No deduplication** — Supervisor doesn't check if a workflow is already running before dispatching

## Design: 5 Workflows

### File Structure (after)

```
src/workflows/
  agentic-lib-workflow.yml     # Main pipeline — supervisor + maintain + review + dev + PR cleanup
  agentic-lib-bot.yml          # Discussions bot — responds to threads, can escalate to workflow
  agentic-lib-schedule.yml     # Schedule control — edits workflow cron, pushes with WORKFLOW_TOKEN

src/seeds/
  agentic-lib-test.yml         # On-push test — also callable via workflow_call
  agentic-lib-init.yml         # Self-contained init — [skip ci], no cascade
```

### Workflow Mapping (10 old -> 5 new)

| Old Workflow | New Workflow | How |
|-------------|-------------|-----|
| `agent-supervisor.yml` | `agentic-lib-workflow.yml` | Supervisor logic becomes the orchestrator job |
| `agent-supervisor-schedule.yml` | `agentic-lib-schedule.yml` | Renamed, same mechanism |
| `agent-flow-transform.yml` | `agentic-lib-workflow.yml` | Single `dev` job with prioritized issue list |
| `agent-flow-review.yml` | `agentic-lib-workflow.yml` | `review` job |
| `agent-flow-maintain.yml` | `agentic-lib-workflow.yml` | `maintain` job |
| `agent-flow-fix-code.yml` | `agentic-lib-workflow.yml` | Inline in `dev` job + `fix-stuck` job |
| `agent-discussions-bot.yml` | `agentic-lib-bot.yml` | Renamed + enhanced with context + escalation |
| `ci-automerge.yml` | `agentic-lib-workflow.yml` | `pr-cleanup` job |
| `test.yml` (seed) | `agentic-lib-test.yml` (seed) | Renamed + adds workflow_call |
| `init.yml` (seed) | `agentic-lib-init.yml` (seed) | Renamed + self-contained |

### Architecture Diagram

```
agentic-lib-init.yml (seed, self-contained)
  Runs: daily schedule or manual
  Does: update agentic-lib, purge, push to main [skip ci]
  Triggers: nothing (no cascade)

agentic-lib-test.yml (seed, on-push + callable)
  Runs: on push to main, on PR, workflow_call, workflow_dispatch
  Does: npm ci && npm test
  Triggers: nothing

agentic-lib-bot.yml (discussions bot)
  Runs: on discussion/comment events, workflow_dispatch
  Does: check thread + repo context, respond to discussions
  Can: dispatch agentic-lib-workflow.yml with message parameter
  Triggers: agentic-lib-workflow.yml (optional, via workflow_dispatch)

agentic-lib-schedule.yml (schedule control)
  Runs: workflow_call from agentic-lib-workflow.yml, workflow_dispatch
  Does: edit cron in agentic-lib-workflow.yml, push with WORKFLOW_TOKEN
  Triggers: nothing

agentic-lib-workflow.yml (THE pipeline)
  Runs: schedule (cron), workflow_dispatch (manual or from bot)
  Does: everything — see Job DAG below
  Calls: agentic-lib-test.yml (via workflow_call, waited on)
         agentic-lib-schedule.yml (via workflow_call, if schedule change needed)
```

### Interaction Flow

```
                                    agentic-lib-init.yml
                                    (daily, self-contained)
                                            |
                                     push main [skip ci]
                                            |
                                            v
User post ──> agentic-lib-bot.yml ──> agentic-lib-workflow.yml <── schedule (cron)
              (responds to thread)    (dispatches with message)     (periodic)
                                            |
                              +-------------+-------------+
                              |                           |
                    agentic-lib-test.yml        agentic-lib-schedule.yml
                    (workflow_call, waited)     (workflow_call, if needed)
```

### agentic-lib-workflow.yml Design

```yaml
name: agentic-lib-workflow
run-name: "agentic-lib-workflow [${{ github.ref_name }}]"

on:
  schedule:
    - cron: "0 6 * * 1"    # Default: weekly Monday 6am (managed by agentic-lib-schedule)
  workflow_dispatch:
    inputs:
      model:
        type: choice
        options: [gpt-5-mini, claude-sonnet-4, gpt-4.1]
        default: gpt-5-mini
      mode:
        description: "Run mode"
        type: choice
        options: [full, dev-only, maintain-only, review-only, pr-cleanup-only]
        default: full
      message:
        description: "Message from bot or human (context for supervisor)"
        type: string
      issue-number:
        description: "Target specific issue (dev-only mode)"
        type: string
      schedule:
        description: "Change schedule frequency after this run"
        type: choice
        options: ["", "off", "weekly", "daily", "hourly", "continuous"]
      pr-number:
        description: "Target specific PR for fix (pr-cleanup-only mode)"
        type: string

concurrency:
  group: agentic-lib-workflow
  cancel-in-progress: false   # Queue, don't cancel — only ONE runs at a time
```

**Critical design choice**: A single concurrency group with `cancel-in-progress: false`. Only one instance of the entire workflow runs at a time. This eliminates ALL cascade problems, ALL concurrency conflicts, and ALL duplicate work. If a new trigger arrives while a run is in progress, it queues and runs after.

### agentic-lib-bot.yml Design

```yaml
name: agentic-lib-bot
run-name: "agentic-lib-bot [${{ github.ref_name }}]"

on:
  discussion:
    types: [created, edited, answered, unanswered]
  discussion_comment:
    types: [created, edited]
  workflow_dispatch:
    inputs:
      discussion-url:
        description: "Target specific discussion"
        type: string
      model:
        type: choice
        options: [gpt-5-mini, claude-sonnet-4, gpt-4.1]
        default: gpt-5-mini

concurrency:
  group: agentic-lib-bot-${{ github.event.discussion.node_id || github.run_id }}
  cancel-in-progress: false   # Per-discussion queuing
```

The bot:
1. Checks thread context (full discussion history, not just latest comment)
2. Checks repository context (issues, features, MISSION.md, code)
3. Responds to the discussion
4. If the response requires action beyond a reply (create feature, create issue, trigger development), dispatches `agentic-lib-workflow.yml` with a `message` parameter summarizing what's needed
5. Proactively checks for unresponded discussions (not just event-triggered)

### Job DAG (agentic-lib-workflow.yml)

```
                   params
                     |
            +--------+--------+
            |                 |
      pr-cleanup         telemetry
            |                 |
            +--------+--------+
                     |
                 supervisor
                     |
            +--------+--------+
            |                 |
         maintain         fix-stuck
            |
      review-features
            |
           dev
            |
        post-merge
```

### Job Descriptions

#### 1. `params`
Normalize all inputs. Set defaults. Output: model, mode, message, issue-number, schedule, pr-number.

#### 2. `pr-cleanup` (always runs, concurrent with telemetry)
- List all open PRs with `automerge` label
- For each: check mergeable state
  - If clean + checks pass: merge (squash), delete branch, label issue
  - If conflicts > 3 days: close PR, delete branch, remove `in-progress` from issue
  - If checks still running: skip (next run will handle)
- List branches with no open PR that are stale (>7 days): delete
- Output: which PRs were merged, which issues to skip in dev job

#### 3. `telemetry` (always runs, concurrent with pr-cleanup)
- Gather: open issues (with labels), open PRs, recent workflow runs, features/ listing, library/ listing, SOURCES.md, intention.md (last 20 entries), MISSION.md
- Check for unresponded discussions (proactive — not just event-triggered)
- Format as structured context for supervisor
- Include `message` input from bot/human if provided
- Output: JSON blob of repo state

#### 4. `supervisor` (runs after pr-cleanup + telemetry)
- Receives all context from telemetry, pr-cleanup results, message input
- Runs `agentic-step` with task: `supervise`
- LLM reviews the full state and produces a prioritized work list:
  - **Issue work list**: ordered list of issues for the dev job. First issue is the best next thing to work on. Subsequent issues are ones that are not blocked, or would be unblocked by completing earlier ones in the list. Like giving instructions: "Do 1. this and 2. that and 3. that"
  - Which issues need `ready` label (batch — up to 5)
  - Which issues to close (already resolved)
  - Whether to create new issues (if below cap)
  - Whether library maintenance is needed
  - Whether to change schedule frequency
  - Whether any unresponded discussions need the bot dispatched
- Output: structured action plan (JSON) — `issue_work_list: [123, 456, 789]`, `maintain: true/false`, `new_issues: [...]`, `close_issues: [...]`, `ready_issues: [...]`, `schedule: "..."`, `dispatch_bot: [discussion-urls]`, etc.

#### 5. `maintain` (conditional — runs if supervisor says maintain=true)
- Run `maintain-features` task
- Run `maintain-library` task
- Commit and push directly to main (these are metadata/docs changes, low conflict risk)
- Output: whether features/library changed

#### 6. `fix-stuck` (conditional — runs if supervisor identifies stuck PRs needing code fixes)
- For each stuck PR with failing checks (up to 2):
  - Check out PR branch
  - Run `agentic-step` with task: `fix-code`
  - Push fix
- Runs concurrently with `maintain`

#### 7. `review-features` (runs after maintain)
- Run `review-issue` task (batch — up to 5 issues)
- Run `enhance-issue` task (batch — up to 5 issues)
- Apply labels decided by supervisor (ready, closed)
- Create new issues decided by supervisor
- This runs after maintain so it sees the latest features/library state

#### 8. `dev` (runs after review-features — single job, sequential issues)
The dev job receives the supervisor's prioritized issue list and works through it sequentially. Each issue is a complete cycle: branch, transform, test, merge.

```
dev:
  if: supervisor.issue_work_list is not empty
  steps:
    for each issue in supervisor.issue_work_list:
      1. Pull latest main (picks up maintain changes + previous issue's merge)
      2. Create branch: agentic-lib-issue-${ISSUE_NUMBER}
      3. Run agentic-step with task: transform, targeting this issue
      4. Run npm test locally
      5. If tests fail: run agentic-step with task: fix-code, retry test (up to 2 attempts)
      6. If tests still fail: skip this issue, move to next
      7. Commit and push branch
      8. Create PR with automerge label
      9. Attempt merge (squash)
      10. If merge fails (conflict): retry once after pulling latest main
      11. If still fails: leave PR open (next workflow run handles it)
      12. If merged: delete branch, label issue, pull latest main
      13. Move to next issue in the list
  outputs:
    - issues-attempted: [list]
    - issues-merged: [list]
    - issues-left-as-pr: [list]
```

**Why sequential, not parallel**: By working through issues one at a time and merging each before starting the next, we avoid all merge conflicts between dev work items. The supervisor orders them so that earlier items unblock later ones. If one fails to merge, the rest still proceed (they branch from whatever main is at that point). This mirrors how a developer works: "Do 1. this and 2. that" — finish 1 before starting 2.

**Why a list, not just one**: The overhead of the pipeline (telemetry, supervisor, maintain, review) is significant. Once we've paid that cost, doing 2-3 transforms in a single run is much more efficient than doing 1 per run. The supervisor picks issues that chain well — e.g. "add the parser (issue 100), then add tests for it (issue 101), then update the README (issue 102)".

#### 9. `post-merge` (runs after dev, always)
- Update intention.md with summary of this run (issues attempted, merged, left as PR)
- Update statistics (S3 publish if configured)
- If supervisor requested schedule change: call `agentic-lib-schedule.yml` via workflow_call
- If supervisor requested bot dispatches: dispatch `agentic-lib-bot.yml` for unresponded discussions
- If all issues closed + tests pass + mission acceptance criteria met: set schedule to off (mission accomplished)

### agentic-lib-schedule.yml Design

```yaml
name: agentic-lib-schedule
on:
  workflow_call:
    inputs:
      frequency:
        required: true
        type: string
      model:
        type: string
  workflow_dispatch:
    inputs:
      frequency:
        required: true
        type: choice
        options: [off, weekly, daily, hourly, continuous]
      model:
        type: choice
        options: [gpt-5-mini, claude-sonnet-4, gpt-4.1]
```

Same mechanism as current `agent-supervisor-schedule.yml`:
- Maps frequency to cron expression
- Edits `agentic-lib-workflow.yml` schedule block (was `agent-supervisor.yml`)
- Updates `agentic-lib.toml` config
- Pushes with WORKFLOW_TOKEN
- No cascade triggers

Frequency mapping (unchanged):
- `off` — remove schedule block
- `weekly` — `0 6 * * 1`
- `daily` — `0 6 * * *`
- `hourly` — `0 * * * *`
- `continuous` — `*/15 * * * *`

### agentic-lib-test.yml Design

```yaml
name: agentic-lib-test
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_call:          # Callable from agentic-lib-workflow dev job
  workflow_dispatch:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
```

### agentic-lib-init.yml Design

Self-contained init — no cascade:

- Pushes directly to main with `[skip ci]`
- Does NOT trigger any other workflow
- Does NOT create a PR
- Closes any hanging init PRs before running
- Calls `agentic-lib-schedule.yml` via workflow_call if schedule parameter provided

The main `agentic-lib-workflow.yml` picks up changes from init on its next scheduled run — no cascade needed.

### Event Triggers Summary

| Trigger | Workflow | What runs |
|---------|----------|-----------|
| `schedule` (cron) | `agentic-lib-workflow` | Full pipeline: all jobs |
| `workflow_dispatch` (manual, mode=full) | `agentic-lib-workflow` | Full pipeline: all jobs |
| `workflow_dispatch` (from bot, with message) | `agentic-lib-workflow` | Full pipeline with bot context |
| `workflow_dispatch` (mode=dev-only) | `agentic-lib-workflow` | params -> supervisor (minimal) -> dev only |
| `workflow_dispatch` (mode=maintain-only) | `agentic-lib-workflow` | params -> maintain only |
| `workflow_dispatch` (mode=review-only) | `agentic-lib-workflow` | params -> telemetry -> review-features only |
| `workflow_dispatch` (mode=pr-cleanup-only) | `agentic-lib-workflow` | params -> pr-cleanup only |
| `discussion` / `discussion_comment` | `agentic-lib-bot` | Bot responds, optionally dispatches workflow |
| `workflow_dispatch` | `agentic-lib-bot` | Bot checks specific discussion |
| `workflow_call` / `workflow_dispatch` | `agentic-lib-schedule` | Edit cron, push |
| `push` / `pull_request` / `workflow_call` | `agentic-lib-test` | Run tests |
| `schedule` / `workflow_dispatch` | `agentic-lib-init` | Init purge/update |

**What's NOT a trigger anymore:**
- `workflow_run` — completely eliminated. No cascade possible.
- `check_suite` — fix-code is now inline in dev job; fix-stuck handles legacy PRs
- `pull_request` on automerge — automerge is now proactive (pr-cleanup job), not reactive

## Migration Path

### Phase 1: Build the new workflows (agentic-lib only)

1. Create `src/workflows/agentic-lib-workflow.yml` with all jobs
2. Create `src/workflows/agentic-lib-bot.yml` (enhanced discussions bot)
3. Create `src/workflows/agentic-lib-schedule.yml` (renamed from agent-supervisor-schedule)
4. Create `src/seeds/agentic-lib-test.yml` (renamed from test.yml + workflow_call)
5. Create `src/seeds/agentic-lib-init.yml` (self-contained init)
6. Write/update composite actions for shared logic:
   - `agentic-step` — unchanged
   - `commit-if-changed` — unchanged
   - New: `merge-pr` composite action (extract merge logic from ci-automerge)
7. Unit test the new workflow YAML structure
8. Update `bin/agentic-lib.js` init to map new filenames

### Phase 2: Deploy to repository0

1. Bump agentic-lib version
2. Run `npx @xn-intenton-z2a/agentic-lib init --purge` on repository0
3. Verify: old workflows deleted, new workflows present (5 total)
4. Manual dispatch of `agentic-lib-workflow` in `full` mode
5. Observe: single run, no cascades, all jobs execute in order

### Phase 3: Remove old workflows

1. Delete all 8 files from `src/workflows/`
2. Delete old `src/seeds/test.yml` and `src/seeds/init.yml`
3. Init mechanism already handles stale workflow deletion in consumer repos

### Phase 4: Documentation

1. Create `_developers/WORKFLOWS.md` consolidating:
   - Workflow architecture and job DAG
   - Implementation details for each of the 5 workflows
   - Test procedures and validation results
   - Observations from V1/V2/V3 reports
   - Tuning guide (schedule, supervisor prompts, issue list sizing)

### Phase 5: Tune and observe

1. Run on `hourly` schedule for 24h, review intention.md
2. Check: is the dev job working through multiple issues per run?
3. Check: are merges succeeding within the dev job?
4. Check: is the supervisor making good issue ordering decisions?
5. Check: is the bot responding and escalating appropriately?
6. Adjust supervisor prompt, issue list size based on observations

## Inputs Consolidation

All inputs from all current workflows, combined into `agentic-lib-workflow.yml`:

| Input | Type | Default | From |
|-------|------|---------|------|
| `model` | choice | gpt-5-mini | all workflows |
| `mode` | choice | full | new |
| `message` | string | '' | new (from bot or human) |
| `issue-number` | string | '' | agent-flow-transform |
| `schedule` | choice | '' | agent-supervisor-schedule |
| `pr-number` | string | '' | agent-flow-fix-code |

## Risks and Mitigations

### R1: Single workflow run time may be long
With telemetry + maintain + review + sequential dev work on multiple issues, a full run could take 20-40 minutes.

**Mitigation:** This is acceptable. The old system often took 20+ minutes across cascading workflows, but with 35% wasted on cancellations. A single clean 30-minute run that merges 3 issues is far better than three 15-minute cascades that each merge 1 (or 0).

### R2: Sequential dev work means one stuck issue blocks the rest
If the first issue in the list takes the full LLM context or fails repeatedly, later issues don't get worked on.

**Mitigation:** The dev job has a per-issue timeout and a max-attempts guard. After 2 failed test attempts, it skips the issue and moves on. The supervisor can also learn from previous runs — if an issue was attempted and failed, it can deprioritize it.

### R3: Schedule self-modification is fragile
The workflow editing its own cron schedule by pushing to main is the current mechanism. It works but is inherently risky.

**Mitigation:** Keep the same proven mechanism from `agent-supervisor-schedule.yml`. It's been working since v7.1.28. Separate `agentic-lib-schedule.yml` keeps this isolated.

### R4: Bot dispatch latency vs inline
The bot dispatches `agentic-lib-workflow.yml` which may queue behind a scheduled run.

**Mitigation:** Acceptable. The bot responds immediately to the user in the discussion. The workflow dispatch is for follow-up actions (create feature, start development). A few minutes of queue delay for actions is fine — the user already got their response.

### R5: Backwards compatibility
Consumers running older agentic-lib versions expect the 8+2 separate workflows.

**Mitigation:** The init --purge mechanism already handles stale workflow deletion. Old workflows are removed automatically when init detects they're not in the template anymore.

## Success Criteria

1. **Zero cascade amplification** — one trigger = one workflow run, period
2. **Zero cancellations from concurrency conflicts** — single concurrency group, queue only
3. **Throughput increase** — more issues resolved per wall-clock hour (multiple per run)
4. **Reduced Actions minutes** — fewer total runs, less overhead per run
5. **Sequential dev work avoids conflicts** — each issue merges before the next starts
6. **Self-healing** — failed merges become PRs, handled on next run
7. **Discussion responsiveness** — bot responds immediately, escalates to workflow when needed

## Comparison: Before and After

| Aspect | Before (10 workflows) | After (5 workflows) |
|--------|----------------------|---------------------|
| Workflow files distributed | 10 | 5 |
| Concurrency groups | 6+ | 3 (workflow, bot-per-discussion, schedule) |
| Cascade depth | 3-5 levels | 0 (no workflow_run) |
| Cancellation rate | 35% | ~0% |
| Supervisor runs per cycle | 2-6 (reactive + scheduled) | 1 (inline job) |
| Issues per pipeline run | 1 (single transform) | 1-3 (sequential in dev job) |
| Time to merge a transform | 15-45 min (transform -> test -> automerge -> supervisor) | ~5 min per issue (branch -> test -> merge, inline) |
| Discussion response latency | Event-driven (~1 min) | Event-driven (~1 min, bot is separate) |
| Schedule changes | Separate workflow push | Separate workflow, called via workflow_call |
| Bot intelligence | Respond only | Respond + check context + escalate to workflow |
| Merge conflicts | Frequent (concurrent workflows) | Rare (sequential within single job) |

## Relationship to Existing Plans

| Document | Relevance |
|----------|-----------|
| PLAN_PIPELINE_IMPROVEMENTS.md | C1 (transform -> PR) solved by dev job. C2 (automerge race) solved by merge-in-dev. H3 (issue targeting) solved by supervisor's ordered list. H4 (concurrency cancellation) solved by single workflow. |
| PLAN_MISSION_SEEDS.md | Unchanged — mission seeds are about content, not workflow structure. The --mission flag works the same way. |
| REPORT_WORKFLOW_VALIDATION_V3.md | All 7 issues addressed: ISSUE-13 (churn) by supervisor picking distinct issues in order. ISSUE-14 (log-only) by skip-on-no-change in dev job. ISSUE-15/16 (review bottleneck) by batch review. ISSUE-17 (test framework) by running tests in dev job. ISSUE-18/19 (tokens) by reduced runs. ISSUE-20 (cancellations) eliminated. |

## Out of Scope

- Multiple concurrent dev jobs / matrix strategy
- Changing the agentic-step action internals
- Changing the agent prompt files
- Changing the config structure (agentic-lib.yml / agentic-lib.toml)
- Website or AWS infrastructure changes
- Mission seed content changes
