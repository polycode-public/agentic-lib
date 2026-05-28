# intentïon — The Conceptual Model

## The Fixed Point

**intentïon** is the only fixed point. It's what you want to exist. You express it, and the system navigates toward making it real. The word, the brand, the domain, the diaeresis — it's all one thing.

---

## GitHub

GitHub is where it all happens. Not a metaphor — just GitHub. Repositories, issues, PRs, discussions, actions, Copilot. intentïon uses what's there. Users bring their own GitHub account, their own Copilot subscription. intentïon teaches it what to build.

The system works with GitHub's grain: branches for parallel work, PRs for quality gates (tests pass or fail), merges for landing changes, Actions for compute. These aren't metaphors for something else — they're the actual mechanisms.

---

## The Repository (Manufacturing)

Inside each repository, four kinds of thing are made. This borrows from manufacturing because a repository is a factory — it takes in an intentïon and produces the thing you wanted:

| Kind          | What it is                                                                          | Manufacturing analog                             | Examples                                                |
| ------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| **Product**   | Code that when run IS the thing you want                                            | Finished goods                                   | `src/`, runtime code, the deployable artifact           |
| **Machinery** | Code, prompts, and config that build, run, deploy, and manage                       | The factory floor — jigs, tools, conveyors       | Workflows, actions, perspectives, config                |
| **Record**    | Digests of what happened and what's true                                            | Quality reports, batch records, audit trail      | Docs, test reports, `intentïon.md`, README              |
| **Materials** | Gathered or generated stuff that enables transformations — a cache, not the product | Raw materials, stock, work-in-progress inventory | Crawled library docs, cached context, intermediate data |

**The loop: machinery transforms materials into product, and leaves a record.**

- **Product** is what ships. It's what the intentïon asked for.
- **Machinery** is the factory. You don't ship it, but without it nothing gets made. It comes with the template.
- **Record** is quality control. Evidence that the product is what was intended. Traceability.
- **Materials** are consumed by transformations. They're concrete and countable (files on disk) but disposable — you can regenerate them. They exist to make transformations cheaper and more reliable than going to source every time.

---

## Perspectives (How Agents See)

Agents are the actors in the system. Each has a **perspective** — not a fixed job, but a way of seeing. The same code looks different to a builder than to a critic.

**Three kinds of agent exist today:**

| Agent                             | Perspective   | Role                                                                                                                                                                                                        |
| --------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The intender (human)**          | The intender  | Expresses the intentïon. Judges realization. The only one who can say "that's what I meant" or "that's not it."                                                                                             |
| **The architect (Claude Code)**   | The architect | Works with the intender directly — exploring, planning, designing, refactoring across repos. Sees the whole workspace.                                                                                      |
| **The makers (machinery agents)** | The makers    | Copilot SDK agents run by workflows. Narrow perspectives — one sees an issue and writes code, another sees failing tests and repairs, another sees a discussion and responds. One transformation at a time. |

Perspectives are not hardcoded task types. Each perspective is defined by how it sees, not what it does. Perspectives include: **builder** (make the thing), **critic** (challenge the thing), **witness** (assess realization), **steward** (maintain after realization), **harvester** (gather materials), **narrator** (maintain the record).

Perspectives are documented as text files in the repository. Any agent can read them, and any agent can modify another's perspective file (but not its own). This creates a social protocol: perspectives refine each other.

---

## Capabilities (How Agents Interact with Services)

A **capability** is a text file that describes how to interact with a service. Capabilities are the building blocks that agents are assembled from.

Capability files live in `.github/agentic-lib/capabilities/`. Each describes one kind of interaction:

| Capability            | What it provides                                                            |
| --------------------- | --------------------------------------------------------------------------- |
| **file-io**           | Read, write, list, and delete files in the repository                       |
| **command-execution** | Run shell commands (build, test, lint)                                      |
| **github-api**        | Create issues, open PRs, read discussions, manage labels                    |
| **web-retrieval**     | Fetch external content (library docs, API references)                       |
| **graph-storage**     | Store and query relationships between entities (causal links, dependencies) |

