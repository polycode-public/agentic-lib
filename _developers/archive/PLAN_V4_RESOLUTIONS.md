# Execution Plan: V4 Report Resolutions & Optimisations

**Source**: `_developers/REPORT_WORKFLOW_VALIDATION_V4.md` (2026-03-06)
**Author**: Claude Code (claude-opus-4-6)
**Scope**: agentic-lib (all changes mastered here, distributed to repository0 via init)

---

## User Assertions

- All changes must be made in agentic-lib and distributed to repository0 via init
- No merges, pushes to main, branch deletion, or history rewriting without explicit per-command permission
- Branch naming: `claude/<short-description>`

---

## Issues to Resolve

### ISSUE-1: Only gpt-5-mini Supports Reasoning Effort (P0 — FINDING-1)

**Problem**: The Copilot SDK's `reasoningEffort` SessionConfig parameter is only supported by `gpt-5-mini`. When `claude-sonnet-4` or `gpt-4.1` is used with the `recommended` or `max` profile, the session creation fails:

> Model 'X' does not support reasoning effort configuration.

The `recommended` profile defaults `reasoningEffort: "medium"` and `max` defaults `reasoningEffort: "high"`, so any non-gpt-5-mini model fails unless the user explicitly overrides `reasoning-effort` to empty/null in TOML.

**Root cause**: `copilot.js:71-73` unconditionally sets `sessionConfig.reasoningEffort` when `tuning.reasoningEffort` is truthy. All three profiles set it by default.

**Fix**: Add a model capability check. Only send `reasoningEffort` for models known to support it.

**Files to change**:
1. `src/actions/agentic-step/copilot.js` — Add model capability check before setting `reasoningEffort`
2. `tests/actions/agentic-step/copilot.test.js` — Add tests for the new behaviour

**Implementation**:

```javascript
// copilot.js — new constant near top of file
const MODELS_SUPPORTING_REASONING_EFFORT = new Set([
  "gpt-5-mini",
  "o4-mini",   // future-proofing for reasoning models
]);

// In runCopilotTask, replace lines 71-73:
if (tuning?.reasoningEffort && MODELS_SUPPORTING_REASONING_EFFORT.has(model)) {
  sessionConfig.reasoningEffort = tuning.reasoningEffort;
} else if (tuning?.reasoningEffort) {
  core.info(`[copilot] Skipping reasoningEffort="${tuning.reasoningEffort}" — not supported by model "${model}"`);
}
```

**Verification**: Run existing tests + new test that verifies reasoning-effort is omitted for `claude-sonnet-4` and `gpt-4.1`.

**Risk**: Low. The Set is conservative (allowlist). If a new model supports reasoning effort, we add it to the Set. False negatives (omitting reasoning-effort for a model that supports it) are harmless — the SDK uses its default.

---

### ISSUE-2: Complex Missions Trigger Churn (P1 — FINDING-3)

**Problem**: cron-engine (5 functions) reached working code by iteration 2 but continued producing transform commits through iteration 4+. Code size fluctuated (91 → 318 → 209 lines). The pipeline doesn't know when to stop.

**Root cause**: Multiple contributing factors:
1. **Transform always finds work**: The transform prompt asks for "the single most impactful next step" — there's always _something_ to improve.
2. **No acceptance criteria checking**: The supervisor prompt (agent-supervisor.md lines 42-47) lists conditions for "mission accomplished" but has no programmatic way to verify them.
3. **No stability detection**: Consecutive nop-less iterations don't trigger any slowdown or stop signal.
4. **Supervisor never runs on schedule** (see ISSUE-5) — even if the supervisor had the right prompt, it's skipped on every scheduled trigger.

**Fix**: Multi-layered approach:

#### 2a. Transform stability signal

When the transform task reviews the code and concludes no meaningful work remains, it should return `nop` instead of making cosmetic changes. Strengthen the agent prompt to be explicit about this.

