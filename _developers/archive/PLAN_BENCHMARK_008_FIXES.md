# Plan: Benchmark 008 Fixes

Fixes and optimizations derived from [BENCHMARK_REPORT_008.md](BENCHMARK_REPORT_008.md).

Covers: R1-R7, DV-1, recurring pattern optimizations, and 8 additional workflow improvements.

---

## User Assertions (non-negotiable)

- Persistent state uses `agentic-lib-state.toml` (not hidden, TOML format) on the `agentic-lib-logs` branch
- `init --purge` must clear `agentic-lib-state.toml` (reset to empty/default)
- Log filenames include a sequence number: `agent-log-2026-03-14T02-07-16-106Z-001.md`
- The sequence number also appears in the log body
- Cumulative stats in logs show both current-task values AND cumulative totals from prior logs
- "Dedicated test files" metric is dropped from Mission Metrics; replaced with more dynamic metrics
- Seed issue creation in `agentic-lib-init.yml` is optional (default: off)
- Every workflow uses a `params` job (like `agentic-lib-workflow.yml`)
- Every workflow has verbose console logging and GitHub workflow summary output
- Supervisor posts to the discussions thread on significant events
- README.md is updated to match actual capabilities

---

## Change Summary

| # | Change | Priority | Files |
|---|--------|----------|-------|
| C1 | Introduce `agentic-lib-state.toml` on `agentic-lib-logs` branch | CRITICAL | `logging.js`, `telemetry.js`, `index.js`, `bin/agentic-lib.js` |
| C2 | Fix cumulative transform counter (R1 + DV-1) | CRITICAL | `index.js`, `telemetry.js` |
| C3 | Auto-disable schedule on mission-failed (R2) | CRITICAL | `tasks/direct.js`, `agentic-lib-schedule.yml` |
| C4 | Enumerate logs with sequence numbers | HIGH | `logging.js`, `index.js` |
| C5 | Split current-task vs cumulative stats in log body | HIGH | `telemetry.js`, `logging.js` |
| C6 | Replace "Dedicated test files" with dynamic metrics | HIGH | `telemetry.js`, `config.js`, `tasks/direct.js` |
| C7 | Grab additional context from workflow jobs for logs | HIGH | `index.js`, workflow YAML files |
| C8 | Make seed issue creation optional (default off) | HIGH | `agentic-lib-init.yml` |
| C9 | Add `params` job to all workflows | HIGH | `agentic-lib-init.yml`, `agentic-lib-update.yml`, `agentic-lib-schedule.yml`, `agentic-lib-test.yml`, `release.yml` |
| C10 | Verbose logging + GitHub workflow summary | MEDIUM | All 8 workflow YAML files |
| C11 | Supervisor posts to discussions on significant events | MEDIUM | `tasks/supervise.js`, `agent-supervisor.md` |
| C12 | Wire feature specs → issue creation (R3) | MEDIUM | `tasks/supervise.js`, `agent-supervisor.md` |
| C13 | Feed library docs into transform context (R5) | MEDIUM | `tasks/transform.js` or equivalent, agent prompt |
| C14 | Limit maintain-features token budget (R4) | MEDIUM | `tasks/maintain-features.js`, `config.js` |
| C15 | Exponential backoff on consecutive nop cycles (R7) | LOW | `tasks/direct.js`, `agentic-lib-state.toml` |
| C16 | Improve mission-failed commit message (R6) | LOW | `tasks/direct.js` |
| C17 | Update README.md | LOW | `README.md` |

---

## C1: Introduce `agentic-lib-state.toml` on `agentic-lib-logs` Branch

**Why:** The system loses state between workflow runs. Counters reset, duplicate patterns emerge, and stuck loops continue indefinitely because no run knows what previous runs did.

**Design:**

The file `agentic-lib-state.toml` lives on the `agentic-lib-logs` branch (same branch as agent-log files). It is read at the start of each agentic-step invocation and written at the end.