Each capability file has YAML front matter (name, tools provided) and a markdown body describing the protocol — what the service expects, what it returns, what can go wrong.

Capabilities are not agents. They don't have perspectives. They're inert descriptions of what's possible. An agent references which capabilities it needs. A novel agent can be composed on-the-fly from the available capabilities.

Branches can create new capabilities that persist after merge. A builder working on a feature that needs database access could create a `database-query` capability file — and from that point on, any agent can use it.

---

## Agents (Assembled Transformations)

An **agent** is a transformation with a perspective. Agent definitions live in `.github/agentic-lib/agents/` as text files. Each defines:

- A **transformation**: from state → to state (what the agent changes)
- Required **capabilities**: which capabilities the agent needs to operate
- **Constraints**: what must be true before the agent can run, and what must not be violated

The default agents correspond to the perspectives:

| Agent         | Perspective    | Transform                         | Key capabilities                       |
| ------------- | -------------- | --------------------------------- | -------------------------------------- |
| **builder**   | The maker      | Open issue → resolved code        | file-io, command-execution, github-api |
| **fixer**     | The repairer   | Failing tests → passing tests     | file-io, command-execution             |
| **critic**    | The challenger | Draft issue → enriched issue      | github-api                             |
| **witness**   | The assessor   | Current state → realization score | file-io, github-api                    |
| **harvester** | The gatherer   | Stale materials → fresh materials | file-io, web-retrieval                 |
| **steward**   | The maintainer | Drift → alignment                 | file-io, command-execution, github-api |

Novel agents can be assembled on-the-fly. When the plan calls for a transformation that no existing agent matches, the system composes one from available capabilities and an action description. This is constraint satisfaction: find a combination of capabilities that satisfies the action's preconditions and can produce its effects.

Agents are enriched by each branch — a branch might create a new agent definition that persists after merge, expanding the system's repertoire.

---

## Planning (Partial-Order Plans as Committed Artifacts)

The plan is not ephemeral output from an LLM. It is a **committed file in the repository**. It persists across workflow runs. Each transformation reads it, refines it, and commits the update. The plan accumulates knowledge.

This draws on classical AI planning theory — particularly partial-order planning (Tate's NONLIN, 1977; Penberthy & Weld's UCPOP, 1992) and the integration of planning with execution under uncertainty (Steel & Ho, "Planning and Execution using Partial Decision Trees", Essex, 1993). The key principles:

- **Least commitment** — don't order steps until you have to. Leave the plan flexible. If two features are independent, the plan doesn't impose an ordering.
- **Open conditions** — the plan explicitly represents what it doesn't know yet. "We need a CLI argument parser but haven't decided how" is a valid plan entry.
- **Causal links** — each step in the plan tracks why it's there — what it achieves toward the intentïon.
- **Threats** — a step might undo something another step achieved. The plan tracks this so perspectives can avoid conflicts.
- **Plan refinement, not replanning** — each cycle refines the existing plan rather than creating a new one from scratch. The plan grows smarter over time.
- **Planning vs execution trade-off** — following Steel & Ho, the system can reason about whether further planning or immediate execution is more valuable, given the cost of each and the uncertainty of outcomes.

### Knowledge representation in the plan

The plan operates under the **Open World Assumption**: what is not stated is unknown, not false. Open conditions are explicit gaps — the plan makes what it doesn't know visible rather than hiding it. This is critical: the system works with incomplete fragments and never assumes completeness.

Each assumption in the plan carries a **justification** and a **strength**. When evidence contradicts an assumption, the weakest-justified assumption is retracted first (following AGM belief revision). Dependents of a retracted assumption are re-evaluated — this is truth maintenance.

Observations use **event calculus** semantics: each agent execution is an event that initiates or terminates conditions. "Builder resolved issue #5" initiates `json-yaml-available` and terminates `json-yaml-open`. This makes the plan's causal structure machine-readable.