**Files to change**:
1. `src/agents/agent-transform.md` (if it exists) or the inline prompt in `src/actions/agentic-step/tasks/transform.js` — Add explicit "return nop when mission is accomplished" instruction

**Implementation**: Add to the transform prompt:

```markdown
## When to return nop (no changes needed)

If the existing code already satisfies all requirements in MISSION.md and all open issues have been addressed:
- Do NOT make cosmetic changes (reformatting, renaming, reordering)
- Do NOT add features beyond what MISSION.md specifies
- Do NOT rewrite working code for stylistic preferences
- Return nop with a message explaining the mission is satisfied
```

#### 2b. Supervisor iteration budget

Add an optional `max-iterations` config knob (default: unlimited) that the supervisor can use to count transform cycles and trigger `set-schedule:off` or `set-schedule:weekly` after N consecutive transforms.

**Files to change**:
1. `agentic-lib.toml` — Add `max-iterations` to `[limits]` section
2. `src/actions/agentic-step/config-loader.js` — Parse the new knob
3. `src/agents/agent-supervisor.md` — Add guidance on iteration budgets

**Implementation**: Add to TOML:

```toml
[limits]
# Maximum transform iterations before supervisor should throttle to weekly or off
# 0 = unlimited (default)
max-iterations = 0
```

Add to agent-supervisor.md:

```markdown
## Iteration Budget

If `max-iterations` is set in the configuration and the number of recent transform completions
(visible in the workflow runs) exceeds that limit, throttle the schedule:
- If all issues are closed: `set-schedule:off`
- If issues remain open: `set-schedule:weekly`
```

#### 2c. Stability detection and discussions reporting in supervisor prompt

Enhance the supervisor prompt to recognise when recent iterations produced no meaningful transform (the last N runs all ended with maintain-only or nop outcomes), AND to check for unresponded discussion activity or bot referrals that need supervisor attention.

**Files to change**:
1. `src/agents/agent-supervisor.md` — Add stability detection and discussions awareness

**Implementation**: Add:

```markdown
## Stability Detection

If the last 2+ workflow runs show no transform commits (only maintain-only or nop outcomes),
AND all open issues are closed, the mission is likely accomplished. Follow the
"Mission Accomplished" protocol above.

## Discussions Awareness

Check the Recent Activity log for discussion bot referrals (lines containing
`discussion-request-supervisor`). These indicate a user asked the bot something that
requires supervisor action. Prioritise responding to these referrals.

Also check for notable progress worth reporting:
- Mission milestones achieved (all core functions implemented, all tests passing)
- Schedule changes (hourly→weekly, mission accomplished)
- Significant code changes (large PRs merged, new features completed)

When notable progress exists or there are unresponded referrals, use
`respond:discussions | message: <status update> | discussion-url: <url>` to post
an update. Keep it concise — 2-3 sentences summarising what happened and what's next.
```

---

### ISSUE-3: Multi-Model Testing Blocked (P2 — Scenario 2)

**Problem**: Cannot compare model quality because only gpt-5-mini works. Resolving ISSUE-1 unblocks this entirely.

**Action**: After ISSUE-1 is resolved:
1. Re-run Scenario 2 (fizz-buzz / claude-sonnet-4)
2. Run fizz-buzz / gpt-4.1
3. Run cron-engine / claude-sonnet-4 (quality comparison)
4. Document results in `_developers/REPORT_WORKFLOW_VALIDATION_V5.md`

**No code changes needed** — this is a testing activity post-fix.

---

### ISSUE-4: Discussion Bot Self-Reply Loop (P0 — from bot review)

**Problem**: User asked one question ("Is the mission accomplished?") and received 4 nearly-identical responses. The bot's own replies trigger `discussion_comment:created` events, which re-trigger the bot workflow.