```toml
# agentic-lib-state.toml — Persistent state across workflow runs
# Written to the agentic-lib-logs branch by each agentic-step invocation

[counters]
log-sequence = 47                         # Next log file sequence number
cumulative-transforms = 3                 # Total transforms since init
cumulative-maintain-features = 12         # Total maintain-features since init
cumulative-maintain-library = 8           # Total maintain-library since init
cumulative-nop-cycles = 0                 # Consecutive nop cycles (resets on non-nop)
total-tokens = 4200000                    # Total tokens consumed since init

[budget]
transformation-budget-used = 3            # Transforms counted toward budget
transformation-budget-cap = 128           # From agentic-lib.toml

[status]
mission-complete = false
mission-failed = false
mission-failed-reason = ""
last-transform-at = "2026-03-14T08:17:45Z"
last-non-nop-at = "2026-03-14T08:17:45Z"

[schedule]
current = "continuous"
auto-disabled = false
auto-disabled-reason = ""
```

**Implementation steps:**

1. Create `src/copilot/state.js` with functions:
   - `readState(logsDir)` — parse `agentic-lib-state.toml` from the logs checkout, return defaults if missing
   - `writeState(logsDir, state)` — serialize state to TOML and write
   - `incrementCounter(state, key)` — increment a counter and return updated state
   - `resetConsecutiveNops(state)` — reset the nop counter on non-nop outcome

2. In `index.js`:
   - After checking out the logs branch (existing code), call `readState()` to load state
   - After task completes, update state with new values
   - Before committing logs, call `writeState()` to persist state
   - Pass state to `buildMissionMetrics()` so it uses correct cumulative values

3. In `bin/agentic-lib.js` (init --purge):
   - When resetting the `agentic-lib-logs` orphan branch, write a fresh `agentic-lib-state.toml` with all counters at 0
   - Add `agentic-lib-state.toml` to the initial commit on the orphan branch

4. In `commit-if-changed/action.yml`:
   - Ensure `agentic-lib-state.toml` is included in the logs branch commit (it should be naturally since it lives on that branch)

**Tests:**
- Unit test `readState()` with missing file → returns defaults
- Unit test `readState()` with valid TOML → returns parsed values
- Unit test `writeState()` → produces valid TOML
- Unit test `incrementCounter()` → increments correctly
- Integration test: two sequential invocations → second reads what first wrote

---

## C2: Fix Cumulative Transform Counter (R1 + DV-1)

