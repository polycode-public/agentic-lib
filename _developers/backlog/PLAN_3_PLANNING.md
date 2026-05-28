# PLAN: Implementing the Conceptual Model

Transform the current 8-task cron-driven system into the model described in CONCEPT.md. The plan is a committed file. Each workflow run reads state, refines the plan, executes, witnesses, and merges. No separate orchestrator. No "evolve" language anywhere.

---

## Current System (What We're Transforming From)

### Core Action (`src/actions/agentic-step/`)

| File               | Lines | What it does                                                             |
| ------------------ | ----- | ------------------------------------------------------------------------ |
| `index.js`         | 117   | Entry point. Hardcoded TASKS map of 8 handlers.                          |
| `config-loader.js` | 103   | Reads `agentic-lib.yml`, fixed path categories.                          |
| `copilot.js`       | 105   | Copilot SDK wrapper. Reusable as-is.                                     |
| `tools.js`         | 133   | 4 tools: read_file, write_file, list_files, run_command. Reusable as-is. |
| `safety.js`        | 106   | WIP limits, attempt limits, path checks. Reusable as-is.                 |
| `logging.js`       | 87    | Appends to intentïon.md. Update format only.                             |

### 8 Task Handlers (`src/actions/agentic-step/tasks/`)

| File                   | Lines   | Concept role                    |
| ---------------------- | ------- | ------------------------------- |
| `resolve-issue.js`     | 93      | Builder                         |
| `fix-code.js`          | 70      | Fixer                           |
| `evolve.js`            | 209     | Navigator + Builder (conflated) |
| `maintain-features.js` | 71      | Harvester                       |
| `maintain-library.js`  | 65      | Harvester                       |
| `enhance-issue.js`     | 96      | Critic                          |
| `review-issue.js`      | 112     | Witness                         |
| `discussions.js`       | 137     | Narrator                        |
| **Total**              | **853** |                                 |

### Key Problem

The current system hardcodes 8 task types in JavaScript, runs them on fixed cron schedules, and has no concept of a plan, realization, or stewardship. The `evolve.js` task conflates planning with execution. There's no persistent planning artifact.

---

## Target System

### Core Insight

Each workflow run is a **transformation** — a budget of compute that runs the 7-step engine loop. Within that budget:

1. **Assess** — Read current state (plan + source code + logs + cached context + capabilities + agent definitions)
2. **Plan** — Refine the planning artifact via a Copilot call, commit the update
3. **Solve** — Find proceedable actions via constraint satisfaction (met preconditions, no threats, no resource conflicts)
4. **Assemble** — Match or compose agents from capabilities for each proceedable action
5. **Execute** — Run agents in parallel (within concurrency limit), each producing commits on the branch
6. **Witness** — Assess realization, record the score
7. **Iterate** — If budget remains and realization is below threshold, loop back to Assess. Otherwise merge.

The **plan is a committed file** in the repository. It persists across workflow runs. Each transformation refines it. The plan accumulates knowledge using partial-order structure with YAML front matter, an Actions table, Causal Links, Threats, Assumptions with justifications, and event calculus Observations (see CONCEPT.md for the full model).

### No separate orchestrator

There is no navigator workflow dispatching other workflows. Each workflow run reads the plan, solves for proceedable actions, assembles agents, executes, witnesses, and iterates. The "navigation" is implicit — it's what the engine loop does.

Concurrency is just GitHub running multiple workflow triggers. Each one independently reads state and acts.

### Three pillars of the engine

The engine draws on three interconnected disciplines (see CONCEPT.md, "Knowledge Representation, Constraint Satisfaction, and Planning"):

- **Knowledge representation** — How to map the repository state into a form efficient for reasoning (Open World Assumption, event calculus, truth maintenance)
- **Constraint satisfaction** — How to assemble agents from capabilities, assemble plans from agent transformations, pick a set of agent transformations to run next
- **Planning** — How to model a plan as a partial-order structure and search a decision tree of plan refinements

---

## Phase 1: Context Sources Extraction

**What:** Extract the context-gathering logic duplicated across 8 task handlers into a shared module.

**Why first:** Pure refactoring with zero behavior change. Golden prompt tests verify nothing changes. Creates the foundation for everything else.

### context-sources.js (~200 lines, extracted)

