# PLAN: Supervisor Orchestration

The agent-supervisor evolves from a reactive workflow-run watcher into a proactive orchestrator that uses an LLM to decide what actions to take, when, and how many concurrently.

## Implementation Status

| Component | Status | PR |
|-----------|--------|----|
| `supervise` task handler (`tasks/supervise.js`) | **Done** | #1806 |
| Agent prompt (`agent-supervisor.md`) | **Done** | #1806 |
| Unit tests (22 tests) | **Done** | #1806 |
| Registered in `index.js` + `action.yml` (9th task) | **Done** | #1806 |
| `agent-supervisor.yml` — reactive + proactive split | **Done** | #1807 |
| `agent-supervisor-schedule.yml` — cron control | **Done** | #1804 |
| Config: `supervisor` field in `agentic-lib.toml` | **Done** | #1804 |
| Discussions bot thread-awareness + supervisor relay | **Done** | #1804 |

### What's left

- [ ] **First live run**: Merge #1807, init repository0, dispatch `agent-supervisor` manually and observe the LLM supervisor making decisions
- [ ] **Schedule activation**: Run `agent-supervisor-schedule.yml` with `frequency: daily` on repository0 to activate proactive supervision
- [ ] **End-to-end discussions flow**: User posts in discussions → bot relays to supervisor → supervisor acts → supervisor responds back through bot
- [ ] **Tuning**: Observe supervisor decisions over several cycles and refine the agent prompt based on what works

## Goals

1. The supervisor tries to achieve `MISSION.md` by growing features, library, and resolving issues
2. It picks **multiple concurrent actions** per cycle — not just one
3. It communicates bidirectionally with the discussions bot to serve users
4. All decision-making is LLM-based with structured, parseable output

## Available Actions

The supervisor can initiate any combination of these per cycle:

### Workflow Dispatches
| Action | Workflow | Purpose |
|--------|----------|---------|
| `dispatch:agent-flow-transform` | `agent-flow-transform.yml` | Pick up next issue, generate code, open PR |
| `dispatch:agent-flow-maintain` | `agent-flow-maintain.yml` | Refresh feature definitions and library docs |
| `dispatch:agent-flow-review` | `agent-flow-review.yml` | Close resolved issues, enhance issue criteria |
| `dispatch:agent-flow-fix-code` | `agent-flow-fix-code.yml` | Fix a failing PR (requires PR number) |
| `dispatch:agent-discussions-bot` | `agent-discussions-bot.yml` | Proactively post in a discussion thread |

### Direct GitHub API Actions
| Action | API | Purpose |
|--------|-----|---------|
| `github:create-issue` | `POST /repos/{owner}/{repo}/issues` | Create issue from gap in features or mission |
| `github:label-issue` | `POST /repos/{owner}/{repo}/issues/{n}/labels` | Prioritize or categorize an issue |
| `github:close-issue` | `PATCH /repos/{owner}/{repo}/issues/{n}` | Close a resolved or stale issue |

### Communication Actions
| Action | Mechanism | Purpose |
|--------|-----------|---------|
| `respond:discussions` | Dispatch discussions bot with response text | Reply to a user request via discussions |
| `nop` | — | No action needed this cycle |

## Context Provided to the LLM

Each supervisor cycle gathers this context before asking the LLM to decide:

1. **Mission** — Full text of `MISSION.md`
2. **Open Issues** — Count, titles, labels, ages (sorted by age)
3. **Open PRs** — Count, branch names, statuses, ages, automerge labels
4. **Recent Workflow Runs** — Last 10 runs across all agentic workflows (name, conclusion, timestamp)
5. **Feature Files** — Names and count vs `features-limit` from config
6. **Library Docs** — Names and count vs `library-limit` from config
7. **Recent Activity** — Last 20 lines of `intentïon.md`
8. **Schedule** — Current tier and supervisor frequency from `agentic-lib.toml`
9. **Pending Discussion Requests** — Free text from discussions bot (if triggered by a user request)

## LLM Output Format

The supervisor prompt instructs the LLM to respond in a structured, parseable format:

```
[ACTIONS]
dispatch:agent-flow-transform
dispatch:agent-flow-maintain
github:create-issue | title: Implement string parsing utilities | labels: automated,enhancement
respond:discussions | message: I've started work on your string utilities request. You'll see a PR shortly.
[/ACTIONS]
[REASONING]
The mission calls for string utility features. There are currently 0 open issues and no
features defined. Creating an issue and starting the transform pipeline will bootstrap
the development cycle. Meanwhile, maintain will generate feature definitions from the mission.
The user in discussions asked for string utilities — acknowledging their request.
[/REASONING]
```

