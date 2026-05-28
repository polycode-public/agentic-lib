# PLAN: Workflow Improvements V5

Derived from REPORT_WORKFLOW_VALIDATION_V5.md findings V5-8, V5-3, V5-10 and user feedback on intention.log quality.

## User Assertions (verbatim, non-negotiable)

- "The goal isn't open up to the max number of issues, it is to break down the work into chunks just big enough to reliably deliver. At each stage, if the mission can be accomplished in the action being taken it should be."
- "The 'high-impact' is going to be ambiguous so hard to achieve, please go through all the evaluation of goal type prompts and make sure there isn't any language like this."
- "Ensure that when these conditions are met we log to intention.log that we are assessing mission complete and there should be an LLM check that looks at the actual MISSION.md before we declare mission complete."
- "Get the actual stats early and use them in the log" (replace `?` placeholders in Limits Status).
- "I would like an English narrative of what the supervisor is doing and why, instead of just logging the raw stats."
- "Thread logging context through all the actions of the supervisor through agentic-lib-workflow so each participant can add a sentence."
- "LLM calls on the way should solicit a sentence to be optionally included in the response so that these can be added to the logging context and added to intention.log."
- "Ensure all the mutating operations — transformation, library maintenance, feature maintenance, source maintenance and feature creation — cost transformation-budget and these are cumulative."
- "intention.log should get the names of the files changed and the titles of the issues raised or documents created."
- "The transformation cost `1` vs `transformation-budget 0/32 32 remaining` can't be right — the cumulative cost must be tracked."

---

## Problem 1: Supervisor Doesn't Declare Mission Accomplished

**Finding**: V5-8 — After 3+ consecutive nop iterations (all issues closed, all acceptance criteria satisfied), the supervisor still creates new issues instead of declaring mission accomplished.

**Root Cause**: `supervise.js:gatherContext` only fetches `state: "open"` issues (line 42-48). The supervisor sees 0 open issues and creates a new one. It never sees recently-closed issues, so it can't detect that the same issues keep being closed as already-resolved.

### Fix 1A — Recently-closed issues in supervisor context (`supervise.js`)

Add a second API call in `gatherContext` to fetch recently-closed issues (last 5, with close reason and last comment). Include them in `buildPrompt` as a new section:

```
### Recently Closed Issues (last 5)
#2654 closed: Implement FizzBuzz library — closed by review as RESOLVED
#2653 closed: Implement FizzBuzz library — closed by review as RESOLVED
```

This lets the supervisor see "I already created this exact issue and review closed it as resolved."

**File**: `src/actions/agentic-step/tasks/supervise.js`
- In `gatherContext`: Add `octokit.rest.issues.listForRepo({ state: "closed", sort: "updated", direction: "desc", per_page: 5 })` and fetch last comment for each
- In `buildPrompt`: Add `### Recently Closed Issues` section
- In context return: Add `recentlyClosedIssues` array

### Fix 1B — Supervisor prompt rule for mission-complete detection (`agent-supervisor.md`)

Add to "Stability Detection" section:

> If review has closed the last 2+ issues as already-resolved (no transform ran), and there are 0 open issues, the mission is accomplished. Do NOT create another issue — follow the Mission Accomplished protocol. Before declaring mission accomplished, verify against the MISSION.md acceptance criteria listed in the context.

**File**: `src/agents/agent-supervisor.md`

### Fix 1C — LLM mission-complete verification before declaration

When the supervisor detects mission-complete conditions (via prompt rule 1B), it should:
1. Log to intention.log: "Supervisor assessing mission complete: 0 open issues, last N issues closed as resolved, 0 open PRs."
2. The LLM reads the MISSION.md acceptance criteria (already in the prompt) and verifies each one against the recently-closed issue details
3. Only if all criteria are met does it output `set-schedule:off` and `dispatch:agentic-lib-bot` (to announce)
4. If criteria are NOT all met, it creates a targeted follow-up issue for the remaining work

This is primarily a prompt change (1B) — the LLM already has MISSION.md in its context. The log line comes from the narrative feature (Problem 4).

---

## Problem 2: Issue Churn — Near-Identical Issues Each Cycle

**Finding**: V5-3 — Supervisor creates near-identical issues each cycle. 8+ issues with titles like "Implement FizzBuzz library" created across 6 iterations.

**Root Cause**: Same as Problem 1 — supervisor only sees open issues. Also no deduplication guard.

### Fix 2A — Context (solved by Fix 1A)

Adding recently-closed issues to the supervisor's view means it can see "I already created this exact issue and review closed it as resolved."

### Fix 2B — Prompt rule (`agent-supervisor.md`)

Add to "When to use each action" under `github:create-issue`:

> Do not create an issue if a similar issue was recently closed as resolved. Check the Recently Closed Issues section — if the last issue with a similar title was closed as RESOLVED, the work is already done.

### Fix 2C — Dedup guard in code (`supervise.js`)

In `executeCreateIssue`, before creating, check if a similarly-titled issue was closed in the last hour:

```javascript
// Check for recent duplicate
const { data: recent } = await octokit.rest.issues.listForRepo({
  ...repo, state: "closed", sort: "updated", direction: "desc", per_page: 5,
});
const duplicate = recent.find(i =>
  !i.pull_request &&
  i.title.toLowerCase().includes(title.toLowerCase().substring(0, 30)) &&
  Date.now() - new Date(i.closed_at).getTime() < 3600000
);
if (duplicate) {
  core.info(`Skipping duplicate issue (similar to recently closed #${duplicate.number})`);
  return `skipped:duplicate-of-#${duplicate.number}`;
}
```

**File**: `src/actions/agentic-step/tasks/supervise.js` — `executeCreateIssue` function

---

## Problem 3: Discussions Bot Acknowledges But Doesn't Act

**Finding**: V5-10 — The bot outputs `[ACTION:create-issue]` in its response text but `discussions.js` only handles `mission-complete`. For all other actions, it logs and returns — no execution.

**Root Cause**: `discussions.js` line 172-174 parses the action, but only `mission-complete` has a handler (line 180). The action list in the prompt (lines 107-117) includes `create-issue`, `request-supervisor`, etc. but they're dead code.

### Fix 3 — Add action handlers to `discussions.js`

Add handlers for:

1. **`create-issue`** — call `octokit.rest.issues.create({ ...repo, title: actionArg, labels: ["automated", "enhancement"] })`
2. **`request-supervisor`** — dispatch `agentic-lib-workflow.yml` with `mode: full` and pass `actionArg` as `message` input
3. **`stop`** — dispatch `agentic-lib-schedule.yml` with `frequency: off`

For `create-feature`, `update-feature`, `delete-feature`, `seed-repository` — these require file system access that the discussions task doesn't have. Log them as pending for the next supervisor cycle.

**File**: `src/actions/agentic-step/tasks/discussions.js`

---

## Problem 4: intention.log Quality

### Fix 4A — Replace `?` placeholders with actual stats

**Current**: Limits Status shows `?/2` for max-feature-issues, max-maintenance-issues, etc.

**Root Cause**: `index.js` lines 103-111 initialise limits with `?` and only overwrite if `result.limitsStatus` provides values — but most tasks don't return limitsStatus.

**Fix**: In `index.js`, before logging, fetch actual counts:
- Count open issues with `automated` + `enhancement` labels → feature issues used
- Count open issues with `automated` + `maintenance` labels → maintenance issues used
- Count feature files in `config.paths.features.path` → features used
- Count library files in `config.paths.library.path` → library docs used
- Read cumulative transformation cost from the log file itself → transformation-budget used

**File**: `src/actions/agentic-step/index.js`

### Fix 4B — English narrative from supervisor and all LLM tasks

**Current**: intention.log has raw stats tables. User wants "Supervisor assessing mission status: 0 open issues, last 3 issues closed as resolved..."

**Fix**:
1. In every task's `runCopilotTask` call, add to the system message: "After your main response, on a new line starting with `[NARRATIVE]`, write one sentence describing what you did and why, for the activity log."
2. In each task handler, parse the `[NARRATIVE]` line from the response and return it as `result.narrative`
3. `index.js` already passes `narrative` to `logActivity` (line 154), and `logging.js` already renders it (lines 115-118)

The supervisor's narrative should describe its decision: "Assessed mission status: 0 open issues, last 3 issues closed as resolved. Creating follow-up issue for missing edge-case tests."

**Files**: All task handlers in `src/actions/agentic-step/tasks/`, system message additions

### Fix 4C — Thread logging context through workflow actions

**Current**: Each task logs independently. The supervisor creates an issue, then review/transform runs in the same workflow — but each logs separately with no shared context.

**Fix**: The workflow already runs tasks sequentially (supervisor → maintain → review → dev → post-merge). After each agentic-step, capture the narrative output and pass it as additional context to the next step via GitHub Actions outputs/env vars.

In `agentic-lib-workflow.yml`:
- After each `agentic-step` invocation, capture `steps.X.outputs.result` and build a `logging-context` env var
- Pass `logging-context` to subsequent steps as an additional input or environment variable
- Each task reads this and includes it in its log entry as "Pipeline context"

**Files**: `.github/workflows/agentic-lib-workflow.yml`, `src/actions/agentic-step/index.js`

### Fix 4D — Fix transformation cost tracking

**Current**: `index.js` line 104 always shows `0/32` for transformation-budget. But line 127 computes `transformationCost` as 0 or 1 per entry. The cumulative sum is computed in `iterate.js:readTransformationCost` by summing all `**agentic-lib transformation cost:** N` lines — but `index.js` never reads the current cumulative total.

**Fix**: In `index.js`, before building limitsStatus:
1. Read the intention log file
2. Sum all `**agentic-lib transformation cost:** N` entries (same logic as `iterate.js:readTransformationCost`)
3. Add the current task's cost to get the new cumulative total
4. Set `transformation-budget` limit's `valueNum` and `value` to reflect the cumulative total

```javascript
const cumulativeCost = readCumulativeTransformationCost(intentionFilepath) + transformationCost;
limitsStatus[0] = {
  name: "transformation-budget",
  valueNum: cumulativeCost,
  capacityNum: config.transformationBudget || 0,
  value: `${cumulativeCost}/${config.transformationBudget || 0}`,
  remaining: `${Math.max(0, (config.transformationBudget || 0) - cumulativeCost)}`,
  status: cumulativeCost >= (config.transformationBudget || 0) ? "EXHAUSTED" : "",
};
```

**File**: `src/actions/agentic-step/index.js`

### Fix 4E — Log file names changed and issue/document titles

**Current**: `logging.js` already supports `changes` array (lines 85-90) — items like `{ action: "modified", file: "src/lib/main.js", sizeInfo: "67 lines" }`. But most tasks don't populate this.

**Fix**: In task handlers that produce file changes (resolve-issue, fix-code, transform, maintain-features, maintain-library):
- After writing files, build a `changes` array with the file names and actions
- Return it as `result.changes`
- For issue creation (supervise), return `result.changes = [{ action: "created-issue", file: `#${issue.number}`, sizeInfo: issue.title }]`
- For document creation (maintain-library, maintain-features), return the document name

**Files**: All task handlers that create files or issues

---

## Fix 10 — First-class `mission-complete` supervisor action

The supervisor can now declare mission complete directly via `mission-complete | reason: <text>`. This:
1. Writes `MISSION_COMPLETE.md` with timestamp, reason, and detected-by
2. Dispatches `agentic-lib-schedule.yml` with `frequency: off` to stop the schedule
3. Returns the action result for logging

The action is available in the "Mission Lifecycle" section of the supervisor's available actions in `buildPrompt`.

**Guidance** (in `agent-supervisor.md`): Use when all MISSION.md acceptance criteria are verified as satisfied, tests pass, and the Recently Closed Issues show 2+ issues closed by review as RESOLVED with 0 open issues remaining.

**Files**: `supervise.js` (handler), `agent-supervisor.md` (guidance)

---

## Fix 11 — First-class `mission-failed` supervisor action

The supervisor can now declare mission failed via `mission-failed | reason: <text>`. This:
1. Writes `MISSION_FAILED.md` with timestamp, reason, and detected-by
2. Dispatches `agentic-lib-schedule.yml` with `frequency: off` to stop the schedule
3. Returns the action result for logging

**Guidance** (in `agent-supervisor.md`): Use when:
- Transformation budget is exhausted with acceptance criteria still unmet
- Pipeline is stuck in a create-close loop with no code changes
- 3+ consecutive transforms failed to produce working code
- Budget is being consumed without the codebase converging toward acceptance criteria

**Files**: `supervise.js` (handler), `agent-supervisor.md` (guidance)

---

## Implementation Order

| Priority | Fix | Files | Solves |
|----------|-----|-------|--------|
| 1 | 1A: Recently-closed issues in context | `supervise.js` | Mission-complete detection, issue churn |
| 2 | 1B + 2B: Prompt rules | `agent-supervisor.md` | Mission-complete + dedup (prompt-level) |
| 3 | 2C: Dedup guard | `supervise.js` | Issue churn (code-level backup) |
| 4 | 3: Bot action handlers | `discussions.js` | Bot can create issues, request supervisor |
| 5 | 4D: Fix transformation cost | `index.js` | Cumulative budget tracking |
| 6 | 4A: Replace ? placeholders | `index.js` | Accurate limits in log |
| 7 | 4B: Supervisor narrative | `supervise.js` | Reasoning in log as narrative |
| 8 | 4E: Log changes from supervisor | `supervise.js` | Issue titles and signal files in log |
| 9 | 10: mission-complete action | `supervise.js`, `agent-supervisor.md` | First-class mission-complete declaration |
| 10 | 11: mission-failed action | `supervise.js`, `agent-supervisor.md` | First-class mission-failed declaration |

---

## Validation

After implementing all fixes, run a new benchmark scenario:
1. Init repository0 with fizz-buzz mission, recommended profile
2. Run 6+ iterations
3. Verify:
   - Supervisor sees recently-closed issues in its context
   - No duplicate issues created after review closes them as resolved
   - Supervisor declares mission accomplished when all criteria are met (with LLM verification)
   - Schedule set to off after mission accomplished via `mission-complete` action
   - Discussions bot can execute create-issue, request-supervisor, and stop actions
   - intention.log shows actual stats (no `?` placeholders for transformation-budget, features, library, issues)
   - intention.log shows cumulative transformation cost
   - intention.log includes supervisor reasoning as narrative
   - intention.log includes issue titles created and signal files written
   - Supervisor uses `mission-failed` when budget is exhausted without progress

---

## Status

| Fix | Status | PR |
|-----|--------|-----|
| 1A | done | — |
| 1B | done | — |
| 1C | done (covered by 1B prompt) | — |
| 2A | done (same as 1A) | — |
| 2B | done (same as 1B) | — |
| 2C | done | — |
| 3 | done | — |
| 4A | done | — |
| 4B | done (supervisor narrative from reasoning) | — |
| 4C | deferred (requires workflow YAML changes) | — |
| 4D | done | — |
| 4E | done (supervisor tracks created issues + signal files) | — |
| 10 | done | — |
| 11 | done | — |