```javascript
export async function getIntention(config) {
  /* read INTENTÏON.md */
}
export async function getOpenIssues(octokit, repo, label, limit) {
  /* list open issues */
}
export async function getClosedIssues(octokit, repo, label, since) {
  /* recent closed */
}
export async function getSourceFiles(config) {
  /* scan product source */
}
export async function getTestFiles(config) {
  /* scan product tests */
}
export async function getFeatures(config) {
  /* scan features/ */
}
export async function getLibrary(config) {
  /* scan library/ */
}
export async function getIssueDetail(octokit, repo, issueNumber) {
  /* issue + comments */
}
export async function getPRDetail(octokit, repo, prNumber) {
  /* PR + check runs */
}
export async function getDiscussion(octokit, repo, discussionNumber) {
  /* GraphQL */
}
export async function getContributing(config) {
  /* read CONTRIBUTING.md */
}
export async function getActivityRecord(config, limit) {
  /* recent intentïon.md */
}
export async function getSources(config) {
  /* read SOURCES.md */
}
export async function getPlan(config) {
  /* read PLAN.md — the committed plan */
}
```

**Migration:** Update each task handler to import from context-sources.js. Run golden prompt tests after each. No behavior change.

**Scope:** Medium. ~200 lines extracted, 8 files updated.

---

## Phase 2: The Planning Artifact

**What:** Introduce the committed plan file with full partial-order structure, YAML front matter, and knowledge representation primitives. Each transformation reads it, refines it, and commits the update.

### PLAN.md (the committed planning artifact)

This file lives in the repo root (alongside INTENTÏON.md and intentïon.md). It's writable by all agents. It uses YAML front matter and partial-order structure:

```markdown
---
cycle: 1
realization: 0.0
budget: { iterations: 5, tokens: 50000 }
---

## Actions

| id                                                                            | action | preconditions | effects | agent | status | resources |
| ----------------------------------------------------------------------------- | ------ | ------------- | ------- | ----- | ------ | --------- |
| (actions with preconditions, effects, assigned agent, status, resource paths) |

## Causal Links

- (action A →(condition)→ action B — A provides a condition B needs)

## Threats

- (action X might undo condition C that a causal link protects — with resolution strategy)

## Assumptions

| assumption                                                                  | justification | strength | dependents |
| --------------------------------------------------------------------------- | ------------- | -------- | ---------- |
| (beliefs held by the system, with why, how strong, and what relies on them) |

## Open Conditions

- [ ] (conditions needed but not yet provided by any action — explicit gaps, open world assumption)

## Observations

- (event calculus entries: what happened, what conditions were initiated/terminated, by whom, when)

## Witness

- Cycle N: score X%, evidence: "...", open conditions: N, threats: N
```

### New modules

#### plan-schema.js (~150 lines, new)

Parses and serializes the enriched PLAN.md format. Round-trip fidelity (parse → serialize → parse is lossless).

```javascript
export function parsePlan(markdown) {
  // Parse YAML front matter (cycle, realization, budget)
  // Parse Actions table into array of { id, action, preconditions, effects, agent, status, resources }
  // Parse Causal Links into array of { from, condition, to }
  // Parse Threats into array of { actions, condition, resolution }
  // Parse Assumptions into array of { assumption, justification, strength, dependents }
  // Parse Open Conditions into array of strings
  // Parse Observations into array of { cycle, event, initiates, terminates }
  // Parse Witness entries
}

export function serializePlan(plan) {
  // Inverse of parsePlan — produce valid PLAN.md markdown
}
```

#### belief-state.js (~100 lines, new)

Manages assumptions, open conditions, and belief revision.

```javascript
export function getBeliefState(plan) {
  // Extract current assumptions, their justifications and strengths
  // Extract open conditions (conditions needed but not provided)
}

export function reviseBeliefs(beliefState, observation) {
  // When an observation contradicts an assumption:
  // 1. Find the weakest-justified contradicted assumption (AGM revision)
  // 2. Retract it
  // 3. Cascade: re-evaluate all dependents
  // 4. Any action whose sole support was the retracted assumption → status: open
}

export function propagateEffects(plan, achievedAction) {
  // When an action is achieved, its effects become available preconditions
  // Check if any blocked actions now have all preconditions met → status: ready
}
```

### How it integrates with the current system