### Parsing Rules
- Everything between `[ACTIONS]` and `[/ACTIONS]` is one action per line
- Pipe `|` separates the action from key-value parameters
- Parameters are `key: value` pairs separated by `|`
- The `[REASONING]` block is logged but not acted on

## Discussions ↔ Supervisor Communication

### User → Discussions Bot → Supervisor

When a user makes an action request in a discussion:

1. The discussions bot recognises the request
2. Bot uses `[ACTION:request-supervisor]` with the free-text request
3. The discussions bot workflow completion triggers the supervisor (via `workflow_run`)
4. The supervisor reads the request from the discussions bot's output/activity log
5. The supervisor decides what to do and can dispatch back through the discussions bot

### Supervisor → Discussions Bot

When the supervisor wants to communicate back to a user:

1. Supervisor includes `respond:discussions | message: <text> | discussion-url: <url>` in its actions
2. The supervisor script dispatches `agent-discussions-bot.yml` with the response text and URL as inputs
3. The discussions bot posts the message to the thread

### Design Principles

- **Free text everywhere.** Both the request and response are free text because the decision-making is LLM-based. Structured formats are only for machine parsing of actions.
- **The discussions bot advertises capabilities.** It should encourage users to ask for experiments, suggest projects, and be helpful about what's possible.
- **The supervisor filters and prioritises.** Not every user request should be actioned. The supervisor evaluates against the mission, current workload, and resource limits.
- **Origin tracking.** Every request from discussions includes the discussion URL and username so the supervisor knows where to send responses.

## Implementation (Completed)

### Task Handler: `supervise`

The 9th task handler at `src/actions/agentic-step/tasks/supervise.js`:

```
supervise(context) → {
  1. gatherContext() — fetches issues, PRs, workflow runs, features, library, activity via GitHub API
  2. buildPrompt() — constructs LLM prompt with all context + available actions + mission
  3. runCopilotTask() — calls Copilot SDK with supervisor system message
  4. parseActions() — extracts [ACTIONS]...[/ACTIONS] block into {action, params} objects
  5. parseReasoning() — extracts [REASONING] block for logging
  6. executeAction() — dispatches to extracted handler functions:
     - executeDispatch() → octokit.actions.createWorkflowDispatch(...)
     - executeCreateIssue() → octokit.issues.create(...)
     - executeLabelIssue() → octokit.issues.addLabels(...)
     - executeCloseIssue() → octokit.issues.update(...)
     - executeRespondDiscussions() → dispatch discussions bot
     - "nop" → skip
  7. Returns outcome with list of dispatched actions + reasoning
}
```

### Workflow Architecture

`agent-supervisor.yml` has two jobs:

| Job | Trigger | Purpose |
|-----|---------|---------|
| `evaluate` | `workflow_run` completed (test, transform, fix-code, ci-automerge) | Fast hardcoded reactive responses: fix failing PRs with loop protection, clean stale conflicting PRs |
| `supervise` | `workflow_dispatch` + `schedule` | LLM-driven via `agentic-step task=supervise`. Full context gathering, strategic multi-action dispatch |

`agent-supervisor-schedule.yml` modifies the cron schedule on `agent-supervisor.yml` by editing the file and pushing to main. Schedule options: off, weekly, daily, hourly, continuous (every 10 minutes).

### What was removed from the reactive path

These were previously hardcoded in the `evaluate` job but are now handled by the LLM supervisor:
- Post-merge → dispatch transform
- Stale issues → dispatch review
- Discussion bot follow-through → dispatch maintain

### Files

| File | Purpose |
|------|---------|
| `src/actions/agentic-step/tasks/supervise.js` | Task handler (gatherContext, buildPrompt, parseActions, executeAction) |
| `src/agents/agent-supervisor.md` | Agent prompt with decision framework |
| `src/actions/agentic-step/index.js` | Registers supervise as 9th task |
| `src/actions/agentic-step/action.yml` | Updated task description |
| `src/workflows/agent-supervisor.yml` | Dual-mode workflow (reactive + proactive) |
| `src/workflows/agent-supervisor-schedule.yml` | Schedule control workflow |
| `tests/actions/agentic-step/tasks/supervise.test.js` | 22 unit tests |

## Configuration

New fields in `agentic-lib.toml`:

```toml
[schedule]
supervisor = "daily"    # off | weekly | daily | hourly | continuous
```

The `agent-supervisor-schedule.yml` workflow reads this and sets the cron accordingly by editing `agent-supervisor.yml` and pushing to main.

## Success Criteria

1. Supervisor can pick multiple concurrent actions per cycle
2. Supervisor dispatches real workflows and creates real issues
3. Discussions bot can relay user requests to supervisor and receive responses
4. Discussions bot is engaging, not repetitive, and adapts to user language
5. All actions are logged in `intentïon.md` for observability
6. The system makes measurable progress toward MISSION.md without human intervention
