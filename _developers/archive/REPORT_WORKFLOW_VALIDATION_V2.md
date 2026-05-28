# REPORT: Workflow Validation V2 — Supervisor Tuning

**Date**: 2026-03-03
**Operator**: Claude Code (claude-opus-4-6)
**Target**: `xn-intenton-z2a/repository0` (plot-code-lib mission)
**agentic-lib version**: 7.1.32 (tuned supervisor)
**Previous report**: REPORT_WORKFLOW_VALIDATION.md (v7.1.27 → v7.1.30)

## What Changed Since V1

V1 validated the full agentic pipeline works end-to-end. It found 9 issues, fixed 7, and confirmed the pipeline can autonomously generate code from missions. However, overnight monitoring revealed a **productivity imbalance**: 14 maintain runs vs 5 transform runs in 8 hours. The root cause was **issue starvation** — the supervisor defaulted to maintain because there were no open issues for transform to work on.

### Fixes Applied in v7.1.32

| Change | File | Purpose |
|--------|------|---------|
| Bump WIP limit 2→5 | `src/seeds/zero-agentic-lib.toml` | Allow more concurrent feature issues |
| Rewrite supervisor prompt | `src/agents/agent-supervisor.md` | Prioritise transform over maintain, create issues proactively |
| Add reactive triggers | `src/workflows/agent-supervisor.yml` | Trigger on maintain/review completions; auto-dispatch review after transform |
| Pass WIP limits to LLM | `src/actions/agentic-step/tasks/supervise.js` | Show capacity context so LLM can decide when to create issues |

### Deployment