### What the plan looks like

The plan is a committed markdown file with YAML front matter and partial-order structure:

```markdown
---
cycle: 7
realization: 0.45
budget: { iterations: 5, tokens: 50000 }
---

## Actions

| id  | action               | preconditions           | effects                 | agent   | status      | resources                  |
| --- | -------------------- | ----------------------- | ----------------------- | ------- | ----------- | -------------------------- |
| A1  | UUID generation      | —                       | uuid-available          | builder | achieved    | file-io, command-execution |
| A2  | Base64 encode/decode | —                       | base64-available        | builder | achieved    | file-io, command-execution |
| A3  | JSON↔YAML conversion | —                       | json-yaml-available     | builder | in-progress | file-io, command-execution |
| A4  | CLI argument parsing | —                       | cli-framework-available | builder | open        | file-io, command-execution |
| A5  | --help generation    | cli-framework-available | help-available          | builder | blocked     | file-io                    |
| A6  | SHA256 hashing       | —                       | sha256-available        | builder | unordered   | file-io, command-execution |

## Causal Links

- A1 →(uuid-available)→ (product)
- A2 →(base64-available)→ (product)
- A4 →(cli-framework-available)→ A5

## Threats

- A6 and A3 both modify CLI entry point — ordering constraint needed or merge resolution

## Assumptions

| assumption                | justification                                 | strength | dependents |
| ------------------------- | --------------------------------------------- | -------- | ---------- |
| CLI will use commander.js | Harvester found it in 80% of similar projects | 0.7      | A4, A5     |
| Tests can run in < 30s    | Current suite is 12s                          | 0.9      | all        |

## Open Conditions

- [ ] CLI argument parsing framework (needed by A5, not yet planned)

## Observations

- Cycle 5: Builder tried streaming CSV but tests flaky. Deferred. (event: terminates csv-streaming-attempted)
- Cycle 6: Critic noted missing error handling in base64. Issue created. (event: initiates base64-error-handling-needed)
```

This is a living document. Every cycle, a perspective reads it, refines it (adds what was achieved, identifies new open conditions, resolves threats, records observations), and then executes the actionable items. The YAML front matter tracks the current cycle, realization score, and remaining budget.

---

## The Lifecycle (The Transformation Engine)

A **transformation** is a single reliable state change. One GitHub Actions workflow run. But a workflow run is not a single Copilot call — it's a **budget of compute** that runs a 7-step engine loop.

### The 7-step engine loop

Within one workflow run:

1. **Assess** — Read the current state: the plan, the product, the record, the materials. Map the state into a representation efficient for reasoning. What conditions hold? What has changed since last cycle?

2. **Plan** — Refine the planning artifact via a Copilot call. Add new actions, resolve threats, retract contradicted assumptions, record observations. The plan grows smarter. This is decision tree search: which refinements move us closest to realization?

3. **Solve** — Determine which actions are proceedable. An action is proceedable when: all its preconditions are met, no unresolved threats exist against its causal links, no resource conflicts with other proceedable actions, and the iteration/token budget permits it. This is constraint satisfaction — partial-order planning meets CSP.

4. **Assemble** — For each proceedable action, find or compose an agent. Match existing agent definitions first. If no match, compose a novel agent from available capabilities that satisfies the action's requirements. This is also constraint satisfaction: find a combination of capabilities whose provided tools cover the action's needs.

5. **Execute** — Run the assembled agents. Within the concurrency limit of the workflow run, multiple agents can execute in parallel on independent actions. Each produces commits on the branch. After each execution, state has changed — initiated and terminated conditions propagate through the plan.

6. **Witness** — Assess realization. The witness reads the updated state and scores progress toward the intentïon. Record the score, the evidence, and any new observations. This is the feedback signal.

7. **Iterate** — If budget remains and the witness score is below the stewardship threshold, loop back to Assess. The plan has been updated by execution, so the next iteration sees new state. If budget is spent or realization is high, land the branch.

