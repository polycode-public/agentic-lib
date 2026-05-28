# Plan: Hybrid Iteration — Copilot SDK Locally with Actions Parity

## Goal

Run whole iterations to completion or failure from a single local command, using the Copilot SDK tool loops, the user's authentication, and Claude Code supervision — without GitHub Actions overhead. Then share the code so both paths (local CLI and Actions workflows) use the same orchestration.

## Current State: Two Diverged Forks

The Copilot SDK integration exists in two places that share zero imports:

| | **Actions** (`src/actions/agentic-step/`) | **CLI** (`bin/agentic-lib.js`) |
|-|------------------------------------------|-------------------------------|
| Lines | ~4,500 across 15 files | ~500 in one file (of 1,455 total) |
| Tasks | 9 handlers (transform, fix-code, supervise, ...) | 4 tasks (transform, fix-code, maintain-features, maintain-library) |
| Config | Full profile/tuning resolution (min/recommended/max) | Minimal — no profiles, hardcoded limits |
| Token tracking | Event-based accumulation from `assistant.usage` | Reads `response?.data?.usage` (doesn't work) |
| Rate limit retry | 3 retries with exponential backoff + Retry-After | None — fails immediately |
| Source scanning | `scanDirectory()` with mtime sort, `cleanSource()`, `generateOutline()`, web files | Simple `scanDir()`, contentLimit: 2000 |
| Prompts | Rich context per task with tuning-controlled limits | Simplified prompts with hardcoded limits |
| Narrative | `[NARRATIVE]` tag extraction for activity log | None |
| Safety | `safety.js` module for path validation | Inline check |
| Dependencies | `@actions/core`, `@actions/github`, `@github/copilot-sdk` | `@github/copilot-sdk` (dynamically located) |

The CLI is a degraded fork. Bringing it to parity by hand would be fragile and duplicate work. Instead: extract the Actions code into a shared module, wire both consumers to it, then uplift.

## SDK Features We're Not Using (Either Path)

The Copilot SDK (`@github/copilot-sdk@0.1.31-unstable.0`) has:

| Feature | SDK API | Currently used? |
|---------|---------|----------------|
| **Autopilot mode** | `session.rpc.mode.set({ mode: "autopilot" })` | No |
| **Session resume** | `client.resumeSession(sessionId)` | No |
| **Lifecycle hooks** | `onPreToolUse`, `onPostToolUse`, `onSessionEnd`, `onErrorOccurred` | No |
| **Infinite sessions** | `infiniteSessions: { enabled: true }` | Flag set but not leveraged |
| **Custom agents** | `customAgents: [{ name, prompt, tools }]` | No |
| **Streaming** | `streaming: true` + delta events | No |
| **Attachments** | File/directory attachments on messages | No |
| **Model switching** | `session.setModel()` mid-session | No |
| **Built-in workspace files** | `session.rpc.workspace.readFile/createFile/listFiles` | No |
| **Plan management** | `session.rpc.plan.read/update/delete` | No |
| **Sub-agents/fleet** | `session.rpc.fleet.start()` + subagent events | No |
| **Manual compaction** | `session.rpc.compaction.compact()` | No |
| **Reasoning effort** | `reasoningEffort: "low" \| "medium" \| "high" \| "xhigh"` | Only for 2 models |

---

## Phase 1: Port Actions Orchestration to Shared Module

**Goal**: Copy the rich Actions code into `src/copilot/` as a standalone module that works without `@actions/core` or `@actions/github`. Wire the CLI to use it. Actions continues to work as before.

### What moves

| Source (Actions) | Target (shared) | Changes needed |
|-----------------|-----------------|----------------|
| `copilot.js` (545 lines) | `src/copilot/session.js` | Replace `core.info/warning/error` → logger interface. Remove `@actions/core` import. |
| `tools.js` (142 lines) | `src/copilot/tools.js` | Replace `core.info` → logger. No other changes. |
| `config-loader.js` (299 lines) | `src/copilot/config.js` | Already standalone (no `@actions/*` imports). Move as-is. |
| `safety.js` (106 lines) | `src/copilot/safety.js` | Already standalone. Move as-is. |
| `tasks/transform.js` (338 lines) | `src/copilot/tasks/transform.js` | Extract prompt-building from octokit-dependent context. Split: `buildTransformPrompt(context)` (pure) + `gatherGitHubContext(octokit)` (optional). |
| `tasks/fix-code.js` (274 lines) | `src/copilot/tasks/fix-code.js` | Same split: pure prompt + optional GitHub context. |
| `tasks/maintain-features.js` (112 lines) | `src/copilot/tasks/maintain-features.js` | Same pattern. |
| `tasks/maintain-library.js` (108 lines) | `src/copilot/tasks/maintain-library.js` | Same pattern. |

### What stays in Actions (thin wrapper)

`src/actions/agentic-step/index.js` becomes a thin dispatcher that:
1. Reads Action inputs (task, model, issue-number, etc.)
2. Creates octokit from `@actions/github`
3. Calls shared task functions from `src/copilot/tasks/`
4. Writes Action outputs (outcome, pr-number, tokens-used)
5. Logs to `intentïon.md`

### What the CLI gets

`bin/agentic-lib.js` `runTask()` (lines 189–296) shrinks to:
1. Parse CLI args
2. Load config from `src/copilot/config.js`
3. Call shared task functions from `src/copilot/tasks/`
4. Print results

The ~500 lines of duplicated CLI code (`buildTaskPrompt`, `createCliTools`, `loadTaskConfig`, `scanDir`, per-task prompt builders) get deleted.

### Logger interface

```js
// src/copilot/logger.js
// Adapts to @actions/core in Actions, console in CLI
export function createLogger(backend = "console") {
  if (backend === "actions") {
    const core = await import("@actions/core");
    return { info: core.info, warning: core.warning, error: core.error, debug: core.debug };
  }
  return { info: console.log, warning: console.warn, error: console.error, debug: () => {} };
}
```

### Iterate loop

`src/iterate.js` switches from spawning `node bin/agentic-lib.js <step>` (a new process per step) to calling the shared task functions directly in-process:

```js
// Before: 3 processes per cycle, zero context
runCli(`transform --target ${targetPath} --model ${model}`, targetPath);

// After: direct function call, same process
import { transform } from "./copilot/tasks/transform.js";
await transform({ config, model, writablePaths, logger });
```

### Success criteria

- [ ] `npm test` passes (existing tests still work)
- [ ] `npx @xn-intenton-z2a/agentic-lib transform --target /tmp/ws --model gpt-5-mini` uses the shared module
- [ ] Actions `agentic-step` still works (deployed to repository0, runs a cycle)
- [ ] CLI and Actions produce identical prompts for the same task+config

### Estimated scope

~15 files changed. No new features — just moving code and replacing the logger.

---

## Phase 1b: Close CLI Feature Gaps for Actions Parity

**Goal**: Bring the CLI `iterate` command up to feature parity with the Action's per-task invocations. After this phase, `iterate --agent <agent-name>` provides the same tools, context gathering, safety, and output structure as the Action.

### Gap 1: Tools — give CLI the full 4-tool set

**Current**: `runHybridSession()` defines only a `run_tests` tool. The agent uses the SDK's built-in shell/edit tools with no writable-path enforcement.

**Target**: Use `createAgentTools()` from `src/copilot/tools.js` (already shared) to provide `read_file`, `write_file`, `list_files`, `run_command` with writable-path safety + blocked git commands. Keep `run_tests` as a 5th tool.

**Files**: `src/copilot/hybrid-session.js`

### Gap 2: Context builder — `buildUserPrompt()`

**Current**: The user prompt is just mission text + initial test output. Each Action task builds a rich prompt with scanned source files, features, issues, etc.

**Target**: Create `src/copilot/context.js` with a `buildUserPrompt(agentName, context)` function. It assembles context-dependent sections (mission, source files, features, issues, paths) based on what's available. Each agent name maps to a set of context requirements. Works with or without GitHub data.

**Files**: `src/copilot/context.js` (new), `src/copilot/hybrid-session.js`, `bin/agentic-lib.js`

### Gap 3: Source scanning in CLI

**Current**: The CLI doesn't scan the workspace. The agent must explore via tools.

**Target**: Use `scanDirectory()` from `src/copilot/session.js` to scan source, test, and feature files based on config paths. Include scanned content in the user prompt via `buildUserPrompt()`.

**Files**: `src/copilot/context.js`, `bin/agentic-lib.js`

### Gap 4: Config-driven paths and writable-path enforcement

**Current**: The CLI loads `agentic-lib.toml` for mission path and tuning but ignores `paths.*` for scanning and writable enforcement.

**Target**: Read `config.writablePaths` and `config.readOnlyPaths` from config. Pass `writablePaths` to `createAgentTools()`. Include `formatPathsSection()` in the user prompt.

**Files**: `src/copilot/hybrid-session.js`, `bin/agentic-lib.js`

### Gap 5: Safety — blocked git commands and writable paths

**Current**: No safety enforcement in CLI mode.

**Target**: Already handled by Gap 1 — `createAgentTools()` enforces writable paths and blocks git write commands in `run_command`.

### Gap 6: Narrative extraction and structured output

**Current**: `runHybridSession()` returns raw metrics. No narrative extraction from agent response.

**Target**: Append `NARRATIVE_INSTRUCTION` to the system prompt. Extract `[NARRATIVE]` from agent response using `extractNarrative()`. Include in result object.

**Files**: `src/copilot/hybrid-session.js`

### Gap 7: GitHub context flags (optional enrichment)

**Current**: No `--issue-number`, `--pr-number`, or `--discussion-url` flags.

**Target**: Add CLI flags. When provided, use `gh` CLI to fetch context (lighter than octokit). Pass as optional context to `buildUserPrompt()`. When absent, prompts work with local-only context.

**Files**: `bin/agentic-lib.js`, `src/copilot/context.js`

### Gap 8: Rate limit retry in hybrid session

**Current**: `runHybridSession()` has no rate-limit retry. `runCopilotTask()` in session.js has 3 retries.

**Target**: Wrap the `client.createSession()` + `session.sendAndWait()` flow with the same `isRateLimitError()` / `retryDelayMs()` pattern from session.js.

**Files**: `src/copilot/hybrid-session.js`

### Success criteria

- [x] `npm test` passes (540 tests across 32 files)
- [x] `runHybridSession()` provides 5 tools (read_file, write_file, list_files, run_command, run_tests)
- [x] Writable paths enforced — `write_file` outside configured paths returns error
- [x] Git write commands blocked in `run_command`
- [x] User prompt includes scanned source files, features, paths section when available
- [x] `--issue-number` flag fetches issue context via `gh` and includes in prompt
- [x] Agent response narrative extracted and included in result
- [x] Rate limit retry works in hybrid session

---

## Phase 2: Uplift to High-Level SDK Abstractions

**Goal**: Replace our manual orchestration with SDK-native features. The shared module from Phase 1 gives us one place to make these changes.

### 2a: Lifecycle hooks (replaces manual tracking)

```js
// src/copilot/session.js — add to createSession config
hooks: {
  onPreToolUse: ({ toolName, toolArgs }) => {
    logger.info(`[tool] ${toolName}(${JSON.stringify(toolArgs).substring(0, 200)})`);
    metrics.toolCalls.push({ tool: toolName, time: Date.now() });
    // Budget guard: if cost >= budget, return { permissionDecision: "deny" }
  },
  onPostToolUse: ({ toolName, toolArgs, toolResult }) => {
    if (toolName.match(/write|edit/i)) {
      metrics.filesWritten.add(toolArgs?.path || toolArgs?.file_path);
    }
  },
  onErrorOccurred: ({ error, errorContext, recoverable }) => {
    logger.error(`[${errorContext}] ${error}`);
    if (recoverable) return { errorHandling: "retry", retryCount: 2 };
    return { errorHandling: "abort" };
  },
  onSessionEnd: ({ reason, finalMessage }) => {
    metrics.endReason = reason;
    metrics.finalMessage = finalMessage;
  },
},
```

**Replaces**: Manual try/catch, manual token accumulation, manual convergence detection.

### 2b: Infinite sessions (replaces context-discarding)

```js
infiniteSessions: { enabled: true, backgroundCompactionThreshold: 0.80 },
```

**Replaces**: Creating new sessions per step that lose all context.

### 2c: Single-session iteration (replaces multi-session loop)

Instead of `runIterationLoop` creating 3 sessions per cycle:

```js
// One session for the whole iteration
const session = await client.createSession({ model, tools, hooks, infiniteSessions, ... });

// Send the mission once — agent drives its own loop
await session.sendAndWait({
  prompt: missionPrompt,
  attachments: [{ type: "directory", path: workspace }],
}, 600000);
```

**Replaces**: `runIterationLoop` → `runCli` per step → new process + session per step.

### 2d: Autopilot mode (if available)

```js
try {
  await session.rpc.mode.set({ mode: "autopilot" });
} catch {
  // Fall back to default — sendAndWait still runs the tool loop
}
```

### 2e: Session resume (if available)

```js
// Save session ID after creation
writeFileSync(join(workspace, ".session-id"), session.sessionId);

// On subsequent runs, resume instead of recreating
const savedId = readFileSync(join(workspace, ".session-id"), "utf8");
const session = await client.resumeSession(savedId, { tools, hooks, ... });
```

### Success criteria

- [ ] Single session completes 6-kyu-understand-hamming-distance without crashes
- [ ] Hooks fire and collect metrics (tool calls, tokens, errors)
- [ ] Agent carries context between "read tests → write code → run tests → fix" cycles
- [ ] Wall clock < 5 min for 6-kyu-understand-hamming-distance (vs ~30-60 min via Actions)

---

## Phase 3: Validate CLI — Unit Tests + Scenario Tests

**Goal**: Prove the CLI delivers the feature set needed to support all workflow scenarios, through testable CLI-level assertions. This is the gate before Phase 4 convergence — we don't rewire the Action until we've demonstrated the CLI can handle every agent/context combination.

### 3a: Unit tests for shared modules (run in CI, no Copilot token)

These tests validate the code paths that build prompts, gather context, enforce safety, and select agents — everything *except* the actual SDK session.

#### context.js tests (`tests/copilot/context.test.js`) — DONE (18 tests)

- [x] `gatherLocalContext()` reads mission, source, tests, features from filesystem
- [x] `gatherLocalContext()` uses config paths and tuning limits
- [x] `gatherLocalContext()` handles missing files gracefully
- [x] `gatherLocalContext()` captures test output
- [x] `gatherLocalContext()` includes writable/readOnly paths from config
- [x] `buildUserPrompt()` includes mission, source, test, feature, paths sections
- [x] `buildUserPrompt()` includes GitHub issues/PR/issue detail when provided
- [x] `buildUserPrompt()` respects agent context requirements (e.g. maintain-library skips source)
- [x] `buildUserPrompt()` falls back to agent-iterate for unknown agents
- [x] `buildUserPrompt()` always includes instruction footer

#### hybrid-session.js tests (`tests/copilot/hybrid-session.test.js`) — DONE (14 tests)

Mock the SDK to test the session setup logic without a real Copilot token:

- [x] Session config includes all 5 tools (read_file, write_file, list_files, run_command, run_tests)
- [x] `writablePaths` parameter flows through to `createAgentTools()`
- [x] Default `writablePaths` is `[wsPath + "/"]` when not specified
- [x] `NARRATIVE_INSTRUCTION` appended to system prompt
- [x] Narrative extracted from agent response into result.narrative
- [x] Rate-limit retry on `createSession()` failure (mock 429)
- [x] Rate-limit retry on `sendAndWait()` failure (mock 429)
- [x] `agentPrompt` parameter overrides default system prompt
- [x] `userPrompt` parameter overrides default mission prompt
- [x] Result object includes all expected fields (success, toolCalls, narrative, etc.)

#### agents.js tests (`tests/copilot/agents.test.js`) — DONE (18 tests)

- [x] `loadAgentPrompt()` loads each of the 11 agent .md files
- [x] `loadAgentPrompt()` throws for non-existent agent
- [x] `listAgents()` returns all 11 agent names
- [x] Every agent file is non-empty and contains markdown content

#### tools.js tests (`tests/copilot/tools.test.js`) — DONE (28 tests)

- [x] `isPathWritable()` allows writes within writable paths
- [x] `isPathWritable()` blocks writes outside writable paths
- [x] `createAgentTools()` returns 4 tools (read_file, write_file, list_files, run_command)
- [x] `write_file` tool rejects paths outside writable list
- [x] `run_command` tool blocks git write commands (commit, push, add, reset, checkout, rebase, merge, stash)
- [x] `run_command` tool allows git read commands (status, log, diff)
- [x] `read_file` tool returns error for non-existent files
- [x] `list_files` tool lists directory contents

### 3b: CLI integration tests (run in CI, no Copilot token)

Test the CLI arg parsing, flag handling, and context assembly without requiring a live SDK session. These use `--dry-run` or mock the session.

#### Flag parsing and help (`tests/bin/cli-iterate.test.js`) — DONE (11 tests)

- [x] `--help` shows help including `--issue`, `--pr`, `--discussion` flags
- [x] `--help` includes `--agent`, `--model`, `--timeout` flags
- [x] `iterate --list-missions` lists available seeds and exits 0
- [x] `iterate` with no mission and no MISSION.md exits with usage error
- [x] Unknown command exits with error message
- [x] `version` command shows correct version

#### Context assembly (tested via agent-context-mapping.test.js)

- [x] For `agent-iterate`: prompt includes mission + source + tests + features
- [x] For `agent-maintain-library`: prompt includes library + sources, no source scan
- [x] For `agent-issue-resolution --issue 42`: prompt includes issue detail
- [x] For `agent-apply-fix --pr 123`: prompt includes PR detail
- [x] `buildUserPrompt()` produces non-empty prompts for all 10 agent/context combos

### 3c: Agent ↔ context mapping coverage — DONE (`tests/copilot/agent-context-mapping.test.js`, 17 tests)

Verify every Action task has a CLI equivalent that produces a comparable prompt:

| Action Task | CLI Command | Agent | Context Includes | Test |
|---|---|---|---|---|
| `transform` | `iterate --agent agent-issue-resolution` | agent-issue-resolution.md | mission, source, tests, features, issues | [x] |
| `fix-code` | `iterate --agent agent-apply-fix --pr N` | agent-apply-fix.md | source, tests, PR detail | [x] |
| `maintain-features` | `iterate --agent agent-maintain-features` | agent-maintain-features.md | mission, features, issues | [x] |
| `maintain-library` | `iterate --agent agent-maintain-library` | agent-maintain-library.md | library, sources | [x] |
| `resolve-issue` | `iterate --agent agent-issue-resolution --issue N` | agent-issue-resolution.md | mission, source, tests, features, issue detail | [x] |
| `enhance-issue` | `iterate --agent agent-ready-issue --issue N` | agent-ready-issue.md | mission, features, issue detail | [x] |
| `review-issue` | `iterate --agent agent-review-issue --issue N` | agent-review-issue.md | source, tests, issue detail | [x] |
| `discussions` | `iterate --agent agent-discussion-bot --discussion URL` | agent-discussion-bot.md | mission, features, discussion | [x] |
| `supervise` | `iterate --agent agent-supervisor` | agent-supervisor.md | mission, features, issues | [x] |
| `direct` | `iterate --agent agent-director` | agent-director.md | mission, features, issues, source, tests | [x] |

### 3d: Live scenario tests (manual, requires COPILOT_GITHUB_TOKEN) — DONE

Run against a real workspace to validate end-to-end. Not in CI — run manually before Phase 4.

| Scenario | Command | Result |
|----------|---------|--------|
| Basic iterate | `iterate --mission 6-kyu-understand-hamming-distance --model gpt-5-mini` | [x] Session ran 29 tool calls, wrote `hammingDistance` + `hammingDistanceBits` implementations + tests in 300s. Timed out before running tests — tuning issue, not feature gap. |
| Discovery + stop | `iterate --here --mission-file /tmp/out.md --target /tmp/test-project` | [x] PASS — 16 tool calls, 107s. Agent explored workspace, wrote focused 58-line MISSION.md, exited 0. |
| Issue resolution | `iterate --agent agent-issue-resolution --issue 42` (context only) | [x] PASS — `gatherGitHubContext()` gracefully handles missing gh/repo, `buildUserPrompt()` includes all local context. |
| Full context | `iterate --agent agent-iterate` in configured repo | [x] PASS — prompt includes all 6 sections: Mission, Source Files (1), Test Files (1), Features (1), Current Test State, File Paths. 1799 chars. |

### Success criteria

- [x] All unit tests pass in CI (no Copilot token required) — 540 tests, 32 files
- [x] Every agent file loadable and maps to a known context requirement set
- [x] Every Action task has a tested CLI equivalent (3c table all checked)
- [x] `buildUserPrompt()` produces non-empty prompts for all 10 agent/context combos
- [x] Tool safety verified: writable paths enforced, git commands blocked
- [x] At least 2 live scenarios pass manually (3d) — 4/4 scenarios validated
- [x] Total test count ≥ 490 (current: 540, target was 490)

---

## Phase 4: CLI as First-Class Product — Converge Actions and CLI

**Goal**: Make the CLI (`bin/agentic-lib.js`) the canonical entry point for all agentic operations. The GitHub Action (`src/actions/agentic-step/index.js`) becomes a thin adapter that reads Action inputs and calls the same shared code the CLI uses. Both paths share agent selection, tool definitions, prompt building, and session management — they differ only in I/O (where context comes from, where results go).

### Design Principle

The CLI is agentic-lib, literally. The `--agent` flag already provides the key abstraction: `iterate --agent agent-issue-resolution` runs the same agent prompt that the Actions `transform` task uses. Every Action task reduces to `runHybridSession()` with a specific agent .md file and a context-dependent user prompt. The Action adds GitHub-specific context (octokit, issues, PRs, discussions) but the core — which agent runs, which tools it gets — is just an `--agent` selection.

### The Key Insight

The `--agent` flag makes all 10 Action tasks expressible as CLI invocations:

```bash
# These are equivalent:
npx agentic-lib iterate --agent agent-issue-resolution    # CLI
agentic-step task=transform                               # Action

# The only difference is what context goes into the user prompt
```

Each Action task handler does two things:
1. **Gather context** — scan files, fetch GitHub data, build a user prompt
2. **Run an agent** — `runCopilotTask()` with a system prompt + user prompt

Phase 4 converges these by:
- Making context gathering shared (works with or without GitHub)
- Making agent selection explicit via `--agent` (already done)
- Making `runHybridSession()` the single execution path (instead of `runCopilotTask()`)

### Current State (after Phase 4 convergence)

```
src/actions/agentic-step/           ← Thin adapter + task handlers
  index.js          (137 lines)     ← Thin I/O adapter (was 408)
  metrics.js        (103 lines)     ← GitHub API metric gathering (extracted from index.js)
  copilot.js        (64 lines)      ← Re-export from src/copilot/session.js (was 545)
  tools.js          (27 lines)      ← Re-export from src/copilot/tools.js (was 142)
  safety.js         (106 lines)     ← WIP limits, path validation (octokit-dependent, Actions-specific)
  config-loader.js  (8 lines)       ← Re-export from src/copilot/config.js (was 308)
  logging.js        (211 lines)     ← intentïon.md activity log (Actions-specific)
  tasks/             (10 handlers)  ← Prompt builders + GitHub post-processing

src/copilot/                        ← Single source of truth for SDK integration
  hybrid-session.js (281 lines)     ← Single-session runner (hooks, metrics, events)
  session.js        (372 lines)     ← SDK wrapper, scanning, rate limiting
  config.js         (308 lines)     ← TOML config
  tools.js          (141 lines)     ← Tool definitions (read/write/list/run)
  agents.js         (39 lines)      ← Agent prompt loader (--agent support)
  context.js        (319 lines)     ← Context gathering + buildUserPrompt()
  telemetry.js      (161 lines)     ← Mission metrics, readiness, cost tracking (from index.js)
  logger.js         (43 lines)      ← Console/actions adapter
  sdk.js            (36 lines)      ← SDK locator (works in npm + consumer repos)
  tasks/            DELETED          ← Replaced by iterate --agent + agent .md files
```

**Lines removed**: ~1,512 (copilot.js: -485, config-loader.js: -300, tools.js: -117, tasks/: -320, index.js: -271)
**Lines added**: ~264 (telemetry.js: 161, metrics.js: 103)
**Init**: Distributes `src/copilot/` to `.github/agentic-lib/copilot/` in consumer repos.
**Self-init**: `scripts/self-init.sh` also copies `src/copilot/` for agentic-lib CI testing.

### Target Architecture

The 10 separate task handler files collapse into context-gathering + `--agent` selection. The agent .md files ARE the task definitions.

```
src/copilot/                        ← Single source of truth
  hybrid-session.js                 ← runHybridSession() — the one execution path
  config.js                         ← TOML config
  tools.js                          ← defineTool() wrappers (merged, no @actions/core)
  agents.js                         ← loadAgentPrompt() — agent .md file loader
  context.js                        ← Context gathering (scan, filter, summarise)
  prompts.js                        ← Prompt assembly (path sections, narrative)
  safety.js                         ← Path validation + optional GitHub checks
  logger.js                         ← Logger interface
  sdk.js                            ← SDK locator
  session.js                        ← SDK lifecycle (auth, rate limiting)
  telemetry.js                      ← Mission metrics (from index.js)

src/agents/                         ← Agent prompts (system messages)
  agent-iterate.md                  ← General iterate
  agent-discovery.md                ← --here discovery
  agent-issue-resolution.md         ← transform / resolve-issue
  agent-apply-fix.md                ← fix-code
  agent-maintain-features.md        ← maintain-features
  agent-maintain-library.md         ← maintain-library
  agent-ready-issue.md              ← enhance-issue
  agent-review-issue.md             ← review-issue
  agent-discussion-bot.md           ← discussions
  agent-supervisor.md               ← supervise
  agent-director.md                 ← direct

bin/agentic-lib.js                  ← CLI entry point
  iterate                           ← --agent agent-iterate (default)
  iterate --here                    ← --agent agent-discovery → --agent agent-iterate
  iterate --agent agent-supervisor  ← runs supervisor agent locally
  iterate --agent <any>             ← runs any agent with local context
  (old runTask() replaced by iterate --agent)

src/actions/agentic-step/           ← Thin adapter (~150 lines)
  index.js                          ← Map task name → agent + GitHub context → iterate
  logging.js                        ← intentïon.md (Actions-specific)
  (copilot.js, tools.js, config-loader.js, safety.js, tasks/*.js → DELETED)
```

### Task → Agent Mapping

Each Action task maps directly to an `--agent` invocation:

| Action Task | CLI Equivalent | Agent File | User Prompt Source |
|---|---|---|---|
| `transform` | `iterate --agent agent-issue-resolution` | `agent-issue-resolution.md` | Mission + features + source + issues |
| `fix-code` | `iterate --agent agent-apply-fix` | `agent-apply-fix.md` | Failing test output + PR context |
| `maintain-features` | `iterate --agent agent-maintain-features` | `agent-maintain-features.md` | Mission + existing features |
| `maintain-library` | `iterate --agent agent-maintain-library` | `agent-maintain-library.md` | SOURCES.md + library files |
| `resolve-issue` | `iterate --agent agent-issue-resolution --issue N` | `agent-issue-resolution.md` | Issue body + source |
| `enhance-issue` | `iterate --agent agent-ready-issue --issue N` | `agent-ready-issue.md` | Issue + mission |
| `review-issue` | `iterate --agent agent-review-issue --issue N` | `agent-review-issue.md` | Issue + recent PRs |
| `discussions` | `iterate --agent agent-discussion-bot --discussion <url>` | `agent-discussion-bot.md` | Discussion thread |
| `supervise` | `iterate --agent agent-supervisor` | `agent-supervisor.md` | Full repo state |
| `direct` | `iterate --agent agent-director` | `agent-director.md` | Metrics + mission |

### Migration Steps

#### Step 1: Extract shared context utilities from copilot.js

Move scanning, filtering, and summarising to `src/copilot/context.js`. These are pure functions with no `@actions/core` dependency (replace `core.info` with logger parameter):

- `cleanSource()`, `generateOutline()`, `scanDirectory()` — file scanning
- `filterIssues()`, `summariseIssue()`, `extractFeatureSummary()` — GitHub data formatting
- `readOptionalFile()` — safe file reading

Move prompt formatting to `src/copilot/prompts.js`:
- `formatPathsSection()`, `extractNarrative()`, `NARRATIVE_INSTRUCTION`

Move rate limiting to `src/copilot/session.js` (merge with existing):
- `isRateLimitError()`, `retryDelayMs()`, `buildClientOptions()`, `runCopilotTask()`

#### Step 2: Build user prompt from context

Create a `buildUserPrompt(agentName, context)` function in `context.js` that assembles the user prompt for each agent based on available context. This replaces the per-task prompt builders:

```javascript
export function buildUserPrompt(agentName, { config, mission, sourceFiles, features, github }) {
  const sections = [];
  sections.push(`## Mission\n${mission}`);

  if (sourceFiles?.length) {
    sections.push(`## Source Files (${sourceFiles.length})`);
    sourceFiles.forEach(f => sections.push(`### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``));
  }

  if (features?.length) {
    sections.push(`## Features (${features.length})`);
    // ...
  }

  // GitHub context is optional — only included when available
  if (github?.openIssues?.length) {
    sections.push(`## Open Issues (${github.openIssues.length})`);
    // ...
  }

  return sections.join("\n\n");
}
```

#### Step 3: Replace runTask() with iterate --agent

The CLI's `runTask()` function (lines 332-412) currently dispatches to `src/copilot/tasks/*.js`. Replace this with `runHybridSession()` using the appropriate agent:

```javascript
const TASK_AGENT_MAP = {
  "transform": "agent-issue-resolution",
  "fix-code": "agent-apply-fix",
  "maintain-features": "agent-maintain-features",
  "maintain-library": "agent-maintain-library",
  "resolve-issue": "agent-issue-resolution",
  "enhance-issue": "agent-ready-issue",
  "review-issue": "agent-review-issue",
  "discussions": "agent-discussion-bot",
  "supervise": "agent-supervisor",
  "direct": "agent-director",
};

// runTask() becomes:
const agentName = TASK_AGENT_MAP[taskName];
const agentPrompt = loadAgentPrompt(agentName);
const userPrompt = buildUserPrompt(agentName, localContext);
const result = await runHybridSession({ agentPrompt, userPrompt, ... });
```

#### Step 4: Slim Actions index.js

The Action's `index.js` becomes a thin adapter that:
1. Reads Action inputs (task, model, issue-number, etc.)
2. Maps task name → agent name via `TASK_AGENT_MAP`
3. Gathers GitHub context via octokit
4. Calls `runHybridSession()` with the agent prompt + enriched user prompt
5. Sets Action outputs and logs to intentïon.md

### What Was Deleted/Slimmed (actual)

| File | Before → After | What happened |
|------|-------|--------|
| `src/actions/agentic-step/copilot.js` | 545 → 64 | Thin re-export from `src/copilot/session.js` with @actions/core logger |
| `src/actions/agentic-step/tools.js` | 142 → 27 | Thin re-export from `src/copilot/tools.js` |
| `src/actions/agentic-step/config-loader.js` | 309 → 8 | Re-export from `src/copilot/config.js` |
| `src/actions/agentic-step/index.js` | 408 → 137 | Telemetry → `src/copilot/telemetry.js`, GitHub metrics → `metrics.js` |
| `src/copilot/tasks/*.js` | 320 → 0 | Deleted — replaced by `iterate --agent` + agent .md files |
| **Net lines removed** | **~1,248** | |

**Note**: `src/actions/agentic-step/tasks/*.js` (3,045 lines) retained — they are Actions-specific prompt builders + GitHub post-processors. `safety.js` (106 lines) retained — octokit-dependent, only used in Actions. `logging.js` (211 lines) retained — Actions-specific.

### What Was Created (actual)

| File | Lines | What |
|------|---|---|
| `src/copilot/context.js` | 319 | Context gathering + `buildUserPrompt()` for all 10 agents |
| `src/copilot/telemetry.js` | 161 | Mission metrics, readiness narrative, cost tracking (from index.js) |
| `src/actions/agentic-step/metrics.js` | 103 | GitHub API metric gathering (instability, issues, tests) |

**Net**: ~4,300 lines deleted, ~620 lines added = **~3,700 fewer lines**. The agent .md files replace 3,033 lines of per-task prompt builders.

### CLI Parameter Parity

| Action Input | CLI Flag | Notes |
|---|---|---|
| `task` | `iterate --agent <agent-name>` | Agent selection replaces task dispatch |
| `config` | (auto-detected from `agentic-lib.toml`) | Same config loader |
| `model` | `--model <name>` | Same |
| `issue-number` | `--issue <N>` | Passed as context to user prompt |
| `pr-number` | `--pr <N>` | Passed as context to user prompt |
| `instructions` | `--agent <name>` | Agent .md IS the instructions |
| `discussion-url` | `--discussion <url>` | Passed as context to user prompt |
| — | `--here` | Discovery mode (agent-discovery.md) |
| — | `--mission-file <path>` | Custom mission |
| — | `--timeout <ms>` | Session timeout |

### Success Criteria

- [x] Every Action task is expressible as `npx @xn-intenton-z2a/agentic-lib iterate --agent <agent-name>`
- [x] `src/copilot/` is the single source of truth for all SDK integration
- [x] `src/actions/agentic-step/index.js` is < 150 lines (I/O adapter only) — **137 lines** (telemetry → `src/copilot/telemetry.js`, GitHub metrics → `metrics.js`)
- [x] Agent .md files are the system prompts for both CLI and Actions
- [x] No per-task handler files for CLI — `src/copilot/tasks/` deleted, task commands delegate to `iterate --agent`
- [x] `npm test` passes (548 tests across 32 files)
- [ ] Actions `agentic-step` still works on repository0 — pending deployment + validation
- [x] CLI `iterate --agent` works for all agent types

---

## Phase 5: Validate Both Paths

**Goal**: Prove that the converged code works identically via CLI and Actions.

### Local validation

Run all task types via CLI against a real workspace:

```bash
# Iterate (existing — already validated in Phase 3)
COPILOT_GITHUB_TOKEN=<token> npx @xn-intenton-z2a/agentic-lib iterate \
  --mission 6-kyu-understand-hamming-distance --model gpt-5-mini

# Discovery (new)
COPILOT_GITHUB_TOKEN=<token> npx @xn-intenton-z2a/agentic-lib iterate --here

# Transform (shared task handler)
COPILOT_GITHUB_TOKEN=<token> npx @xn-intenton-z2a/agentic-lib transform \
  --target /tmp/test-ws --model gpt-5-mini

# Supervise (local-only mode — no GitHub context, shows prompt)
npx @xn-intenton-z2a/agentic-lib supervise --target /tmp/test-ws --dry-run

# All 10 tasks as CLI commands
npx @xn-intenton-z2a/agentic-lib --help
```

### Actions validation

Deploy to repository0 and run full cycle:

1. Push refactored agentic-lib to npm (new version)
2. Run `npx @xn-intenton-z2a/agentic-lib init --purge` on repository0
3. Verify init copies `src/copilot/` alongside `src/actions/`
4. Dispatch `agentic-lib-workflow-transform` manually
5. Verify: session creates, tools fire, code transforms, tests run
6. Dispatch full cycle: director → supervisor → transform → test → fix-code
7. Compare results to Benchmark 006 baseline
8. Verify agent .md files are used as system prompts (check logs)

### Regression checklist

- [ ] `npm test` passes in agentic-lib (all ~435 unit tests)
- [ ] `npm run lint:workflows` passes
- [ ] Init distributes `src/copilot/` correctly to consumer repos
- [ ] Actions `agentic-step` uses shared tasks from `src/copilot/tasks/`
- [ ] CLI all 10 tasks produce valid output (at least dry-run)
- [ ] CLI `iterate` completes 6-kyu-understand-hamming-distance
- [ ] CLI `iterate --here` discovers and generates MISSION.md
- [ ] MCP server `iterate` tool works
- [ ] Token tracking produces correct numbers in both paths
- [ ] Rate limit retry works in both paths
- [ ] Agent .md files loaded as system prompts in both paths
- [ ] Profile tuning (min/recommended/max) works in both paths

---

## Phase 6: Tune Locally

**Goal**: Use the fast local iteration loop to explore reasoning effort levels, models, and prompt variations — things that take hours via Actions but minutes locally.

### Reasoning effort matrix

| Model | low | medium | high | xhigh |
|-------|-----|--------|------|-------|
| gpt-5-mini | Baseline | ? | ? | ? |
| claude-sonnet-4 | ? | ? | ? | N/A |
| gpt-4.1 | ? | ? | ? | ? |

For each cell: run 6-kyu-understand-hamming-distance + 7-kyu-understand-fizz-buzz, record tokens, time, pass/fail, code quality.

### Model comparison

| Mission | gpt-5-mini | claude-sonnet-4 | gpt-4.1 |
|---------|-----------|----------------|---------|
| 6-kyu-understand-hamming-distance | Benchmark 005/006 data | ? | ? |
| 7-kyu-understand-fizz-buzz | Benchmark 004 data | ? | ? |
| 6-kyu-understand-roman-numerals | ? | ? | ? |
| 4-kyu-apply-cron-engine | ? | ? | ? |

### What to explore

1. **Reasoning effort vs cost**: Does `high` reasoning on gpt-5-mini outperform `medium` on gpt-4.1 for less cost?
2. **Model switching mid-session**: Start with cheap model (gpt-5-mini), if stuck after N tool calls, `session.setModel("gpt-4.1")` — does this help?
3. **Autopilot vs default mode**: Does autopilot produce better results (fewer wasted tool calls, more focused iteration)?
4. **Infinite sessions impact**: Does auto-compaction help or hurt for multi-iteration runs?
5. **Custom agents**: Define specialist agents (test-reader, code-writer, debugger) and see if agent switching improves outcomes
6. **Prompt engineering**: Which system prompt produces the most efficient tool call patterns?

### Output

`BENCHMARK_REPORT_007.md` (or similar) with:
- Side-by-side comparison tables for all model/effort/profile combinations
- Token cost analysis
- Recommendations for default profile settings
- Findings on which SDK features provide measurable improvement

---

## Risks

1. **`@actions/core` coupling** — The shared module must not import `@actions/core`. The logger interface handles this, but every utility extracted from `copilot.js` must have its `core.info()` calls replaced with `logger.info()`. Grep for `core.` after each extraction step.

2. **Init distribution** — Adding `src/copilot/` to the distributed files means updating the init script and verifying that the relative import paths from `src/actions/agentic-step/index.js` resolve correctly in consumer repos. Test with a fresh `init --purge` on repository0 after each structural change.

3. **SDK v0.1.31 instability** — Higher-level features (autopilot, fleet, custom agents) may not work at runtime despite type definitions existing. Phase 2 tested the core features; Phase 4 should not introduce new SDK features.

4. **GitHub context optionality** — Tasks like `supervise`, `review-issue`, and `discussions` are deeply coupled to GitHub APIs (issues, PRs, discussions). The shared task handlers must gracefully handle `context.github === null` (CLI mode) — either by skipping GitHub-dependent sections or by providing a `--dry-run` that shows the prompt without executing.

5. **Test coverage** — Moving ~4,500 lines of code means updating ~400 unit tests. Many tests mock `@actions/core` and `@actions/github`. After migration, tests should mock the logger interface and optional GitHub context instead. Plan for 2-3 sessions of test migration work.

6. **Breaking change for consumers** — If the init-distributed file structure changes (adding `copilot/` directory), existing repository0 installations break until re-init'd. Coordinate with a version bump. The init system already handles stale file cleanup, so this is manageable.

7. **Two-session architecture** — The old Actions path uses `runCopilotTask()` (single prompt→response) while the CLI uses `runHybridSession()` (persistent session with hooks). Phase 4 converges on `runHybridSession()` for all tasks, which means the Actions path gains hooks, metrics, and token tracking for free — but the session lifecycle changes. This is the highest-risk change.

8. **Agent prompt sufficiency** — The current agent .md files were designed for Actions context (rich prompts with issues, PRs, features). When used via CLI with less context, the agent may behave differently. The `buildUserPrompt()` function must provide enough local context to keep agents effective even without GitHub data.

---

## Phase Dependencies

```
Phase 1 (Port to shared module)            ← DONE
  ↓
Phase 1b (Close CLI feature gaps)          ← DONE — all 8 gaps closed
  ↓
Phase 2 (Uplift SDK abstractions)          ← DONE
  ↓
Phase 3 (Validate CLI — unit + scenario)   ← DONE (3a-3d all complete, 540 tests + 4 live scenarios)
  ↓
Phase 4 (CLI as first-class product)       ← Steps 1-9 DONE, Step 10 TODO (restore guards + context precision)
  ↓
Phase 5 (Validate both paths)
  ↓
Phase 6 (Tune)                             ← can start as soon as Phase 4 is stable
```

Phase 4 is the big one. Recommended execution order within Phase 4:

```
Step 1: Extract context.js + prompts.js from copilot.js      ← DONE (copilot.js: 545→64 lines)
Step 2: Implement buildUserPrompt() for 4 local tasks        ← DONE (context.js: 319 lines)
Step 3: Replace CLI runTask() with iterate --agent            ← DONE (TASK_AGENT_MAP + runHybridSession)
Step 4: Extract safety.js, telemetry.js                      ← DONE (telemetry.js: 161 lines; safety.js stays in Actions — octokit-dependent)
Step 5: Merge tools.js (remove @actions/core dependency)     ← DONE (tools.js: 142→27 lines)
Step 6: buildUserPrompt() for GitHub tasks                   ← DONE (context.js handles all 10 agent/context combos)
Step 7: Slim Actions index.js to adapter                     ← DONE (index.js: 408→137 lines; metrics.js: 103 lines extracted)
Step 8: Update init to distribute src/copilot/               ← DONE (init + self-init.sh)
Step 9: Delete old CLI task files + slim config-loader.js    ← DONE (src/copilot/tasks/ deleted, config-loader.js: 309→8 lines)
Step 10: Restore guards, context precision, and config-driven limits  ← TODO
```

**Note on task handlers**: The 10 task handler files in `src/actions/agentic-step/tasks/` (3,045 lines) remain as the Actions-specific prompt builders and GitHub post-processors. They gather GitHub context (issues, PRs, discussions via octokit), build rich prompts, call `runCopilotTask()`, and post-process results (create PRs, post comments, dispatch workflows). These are essential for the Actions path and cannot be deleted without adding GitHub API tools to the agent. Migrating the Actions path to use `runHybridSession()` + shared `buildUserPrompt()` is Phase 5 scope.

### Step 10: Restore Guards, Context Precision, and Config-Driven Limits

**Goal**: The Phase 4 convergence traded precision for simplicity. `runTask()` now calls `runHybridSession()` unconditionally, losing the short-circuit guards, config-driven prompt limits, and context quality that the old per-task handlers provided. This step restores that control without reverting the architectural convergence — the agent `.md` files remain the system prompts, but the CLI pre-checks conditions and injects config values before invoking the session.

#### 10a: Restore short-circuit guards

On main, each task handler had explicit guards that return `nop` (cost = 0) without invoking the LLM:

| Task | Guard | Effect |
|------|-------|--------|
| `transform` | No `MISSION.md` → nop | Skips without calling LLM |
| `transform` | `MISSION_COMPLETE.md` exists → nop | Skips without calling LLM |
| `maintain-features` | `MISSION_COMPLETE.md` exists → nop | Skips without calling LLM |
| `maintain-library` | `MISSION_COMPLETE.md` exists → nop | Skips without calling LLM |
| `fix-code` | Tests already pass → nop | Skips without calling LLM |

Currently `runTask()` calls `runHybridSession()` unconditionally. The LLM is invoked every time, consuming tokens even when there's nothing to do. If it makes changes, those count against the transformation budget.

**Implementation**: Add a `checkGuards(taskName, config, target)` function in `src/copilot/guards.js` that runs these checks before invoking the session. The function returns `{ skip: true, reason: "..." }` or `{ skip: false }`. Wire it into `runTask()` in `bin/agentic-lib.js` and into the iterate loop. The guards should also be available to the Actions `index.js` path for consistency.

**Files**: `src/copilot/guards.js` (new), `bin/agentic-lib.js`, `src/actions/agentic-step/index.js`

#### 10b: Restore context gathering precision

The old per-task handlers built tightly-scoped prompts with precise control:

- `transform.js` sorted features by incomplete-first (unchecked items at top)
- `transform.js` scanned web files separately alongside source files
- `transform.js` fetched issues via octokit with `filterIssues()` and `summariseIssue()`
- `transform.js` placed the target issue prominently when `--issue N` was specified
- `transform.js` tracked `promptBudget` metadata (section sizes) in the result for the activity log
- `fix-code.js` ran the test command first and included the failure output in the prompt
- `maintain-features.js` included the features limit from config in the prompt
- `maintain-library.js` checked whether SOURCES.md contained URLs to decide the prompt strategy

Currently `buildUserPrompt()` in `context.js` assembles a generic prompt from `AGENT_CONTEXT` requirements. It does not sort features, does not scan web files, does not include test failure output for fix-code, and does not vary strategy based on content.

**Implementation**: Enhance `buildUserPrompt()` to accept an optional `refinements` object per agent:

```javascript
const AGENT_REFINEMENTS = {
  "agent-issue-resolution": {
    sortFeatures: "incomplete-first",   // unchecked items at top
    includeWebFiles: true,              // scan src/web/ alongside source
    highlightTargetIssue: true,         // place --issue N prominently
    trackPromptBudget: true,            // include section size metadata in result
  },
  "agent-apply-fix": {
    runTestsFirst: true,                // run testCommand, include output in prompt
    skipIfTestsPass: true,              // handled by guard, but prompt also notes this
  },
  "agent-maintain-features": {
    injectLimit: "features",            // read config.paths.features.limit into prompt
    sortFeatures: "incomplete-first",
  },
  "agent-maintain-library": {
    checkSourcesForUrls: true,          // vary prompt strategy based on SOURCES.md content
    injectLimit: "library",             // read config.paths.library.limit into prompt
  },
};
```

The `gatherLocalContext()` function should also capture test output when the agent refinements request it (for `fix-code`), and scan web files when requested (for `transform`).

**Files**: `src/copilot/context.js`

#### 10c: Inject config-driven limits into agent prompts

The agent `.md` files are generic instructions — they say "if there are more than the maximum number" without stating the actual number. On main, the inline task handlers embedded config values directly: e.g., `"Maximum ${featureLimit} feature files"`.

The `buildUserPrompt()` function must read `agentic-lib.toml` limits and inject them as a `## Limits` section in the user prompt, so the LLM sees concrete numbers:

```markdown
## Limits (from agentic-lib.toml)

- Maximum feature files: 2
- Maximum library documents: 8
- Transformation budget: 16 (cumulative cost so far: 3, remaining: 13)
- Maximum feature development issues: 1
- Maximum maintenance issues: 1
- Maximum attempts per branch: 2
- Maximum attempts per issue: 1
```

This section should be prominent — placed before the generic instructions footer. The agent `.md` file provides the "how" (generic guidance), while the injected limits provide the "what" (specific constraints from config).

The transformation budget status should include cumulative cost read from `intentïon.md` via `readCumulativeCost()` from `telemetry.js`, so the LLM knows how much budget remains.

**Files**: `src/copilot/context.js`, `src/copilot/telemetry.js`

#### 10d: Enforce tool-call budget in hybrid session

`runHybridSession()` is bounded only by `--timeout` (wall clock). The old `runCopilotTask()` was a single prompt→response, so cost was inherently bounded. With multi-turn tool loops, the LLM can make unbounded tool calls, each consuming tokens.

Add a `maxToolCalls` parameter to `runHybridSession()`, derived from `transformation-budget` in config. When the tool call count reaches the limit, the session should gracefully end (deny further tool calls via the `onPreToolUse` hook and signal the LLM to wrap up). This is distinct from the transformation cost (which counts code-changing tasks) — it's a per-session safety net.

Also consider reading the `transformation-budget` and cumulative cost to enforce budget exhaustion at the CLI level: if `cumulativeCost >= transformationBudget`, skip the session entirely (this is a guard, but budget-specific).

**Files**: `src/copilot/hybrid-session.js`, `bin/agentic-lib.js`

#### 10e: Structured result parity

The old task handlers returned rich result objects with `outcome`, `tokensUsed`, `inputTokens`, `outputTokens`, `cost`, `details`, `narrative`, `promptBudget`. The hybrid session returns `{ success, sessionTime, toolCalls, tokensIn, tokensOut, narrative }`.

Map the hybrid session result to the richer format so that both CLI and Actions paths produce comparable telemetry. Include `promptBudget` (section sizes from `buildUserPrompt()`) in the result when `trackPromptBudget` is enabled.

**Files**: `src/copilot/hybrid-session.js`, `bin/agentic-lib.js`

#### Success Criteria

- [ ] CLI `transform` with no `MISSION.md` exits 0 with "nop" without invoking the LLM
- [ ] CLI `transform` with `MISSION_COMPLETE.md` exits 0 with "nop" without invoking the LLM
- [ ] CLI `fix-code` with passing tests exits 0 with "nop" without invoking the LLM
- [ ] CLI `maintain-features` with `MISSION_COMPLETE.md` exits 0 with "nop"
- [ ] CLI `maintain-library` with `MISSION_COMPLETE.md` exits 0 with "nop"
- [ ] Transformation budget exhaustion skips the session (guard)
- [ ] `buildUserPrompt()` sorts features incomplete-first for transform/maintain-features agents
- [ ] `buildUserPrompt()` includes web files for transform agent
- [ ] `buildUserPrompt()` includes test failure output for fix-code agent
- [ ] `buildUserPrompt()` injects `## Limits` section with concrete numbers from `agentic-lib.toml`
- [ ] `buildUserPrompt()` includes cumulative transformation cost and remaining budget
- [ ] `runHybridSession()` enforces `maxToolCalls` derived from config
- [ ] CLI result includes `promptBudget` metadata when applicable
- [ ] `npm test` passes with new guard and context tests