Every task handler gets a new step at the start: read the plan. And a new step at the end: update the plan (what was achieved, what's newly open, what was observed) and assess realization.

```javascript
// At start of any task
const plan = await parsePlan(await readFile(config.planFilepath));
const intention = await getIntention(config);

// At end of any task
plan.observations.push({ cycle: plan.cycle, event: "Resolved issue #42", initiates: ["feature-42-available"] });
plan.actions.find((a) => a.id === "A42").status = "achieved";
propagateEffects(
  plan,
  plan.actions.find((a) => a.id === "A42"),
);
await writeFile(config.planFilepath, serializePlan(plan));
await witness(config, intention, plan);
```

**Scope:** Medium. ~250 lines new modules (plan-schema + belief-state), ~30 lines per handler, PLAN.md template.

---

## Phase 3: Capabilities and Agent Definitions

**What:** Define capabilities as service interaction descriptions and agent definitions as assembled transformations. Replace hardcoded JS task handlers with data-driven definitions that the engine can load, match, and compose.

### Capability file format

Capability files live in `.github/agentic-lib/capabilities/`. Each is a markdown file with YAML front matter:

```markdown
---
name: file-io
tools: [read_file, write_file, list_files]
---

# File I/O Capability

## Tools provided

- `read_file(path)` — Read file contents from the repository
- `write_file(path, content)` — Write file (writable paths only, enforced by safety.js)
- `list_files(path, recursive?)` — List directory contents

## Protocol

- All paths are relative to repository root
- write_file respects writable path restrictions from the agent definition
- Errors are returned as tool results, not thrown
```

### Agent definition file format

Agent definitions live in `.github/agents/`. Each is a markdown file with YAML front matter:

```markdown
---
name: builder
role: builder
capabilities: [file-io, command-execution, github-api]
transform:
  from: "Open condition or issue requiring implementation"
  to: "Working, tested code satisfying the condition"
constraints:
  preconditions: [intention-exists, plan-exists]
  resources: [product.sourcePath, product.testsPath]
  max_calls: 3
---

# Builder

You are a builder. You see open conditions as opportunities to create working code.

## How you act

1. Read the action description and preconditions
2. Read relevant source files and tests
3. Write implementation code
4. Run tests to validate
5. Report what conditions you established
```

### Default capabilities

| File                   | Name              | Tools                                           |
| ---------------------- | ----------------- | ----------------------------------------------- |
| `file-io.md`           | file-io           | read_file, write_file, list_files               |
| `command-execution.md` | command-execution | run_command                                     |
| `github-api.md`        | github-api        | create_issue, create_pr, list_issues, add_label |
| `web-retrieval.md`     | web-retrieval     | fetch_url                                       |

### Default agent definitions

| File           | Agent     | Role      | Transform                         | Capabilities                           |
| -------------- | --------- | --------- | --------------------------------- | -------------------------------------- |
| `builder.md`   | builder   | builder   | Open issue → resolved code        | file-io, command-execution, github-api |
| `fixer.md`     | fixer     | fixer     | Failing tests → passing tests     | file-io, command-execution             |
| `critic.md`    | critic    | critic    | Draft issue → enriched issue      | github-api                             |
| `witness.md`   | witness   | witness   | Current state → realization score | file-io, github-api                    |
| `harvester.md` | harvester | harvester | Stale context → fresh context     | file-io, web-retrieval                 |
| `steward.md`   | steward   | steward   | Drift → alignment                 | file-io, command-execution, github-api |

### New modules

#### capability-loader.js (~70 lines, new)

```javascript
export async function loadCapabilities(capabilitiesPath) {
  // Scan capabilitiesPath for *.md files
  // Parse YAML front matter: name, tools
  // Return Map<name, { name, tools, body }>
}

export function resolveTools(capabilityNames, allCapabilities, toolRegistry) {
  // Given a list of capability names, resolve to actual defineTool() instances
  // Verify no tool conflicts (same tool from two capabilities)
  // Return array of tool definitions for the Copilot SDK session
}
```

#### agent-loader.js (~60 lines, new)

```javascript
export async function loadAgentDefinitions(agentsPath) {
  // Scan agentsPath for *.md files with role: in front matter
  // Parse YAML front matter: name, role, capabilities, transform, constraints
  // Return Map<name, AgentDefinition>
}
```

#### assembler.js (~100 lines, new)

```javascript
export function matchAgent(action, agentDefinitions) {
  // Find an agent definition whose role matches the action's agent field
  // Verify the agent's capabilities cover the action's resource needs
  // Return matched AgentDefinition or null
}

export function composeAgent(action, capabilities) {
  // When no existing agent matches, compose a novel agent:
  // 1. Determine which tools the action needs (from its resources)
  // 2. Find the minimum set of capabilities that provides all needed tools (CSP)
  // 3. Build an ad-hoc agent definition with those capabilities and the action description as the prompt
  // Return composed AgentDefinition
}

export function buildAgentSession(agentDef, action, capabilities, toolRegistry, config) {
  // Resolve capabilities → tools
  // Build system message from agent definition body + action context
  // Return { systemMessage, tools, writablePaths }
}
```

### Migration

1. Create default capability files (4 files)
2. Create default agent definition files (6 files)
3. Create capability-loader, agent-loader, assembler modules
4. Verify with unit tests (load, match, compose)
5. Integration test: given an action and agent definitions, assembler produces a valid session

**Scope:** Large. ~230 lines new JS + 10 definition files. The definition files replace the 8 legacy task handler JS files (853 lines).

---

## Phase 4: The Transformation Engine

**What:** The 7-step engine loop that replaces the current monolithic task handlers. Each workflow run triggers the engine, which iterates through assess → plan → solve → assemble → execute → witness → iterate.

### Engine modules (all under `src/actions/agentic-step/engine/`)

| File                   | Lines (est.) | Purpose                                  |
| ---------------------- | ------------ | ---------------------------------------- |
| `runner.js`            | ~120         | Main loop orchestrator                   |
| `assessor.js`          | ~80          | Read state into a snapshot for reasoning |
| `planner.js`           | ~80          | Refine PLAN.md via Copilot SDK call      |
| `constraint-solver.js` | ~80          | Find proceedable actions (POP + CSP)     |
| `executor.js`          | ~80          | Concurrent batch execution               |
| `witness.js`           | ~60          | Realization assessment                   |

(plan-schema.js, belief-state.js, capability-loader.js, agent-loader.js, assembler.js are defined in Phases 2 and 3)

### runner.js — the orchestrator

```javascript
export async function runEngine(config, octokit) {
  let plan = parsePlan(await readFile(config.planFilepath));
  const capabilities = await loadCapabilities(config.capabilitiesPath);
  const agentDefs = await loadAgentDefinitions(config.agentsPath);
  let iteration = 0;

  while (iteration < plan.budget.iterations) {
    iteration++;

    // 1. ASSESS
    const state = await assess(config, plan);

    // 2. PLAN — refine the plan via Copilot call
    plan = await refinePlan(config, state, plan);
    await writeFile(config.planFilepath, serializePlan(plan));

    // 3. SOLVE — find proceedable actions
    const proceedable = solveProceedable(plan);
    if (proceedable.length === 0) break; // nothing to do

    // 4. ASSEMBLE — match/compose agents for proceedable actions
    const agents = proceedable.map((action) => matchAgent(action, agentDefs) || composeAgent(action, capabilities));
    const sessions = agents.map((agent, i) =>
      buildAgentSession(agent, proceedable[i], capabilities, toolRegistry, config),
    );

    // 5. EXECUTE — run agents in parallel (within concurrency limit)
    const results = await executeBatch(sessions, config.concurrencyLimit);

    // 6. WITNESS — assess realization
    plan = parsePlan(await readFile(config.planFilepath)); // re-read after execution
    const score = await witness(config, plan);
    plan.realization = score;
    plan.cycle = plan.cycle + 1;
    await writeFile(config.planFilepath, serializePlan(plan));

    // 7. ITERATE — check budget and realization
    if (score >= config.stewardshipThreshold) break;
  }

  return plan;
}
```

### assessor.js — state snapshot

```javascript
export async function assess(config, plan) {
  // Read intention, source files, test files, cached context
  // Map current conditions: what's initiated, what's terminated (event calculus)
  // Identify what's changed since last cycle
  // Return StateSnapshot for the planner
}
```

### constraint-solver.js — finding proceedable actions

```javascript
export function solveProceedable(plan) {
  // For each action with status 'open' or 'unordered':
  //   1. Check all preconditions are met (provided by achieved actions or initial state)
  //   2. Check no unresolved threats against its causal links
  //   3. Check resource paths don't conflict with other proceedable actions
  // Return array of proceedable actions, respecting concurrency limit
}
```

An action is **proceedable** when:

- All preconditions are satisfied (conditions initiated by achieved actions)
- No unresolved threats exist against causal links that provide those preconditions
- Its resource paths don't conflict with other actions in the same batch
- The iteration and token budget permits execution

### executor.js — concurrent batch execution

```javascript
export async function executeBatch(sessions, concurrencyLimit) {
  // Run up to concurrencyLimit agents in parallel via Promise.all
  // Each agent gets its own Copilot SDK session with its own tools and system message
  // After each agent completes, its effects propagate through the plan
  // Errors are isolated — one agent failing doesn't stop others
  // Return array of results
}
```

### witness.js — realization assessment

```javascript
export async function witness(config, plan) {
  // Objective gates: do tests pass? Are there open issues?
  // Subjective: Copilot SDK call to score realization against the intention
  // Record score, evidence, and observations in the plan
  // Return realization score (0.0 to 1.0)
}
```

### What constrains the engine

- **Iteration budget**: maximum engine cycles per workflow run (configurable, default 5)
- **Token budget**: maximum Copilot SDK tokens per workflow run (configurable, tracks cost)
- **Concurrency limit**: maximum parallel agents per batch (configurable, default 2)
- **Time**: GitHub Actions 6-hour timeout per job
- **Reliability**: if an agent fails, land what you have — the plan records the observation

**Scope:** Large. ~500 lines new across 6 modules. This is the core of the system.

---

## Phase 5: Cross-Agent Modification and Safety

**What:** Agents can modify each other's definitions and create new capabilities. The social protocol is enforced in safety.js.

The social protocol:

```javascript
export function canModifyAgentDefinition(currentAgent, targetFile) {
  const targetName = path.basename(targetFile, ".md");
  return targetName !== currentAgent; // can't modify self
}
```

This enables:

- The critic can add constraints to the builder's agent definition
- Any agent can create a new capability file (expanding the system's repertoire)
- Any agent can create a new agent definition (the system grows its own workforce)
- The harvester can refine what cached context other agents read

INTENTÏON.md remains read-only (hardcoded). The plan and logs are writable by all. Capability and agent definition files are writable by all (subject to the self-modification restriction).

**Scope:** Small. Safety check (~20 lines), make capabilities/ and agents/ writable in config.

_Note: Phase 5 from the previous plan (capability files as a separate concept) is absorbed into Phase 3 above._

---

## Phase 6: Workflow Integration

**What:** Simplify workflows to use the engine. Feature branches carry goals. Matrix strategy enables parallel branch execution.

### New workflows

```
transform-navigate.yml    — Cron daily. Creates a feature branch with a goal.
                            Calls agentic-step with task=navigate.
                            The engine runs the 7-step loop on the branch.
                            Merges when budget spent or goal met.
transform-repair.yml      — Event: check_suite failure. Creates a fix branch.
                            Calls agentic-step with task=navigate (fixer role).
transform-narrate.yml     — Event: discussion activity. Narrator role.
ci-automerge.yml          — UNCHANGED
ci-test.yml               — UNCHANGED
```

### Feature branches with goals

Each workflow run creates a feature branch with a target state. The engine runs on the branch, producing commits. When the engine finishes (budget spent or goal met), the branch is merged back via PR.

```yaml
# In transform-navigate.yml
jobs:
  navigate:
    strategy:
      matrix:
        branch: [feature-a, feature-b] # parallel branches, each with its own goal
      max-parallel: 2
    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ matrix.branch }}
      - uses: ./.github/agentic-lib/actions/agentic-step
        with:
          task: navigate
          iteration-budget: 5
          token-budget: 50000
          concurrency-limit: 2
```

### What stays identical

- `copilot.js` — No changes.
- `tools.js` — No changes.
- `safety.js` — Extended with agent self-modification check.
- All CI/CD workflows — unchanged.
- All publish workflows — unchanged.

### The `navigate` task handler

The engine is surfaced as a new `navigate` task in the existing TASKS map:

```javascript
// tasks/navigate.js (~40 lines)
export async function navigate(config, octokit) {
  const { runEngine } = await import("../engine/runner.js");
  return runEngine(config, octokit);
}
```

All 8 existing task handlers remain functional during migration. The engine is additive — it doesn't replace the existing handlers until it's proven.

---

## Integration with FEATURES.md and FEATURES_ROADMAP.md

Both documents must be rewritten as part of the narrative alignment (see PLAN_NARRATIVE.md):

- **FEATURES.md**: new title, new vocabulary, all 29 features renamed, architecture section reframed
- **FEATURES_ROADMAP.md**: same vocabulary treatment, all 12 post-MVP features renamed
- The planning artifact (PLAN.md) becomes part of the template system (Feature #14)
- The witness scoring becomes part of witness workflows (Feature #12)
- The MVP demo (#28) uses the devkit scenario
- The devkit CLI includes `--add "description"` which creates a GitHub issue from the command line, enabling users to request features that the workflows deliver via `npm update`

---

## Migration Sequence

| Step | What                                                                                    | Validates                                                      |
| ---- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1    | Extract context-sources.js from 8 task handlers                                         | Golden prompt tests                                            |
| 2    | Introduce PLAN.md template + plan-schema.js + belief-state.js                           | Unit tests on plan parse/serialize round-trip, belief revision |
| 3    | Add plan read/update/witness to each task handler                                       | Plan updates correctly                                         |
| 4    | Create default capability files (4 files)                                               | Capability loader tests                                        |
| 5    | Create default agent definition files (6 files)                                         | Agent loader tests                                             |
| 6    | Create capability-loader, agent-loader, assembler                                       | Unit tests (load, match, compose)                              |
| 7    | Create engine modules (runner, assessor, planner, constraint-solver, executor, witness) | Integration tests                                              |
| 8    | Create navigate task handler wiring engine to TASKS map                                 | End-to-end test                                                |
| 9    | Rename files (MISSION→INTENTÏON, agents directory, agent-flow workflows)                | All tests pass                                                 |
| 10   | Update config schema (new key names: capabilitiesPath, planFilepath, etc.)              | Config-loader tests                                            |
| 11   | Rewrite FEATURES.md with new vocabulary                                                 | Human review                                                   |
| 12   | Rewrite FEATURES_ROADMAP.md with new vocabulary                                         | Human review                                                   |
| 13   | Enable cross-agent modification in safety.js                                            | Safety tests                                                   |
| 14   | Simplify to 3 workflows with engine-driven navigation                                   | Manual test                                                    |
| 15   | Delete legacy task handler files when engine is proven                                  | Tests pass without them                                        |

---

## Estimated Totals

| Category                                                                                                                                                                             | Lines       | Files |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ----- |
| New code (context-sources, plan-schema, belief-state, capability-loader, agent-loader, assembler, runner, assessor, planner, constraint-solver, executor, witness, navigate handler) | ~1,250      | 13    |
| New definitions (capabilities + agent definitions)                                                                                                                                   | ~400        | 10    |
| Plan template (PLAN.md)                                                                                                                                                              | ~40         | 1     |
| Deleted code (legacy task handlers, eventually)                                                                                                                                      | -853        | 8     |
| Config changes                                                                                                                                                                       | ~60         | 2     |
| Test updates                                                                                                                                                                         | ~300        | 15+   |
| **Net change**                                                                                                                                                                       | **~+1,197** |       |

---

## Risk Register

| Risk                                                                   | Severity | Mitigation                                                                            |
| ---------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| Plan file parsing fragile                                              | Medium   | plan-schema.js with round-trip fidelity tests, fallback to fresh plan                 |
| Constraint solver produces incorrect proceedable set                   | High     | Comprehensive unit tests: unmet preconditions, unresolved threats, resource conflicts |
| Engine consumes too many tokens per run                                | Medium   | Configurable iteration and token budgets, cost tracking in plan front matter          |
| Agent assembly (CSP) finds no valid composition                        | Medium   | Fallback to default builder agent, log the gap as an observation                      |
| Belief revision cascades too aggressively                              | Medium   | Strength thresholds, require minimum justification quality before auto-retraction     |
| Cross-agent modification creates conflicts                             | Medium   | Social protocol (not self), plan tracks threats, PR review                            |
| Legacy handlers and engine produce different behavior during migration | High     | Run both in parallel during transition, compare results                               |
| Plan grows unbounded                                                   | Low      | Archive achieved items to intentïon.md periodically                                   |
| Concurrent execution creates merge conflicts on branch                 | Medium   | Resource path tracking in constraint solver prevents same-file concurrent edits       |
| Rename coordination across 3 repos                                     | Medium   | Script the renames, one session, branches not main                                    |