### Concurrent execution

Within one workflow run, multiple agents can execute in parallel. The constraint solver ensures that concurrent actions don't conflict — they operate on independent resources and don't threaten each other's causal links. The concurrency limit is configurable (default: the number of independent proceedable actions, capped by the workflow's parallelism budget).

### Two scales of iteration

- **Inner loop**: within one workflow run, the 7-step engine cycles until budget is spent or the goal is met. Each cycle refines the plan, executes proceedable actions, and witnesses progress.
- **Outer loop**: branch from main, run the engine, merge back. Next cron trigger starts a new workflow run from the new state.

```
    ┌─────────────────────────────────┐
    │                                 │
    │   intentïon expressed           │
    │   (INTENTION.md — committed)    │
    │                                 │
    └──────────────┬──────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────┐
    │   ENGINE (one workflow run)     │
    │                                 │
    │   ┌─► 1. Assess state          │
    │   │   2. Plan (refine plan)     │
    │   │   3. Solve (find actions)   │
    │   │   4. Assemble agents        │
    │   │   5. Execute (parallel)     │
    │   │   6. Witness (score)        │
    │   └── 7. Iterate ──► budget?   │
    │                                 │
    │   Budget spent or realized:     │
    │   merge branch                  │
    │                                 │
    └──────────────┬──────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────┐
    │   STATE CHANGED                 │
    │                                 │
    │   Plan updated. Product grown.  │
    │   Record kept. Realization      │
    │   score recorded.               │
    │                                 │
    │   Realized? ── Yes → STEWARD   │
    │   Not yet?  ── Next cron       │
    │                triggers another │
    │                workflow run     │
    │                                 │
    └─────────────────────────────────┘
```

### Budgets as constraints

Two budgets govern the engine:

- **Iteration budget** — maximum number of assess/plan/solve/assemble/execute/witness cycles per workflow run (configurable, default 5)
- **Token budget** — maximum Copilot SDK tokens consumed per workflow run (configurable, tracks cost)

When either budget is exhausted, the engine lands what it has. A partially-executed plan is valid — the next workflow run picks up where this one stopped.

### Properties of a good transformation

- **Maximal** — do as much as you can land perfectly
- **Reliable** — if it can't land clean, it doesn't land at all
- **Observable** — it leaves a record of what changed and why
- **Parallelizable** — independent transformations can run concurrently (multiple cron triggers, multiple workflow runs)

**Stewardship** is not a separate mode with different machinery. It's what happens when the witness consistently scores high: the plan has no open conditions, no active issues, the product matches the intentïon. The next transformation reads this state and naturally shifts to maintenance — responding to drift, fixing regressions, refining quality. The behavior change is emergent from the state, not imposed by a mode switch.

---

## Agents and the Control Plane

Agents can modify the machinery. A builder can update the harvester's perspective file. The navigator can create a new perspective. The narrator can restructure materials.

The social protocol: **no agent modifies its own perspective file in the same run.** But it can ask another to. This creates natural checks — perspectives refine each other across cycles.

This is more fluid than a forbidden list. Capabilities are documented in repo files (like skills). Any agent reads them. Any agent can propose changes to another's capabilities through the normal PR process.

---

## What This Means for the UX

**Homepage (intentïon.com):** "What is your intentïon?" → You describe what you want to exist → The system begins navigating toward it using your GitHub account and Copilot subscription.

**Template (repository0):** You clone it, you write your intentïon, the machinery begins transforming materials into product. You watch the plan refine and the product grow in `intentïon.md`. It tells you when it witnesses realization. Then it stewards.

**The SDK (agentic-lib):** Provides the machinery — the workflows, the action, the perspectives. It's the factory-in-a-box you install on any repository.

**Live feature requests from the CLI:**

Once the product is realized and stewardship begins, users can request new features from the command line:

```
devkit --add "please add a TOML parser"
```