**Evidence** (Discussion #2601, 2026-03-06):
- 12:58:03 — User: "Is the mission accomplished?"
- 12:59:12 — Bot reply #1 (run 22764438306): "Not yet — I export both functions..."
- 13:49:09 — Bot reply #2 (run 22766212407): "Not yet — I don't fully meet MISSION.md..."
- 13:59:25 — Bot reply #3 (run 22766589776): "Acknowledged. Passing this to the supervisor..."
- 18:12:18 — Bot reply #4 (run 22775990383): "Acknowledged — requesting the supervisor..."

Each bot reply posted via GraphQL creates a new `discussion_comment:created` event → new bot workflow run → another reply. The prompt includes "DO NOT REPEAT THIS" with the last bot reply, but the LLM doesn't consistently obey it.

**Root cause**: Two issues:
1. The concurrency group is commented out (`#concurrency:` in `agentic-lib-bot.yml`)
2. No check to skip when the triggering comment is from the bot itself

**Fix**: Add a guard step in the bot workflow that checks the comment author before running.

**Files to change**:
1. `.github/workflows/agentic-lib-bot.yml` — Add author check step; uncomment concurrency group

**Implementation**:

```yaml
# Uncomment the concurrency group:
concurrency:
  group: agentic-lib-bot-${{ github.event.discussion.node_id || github.run_id }}
  cancel-in-progress: false

# Add a guard step before the respond job runs agentic-step:
- name: Check if comment is from bot
  id: guard
  if: |
    github.event_name == 'discussion_comment' &&
    github.event.comment.user.login == 'github-actions[bot]'
  run: echo "skip=true" >> $GITHUB_OUTPUT

# Gate the agentic-step on the guard:
- name: Respond to discussion
  if: steps.discussion-url.outputs.url != '' && steps.guard.outputs.skip != 'true'
```

**Risk**: Low. Only affects workflow triggering logic. No code logic changes.

---

### ISSUE-5: Supervisor Always Skipped on Schedule Triggers (P0 — from bot review)

**Problem**: The supervisor job NEVER runs on scheduled triggers. During the V4 test, all 15+ scheduled runs between 09:28Z and 18:49Z had `supervisor: skipped`. This means:
- No strategic issue creation
- No mission completion detection
- No schedule management
- No bot referral handling
- The pipeline runs blind (maintain → review → dev) without any orchestration

**Evidence**: Every scheduled run (e.g. 22776262307, 22775121155, 22774081151) shows:
```
maintain: success | supervisor: skipped | review-features: success | dev: success
```

**Root cause**: The `#@dist` transformation is incomplete. In `agentic-lib-workflow.yml`:
- Line 92: `default: true  #@dist false` — correctly transforms `workflow_dispatch` default to `false`
- Line 128: `echo "dry-run=${DRY_RUN:-true}"` — bash fallback is NOT transformed

When triggered by `schedule`, `inputs.dry-run` is undefined (schedule events have no inputs), so `DRY_RUN=''` and bash substitution `${DRY_RUN:-true}` evaluates to `true`. The supervisor condition `needs.params.outputs.dry-run != 'true'` fails.

The maintain, review-features, and dev jobs run because they DON'T check `dry-run` — only `mode`.

**Fix**: Add a `#@dist` marker on the bash fallback, or change the fallback logic to derive from the workflow_dispatch default.

**Files to change**:
1. `.github/workflows/agentic-lib-workflow.yml` — Fix the bash dry-run default for schedule triggers

**Implementation** (option A — `#@dist` marker):

```yaml
# Line 128: change the bash default
DRY_RUN='${{ inputs.dry-run }}'
echo "dry-run=${DRY_RUN:-true}" >> $GITHUB_OUTPUT    #@dist echo "dry-run=${DRY_RUN:-false}" >> $GITHUB_OUTPUT
```

**Implementation** (option B — derive from trigger type, no `#@dist` needed):

```yaml
# If triggered by schedule, force dry-run=false (schedule should always be live)
DRY_RUN='${{ inputs.dry-run }}'
if [ "${{ github.event_name }}" = "schedule" ]; then
  DRY_RUN="false"
fi
echo "dry-run=${DRY_RUN:-true}" >> $GITHUB_OUTPUT
```

Option B is preferred — it's self-documenting and works without relying on `#@dist` transformation.

**Risk**: Medium. This enables the supervisor to run on schedule for the first time. The supervisor dispatches workflows and creates issues. Verify in dry-run first, then in a controlled scenario.

---

### ISSUE-6: Bot `request-supervisor` Action Is Fire-and-Forget (P1 — from bot review)

**Problem**: All 4 bot replies to Discussion #2601 returned `outcome=discussion-request-supervisor` with a detailed request for the supervisor. But the bot workflow (`agentic-lib-bot.yml`) has NO step after the agentic-step to actually dispatch the supervisor workflow. The bot promises "I'll pass this to the supervisor" but nothing happens.

**Evidence**: Bot logs show:
```
Discussion bot action: request-supervisor, arg: Run tests; if failing, apply minimal fixes...
agentic-step completed: outcome=discussion-request-supervisor
```
No subsequent workflow dispatch occurs.

**Root cause**: The bot workflow only has one step (agentic-step). The `action` and `actionArg` outputs are returned but never consumed by a subsequent step.

**Fix**: Add a post-step in the bot workflow that dispatches `agentic-lib-workflow` when the action is `request-supervisor`.

**Files to change**:
1. `.github/workflows/agentic-lib-bot.yml` — Add dispatch step after agentic-step
2. `src/actions/agentic-step/tasks/discussions.js` — Set action/actionArg as action outputs (already returned, just need to be surfaced)

**Implementation**: Add to bot workflow after the "Respond to discussion" step:

```yaml
- name: Dispatch supervisor if requested
  if: steps.respond.outputs.action == 'request-supervisor'
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    gh workflow run agentic-lib-workflow.yml \
      -f mode=full \
      -f message="${{ steps.respond.outputs.actionArg }}"
```

Also need to surface the `action` output from the agentic-step action. Currently `discussions.js` returns `action` in the result object, but the action's `index.js` needs to set it as a GitHub Actions output.

**Files to also change**:
1. `src/actions/agentic-step/index.js` — Set `action` as an output: `core.setOutput('action', result.action || '')`

**Risk**: Low-medium. The dispatch is gated on the bot explicitly choosing `request-supervisor`. Worst case: unnecessary workflow runs (which the supervisor handles via nop).

---

### ISSUE-7: Supervisor Should Report Progress to Discussions (P1 — user request)

**Problem**: The supervisor gathers comprehensive repository context but never proactively reports to the discussions thread. Users who interact via the discussion bot get no follow-up. The bot refers to the supervisor, but the supervisor doesn't report back.

**Desired behaviour**: During `agentic-lib-workflow.yml`, the supervisor should:
1. Check for unresponded bot referrals (`discussion-request-supervisor` in recent activity)
2. Check for notable progress worth reporting (milestones, completed issues, schedule changes)
3. When either applies, include `respond:discussions` in its action output

**Fix**: This is addressed by ISSUE-2c (supervisor prompt update). The supervisor already has the `respond:discussions` action available — it just needs prompt guidance to use it proactively.

Additionally, the supervisor needs to know the discussion URL. Currently it's not in the context.

**Files to change**:
1. `src/actions/agentic-step/tasks/supervise.js` — Include active discussion URL in context (from config or recent activity)
2. `src/agents/agent-supervisor.md` — Already covered in ISSUE-2c prompt additions

**Implementation**: In `gatherContext()`, scan for the discussion URL pattern in recent activity or add a `discussion-url` config field:

```javascript
// Extract discussion URL from recent activity log
const discussionUrlMatch = recentActivity.match(
  /https:\/\/github\.com\/[^/]+\/[^/]+\/discussions\/\d+/
);
const activeDiscussionUrl = discussionUrlMatch ? discussionUrlMatch[0] : "";
```

Include in the prompt context:
```
### Active Discussion
${ctx.activeDiscussionUrl || "none"}
```

---

## Optimisations

### OPT-1: Log Reasoning-Effort Decision

Currently there's no log line when reasoning-effort is applied or skipped. Add an info log so operators can see which capability was used.

**Files to change**: `src/actions/agentic-step/copilot.js`

**Already covered by ISSUE-1 implementation** (the `else if` branch logs the skip).

---

### OPT-2: MCP Server Profile-to-Model Mapping Consistency

The MCP server's `profileDefaultModel()` maps `recommended → claude-sonnet-4` and `max → gpt-4.1`, both of which fail with reasoning-effort. After ISSUE-1, these profiles will work correctly. However, the documentation in `MCP_SERVER.md` should note that reasoning-effort is only applied for compatible models.

**Files to change**:
1. `MCP_SERVER.md` — Add a note about reasoning-effort model compatibility

---

### OPT-3: Supervisor Context — Include Previous Iteration Outcome

Currently the supervisor reads recent workflow runs (status/conclusion) but not the _outcome_ of the previous agentic-step (e.g. "transformed" vs "nop"). Including this would help the supervisor detect stability without relying purely on commit diffs.

**Files to change**:
1. `src/actions/agentic-step/tasks/supervise.js` — In `gatherContext()`, parse the last few lines of `intentïon.md` for outcome strings (already partially done — the prompt includes "Recent Activity" from intentïon.md, but could be more explicit)
2. `src/agents/agent-supervisor.md` — Add guidance on interpreting outcome strings

**Implementation**: Already partially there. The supervisor prompt receives the last 20 lines of intentïon.md. Strengthen the prompt to explicitly look for `transform: nop` vs `transform: transformed` patterns.

---

### OPT-4: TOML Config — Explicit `reasoning-effort = "none"` Override

Allow users to explicitly disable reasoning-effort regardless of model, by setting `reasoning-effort = "none"` in TOML. This gives users an escape hatch if the model capability list is stale.

**Files to change**:
1. `src/actions/agentic-step/config-loader.js` — Treat `"none"` as falsy
2. `agentic-lib.toml` — Document the option in comments
3. `tests/actions/agentic-step/config-loader.test.js` — Test the override

---

## Execution Order

| Step | Issue/Opt | Description | Dependencies | Estimated Complexity |
|------|-----------|-------------|--------------|---------------------|
| 1 | ISSUE-5 | Fix dry-run default for schedule triggers | None | Small (1 line in workflow) |
| 2 | ISSUE-4 | Fix bot self-reply loop | None | Small (workflow guard step) |
| 3 | ISSUE-1 | Fix reasoning-effort model compatibility | None | Small (1 file + tests) |
| 4 | OPT-4 | Add `reasoning-effort = "none"` escape hatch | Step 3 | Tiny (1 line in config-loader) |
| 5 | ISSUE-6 | Wire bot `request-supervisor` to dispatch | Step 2 | Medium (workflow + index.js output) |
| 6 | ISSUE-2a | Strengthen transform nop-when-done prompt | None | Small (prompt edit) |
| 7 | ISSUE-2c | Stability detection + discussions reporting in supervisor prompt | None | Small (prompt edit) |
| 8 | ISSUE-7 | Supervisor discussions context (URL extraction) | Step 7 | Small (supervise.js + prompt) |
| 9 | ISSUE-2b | max-iterations config knob | Steps 6-7 | Medium (config + prompt + test) |
| 10 | OPT-3 | Supervisor outcome awareness prompt | Steps 6-7 | Small (prompt edit) |
| 11 | OPT-2 | MCP Server docs update | Step 3 | Tiny (docs only) |
| 12 | ISSUE-3 | Multi-model validation testing | Step 3 deployed | Testing only (no code) |

**Suggested branch**: `claude/v4-resolutions`

**Commit grouping**:
- Commit 1: Steps 1-2 (workflow fixes: dry-run default + bot guard)
- Commit 2: Steps 3-4 (reasoning-effort fix + "none" escape hatch)
- Commit 3: Step 5 (bot → supervisor dispatch wiring)
- Commit 4: Steps 6-8, 10 (supervisor + transform prompt improvements)
- Commit 5: Step 9 (max-iterations config knob)
- Commit 6: Step 11 (docs)
- Step 12: Follow-up testing after release

---

## Files Changed (Summary)

| File | Steps | Change Type |
|------|-------|-------------|
| `.github/workflows/agentic-lib-workflow.yml` | 1 | Workflow: fix dry-run bash default for schedule |
| `.github/workflows/agentic-lib-bot.yml` | 2, 5 | Workflow: bot guard + supervisor dispatch |
| `src/actions/agentic-step/copilot.js` | 3, OPT-1 | Code: model capability check |
| `src/actions/agentic-step/config-loader.js` | 4, 9 | Code: "none" handling, max-iterations |
| `src/actions/agentic-step/index.js` | 5 | Code: surface `action` output |
| `src/actions/agentic-step/tasks/supervise.js` | 8 | Code: discussion URL extraction |
| `src/agents/agent-supervisor.md` | 7, 9, 10 | Prompt: stability, discussions, budget, outcomes |
| `src/actions/agentic-step/tasks/transform.js` | 6 | Prompt: nop-when-done guidance |
| `agentic-lib.toml` | 4, 9 | Config: max-iterations, reasoning-effort docs |
| `MCP_SERVER.md` | 11 | Docs: reasoning-effort compatibility note |
| `tests/actions/agentic-step/copilot.test.js` | 3 | Test: model capability check |
| `tests/actions/agentic-step/config-loader.test.js` | 4, 9 | Test: none override, max-iterations |

---

## Success Criteria

1. `claude-sonnet-4` and `gpt-4.1` can complete a fizz-buzz scenario without reasoning-effort errors
2. cron-engine reaches stability in <=6 iterations (down from >4 with continued churn)
3. All existing tests pass (314 tests)
4. New tests cover the reasoning-effort model check and config overrides
5. Bot responds exactly once per user comment (no self-reply loop)
6. Bot `request-supervisor` actually dispatches the supervisor workflow
7. Supervisor runs on scheduled triggers (not skipped)
8. Supervisor reports progress to discussions when notable milestones occur or when referred by the bot

---

## Additional Items (added during implementation)

### ITEM-8: Tuning Parameter Logging

Every tuning parameter is now logged when applied, showing the value, profile it came from, and model. When scan limits clip content (e.g. file count or char limit exceeded), the excess is also logged.

**Files changed**: `src/actions/agentic-step/copilot.js` (logTuningParam function, scanDirectory clipping logs)

### ITEM-9: Model Annotations in Config

`agentic-lib.toml` now documents model specialisations:
- gpt-5-mini: fast, cheap, supports reasoning-effort
- claude-sonnet-4: strong code quality, nuanced reasoning
- gpt-4.1: high capability, large context

### ITEM-10: Discussion Bot Scope & Engagement

Bot prompt updated to:
- Stay on-topic (only repository-related discussions)
- Redirect off-topic questions politely
- Encourage experimentation and user engagement
- Suggest experiments and invite participation

### ITEM-11: Dynamic Model Capability (future)

The Copilot SDK (v0.1.30) exposes `client.listModels()` with `supportedReasoningEfforts` per model. The current implementation uses a static allowlist for simplicity (no auth needed at config time). A future enhancement could query the API at session creation time for dynamic capability detection.

---

## Additional Items (continued)

### ITEM-12: Inert Workflow Guards (repository != agentic-lib)

Distributable workflows (`agentic-lib-workflow.yml`, `agentic-lib-bot.yml`, `agentic-lib-init.yml`, `agentic-lib-schedule.yml`) had active `workflow_dispatch` triggers in agentic-lib. The supervisor or other dispatchers could trigger real write operations (PR merges, git pushes, workflow dispatches) in the source repo.

**Fix**: Added `github.repository != 'xn-intenton-z2a/agentic-lib'` guards at **step level** on all write/dispatch steps (12 step guards + 1 job guard). Jobs themselves still run their read-only parts (checkout, npm ci, telemetry gathering, stuck PR detection) in agentic-lib — only the mutation steps are blocked.

**Files changed**: `agentic-lib-workflow.yml` (7 guards), `agentic-lib-bot.yml` (1 guard), `agentic-lib-init.yml` (3 guards), `agentic-lib-schedule.yml` (1 guard)

### ITEM-13: Fine-Grained Dry-Run (exercise more in test mode)

Jobs previously gated entirely by `dry-run != 'true'` at job level (`pr-cleanup`, `telemetry`, `supervisor`, `fix-stuck`) now run their read-only steps in dry-run mode. Only the write steps within each job check `dry-run`. This means dry-run tests exercise the full workflow pipeline including telemetry gathering, stuck PR detection, and supervisor setup — only actual mutations are skipped.

**Files changed**: `agentic-lib-workflow.yml` — removed `dry-run` from 4 job-level `if` conditions; write steps retain both `repository` and `dry-run` guards.

### ITEM-14: Concurrency Group on test.yml

Added `concurrency: { group: test-${{ github.head_ref || github.ref_name }}, cancel-in-progress: true }` to `test.yml`. When pushing to a branch with an open PR, both `push` and `pull_request` triggers fire; the concurrency group cancels the older run so only one completes.

**Files changed**: `.github/workflows/test.yml`

### ITEM-15: Copilot SDK Protocol v3 Upgrade

The Copilot SDK server upgraded to protocol v3, breaking all SDK calls with: `SDK protocol version mismatch: SDK expects version 2, but server reports version 3`. Updated `@github/copilot-sdk` from `0.1.30` (protocol v2) to `0.1.31-unstable.0` (protocol v3).

**Files changed**: `package.json`, `package-lock.json`

---

## Implementation Status

**State**: All changes on main. PR #1847 merged (steps 1-8, 10, ITEMs 8-10). Subsequent fixes (ITEMs 12-15) pushed directly to main.

### What is done

All code changes for steps 1-8, 10, and ITEMs 8-15 are complete:
- Steps 1-8, 10: ISSUE-1 through ISSUE-7, OPT-3, OPT-4 — all implemented
- ITEM-8: Tuning parameter logging with clipping
- ITEM-9: Model annotations in agentic-lib.toml
- ITEM-10: Bot scope & engagement prompt
- ITEM-12: Repository guards on all write/dispatch steps in distributable workflows
- ITEM-13: Fine-grained dry-run — jobs exercise read-only steps, only writes gated
- ITEM-14: test.yml concurrency group to deduplicate push+PR triggers
- ITEM-15: Copilot SDK protocol v3 upgrade (0.1.30 → 0.1.31-unstable.0)
- 333 tests pass, lint clean, workflow YAML validation passes

### What is NOT done yet

| Step | Item | Status |
|------|------|--------|
| 9 | ISSUE-2b: max-iterations config knob | Not started — deferred |
| 11 | OPT-2: MCP_SERVER.md docs update | Not started — deferred |
| 12 | ISSUE-3: Multi-model validation testing | Blocked on deploy to repository0 |

### Next Steps

- User testing ITEM-15 (SDK protocol v3) on repository0
- After validation: run multi-model tests (ISSUE-3), update MCP docs (OPT-2)

## Out of Scope

- GitHub Marketplace publishing (separate plan: `_developers/PLAN_MARKETPLACE.md`)
- New mission seeds (separate plan: `PLAN_MISSION_SEEDS.md`)
- Schedule activation on repository0 (manual step post-fix)
- Dynamic model capability querying via SDK (future enhancement)