**Why:** `index.js` line 112 sets `cumulativeCost = transformationCost` (just the current task's 0 or 1) instead of the true cumulative. This causes the Mission Metrics table to show `Cumulative transforms | 0` even after multiple transforms have merged.

**Root cause:** `index.js:112`:
```javascript
const cumulativeCost = transformationCost; // BUG: only current task
```

**Fix:** After C1 is implemented, read cumulative cost from `agentic-lib-state.toml`:

```javascript
// In index.js, after readState():
const transformationCost = computeTransformationCost(task, result.outcome, isInstability);
state.counters['cumulative-transforms'] += transformationCost;
state.budget['transformation-budget-used'] += transformationCost;
const cumulativeCost = state.counters['cumulative-transforms'];
```

**Also fix `telemetry.js` `buildMissionMetrics()`:**
- Accept `cumulativeCost` from the state file (already passed as parameter, just needs correct value)
- Remove the fallback to `readCumulativeCost(intentionFilepath)` since state.toml is now authoritative

**Also fix `guards.js` `budget-exhausted`:**
- Read `budget.transformation-budget-used` from state.toml instead of scanning all agent-log files
- This is faster and more reliable than regex-parsing hundreds of log files

**Tests:**
- Unit test: after 3 transforms, `cumulativeCost` is 3
- Unit test: after transform + maintain-features (non-transform), cumulative stays at previous value
- Unit test: budget-exhausted guard reads from state.toml

---

## C3: Auto-Disable Schedule on Mission-Failed (R2)

**Why:** After mission-failed at 05:36, the system continued cycling for 7.6 hours until manual intervention. The continuous schedule kept dispatching work that could never converge.

**Implementation:**

In `tasks/direct.js`, when mission-failed is declared:

1. Write `MISSION_FAILED.md` (existing behaviour)
2. Update `agentic-lib-state.toml`:
   ```toml
   [status]
   mission-failed = true
   mission-failed-reason = "Cumulative transforms: 0, target: >= 1"

   [schedule]
   auto-disabled = true
   auto-disabled-reason = "mission-failed"
   ```
3. Dispatch `agentic-lib-schedule.yml` with `frequency: weekly` via `github.rest.actions.createWorkflowDispatch()` (the schedule workflow already accepts this parameter)
4. Log the schedule change to the activity log

Also in `tasks/direct.js`, add a guard at the top:
- If `MISSION_FAILED.md` exists, return `nop` immediately — don't invoke the LLM at all

**In `agentic-lib-workflow.yml` supervisor job:**
- Add a condition: if `MISSION_FAILED.md` exists on main, skip the supervisor and direct jobs entirely

**Tests:**
- Unit test: direct.js returns nop when MISSION_FAILED.md exists
- Unit test: direct.js dispatches schedule change on mission-failed declaration

---

## C4: Enumerate Logs with Sequence Numbers

**Why:** Log files currently have only timestamps. Sequence numbers make it easy to see ordering and total iteration count at a glance.

**Implementation:**

1. In `readState()`, read `counters.log-sequence` (default 0)
2. In `index.js`, before writing the log file:
   ```javascript
   state.counters['log-sequence'] += 1;
   const seq = String(state.counters['log-sequence']).padStart(3, '0');
   const logFileName = `agent-log-${timestamp}-${seq}.md`;
   ```
3. In `writeAgentLog()` (logging.js), include the sequence number in the log body:
   ```markdown
   # Agent Log: maintain-features at 2026-03-14T02:06:10.431Z

   **Sequence:** 001
   ```
4. The sequence number resets to 0 on init --purge (C1 handles this)

**Naming example:**
- `agent-log-2026-03-14T02-06-10-431Z-001.md`
- `agent-log-2026-03-14T02-07-16-106Z-002.md`
- `agent-log-2026-03-14T02-08-13-055Z-003.md`

**Tests:**
- Unit test: sequence increments correctly
- Unit test: filename includes zero-padded sequence
- Unit test: log body contains `**Sequence:** NNN`

---

## C5: Split Current-Task vs Cumulative Stats in Log Body

**Why:** The current logs show only one value per metric. When that value is wrong (counter reset bug), there's no way to tell. Showing both the current task's contribution and the cumulative total makes the logs self-verifying.

**Implementation:**

Change the Mission Metrics table in `telemetry.js` `buildMissionMetrics()`:

**Before:**
```
| Transformation budget used | 0/128 | < 128 | OK |
| Cumulative transforms | 0 | >= 1 | NOT MET |
```

**After:**
```
| Transformation budget (this task) | 1 | — | — |
| Transformation budget (cumulative) | 3/128 | < 128 | OK |
| Transforms (this task) | 1 | — | — |
| Transforms (cumulative) | 3 | >= 1 | MET |
| Tokens (this task) | 486,269 | — | — |
| Tokens (cumulative) | 1,200,000 | — | — |
```

This requires `buildMissionMetrics()` to accept both the current task's cost and the cumulative state. Both are available from C1/C2.

**Tests:**
- Unit test: metrics table has separate rows for this-task and cumulative
- Unit test: cumulative values include the current task's contribution

---

## C6: Replace "Dedicated Test Files" with Dynamic Metrics

**Why:** "Dedicated test files" is a static binary metric (0 or N). It doesn't change meaningfully over the project lifecycle. Better to track metrics that show progress over time.

**Drop:** `Dedicated test files | N | >= M | MET/NOT MET`

**Add these metrics instead:**

| New Metric | Source | Why It's Useful |
|------------|--------|-----------------|
| Source line count | `wc -l src/lib/*.js` or equivalent | Shows code growth over transforms |
| Test count (passing/total) | Parse test runner output | Shows quality progression |
| Feature specs (open/total) | Count files in features/ | Shows feature lifecycle progress |
| Library docs (count) | Count files in library/ | Shows knowledge base growth |
| Acceptance criteria (met/total) | Parse MISSION.md checkboxes | Direct progress toward mission |

**Implementation:**

1. In `telemetry.js`, replace `dedicatedTestCount` row with:
   - `Source lines` — count lines in configured source path
   - `Test assertions (pass/fail)` — extract from most recent test run output
   - `Feature specs` — count files in features/ directory
   - `Acceptance criteria` — regex count `- [x]` vs `- [ ]` in MISSION.md

2. In `config.js`, remove `minDedicatedTests` and `requireDedicatedTests` from mission-complete thresholds. Replace with `minAcceptanceCriteria` (default: check MISSION.md checkboxes).

3. In `tasks/direct.js`, update the metric assessment to use new metrics instead of dedicated test count.

4. In `agentic-lib.toml` `[mission-complete]` section:
   ```toml
   [mission-complete]
   min-resolved-issues = 2
   max-source-todos = 0
   # Removed: min-dedicated-tests (replaced by acceptance criteria check)
   ```

**Tests:**
- Unit test: `buildMissionMetrics()` includes new metric rows
- Unit test: source line count computed correctly
- Unit test: acceptance criteria parsed from MISSION.md

---

## C7: Grab Additional Context from Workflow Jobs for Logs

**Why:** Some logs contain partial information (e.g., `implementation-review` logs with `nop` outcome and no narrative or tokens) even though the workflow job had access to more context (issue counts, PR state, recent activity).

**Investigation needed:** Review where `implementation-review` logs are generated in the `agentic-lib-workflow.yml` review job. The issue is likely that the review job's output (from the agentic-step action) isn't being fully captured when the outcome is `nop` or when the LLM returns early.

**Implementation:**

1. In `index.js`, when the task returns `nop`:
   - Still populate the narrative field with a reason (e.g., "Guards prevented execution: mission-failed already declared")
   - Still record token count (even if 0) and duration
   - Include the guard that blocked execution

2. In `logging.js` `writeAgentLog()`:
   - Add a "Guard Status" section when outcome is `nop`:
     ```markdown
     ## Guard Status
     | Guard | Result |
     |-------|--------|
     | no-mission | PASS |
     | mission-complete | PASS |
     | budget-exhausted | PASS |
     | mission-failed | **BLOCKED** — MISSION_FAILED.md exists |
     ```

3. In workflow YAML files, pass workflow-level context to the agentic-step action:
   - Add `workflow-run-id: ${{ github.run_id }}` as an input
   - Add `workflow-name: ${{ github.workflow }}` as an input
   - Add `trigger-event: ${{ github.event_name }}` as an input
   These appear in the log body for correlation.

**Tests:**
- Unit test: nop logs include guard status
- Unit test: nop logs include workflow context

---

## C8: Make Seed Issue Creation Optional (Default Off)

**Why:** The two seed issues ("Initial unit tests" and "Initial web layout") are created unconditionally on purge. For some missions these are unhelpful or actively misleading (e.g., the OWL ontology mission got a generic "Initial web layout" issue). The supervisor should decide what issues to create based on the mission content.

**Implementation:**

In `agentic-lib-init.yml`:

1. Add a new input parameter:
   ```yaml
   inputs:
     create-seed-issues:
       description: 'Create seed issues on init purge (true/false)'
       required: false
       default: 'false'
       type: string
   ```

2. Wrap the seed issue creation block (lines 327-378) in a conditional:
   ```yaml
   if: inputs.create-seed-issues == 'true' && inputs.dry-run != 'true' && env.INIT_MODE == 'purge'
   ```

3. In the `#@dist` transformed version for consumers, default to `'false'`.

4. Update the workflow_dispatch trigger to expose the parameter.

**Tests:**
- Test: init purge with create-seed-issues=false creates no issues
- Test: init purge with create-seed-issues=true creates 2 issues (existing behaviour)

---

## C9: Add `params` Job to All Workflows

**Why:** The `params` job normalizes inputs across trigger types (workflow_dispatch, schedule, workflow_run, push). Without it, each job re-derives parameters independently, leading to inconsistency.

**Workflows that need params jobs added:**

| Workflow | Current State | Params Job Needs |
|----------|---------------|------------------|
| `agentic-lib-init.yml` | No params job | Normalize: dry-run, mission, profile, model, create-seed-issues |
| `agentic-lib-update.yml` | No params job | Normalize: dry-run |
| `agentic-lib-schedule.yml` | No params job | Normalize: frequency, model, profile, maintenance |
| `agentic-lib-test.yml` (consumer) | No params job | Normalize: dry-run |
| `release.yml` | No params job | Normalize: bump-type |

**Pattern to follow** (from `agentic-lib-workflow.yml`):

```yaml
jobs:
  params:
    runs-on: ubuntu-latest
    outputs:
      dry-run: ${{ steps.resolve.outputs.dry-run }}
      model: ${{ steps.resolve.outputs.model }}
    steps:
      - uses: actions/checkout@v4
      - id: resolve
        uses: actions/github-script@v7
        with:
          script: |
            // Read from inputs, fallback to agentic-lib.toml, fallback to defaults
            const toml = require('@iarna/toml');
            const config = toml.parse(fs.readFileSync('agentic-lib.toml', 'utf8'));
            core.setOutput('model', context.payload.inputs?.model || config.tuning?.model || 'gpt-5-mini');
            core.setOutput('dry-run', context.payload.inputs?.['dry-run'] || 'false');
```

**Implementation:**
- For each workflow, add a `params` job as the first job
- Make all other jobs `needs: [params]`
- Reference params via `${{ needs.params.outputs.X }}`

---

## C10: Verbose Logging + GitHub Workflow Summary

**Why:** When debugging workflow runs, the console logs are often sparse. Adding structured logging at step boundaries and a summary at the end of each job makes debugging much faster.

**Implementation pattern for each workflow job:**

1. **At the start of each job step**, log the step name and key inputs:
   ```yaml
   - name: Run supervisor
     run: |
       echo "::group::Supervisor Configuration"
       echo "Model: ${{ needs.params.outputs.model }}"
       echo "Dry-run: ${{ needs.params.outputs.dry-run }}"
       echo "::endgroup::"
   ```

2. **At the end of each job**, write a summary to `$GITHUB_STEP_SUMMARY`:
   ```yaml
   - name: Job Summary
     if: always()
     run: |
       cat >> "$GITHUB_STEP_SUMMARY" <<'EOF'
       ## Supervisor Job
       | Parameter | Value |
       |-----------|-------|
       | Model | ${{ needs.params.outputs.model }} |
       | Outcome | ${{ steps.supervisor.outputs.outcome }} |
       | Duration | ${{ steps.supervisor.outputs.duration }} |
       EOF
   ```

3. **For agentic-step invocations**, log all action outputs:
   ```yaml
   - name: Log agentic-step outputs
     if: always()
     run: |
       echo "::group::agentic-step Outputs"
       echo "outcome=${{ steps.step-id.outputs.outcome }}"
       echo "narrative=${{ steps.step-id.outputs.narrative }}"
       echo "tokens=${{ steps.step-id.outputs.tokens }}"
       echo "::endgroup::"
   ```

**Apply to all 8 workflow files.** This is mostly additive — no existing logic changes.

---

## C11: Supervisor Posts to Discussions on Significant Events

**Why:** Users watching the repository have no visibility into what the autonomous system is doing unless they check workflow runs. Posting to the discussions thread on key events keeps users informed.

**Significant events that trigger a discussion post:**

1. **Source file changes**: After a transform PR is merged, post a summary of what changed
2. **Stagnation detected**: If `consecutive-nop-cycles` (from state.toml) exceeds 5, post asking for human guidance
3. **Discussion-related change applied**: When a transform resolves an issue that was created from a user's discussion request, post confirming completion
4. **Mission complete declared**: Post celebrating completion with summary stats
5. **Mission failed declared**: Post explaining what was achieved and what failed

**Implementation:**

1. In `tasks/supervise.js`:
   - After reading state, check for trigger conditions
   - When a trigger condition is met, include a `respond:discussions` action in the supervisor's output
   - The supervisor prompt (`agent-supervisor.md`) already supports this action

2. In `agent-supervisor.md`, add to the prompt:
   ```markdown
   ## Discussion Updates (NEW)

   Post to the active discussion thread when:
   - A transform PR has been merged (summarize changes)
   - 5+ consecutive nop cycles indicate stagnation (ask for help)
   - A user's discussion request has been addressed (confirm completion)
   - Mission complete or mission failed is declared (summarize outcome)

   Use `respond:discussions | message: <text> | discussion-url: <url>` for each post.
   ```

3. In `agentic-lib-workflow.yml`, after the `direct` job:
   - If the director declared mission-complete or mission-failed, dispatch the bot to post
   - Alternatively, have the supervisor handle this in the next cycle (simpler, slightly delayed)

**Tests:**
- Unit test: supervisor includes discussion post action when stagnation detected
- Unit test: supervisor includes discussion post action on mission-complete/failed

---

## C12: Wire Feature Specs → Issue Creation (R3)

**Why:** The maintain-features pipeline creates detailed feature specs in `features/` but these are never converted into issues. The supervisor should create issues from unimplemented feature specs.

**Implementation:**

In `agent-supervisor.md`, strengthen the existing issue creation guidance:

```markdown
## Feature Spec → Issue Pipeline (NEW)

When feature specs exist in `features/` but no open issues reference them:
1. Read the feature spec's acceptance criteria
2. Cross-reference with implemented code and existing tests
3. If acceptance criteria are unmet, create an issue from the feature spec
4. Include the feature spec's acceptance criteria in the issue body
5. Label with `automated`, `ready`, and `feature`

Priority: Create issues for feature specs whose acceptance criteria most directly
advance the MISSION.md goals. Don't create issues for all specs at once — respect
the WIP limit.
```

In `tasks/supervise.js`:
- When building the prompt context, include the list of feature spec filenames and their first few lines (acceptance criteria)
- Add a "Feature Coverage" section showing which specs have corresponding closed issues

---

## C13: Feed Library Docs into Transform Context (R5)

**Why:** The maintain-library pipeline creates reference documents in `library/` but the transform task doesn't see them. For domain-specific missions (OWL ontology), the library docs contain exactly the knowledge the LLM needs.

**Implementation:**

In the transform task's agent prompt (`agent-transform.md` or equivalent):
- Add a section: "Library Reference: The following library documents are available for this domain."
- Include a summary index of library doc titles and first paragraphs (not full content — too large)
- The LLM can then use the `read_file` tool to read specific library docs it finds relevant

In `tasks/transform.js` (or wherever transform context is built):
- Read `library/*.md` filenames and first 2 lines of each
- Include as a "Library Index" section in the prompt
- Cap at 2000 chars to avoid prompt bloat

---

## C14: Limit Maintain-Features Token Budget (R4)

**Why:** The maintain-features task at 05:31 consumed 625,997 tokens to update one markdown file. Per-invocation token caps prevent runaway costs.

**Implementation:**

1. In `agentic-lib.toml`, add under `[limits]`:
   ```toml
   max-tokens-per-maintain = 200000   # Per-invocation cap for maintain-features/library
   ```

2. In `config.js`, read this value (default 200000)

3. In the Copilot SDK session configuration for maintain-features and maintain-library tasks:
   - Set `maxTokens` or equivalent session parameter
   - If the SDK doesn't support this natively, implement a token counter that terminates the session after the cap

**Tests:**
- Unit test: config reads max-tokens-per-maintain
- Unit test: maintain task respects token cap (mock)

---

## C15: Exponential Backoff on Consecutive nop Cycles (R7)

**Why:** 20+ identical nop cycles in a row waste resources. Exponential backoff reduces the frequency of retries.

**Implementation:**

Using `agentic-lib-state.toml` from C1:

1. In `index.js`, after task completes:
   - If outcome is `nop`: increment `state.counters['cumulative-nop-cycles']`
   - If outcome is NOT `nop`: reset `state.counters['cumulative-nop-cycles'] = 0`

2. In `agentic-lib-workflow.yml` supervisor job:
   - Read `consecutive-nop-cycles` from state.toml (via a step that checks out the logs branch)
   - If consecutive nops > 3: add a delay or skip the current run
   - Implementation: use a `github-script` step that exits early if the nop count exceeds threshold:
     ```javascript
     if (nopCount > 3 && nopCount % Math.pow(2, Math.floor(Math.log2(nopCount - 2))) !== 0) {
       core.info(`Skipping: ${nopCount} consecutive nops, next run at power-of-2`);
       // Set output to skip downstream jobs
     }
     ```
   This runs at nop counts 4, 4, 8, 8, 16, 16, 32... — exponentially decreasing frequency

**Tests:**
- Unit test: nop counter increments
- Unit test: nop counter resets on non-nop
- Unit test: backoff formula skips correct runs

---

## C16: Improve Mission-Failed Commit Message (R6)

**Why:** The commit message "Transformation budget exhausted and acceptance criteria remain unmet" was factually wrong. The message should specify exactly which criteria failed.

**Implementation:**

In `tasks/direct.js`, when writing `MISSION_FAILED.md`:

1. Build a structured reason string from the metrics:
   ```
   mission-failed: Cumulative transforms = 0 (target: >= 1).
   All other metrics MET: open issues = 0, open PRs = 0, resolved = 3, TODOs = 0.
   ```

2. Use this as the commit message body (after the subject line)

3. Also write the reason to `agentic-lib-state.toml` `[status].mission-failed-reason`

**Tests:**
- Unit test: mission-failed reason includes specific failed metrics
- Unit test: mission-failed reason is written to state.toml

---

## C17: Update README.md

**Why:** The README should accurately describe current capabilities, including the state management changes, new metrics, and discussion integration.

**Sections to update:**

1. **agentic-lib.toml configuration**: Document new `[limits].max-tokens-per-maintain` and removed `[mission-complete].min-dedicated-tests`
2. **State management**: Document `agentic-lib-state.toml` on the logs branch
3. **Mission metrics**: Update the metrics table to show new metrics (source lines, test count, feature specs, acceptance criteria)
4. **Task handlers**: Update count from 10 to reflect current reality; verify the list matches actual code
5. **Workflow list**: Verify the 8 workflow names and descriptions match the current files
6. **Code examples**: Ensure any CLI examples (`npx @xn-intenton-z2a/agentic-lib init`, `iterate`, etc.) produce output matching what the README claims
7. **Init parameters**: Document `create-seed-issues` parameter (default off)

**Approach:** Read the current README, run the CLI commands to verify output, update discrepancies.

---

## Implementation Order

### Phase 1: State Foundation (C1, C2, C4, C5) — Must be done together

These are tightly coupled. The state file (C1) enables the counter fix (C2), and the counter values flow into the log format (C4, C5).

1. **C1**: Create `src/copilot/state.js` + update init purge
2. **C2**: Fix `index.js` and `telemetry.js` to use state file
3. **C4**: Add sequence numbering to log filenames and body
4. **C5**: Split current-task vs cumulative in metrics table
5. Write tests for all four

### Phase 2: Safety & Lifecycle (C3, C6, C8, C15, C16)

These reduce waste and improve mission lifecycle management.

1. **C3**: Auto-disable schedule on mission-failed
2. **C6**: Replace dedicated test metric with dynamic metrics
3. **C8**: Make seed issues optional
4. **C15**: Exponential backoff
5. **C16**: Improve mission-failed commit message
6. Write tests

### Phase 3: Workflow Standardization (C9, C10, C7)

These are mechanical changes to workflow YAML files.

1. **C9**: Add params jobs to 5 workflows
2. **C10**: Add verbose logging + summaries to all 8 workflows
3. **C7**: Pass workflow context to agentic-step, improve nop log content

### Phase 4: Pipeline Wiring (C11, C12, C13, C14)

These connect the disconnected pipelines.

1. **C12**: Wire feature specs → issue creation in supervisor prompt
2. **C13**: Feed library docs into transform context
3. **C14**: Token cap for maintain tasks
4. **C11**: Supervisor discussion posting

### Phase 5: Documentation (C17)

1. **C17**: Update README.md after all changes are implemented

---

## Verification

After all changes:

1. Run `npm test` — all existing tests pass plus new tests for state.js, updated telemetry, updated guards
2. Run `npm run lint:workflows` — all workflow YAML is valid
3. Run `npx @xn-intenton-z2a/agentic-lib init --dry-run` — verify state.toml is included in init output
4. Manually verify one end-to-end cycle:
   - Init purge creates clean `agentic-lib-state.toml` on logs branch
   - First workflow run reads state, writes updated state
   - Log file has sequence number in name and body
   - Metrics table shows split current/cumulative values
   - After mission-failed, schedule is auto-disabled
5. Run a short benchmark (e.g., fizz-buzz with budget=4) to verify the counter works end-to-end

---

## Success Criteria

- The cumulative transform counter persists correctly across workflow runs
- Mission-failed auto-disables the schedule (no more 7-hour nop loops)
- Log files are sequentially numbered and self-documenting
- The Mission Metrics table shows both per-task and cumulative values
- Feature specs can drive issue creation through the supervisor
- No regressions in existing test suite