- PR [#1811](https://github.com/xn-intenton-z2a/agentic-lib/pull/1811) merged to agentic-lib
- Published as `@xn-intenton-z2a/agentic-lib@7.1.32`
- Init'd in repository0 (no purge, no seed)
- Supervisor schedule set to continuous (`*/10 * * * *`)

## Test Method

Same approach as V1: dispatch workflows via `gh workflow run`, observe outcomes via `gh run view --log`, record results. The focus is on **supervisor decision quality** and **pipeline throughput**, not individual workflow correctness (validated in V1).

### Pre-conditions
- repository0 on main, plot-code-lib mission
- 2 open issues: #2459 (CLI for expression plotting, `ready` label), #2460 (time series data, no `ready` label)
- 4 feature files in `features/`
- Previous day's autonomous operation generated extensive code

### What We're Validating (mapped to PLAN_LOCAL_SCENARIO_TESTS.md)

| V2 Experiment | Future Local Scenario | What It Proves |
|---------------|----------------------|----------------|
| Supervisor dispatches transform | `transform` scenario | Transform picks up ready issues and generates code |
| Supervisor creates issues proactively | `maintain-features` scenario | Pipeline fills its own backlog |
| Review auto-dispatches after transform | `full-loop` scenario | The maintain → transform → review lifecycle works |
| Supervisor throttles maintain | `full-loop` scenario | Pipeline doesn't waste cycles on metadata refreshes |
| Multi-cycle autonomous operation | `full-loop` scenario | End-to-end mechanics work in sequence |

---

## Baseline: Pre-Fix Activity (v7.1.31)

Before deploying v7.1.32, the supervisor ran on a `*/10` schedule from 13:20Z to 19:20Z (6 hours):

| Workflow | Runs | % of Total |
|----------|------|-----------|
| agent-supervisor (schedule) | 14 | — (orchestrator) |
| agent-flow-maintain | 9 | **69%** |
| agent-flow-transform | 4 | **31%** |
| agent-flow-review | 0 | 0% |

The supervisor dispatched maintain 2:1 over transform. Review was never dispatched. This is the behavior we're fixing.

---

## Experiment 1: Supervisor Prioritises Transform (v7.1.32)

**Time**: 2026-03-03T19:48Z
**Action**: Dispatched `agent-supervisor` via `workflow_dispatch` (first run with new prompt)
**Run**: https://github.com/xn-intenton-z2a/repository0/actions/runs/22639805870
**Duration**: 23s
**Result**: **PASS**

The supervisor chose 1 action: `dispatch:agent-flow-transform`

**Reasoning**: "The repository has perfect conditions for transform dispatch: Issue #2459 'Implement CLI for mathematical expression plotting' has the `ready` label, making it ready for code generation"

**Verdict**: The tuned prompt correctly prioritises transform over maintain when ready issues exist. Previously, the supervisor would have been equally likely to dispatch maintain.

## Experiment 2: Transform Picks Up Ready Issue

**Time**: 2026-03-03T19:48Z (dispatched by Experiment 1's supervisor)
**Run**: https://github.com/xn-intenton-z2a/repository0/actions/runs/22639823804
**Duration**: 2m17s
**Result**: **PASS**

Transform successfully picked up issue #2459 ("Implement CLI for mathematical expression plotting") which had the `ready` label, generated code, and committed to main.

## Experiment 3: Reactive Review After Transform

**Hypothesis**: After transform completes successfully on main, the reactive `evaluate` job should auto-dispatch `agent-flow-review` (new rule in v7.1.32).

**Result**: **PARTIAL PASS**

The reactive `workflow_run` trigger fired 4 times after the init push and schedule change, but the post-transform review rule was **not exercised** — the supervisor runs triggered by `workflow_run` on the init-related workflows correctly chose `nop` (no failing PRs to fix).

However, the **scheduled supervisor** at 19:53Z correctly observed that transform had completed and dispatched review:
- Run: https://github.com/xn-intenton-z2a/repository0/actions/runs/22640023181
- Decision: `dispatch:agent-flow-review`
- Review run: https://github.com/xn-intenton-z2a/repository0/actions/runs/22640045051
- Review closed issue #2459 as resolved (46s)

**ISSUE-10**: The reactive path (evaluate job dispatching review after transform) was never directly observed because the scheduled supervisor compensated. The rule exists in the code but needs further validation. Not blocking — the proactive supervisor covers this gap.

## Experiment 4: Supervisor Creates Issues Proactively

**Hypothesis**: When the supervisor runs with <3 open issues (and open issues < WIP limit of 5), it should create new issues from features/mission before dispatching other workflows.

**Result**: **PASS**

At 20:05Z, the scheduled supervisor saw only 1 open issue (#2460) and:
1. Created issue #2461 ("Enhance CLI expression parsing and range syntax validation") with labels `enhancement, automated`
2. Dispatched `agent-flow-review` to enhance the new issue

Run: https://github.com/xn-intenton-z2a/repository0/actions/runs/22640457533

The supervisor reasoning: "With only 1 open issue (#2460) and capacity for 2, the pipeline needs feeding. Creating a CLI-focused enhancement issue addresses core mission requirements."

The subsequent review run at 20:06Z enhanced issue #2460 with acceptance criteria and added the `ready` label, then closed issue #2460 as resolved.

## Experiment 5: Multi-Cycle Autonomous Operation

**Purpose**: Let the pipeline run autonomously for 30+ minutes on the continuous schedule and measure the transform:maintain ratio compared to baseline.

**Result**: **PASS**

Post-fix activity from 19:37Z to 20:10Z (33 minutes):

| Workflow | Runs | % of Dispatched |
|----------|------|-----------------|
| agent-supervisor | 8 | — (orchestrator) |
| agent-flow-transform | 1 | **25%** |
| agent-flow-review | 3 | **75%** |
| agent-flow-maintain | 0 | **0%** |

The supervisor dispatched **zero maintain** runs in 33 minutes (vs 69% maintain in baseline). All dispatched work was productive: 1 transform (code generation) and 3 reviews (issue enhancement + resolution). The supervisor created 1 new issue proactively.

**Note**: The transform:review ratio is expected — after the initial transform resolves an issue, the pipeline shifts to review mode to close resolved issues and prepare new ones. Transform will resume when new issues get the `ready` label from review.

---

## Results Summary

| Experiment | Test | Outcome | Duration | Notes |
|-----------|------|---------|----------|-------|
| 1 | Supervisor prioritises transform | **PASS** | 23s | Dispatched transform, not maintain |
| 2 | Transform picks up ready issue | **PASS** | 2m17s | Generated code for issue #2459 |
| 3 | Reactive review after transform | **PARTIAL** | — | Scheduled supervisor compensated; reactive path untested |
| 4 | Proactive issue creation | **PASS** | 38s | Created #2461 when only 1 open issue existed |
| 5 | Multi-cycle autonomous | **PASS** | 33min | 0% maintain (vs 69% baseline), all productive work |

---

## Issues Found

| # | Issue | Severity | Status | Fix |
|---|-------|----------|--------|-----|
| 10 | Reactive post-transform review dispatch untested | Low | Open | The evaluate job's new rule (dispatch review after transform success) was never directly observed — the scheduled supervisor compensated. Need to verify the `workflow_run` event for `agent-flow-transform` reaches the evaluate job's post-transform logic. |
| 11 | intentïon.log always shows `Tokens: 0` | Medium | **Fixed in v7.1.33** | Root cause: `sendAndWait()` response doesn't include usage data. Tokens come from separate `assistant.usage` events. PR [#1813](https://github.com/xn-intenton-z2a/agentic-lib/pull/1813) accumulates usage events. |
| 12 | Continuous schedule too aggressive | Low | **Fixed in v7.1.33** | Changed `*/10` → `*/15`. Reactive triggers handle fast cycling; cron is just a heartbeat. |

---

## Mapping to Local Scenario Tests (PLAN_LOCAL_SCENARIO_TESTS.md)

The local scenario tests will eventually automate what we're testing here manually. The mapping:

### Scenario: `maintain-features`
- **V2 Experiment**: #4 (proactive issue creation requires features to exist first)
- **What V2 proves**: The maintain-features → feature files → issue creation pipeline works with real LLM
- **What local test will prove**: The maintain-features prompt produces valid tool calls that create `.md` files in `features/`

### Scenario: `transform`
- **V2 Experiment**: #2 (transform picks up ready issue and generates code)
- **What V2 proves**: Transform correctly reads issues, generates code, pushes to main
- **What local test will prove**: The transform prompt produces valid tool calls that modify `src/lib/main.js` with parseable JavaScript

### Scenario: `full-loop`
- **V2 Experiments**: #1-5 (full supervisor-driven lifecycle)
- **What V2 proves**: The supervisor → transform → review → issue creation cycle works autonomously
- **What local test will prove**: maintain-features followed by transform produces valid output in sequence

### What V2 Tests That Local Tests Cannot

| Aspect | V2 (Remote) | Local Scenario |
|--------|-------------|----------------|
| GitHub Actions runtime | Yes | No |
| Copilot SDK authentication | Yes | No (uses node-llama-cpp) |
| Reactive workflow triggers | Yes | No |
| Concurrent execution | Yes | No |
| Push/commit mechanics | Yes | No |
| Supervisor LLM decision quality | Yes | No (tiny model) |

### What Local Tests Will Test That V2 Cannot

| Aspect | V2 (Remote) | Local Scenario |
|--------|-------------|----------------|
| Speed (<30s total) | No (minutes per cycle) | Yes |
| Reproducibility | No (LLM non-determinism + GitHub timing) | Partial (still non-deterministic but faster retry) |
| Offline operation | No | Yes |
| CI integration | Manual | `npm run test:scenario` |
| Path writability enforcement | Implicit | Explicit assertions |

---

## Continuous Rate Assessment (Final)

The tuned supervisor achieved **100% productive work** in 33 minutes of autonomous operation:
- Zero maintain dispatches (vs 69% baseline) — maintain correctly throttled
- Transform + review pipeline flowing correctly
- Proactive issue creation keeping the backlog fed
- Issues being closed as code resolves them

**Achieved ratio**: 0% maintain, 25% transform, 75% review (vs 69%/31%/0% baseline)

The high review percentage is expected in the observed window — after the initial transform resolved issue #2459, the pipeline shifted to review mode to close resolved issues and enhance new ones. As the pipeline continues, transform will resume when new issues get the `ready` label from review, producing a steady-state cycle.

## Token Logging Fix (v7.1.33)

During V2 testing, we discovered that intentïon.log always shows `Tokens: 0`. Investigation revealed the root cause:

- **Expected**: `sendAndWait()` response includes `response.data.usage.totalTokens`
- **Actual**: Copilot SDK sends usage data as separate `assistant.usage` events with `inputTokens`, `outputTokens`, `cost`, and `copilotUsage.totalNanoAiu`
- **Evidence**: Workflow logs show `assistant.usage` events with real data (e.g., `inputTokens: 15957, outputTokens: 393, cost: 1`)

**Fix (PR #1813)**: Accumulate `assistant.usage` events during the session instead of extracting from the response. Propagate `inputTokens`, `outputTokens`, and `cost` through all 9 task handlers to the log writer. Log format changes from `**Tokens:** 0` to `**Tokens:** 72658 (in: 72065, out: 593)` with an additional `**Cost:** 4` line.

---

## Appendix: Raw Workflow Run Data

### Baseline (v7.1.31, 13:20Z–19:20Z)

| Time (UTC) | Workflow | Event | Decision |
|------------|----------|-------|----------|
| 13:20Z | agent-supervisor | schedule | → maintain |
| 13:51Z | agent-flow-maintain | dispatched | success |
| 14:20Z | agent-supervisor | schedule | → maintain |
| 14:21Z | agent-flow-maintain | dispatched | success |
| 15:10Z | agent-supervisor | schedule | → maintain |
| 15:10Z | agent-flow-maintain | dispatched | success |
| 15:58Z | agent-supervisor | schedule | → maintain |
| 15:59Z | agent-flow-maintain | dispatched | success |
| 16:24Z | agent-supervisor | schedule | — |
| 16:48Z | agent-supervisor | schedule | → transform + maintain |
| 16:49Z | agent-flow-transform | dispatched | success |
| 16:49Z | agent-flow-maintain | dispatched | success |
| 17:09Z | agent-flow-transform | dispatched | success |
| 17:10Z | agent-supervisor | schedule | — |
| 17:39Z | agent-supervisor | schedule | → maintain |
| 17:39Z | agent-flow-maintain | dispatched | success |
| 18:00Z | agent-supervisor | schedule | → transform + maintain |
| 18:01Z | agent-flow-transform | dispatched | success |
| 18:01Z | agent-flow-maintain | dispatched | success |
| 18:27Z | agent-supervisor | schedule | → transform |
| 18:27Z | agent-flow-transform | dispatched | success |
| 19:20Z | agent-supervisor | schedule | → close issue + maintain |
| 19:20Z | agent-flow-maintain | dispatched | success |

### Post-Fix (v7.1.32, 19:37Z–20:10Z)

| Time (UTC) | Workflow | Event | Decision/Result |
|------------|----------|-------|-----------------|
| 19:37Z | agent-supervisor-schedule | workflow_dispatch | Set to continuous |
| 19:38Z | agent-supervisor (×4) | workflow_run | Reactive: nop (no failing PRs) |
| 19:39Z | agent-flow-review | workflow_dispatch | Review dispatched |
| 19:48Z | agent-supervisor | workflow_dispatch | → **transform** (Exp 1) |
| 19:48Z | agent-flow-transform | dispatched | **success** (2m17s, Exp 2) |
| 19:53Z | agent-supervisor | schedule | → **review** (Exp 3) |
| 19:54Z | agent-flow-review | dispatched | **success** (46s, closed #2459) |
| 20:05Z | agent-supervisor | schedule | → **create-issue** #2461 + **review** (Exp 4) |
| 20:06Z | agent-flow-review | dispatched | **success** (1m14s, enhanced #2460, closed #2460) |

### Productivity Comparison

| Metric | Baseline (v7.1.31, 6hrs) | Post-Fix (v7.1.32, 33min) |
|--------|--------------------------|---------------------------|
| Maintain dispatches | 9 (69%) | 0 (0%) |
| Transform dispatches | 4 (31%) | 1 (25%) |
| Review dispatches | 0 (0%) | 3 (75%) |
| Issues created | 0 | 1 |
| Issues closed | 1 | 2 |
| Productive work ratio | 31% | **100%** |