This translates to a GitHub issue in the repository, labeled for the builder perspective. The machinery picks it up, the plan is refined to include it, the builder writes the code, the witness assesses it, and the feature lands. The user gets it via:

```
npm update @intentïon/devkit
```

The loop from intention to realization is the same whether the intention is the original seed or a feature request from a user who's already using the product. `--add` is just another way to express an intention.

---

## Planning Theory References

The planning approach draws on:

- **NONLIN** (Tate, 1977, Edinburgh) — the first planner to use causal links and threat detection in a partial-order framework. [NONLIN project page](https://www.aiai.ed.ac.uk/project/nonlin/)
- **O-Plan** (Currie & Tate, 1983-1999, Edinburgh) — open planning architecture extending NONLIN with hierarchical task decomposition. [O-Plan paper](https://www.sciencedirect.com/science/article/abs/pii/000437029190024E)
- **UCPOP** (Penberthy & Weld, 1992) — sound, complete partial-order planner. Formalized least commitment and open conditions. [UCPOP paper](https://www.semanticscholar.org/paper/UCPOP:-A-Sound,-Complete,-Partial-Order-Planner-for-Penberthy-Weld/6e1bd5758be5495141d56de31c28d57f55c56f3e)
- **Planning and Execution using Partial Decision Trees** (Steel & Ho, 1993, Essex) — integrates planning with execution under uncertainty, reasoning about the utility of planning vs acting. [Essex repository](https://repository.essex.ac.uk/8658/)
- **Partial-order planning** (general) — the principle that plans should maintain flexibility by not committing to step ordering until forced. [Wikipedia overview](https://en.wikipedia.org/wiki/Partial-order_planning)

---

## Knowledge Representation, Constraint Satisfaction, and Planning

The transformation engine draws on three interconnected disciplines. Each addresses a different question.

### Knowledge Representation — How to map state for efficient reasoning

The system must represent the state of the repository — what conditions hold, what has been achieved, what is assumed, what is unknown — in a form that agents and the constraint solver can reason about efficiently.

**Open World Assumption.** What is not stated is unknown, not false. If the plan doesn't mention whether a CLI framework exists, that's an open condition — an explicit gap. The system never assumes completeness. This is the opposite of a closed-world database: absence of evidence is not evidence of absence.

**Event Calculus.** Each agent execution is an **event** that **initiates** or **terminates** conditions. "Builder resolved issue #5" is an event that initiates `json-yaml-available` and terminates `json-yaml-open`. Observations record what changed, when, and by whom. The plan's state at any point is the set of conditions initiated but not yet terminated by all events up to that point. This makes the causal history machine-readable and queryable.

**Truth Maintenance (JTMS/ATMS).** Every assumption in the plan carries a **justification** (why we believe it) and a set of **dependents** (what relies on it). When evidence contradicts an assumption, the system applies AGM belief revision: retract the weakest-justified assumption first, then cascade — re-evaluate all dependents. If a retracted assumption was the sole support for an action, that action becomes unsupported and reverts to open. This prevents the plan from accumulating stale beliefs.

**Default Reasoning.** Agents have typical behaviors assumed unless contradicted. A builder is assumed to produce passing tests. A fixer is assumed to not introduce new failures. These defaults let the planner reason forward without exhaustive verification at every step — but they can be overridden by observations.

### Constraint Satisfaction — How to assemble and select

Three assembly problems are solved by constraint satisfaction:

**Assembling agents from capabilities.** Given an action that requires file I/O and GitHub API access, find a combination of capabilities that provides these tools. If no existing agent definition matches, compose one. The constraints are: every tool the action needs must be provided by exactly one capability; no capability conflicts (e.g., two capabilities that both claim exclusive write access to the same resource).

**Assembling plans from agent transformations.** Given the current state and the intentïon, find a set of actions whose combined effects achieve the goal. Each action has preconditions and effects. The plan is a partial order — actions are only ordered when one's effects are another's preconditions, or when they threaten each other. This is classical partial-order planning as constraint satisfaction: find an assignment of actions, orderings, and causal links that satisfies all preconditions and resolves all threats.

**Picking what runs next.** Given the current plan, find the set of **proceedable actions** — actions whose preconditions are all met, whose causal links have no unresolved threats, and whose resource requirements don't conflict with other proceedable actions. This is a constraint satisfaction problem over the current plan state: maximize the number of concurrent actions subject to resource and ordering constraints.

### Planning — How to model a plan and search a decision tree

**Plan modeling.** A plan is a partial-order structure with: actions (preconditions, effects, agent, status), causal links (action A provides condition C needed by action B), threats (action X might undo condition C), assumptions (beliefs with justifications), and observations (events with initiated/terminated conditions). The plan is committed to the repository as a file — it persists across workflow runs and accumulates knowledge.

**Decision tree search.** At the Plan step of the engine loop, the system searches a decision tree of possible plan refinements. Each refinement is a choice: add an action, resolve a threat (by ordering or promotion/demotion), retract an assumption, decompose an action into sub-actions. The search is guided by: proximity to realization (how many open conditions remain), cost (token budget consumed by the refinement), and risk (how many new threats the refinement introduces). Following Steel & Ho, the system also reasons about whether further planning or immediate execution is more valuable, given the cost of each and the uncertainty of outcomes.

**Least commitment.** The plan doesn't order steps until it has to. If two features are independent, no ordering is imposed. If a threat arises, the minimum ordering constraint is added. This keeps the plan flexible and maximizes opportunities for concurrent execution.

**Plan refinement, not replanning.** Each cycle refines the existing plan rather than creating a new one from scratch. The plan is a living document that grows smarter over time. Achieved actions are recorded, observations are accumulated, assumptions are strengthened or retracted. The plan never loses knowledge — it only revises it.

---

## Vocabulary Reference

| Term                  | Definition                                                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **intentïon**         | The stated desire — what you want to exist. The seed. Immutable by agents. The fixed point.                                                                                                   |
| **product**           | Code that when run IS the thing. The intentïon made real.                                                                                                                                     |
| **machinery**         | Code, prompts, config that build, run, deploy, and manage. The factory.                                                                                                                       |
| **record**            | Digests of what happened and what's true. Evidence and traceability.                                                                                                                          |
| **materials**         | Gathered or generated stuff that enables transformations. A cache. Concrete, countable, disposable.                                                                                           |
| **plan**              | A committed partial-order document tracking actions, causal links, threats, assumptions, and observations. YAML front matter tracks cycle, realization score, and budget. Refined each cycle. |
| **transformation**    | A single workflow run. A budget of compute that runs the 7-step engine loop: assess, plan, solve, assemble, execute, witness, iterate.                                                        |
| **perspective**       | An agent's way of seeing. Documented as text files. Agents refine each other's.                                                                                                               |
| **capability**        | A text file describing how to interact with a service. The building blocks that agents are assembled from. Lives in `.github/agentic-lib/capabilities/`.                                      |
| **agent definition**  | A text file defining a transformation (from state → to state), required capabilities, and constraints. Lives in `.github/agentic-lib/agents/`.                                                |
| **constraint solver** | The engine step that finds proceedable actions — those with met preconditions, no unresolved threats, and no resource conflicts. Also assembles agents from capabilities.                     |
| **assessment**        | The engine step that reads repository state into a representation efficient for reasoning. Maps conditions, assumptions, and observations.                                                    |
| **belief state**      | The set of assumptions currently held, each with a justification, strength, and dependents. Subject to revision when evidence contradicts.                                                    |
| **witness**           | Assessment of realization. Happens at the end of every engine cycle. Recorded in the record.                                                                                                  |
| **realization**       | The condition where the intentïon is manifest in the state. Degrees, not binary.                                                                                                              |
| **stewardship**       | What happens when the plan has no open conditions and the witness scores high. Emergent, not imposed.                                                                                         |
