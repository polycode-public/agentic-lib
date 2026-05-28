# Plan: Multi-LLM Provider Abstraction

## Goal

Extract a provider interface from the existing Copilot SDK integration so that
agentic-lib can run against multiple LLM backends — Copilot SDK, Anthropic API,
and local models via node-llama-cpp — selected by a `provider` field in
`agentic-lib.toml` alongside the existing `model` field.

---

## Part 1: Current State — All Interfaces with Copilot

### 1.1 The `agentic-step` GitHub Action (central integration)

All autonomous code decisions funnel through a single composite action at
`.github/agentic-lib/actions/agentic-step/`. It wraps `@github/copilot-sdk`
(`CopilotClient`) and exposes 9 task handlers:

| Task | Purpose | Writes? |
|------|---------|---------|
| `supervise` | Decides what the repo should do next (create issues, prioritise) | No |
| `transform` | Resolves an issue by modifying source code on a branch | Yes |
| `fix-code` | Fixes failing tests or merge conflicts on a stuck PR | Yes |
| `maintain-features` | Creates/updates feature markdown files | Yes |
| `maintain-library` | Creates/updates library research documents | Yes |
| `review-issue` | Closes resolved issues, validates done-ness | No |
| `enhance-issue` | Adds acceptance criteria to issues, marks them `ready` | No |
| `discussions` | Responds to GitHub Discussion threads | No |
| `resolve-issue` | Direct issue resolution (used via MCP) | Yes |

Each task gets a Copilot SDK session with 4 tools (`read_file`, `write_file`,
`list_files`, `run_command`) that give the LLM filesystem and shell access
within writable-path constraints.

**Auth**: `COPILOT_GITHUB_TOKEN` secret overrides `GITHUB_TOKEN`/`GH_TOKEN` in
the subprocess env so the Copilot CLI auto-login picks up the PAT.

### 1.2 Workflow-level entry points

#### `agentic-lib-workflow.yml` — Main autonomous pipeline

- **Triggers**: cron schedule (every 10 min when active), `workflow_dispatch`, `workflow_call`
- **Jobs that call agentic-step**:
  - **maintain** — `maintain-features` + `maintain-library` (pushes directly to main)
  - **supervisor** — `supervise` (decides what to do based on telemetry)
  - **fix-stuck** — `fix-code` (fixes failing PRs; trivial merge resolution then LLM fix)
  - **review-features** — `review-issue` + `enhance-issue`
  - **dev** — `transform` (creates branch, transforms code, opens PR, attempts merge)
- **Model selection**: `gpt-5-mini` (default), `claude-sonnet-4`, `gpt-4.1`

#### `agentic-lib-bot.yml` — Discussions bot

- **Triggers**: `discussion` events (created/edited), `discussion_comment`, `workflow_dispatch`
- Calls agentic-step with `discussions` task
- Can **escalate** by dispatching `agentic-lib-workflow.yml` with a message
  (when the LLM returns `action: request-supervisor`)

#### `agentic-lib-schedule.yml` — Schedule manager

- Changes the cron frequency of `agentic-lib-workflow.yml` and updates model in
  `agentic-lib.toml`
- Not itself a Copilot consumer, but controls how often Copilot runs

#### `agentic-lib-init.yml` — Init/update

- Runs `npx @xn-intenton-z2a/agentic-lib init` to pull latest actions,
  workflows, agents from the npm package
- Distributes the agentic-step action (including Copilot SDK code) to the repo

### 1.3 `copilot-setup-steps.yml` — Copilot Coding Agent sandbox

At `.github/copilot-setup-steps.yml` — configures the environment for GitHub
Copilot's **native coding agent** (assigned to issues via the GitHub UI). Sets
up Node, installs deps, runs tests. Separate from agentic-step — this is
GitHub's built-in Copilot SWE agent. Not affected by this plan.

### 1.4 MCP Server (local iteration)

The agentic-lib npm package includes an MCP server
(`npx @xn-intenton-z2a/agentic-lib mcp`) for local iteration:

| Tool | Copilot involvement |
|------|-------------------|
| `iterate` | Runs a Copilot SDK session locally (needs `COPILOT_GITHUB_TOKEN`) |
| `prepare_iteration` | Gathers context; Claude does the work (no Copilot needed) |
| `workspace_create/read_file/write_file/exec` | Local workspace management |
| `run_tests` | Runs tests in a workspace |

Two modes: **Copilot mode** (`iterate`) and **Claude mode** (`prepare_iteration`
then manual transformation).

---

## Part 2: The Current Shared Interface

### 2.1 Where we are now

The Copilot SDK is already fully encapsulated behind **one function**:

```javascript
runCopilotTask({
  model,           // "gpt-5-mini", "claude-sonnet-4", "gpt-4.1"
  systemMessage,   // string
  prompt,          // string
  writablePaths,   // string[]
  githubToken,     // optional string
  tuning,          // { reasoningEffort, infiniteSessions, ... }
  profileName,     // "min" | "recommended" | "max"
  maxRetries,      // number (default 3)
})
// Returns: { content, tokensUsed, inputTokens, outputTokens, cost }
```

**Location**: `src/actions/agentic-step/copilot.js`

Only **two files** import directly from `@github/copilot-sdk`:

| File | Import | Purpose |
|------|--------|---------|
| `copilot.js` | `CopilotClient`, `approveAll` | Session lifecycle, auth, retry |
| `tools.js` | `defineTool` | File I/O and shell tool definitions |

No task handler imports the SDK directly. All 9 are thin wrappers that:
1. Build context (read files, scan directories, fetch issues)
2. Construct a system message and prompt
3. Call `runCopilotTask()` with standardised arguments
4. Parse the LLM response (extract `[NARRATIVE]`, structured actions)
5. Return a result object for `index.js` to log and output

### 2.2 What's already clean

- **Single function gateway** — `runCopilotTask()` is the only SDK call site
- **No SDK leakage** — task handlers never see `CopilotClient`, `Session`, events
- **Clean return type** — `{ content, tokensUsed, inputTokens, outputTokens, cost }`
- **Tool definitions isolated** — `createAgentTools()` returns opaque tool array
- **Auth abstracted** — `buildClientOptions()` handles token env-var override

### 2.3 What's Copilot-specific (needs abstracting)

| Coupling point | Where | What needs to change |
|----------------|-------|---------------------|
| `defineTool()` from Copilot SDK | `tools.js:9` | Tool specs become provider-neutral; each provider wraps them |
| Session config concepts | `copilot.js:321–344` | `reasoningEffort`, `infiniteSessions`, `onPermissionRequest: approveAll` are Copilot SDK concepts |
| Event handling | `copilot.js:371–394` | `session.on()` with Copilot event types; each provider reports usage differently |
| `sendAndWait()` API | `copilot.js:398` | Different providers have different chat/prompt APIs |
| Model names | `agentic-lib.toml` | Provider-specific; interpretation shifts with provider |
| `COPILOT_GITHUB_TOKEN` | `copilot.js:179` | Auth mechanism tied to Copilot; other providers use different env vars |
| `supportsReasoningEffort()` allowlist | `copilot.js:16` | Copilot model knowledge baked in; needs per-provider logic |

---

## Part 3: The Three Providers

### 3.1 Copilot SDK (`provider = "copilot"`)

**What it is**: `@github/copilot-sdk` — GitHub's SDK for Copilot model access.
Runs models (GPT-5-mini, Claude Sonnet 4, GPT-4.1) through GitHub's
infrastructure using a GitHub PAT.

**Auth**: `COPILOT_GITHUB_TOKEN` — a GitHub PAT with Copilot access. Overrides
`GITHUB_TOKEN`/`GH_TOKEN` in subprocess env for the CLI auto-login flow.

**Tool calling**: `defineTool(name, { description, parameters, handler })`.
Tools are passed to `createSession()`. The SDK handles the tool call loop —
model calls a tool, SDK invokes handler, feeds result back, repeats until model
produces final text.

**Capabilities and tuning**:

| Parameter | Support | Notes |
|-----------|---------|-------|
| `reasoningEffort` | `gpt-5-mini`, `o4-mini` only | Other models ignore it silently |
| `infiniteSessions` | All models | Enables session compaction for long conversations |
| `temperature` | Not exposed | Controlled by SDK internally |
| `maxTokens` | Not exposed directly | 600s timeout on `sendAndWait()` |
| System message | Object `{ content: string }` | |
| Response format | `session.sendAndWait()` → events → content string | Token usage from `assistant.usage` events |

**Return format**: Content extracted from response events. Token counts
accumulated from `assistant.usage` event stream. Cost reported by SDK.

**Retry**: Built into `runCopilotTask()` — retries on HTTP 429 with exponential
backoff, up to `maxRetries` attempts.

### 3.2 Anthropic API (`provider = "anthropic"`)

**What it is**: Direct access to Claude models via the Anthropic API using
`@anthropic-ai/sdk`.

**Auth**: `ANTHROPIC_API_KEY` — standard Anthropic API key.

**Tool calling**: Anthropic's tool-use API. Tools are defined as JSON schemas in
the request; the API returns `tool_use` content blocks; our code invokes the
handler and sends back `tool_result` blocks. Unlike Copilot SDK, **we must
implement the tool call loop ourselves**.

```javascript
// Anthropic tool definition format
{
  name: "read_file",
  description: "Read the contents of a file.",
  input_schema: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"]
  }
}

// Tool call loop:
// 1. Send messages with tools array
// 2. If response has stop_reason "tool_use":
//    - Extract tool_use content blocks (each has id, name, input)
//    - Execute our handler with the input
//    - Append assistant message + tool_result messages (with tool_use_id)
//    - Send again
// 3. If response has stop_reason "end_turn":
//    - Extract text content blocks
//    - Return concatenated text
```

**Capabilities and tuning**:

| Parameter | Support | Notes |
|-----------|---------|-------|
| `reasoningEffort` | Not a native parameter | Map to `temperature` as a heuristic |
| `temperature` | All models, 0.0–1.0 | Lower = more deterministic |
| `max_tokens` | All models, **required** | Must be set explicitly; API rejects requests without it |
| `extended_thinking` | Sonnet/Opus with `thinking` block type | Could map from `reasoningEffort: high` in future |
| System message | Top-level `system` parameter (string or content blocks) | Different from Copilot's `{ content }` object |
| Response format | Synchronous JSON with `content` array | Text in `text` blocks, tool calls in `tool_use` blocks |
| Token usage | `response.usage.input_tokens`, `response.usage.output_tokens` | Direct on response, no event stream needed |

**Model names**:

| Copilot name | Anthropic equivalent | Notes |
|-------------|---------------------|-------|
| `claude-sonnet-4` | `claude-sonnet-4-20250514` | Must use full model ID with date suffix |
| — | `claude-haiku-4-5-20251001` | Fastest/cheapest, good for maintain/review tasks |
| — | `claude-opus-4-20250514` | Most capable, expensive |
| — | `claude-sonnet-4-6-20260320` | Latest Sonnet |

**Key differences from Copilot SDK**:

| Aspect | Copilot SDK | Anthropic API |
|--------|-------------|---------------|
| Tool call loop | Handled by SDK | Must implement manually |
| System message | `{ content: string }` | `string` or content blocks |
| Token usage | Event stream accumulation | Direct on response object |
| Rate limiting | HTTP 429 | HTTP 429 with `retry-after` header; also 529 for overload |
| Cost | Reported in events | Calculable from token counts + model pricing |
| Auth | GitHub PAT in env vars | API key in constructor or `ANTHROPIC_API_KEY` env var |
| `max_tokens` | Not required | **Required** — API rejects without it |
| Streaming | Event-based (`session.on()`) | Optional SSE streaming (not needed for this use case) |

**Prompt compatibility**: Claude models respond well to the same prompts as GPT
models. Key notes:
- Claude follows system prompts more literally — less prompt engineering needed
- Claude handles structured output (JSON, markdown) well without special instructions
- Claude handles long context well — the large prompts built by task handlers work as-is
- The `[NARRATIVE]` extraction tag works identically
- The `[ACTION]` structured output tags work identically

### 3.3 Local LLM via node-llama-cpp (`provider = "local"`)

**What it is**: In-process LLM inference using `node-llama-cpp` with GGUF
models. No network dependency. Proven by spike
(PLAN_1_LOCAL_SCENARIO_TESTS_SPIKE.md).

**Auth**: None required. Model files downloaded from HuggingFace on first use.

**Verified model**: Llama-3.2-3B-Instruct Q4_K_M (2GB). Default URI:
`hf:bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M`. Override via
`LOCAL_LLM_MODEL_URI` env var or `model` field in config.

**Tool calling**: `defineChatSessionFunction()` from `node-llama-cpp`. Functions
are passed to `session.prompt({ functions })`. The library handles the tool call
loop internally using grammar-constrained generation — forces valid JSON tool
calls from the model even at 3B parameters.

```javascript
// node-llama-cpp tool definition format
import { defineChatSessionFunction } from "node-llama-cpp";

const functions = {
  read_file: defineChatSessionFunction({
    description: "Read the contents of a file.",
    params: {                           // Note: "params" not "parameters"
      type: "object",
      properties: { path: { type: "string" } }
    },
    async handler({ path }) {
      return readFileSync(path, "utf8"); // MUST return plain string, NOT JSON
    }
  })
};

const session = new LlamaChatSession({
  contextSequence: context.getSequence(),
  systemPrompt: "You are a code transformation agent.",  // plain string
});

const response = await session.prompt(userPrompt, {
  functions,
  maxParallelFunctionCalls: 1,
  maxTokens: 512,
  temperature: 0.3,
});
// response is a string (final text after all tool calls complete)
```

**Capabilities and tuning**:

| Parameter | Support | Notes |
|-----------|---------|-------|
| `reasoningEffort` | Not applicable | Small models don't benefit; map to `temperature` |
| `temperature` | Yes, 0.0–1.0 | Spike used 0.3 for reliability |
| `maxTokens` | Yes | Spike used 512; needs to be modest to prevent loops |
| System message | Plain string via `systemPrompt` constructor param | |
| Response format | `session.prompt()` returns final string after tool calls | |
| Token usage | Not directly reported | Return 0; can estimate from context size |
| Cost | N/A | Always 0 (local compute) |

**Critical findings from spike** (PLAN_1_LOCAL_SCENARIO_TESTS_SPIKE.md):

1. **Tool handlers MUST return plain strings, NOT `JSON.stringify({...})`.**
   JSON-wrapped returns confuse the model into echoing JSON as file content.
   This is the single most important finding for the local provider adapter.
2. **Model makes extra tool calls** — 5–21 calls instead of the expected 2, but
   produces correct output. Assertions must be loose.
3. **~26s per prompt on CPU** — acceptable for scenario testing, not for production CI.
4. **Grammar-constrained generation** forces valid JSON tool call parameters
   even from a 3B model — this is the key differentiator vs raw HTTP/Ollama.
5. **System prompt is a plain string**, not an object.

**Model selection results from spike**:

| Model | Size | Function Calling | Content Quality | Verdict |
|-------|------|-----------------|----------------|---------|
| SmolLM2-360M-Instruct | 386MB | None — never calls tools | N/A | Unusable |
| Qwen2.5-0.5B-Instruct | 676MB | Partial (read only) | N/A | Unusable |
| Llama-3.2-1B-Instruct | 808MB | Works but infinite loops | Garbage | Unusable |
| **Llama-3.2-3B-Instruct** | **2GB** | **Works** | **Correct JS** | **Use this** |

**Key differences from Copilot SDK**:

| Aspect | Copilot SDK | node-llama-cpp |
|--------|-------------|----------------|
| Tool call loop | Handled by SDK | Handled by library (grammar-constrained) |
| Tool definition | `defineTool()` | `defineChatSessionFunction()` |
| Tool schema key | `parameters` | `params` |
| Tool return format | JSON objects fine | **Plain strings only** (critical) |
| System message | `{ content: string }` | Plain string |
| Response method | `sendAndWait()` → events | `prompt()` → returns string directly |
| Token usage | Event stream | Not reported (return 0) |
| Cost | Reported by SDK | Zero (local compute) |
| Auth | GitHub PAT | None |
| Model quality | GPT-5-mini, Claude Sonnet 4, GPT-4.1 | Llama-3.2-3B (much weaker) |
| Speed | Network-bound (~5–15s) | CPU-bound (~26–72s) |
| Reliability | High (cloud models) | Medium (small model, extra tool calls, occasional garbled paths) |

---

## Part 4: The Provider Interface

### 4.1 Design

One abstract interface that all providers implement. Task handlers call it via a
factory function without knowing which provider is behind it.

```javascript
// provider.js — Provider interface and factory

/**
 * @typedef {Object} RunTaskOptions
 * @property {string} model          - Provider-specific model identifier
 * @property {string} systemMessage  - System prompt text (plain string for all providers)
 * @property {string} prompt         - User prompt text
 * @property {string[]} writablePaths - Paths the agent may write to (tool safety boundary)
 * @property {Object} [tuning]       - Provider-neutral tuning hints
 * @property {string} [tuning.reasoningEffort] - "low" | "medium" | "high" (hint; provider may ignore)
 * @property {boolean} [tuning.infiniteSessions] - hint for long-running sessions
 * @property {number} [tuning.maxRetries]      - Retry attempts on transient errors
 * @property {string} [profileName]  - Tuning profile name for logging
 */

/**
 * @typedef {Object} RunTaskResult
 * @property {string} content       - LLM response text (after all tool calls complete)
 * @property {number} tokensUsed    - Total tokens (input + output), 0 if unavailable
 * @property {number} inputTokens   - Input tokens, 0 if unavailable
 * @property {number} outputTokens  - Output tokens, 0 if unavailable
 * @property {number} cost          - Provider-reported cost in USD, 0 if unavailable
 */

/**
 * @typedef {Object} LLMProvider
 * @property {function(RunTaskOptions): Promise<RunTaskResult>} runTask
 */

/**
 * Create a provider from configuration.
 *
 * @param {string} providerName - "copilot" | "anthropic" | "local"
 * @param {Object} [providerConfig] - Provider-specific config
 * @returns {LLMProvider}
 */
export function createProvider(providerName, providerConfig) {
  switch (providerName) {
    case "copilot":   return new CopilotProvider(providerConfig);
    case "anthropic": return new AnthropicProvider(providerConfig);
    case "local":     return new LocalProvider(providerConfig);
    default:          throw new Error(`Unknown provider: ${providerName}`);
  }
}
```

### 4.2 What stays the same (task handler call site)

Every task handler currently does:

```javascript
const { content, tokensUsed, inputTokens, outputTokens, cost } =
  await runCopilotTask({ model, systemMessage, prompt, writablePaths, tuning, profileName });
```

After refactoring:

```javascript
const provider = createProvider(config.provider, config.providerConfig);
const { content, tokensUsed, inputTokens, outputTokens, cost } =
  await provider.runTask({ model, systemMessage, prompt, writablePaths, tuning, profileName });
```

The `RunTaskResult` shape is identical. Task handlers need minimal changes —
just the import and call site, not their prompt construction or result parsing.

### 4.3 Tool abstraction

Currently `tools.js` creates tools using `defineTool()` from `@github/copilot-sdk`.
Each provider has a different tool definition format:

| Provider | Definition API | Schema key | Return format | Tool call loop |
|----------|---------------|-----------|--------------|----------------|
| Copilot SDK | `defineTool(name, { description, parameters, handler })` | `parameters` | JSON objects | SDK handles internally |
| Anthropic API | `{ name, description, input_schema }` + manual dispatch | `input_schema` | JSON string in `tool_result` | We implement the loop |
| node-llama-cpp | `defineChatSessionFunction({ description, params, handler })` | `params` | **Plain strings only** | Library handles internally |

The solution: define tools as **provider-neutral specs** with handler logic,
then each provider adapter wraps them:

```javascript
// tool-specs.js — Provider-neutral tool specifications

/**
 * @typedef {Object} ToolSpec
 * @property {string} name
 * @property {string} description
 * @property {Object} parameters      - JSON Schema (standard format, "parameters" key)
 * @property {function(Object): *} handler - The tool implementation
 */

export function createToolSpecs(writablePaths) {
  return [
    {
      name: "read_file",
      description: "Read the contents of a file at the given path.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "File path to read" } },
        required: ["path"],
      },
      handler: ({ path }) => { /* ... existing logic from tools.js ... */ },
    },
    // write_file, list_files, run_command — same handler logic as today
  ];
}
```

Each provider converts `ToolSpec[]` to its native format:

```javascript
// In providers/copilot.js:
import { defineTool } from "@github/copilot-sdk";
const tools = specs.map(s => defineTool(s.name, {
  description: s.description, parameters: s.parameters, handler: s.handler
}));

// In providers/anthropic.js:
// Tools as schema objects for the API request:
const tools = specs.map(s => ({
  name: s.name, description: s.description, input_schema: s.parameters
}));
// Handler dispatch in the tool call loop:
function dispatchTool(name, input) {
  const spec = specs.find(s => s.name === name);
  const result = spec.handler(input);
  return typeof result === "string" ? result : JSON.stringify(result);
}

// In providers/local.js:
import { defineChatSessionFunction } from "node-llama-cpp";
const functions = Object.fromEntries(specs.map(s => [
  s.name,
  defineChatSessionFunction({
    description: s.description,
    params: s.parameters,    // "params" not "parameters"
    handler: (args) => {
      const result = s.handler(args);
      // CRITICAL: local models need plain strings, not JSON
      if (typeof result === "object") {
        return result.content || result.error || JSON.stringify(result);
      }
      return String(result);
    }
  })
]));
```

### 4.4 Tuning parameter mapping

The `tuning` object from `agentic-lib.toml` carries provider-neutral hints.
Each provider maps them to its native parameters:

| Tuning hint | Copilot SDK | Anthropic API | node-llama-cpp |
|------------|-------------|---------------|----------------|
| `reasoningEffort: "low"` | `sessionConfig.reasoningEffort = "low"` (gpt-5-mini/o4-mini only) | `temperature: 0.3` | `temperature: 0.2` |
| `reasoningEffort: "medium"` | `sessionConfig.reasoningEffort = "medium"` | `temperature: 0.5` | `temperature: 0.3` |
| `reasoningEffort: "high"` | `sessionConfig.reasoningEffort = "high"` | `temperature: 0.7` | `temperature: 0.5` |
| `infiniteSessions: true` | `sessionConfig.infiniteSessions = {}` | No direct equivalent — use large `max_tokens` | No equivalent |
| `maxRetries: 3` | Retry on HTTP 429 | Retry on HTTP 429/529 | N/A (no network) |

**Note on `reasoningEffort`→`temperature` mapping**: This is a coarse heuristic.
`reasoningEffort` in the Copilot SDK adjusts internal model reasoning depth.
For Claude, lower temperature produces more deterministic/focused output, which
is the closest behavioural equivalent. If Anthropic adds explicit thinking
budgets, we'd map there instead.

### 4.5 System message format mapping

Each provider takes system messages differently. The provider interface takes a
**plain string**; each provider wraps it:

| Provider | How system message is passed |
|----------|----------------------------|
| Copilot SDK | `createSession({ systemMessage: { content: text } })` |
| Anthropic API | `client.messages.create({ system: text, ... })` |
| node-llama-cpp | `new LlamaChatSession({ systemPrompt: text })` |

### 4.6 Max tokens handling

| Provider | Behaviour |
|----------|-----------|
| Copilot SDK | Not explicitly required; 600s timeout on `sendAndWait()` |
| Anthropic API | **Required** — must set `max_tokens`. API rejects without it. |
| node-llama-cpp | Optional but important — prevents infinite tool call loops with small models. |

Profile-based defaults:

| Profile | Anthropic `max_tokens` | Local `maxTokens` |
|---------|----------------------|-------------------|
| min | 2048 | 256 |
| recommended | 4096 | 512 |
| max | 8192 | 1024 |

---

## Part 5: Configuration

### 5.1 `agentic-lib.toml` changes

Add `provider` next to `model` in `[tuning]`:

```toml
[tuning]
profile = "recommended"
provider = "copilot"          # copilot | anthropic | local
model = "gpt-5-mini"         # provider-specific model name
```

And optionally in `[schedule]`:

```toml
[schedule]
supervisor = "continuous"
provider = "copilot"          # can differ from [tuning].provider
model = "gpt-5-mini"
```

Default: `provider = "copilot"` (backwards compatible — existing configs work
unchanged with no `provider` field).

### 5.2 Provider-specific auth via env vars

| Provider | Env var | Where configured | Notes |
|----------|---------|-----------------|-------|
| `copilot` | `COPILOT_GITHUB_TOKEN` | GitHub repo secret | GitHub PAT with Copilot access |
| `anthropic` | `ANTHROPIC_API_KEY` | GitHub repo secret or local env | Anthropic API key |
| `local` | `LOCAL_LLM_MODEL_URI` (optional) | Local env | Override default model HuggingFace URI |

In GitHub Actions, these are repository secrets passed via `env:` in the
workflow step. Locally (MCP server, CLI), they come from the shell environment.

### 5.3 Model name examples per provider

Model names are provider-specific. The `model` field is interpreted by the
selected provider:

| Provider | Model examples | Notes |
|----------|---------------|-------|
| `copilot` | `gpt-5-mini`, `claude-sonnet-4`, `gpt-4.1` | Copilot SDK model catalogue |
| `anthropic` | `claude-sonnet-4-20250514`, `claude-haiku-4-5-20251001`, `claude-opus-4-20250514` | Full model ID with date suffix required |
| `local` | `hf:bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M` | HuggingFace URI; resolved by `resolveModelFile()` |

### 5.4 Workflow-level provider selection

The workflow `model` input dropdown remains as-is. Provider comes from
`agentic-lib.toml` by default. The `agentic-step` action gains an optional
`provider` input for per-run override:

```yaml
# In action.yml inputs:
provider:
  description: "LLM provider (overrides config)"
  required: false
  default: ""   # empty = use config value
```

### 5.5 Config loader changes

`config-loader.js` adds provider resolution:

```javascript
return {
  // ... existing fields ...
  provider: toml.tuning?.provider || "copilot",
};
```

---

## Part 6: File Structure

### 6.1 Before (current)

```
src/actions/agentic-step/
  copilot.js          ← auth + session + tools + retry + events (ALL in one file)
  tools.js            ← defineTool() from @github/copilot-sdk
  config-loader.js    ← TOML parsing
  safety.js           ← path enforcement, WIP limits
  logging.js          ← activity logging
  index.js            ← action entry point
  tasks/              ← 9 task handlers (all call runCopilotTask)
```

### 6.2 After (proposed)

```
src/actions/agentic-step/
  provider.js          ← createProvider() factory + typedefs
  providers/
    copilot.js         ← CopilotProvider (extracted from current copilot.js)
    anthropic.js       ← AnthropicProvider (new)
    local.js           ← LocalProvider via node-llama-cpp (new)
  tool-specs.js        ← Provider-neutral tool specs (extracted from tools.js)
  config-loader.js     ← + provider field parsing
  safety.js            ← unchanged
  logging.js           ← unchanged
  index.js             ← uses createProvider() instead of importing runCopilotTask
  tasks/               ← 9 task handlers (call provider.runTask() — minimal change)
```

### 6.3 Replaced files

| Old file | Replaced by |
|----------|-------------|
| `copilot.js` | `provider.js` + `providers/copilot.js` + shared utilities |
| `tools.js` | `tool-specs.js` + per-provider wrapping in `providers/*.js` |

### 6.4 Shared utility functions (stay provider-neutral)

These functions currently live in `copilot.js` but are about **prompt
construction and result parsing**, not about the LLM provider. They move to a
shared utility file (or stay in `provider.js`):

- `cleanSource()` — strips license headers from source for prompts
- `generateOutline()` — structural outline of source files
- `filterIssues()` — filter issues by recency
- `summariseIssue()` — compact issue summary
- `extractFeatureSummary()` — structured feature summary
- `readOptionalFile()` — safe file reading
- `scanDirectory()` — directory scanning with limits
- `formatPathsSection()` — prompt section formatting
- `extractNarrative()` — extract `[NARRATIVE]` from LLM response
- `NARRATIVE_INSTRUCTION` — prompt suffix for narrative extraction

---

## Part 7: Provider Capability Matrix

Not all providers are equal. The system must handle capability differences
gracefully — degrade, not crash.

### 7.1 Capability comparison

| Capability | Copilot SDK | Anthropic API | Local (node-llama-cpp) |
|-----------|-------------|---------------|----------------------|
| **Code quality** | High (GPT-5-mini, Claude Sonnet 4) | High (Claude Sonnet 4, Opus 4) | Low (Llama-3.2-3B) |
| **Function calling** | Reliable | Reliable | Works but noisy (5–21 calls instead of 2) |
| **Long context** | Yes (model-dependent) | Yes (200K tokens) | Limited by loaded model's context window |
| **Speed** | 5–15s (network) | 3–10s (network) | 26–72s (CPU inference) |
| **Cost** | Copilot subscription + usage | Per-token API pricing | Zero (local compute) |
| **Availability** | Requires internet + GitHub | Requires internet + Anthropic | Fully offline capable |
| **Multi-file transforms** | Strong | Strong | Weak (small model struggles with complexity) |
| **Structured output** | Good | Excellent | Fair (grammar-constrained helps) |
| **Rate limiting** | GitHub API limits | Anthropic API limits (429/529) | None |
| **Auth complexity** | GitHub PAT, env var override | Simple API key | None |
| **Tool return format** | JSON objects | JSON strings | **Plain strings only** |

### 7.2 Recommended provider per task type

| Task | Best provider | Why | Local viable? |
|------|--------------|-----|---------------|
| `transform` | copilot, anthropic | Needs strong code generation | Only for simple missions |
| `fix-code` | copilot, anthropic | Must understand test failures and fix code | No |
| `supervise` | copilot, anthropic | Needs strategic reasoning about repo state | No |
| `maintain-features` | any | Markdown generation; simpler task | Yes |
| `maintain-library` | any | Markdown generation; simpler task | Yes |
| `review-issue` | copilot, anthropic | Needs judgement about done-ness | No |
| `enhance-issue` | copilot, anthropic | Needs to write acceptance criteria | No |
| `discussions` | copilot, anthropic | Needs conversational quality | No |
| **scenario tests** | local | No cost, no network, repeatable | Yes (primary use case) |

### 7.3 Prompt compatibility across providers

All three providers receive the same prompts from task handlers. Compatibility:

**Works identically across all providers:**
- Markdown-structured system messages
- `[NARRATIVE]` extraction tag at end of response
- `[ACTION]` structured output tags (e.g. `[ACTION] create-feature ...`)
- File path listings and feature summaries
- Issue/PR summaries

**Provider-specific prompt behaviour:**

| Aspect | Copilot SDK | Anthropic API | Local (node-llama-cpp) |
|--------|-------------|---------------|----------------------|
| Prompt following | Good — prompts designed for these models | Excellent — Claude follows system prompts literally | Fair — needs explicit step-by-step instructions |
| JSON output | Reliable | Very reliable | Grammar-constrained; valid JSON but content may be garbled |
| Long system messages | Handles well | Handles well (200K context) | May lose detail (small context window) |
| Multi-step tool sequences | Reliable | Reliable | Works but makes redundant calls |
| Error recovery | Self-corrects | Self-corrects | Rarely self-corrects; retries same action |

**Implication**: For Phase 1–2, we keep the same prompts for all providers.
Provider-specific prompt tuning (e.g. simpler prompts for local) is a future
optimisation if needed.

---

## Part 8: Implementation Roadmap

### Phase 1: Extract the interface (no new providers)

Pure refactor. Zero behaviour change. All existing tests pass.

1. Create `tool-specs.js` — extract provider-neutral tool specs from `tools.js`
   (move handler logic, keep `name`/`description`/`parameters`/`handler` shape)
2. Create `provider.js` — `RunTaskOptions`/`RunTaskResult` typedefs +
   `createProvider()` factory function
3. Create `providers/copilot.js` — move `runCopilotTask()` internals here,
   implementing `runTask()` method. Wraps tool specs with `defineTool()`.
   Contains all Copilot-specific logic: `CopilotClient`, `approveAll`,
   `buildClientOptions()`, session events, `supportsReasoningEffort()`,
   rate limit retry.
4. Add `provider` field to `config-loader.js` (default: `"copilot"`)
5. Update `index.js` — use `createProvider(config.provider)` instead of
   importing `runCopilotTask` directly
6. Update task handlers — `runCopilotTask(...)` → `provider.runTask(...)`
   (mechanical rename, same arguments, same return type)
7. Move shared utilities (`cleanSource`, `generateOutline`, `filterIssues`,
   `summariseIssue`, `extractFeatureSummary`, `readOptionalFile`,
   `scanDirectory`, `formatPathsSection`, `extractNarrative`,
   `NARRATIVE_INSTRUCTION`) to a shared module (e.g. `prompt-utils.js`)
8. Delete old `copilot.js` and `tools.js` (replaced by new structure)
9. Run all 314+ unit tests — must pass unchanged
10. Run spike test — must pass unchanged

### Phase 2: Add Anthropic provider

1. Add `@anthropic-ai/sdk` as a dependency in
   `src/actions/agentic-step/package.json`
2. Create `providers/anthropic.js`:
   - Constructor takes `ANTHROPIC_API_KEY` from env
   - `runTask()` implementation:
     a. Create `Anthropic` client
     b. Convert tool specs to Anthropic format (`input_schema`)
     c. Build initial messages array: `[{ role: "user", content: prompt }]`
     d. Call `client.messages.create()` with `system`, `model`, `max_tokens`,
        `tools`, `messages`, `temperature`
     e. Implement tool call loop:
        - Check `response.stop_reason`
        - If `"tool_use"`: extract `tool_use` blocks, execute handlers,
          append `tool_result` messages, call API again
        - If `"end_turn"`: extract text content, return
     f. Map `reasoningEffort` to `temperature` (low→0.3, medium→0.5, high→0.7)
     g. Set `max_tokens` from profile (min→2048, recommended→4096, max→8192)
     h. Extract usage from `response.usage.input_tokens` / `output_tokens`
     i. Retry on HTTP 429/529 with exponential backoff
3. Add unit tests mocking `@anthropic-ai/sdk`
4. Integration test: `provider = "anthropic"` with a simple read+write scenario
5. Update `agentic-step/action.yml` — add `provider` input
6. Document in MCP_SERVER.md

### Phase 3: Add local LLM provider

Building on PLAN_1_LOCAL_SCENARIO_TESTS.md and the spike results:

1. Create `providers/local.js`:
   - **Dynamic import**: `const { getLlama, LlamaChatSession, defineChatSessionFunction, resolveModelFile } = await import("node-llama-cpp");`
     (so Copilot/Anthropic paths don't require `node-llama-cpp` installed)
   - **Singleton model**: Load model once, cache in module-level variable, reuse
     across `runTask()` calls. Model path from `LOCAL_LLM_MODEL_URI` env var
     or the `model` field in config.
   - `runTask()` implementation:
     a. Load/resolve model (singleton pattern)
     b. Create context + session with `systemPrompt` (plain string)
     c. Convert tool specs to node-llama-cpp format:
        - `defineChatSessionFunction({ description, params, handler })`
        - **Handler wrapper**: convert any non-string return to plain string
     d. Call `session.prompt(prompt, { functions, maxParallelFunctionCalls: 1, maxTokens, temperature })`
     e. Map `reasoningEffort` to `temperature` (low→0.2, medium→0.3, high→0.5)
     f. Set `maxTokens` from profile (min→256, recommended→512, max→1024)
     g. Return `{ content: response, tokensUsed: 0, inputTokens: 0, outputTokens: 0, cost: 0 }`
   - **Cleanup**: dispose context after each call (model stays loaded)
2. `node-llama-cpp` stays as devDependency (2GB+ with model)
3. Unit tests with mocked `node-llama-cpp`
4. Scenario tests from PLAN_1_LOCAL_SCENARIO_TESTS.md use this provider
5. CI: model cached via `actions/cache@v4`

### Phase 4: Provider in workflow inputs

1. Add `provider` choice to `workflow_dispatch` inputs in
   `agentic-lib-workflow.yml` and `agentic-lib-bot.yml`
2. Pass through to `agentic-step` action as `provider` input
3. Override config-level provider per run
4. Update `agentic-lib-schedule.yml` to persist provider choice alongside model

### Phase 5: MCP server integration

1. `iterate` tool gains optional `provider` parameter (default from config)
2. `prepare_iteration` already works without a provider (Claude mode —
   unchanged)
3. `config_set` / `config_get` support `provider` field
4. Document: `config_set provider anthropic` → `iterate` uses Anthropic API
5. Test all three provider paths through MCP

---

## Part 9: Dependency Impact

### 9.1 New dependencies

| Package | Provider | Dep type | Size | Notes |
|---------|----------|----------|------|-------|
| `@anthropic-ai/sdk` | anthropic | production | ~2MB | Required for Anthropic provider |
| `node-llama-cpp` | local | **devDependency** | ~50MB + 2GB model | Already installed from spike work |

### 9.2 Existing dependencies (unchanged)

| Package | Provider | Notes |
|---------|----------|-------|
| `@github/copilot-sdk` | copilot | Already in `src/actions/agentic-step/package.json` |

### 9.3 Dynamic imports for optional providers

`providers/local.js` uses dynamic `await import("node-llama-cpp")` so the
package is only required when `provider = "local"`. CI runners and consumer
repos that only use Copilot or Anthropic never need `node-llama-cpp` installed.

`providers/anthropic.js` uses static import of `@anthropic-ai/sdk` — it's small
(~2MB) and should be a production dependency in `src/actions/agentic-step/package.json`
so GitHub Actions workflows can use it without extra install steps.

---

## Part 10: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Anthropic tool call loop more complex than SDK's | Medium | Medium | Well-documented API; reference implementations exist; bounded by `max_tokens` |
| Prompt quality differs between providers | Medium | Low | Same prompts work across all three; provider-specific tuning is future work |
| Local model produces poor results for complex tasks | High (known) | Low | Local provider is for testing/scenarios only; documented as not production-grade |
| Adding `@anthropic-ai/sdk` increases agentic-step install size | Low | Low | ~2MB; negligible vs `@github/copilot-sdk` |
| Existing tests break during refactor | Low | High | Phase 1 is pure refactor; run full suite at each step; no behaviour change |
| Provider config backwards compatibility | Low | Medium | Default `provider = "copilot"`; existing configs without `provider` field work unchanged |
| Rate limiting differs between providers | Medium | Low | Each provider implements its own retry with backoff |
| Anthropic API requires `max_tokens` but Copilot doesn't | Low | Low | Provider sets sensible defaults per profile |
| node-llama-cpp model download fails in CI | Medium | Low | Model cached via `actions/cache@v4`; fallback to spike-only test |
| `defineChatSessionFunction` API changes in node-llama-cpp update | Low | Medium | Pin `^3.17.1`; spike test catches regressions |

---

## Part 11: Success Criteria

### Phase 1 (extract interface)
- [ ] All 314+ existing unit tests pass unchanged
- [ ] `runCopilotTask()` calls replaced by `provider.runTask()` everywhere
- [ ] Only `providers/copilot.js` imports `@github/copilot-sdk`
- [ ] Only `providers/local.js` imports `node-llama-cpp` (future, but prepared)
- [ ] `tools.js` replaced by `tool-specs.js` (no SDK import in specs)
- [ ] `provider = "copilot"` is the default; existing configs work unchanged
- [ ] Spike test (`test:spike-llm`) still passes
- [ ] Shared utility functions accessible by all providers

### Phase 2 (Anthropic provider)
- [ ] `provider = "anthropic"` with `ANTHROPIC_API_KEY` completes a transform task
- [ ] Tool call loop works (read_file → write_file → final response with content)
- [ ] Token usage reported correctly from `response.usage`
- [ ] `max_tokens` set appropriately per profile
- [ ] Rate limit retry works (mock test for 429/529)
- [ ] Unit tests with mocked `@anthropic-ai/sdk`

### Phase 3 (local provider)
- [ ] `provider = "local"` completes the spike scenario (read + write + valid JS)
- [ ] Model loaded once, reused across `runTask()` calls (singleton pattern)
- [ ] Plain-string tool returns produce correct output (not JSON-garbled)
- [ ] Dynamic import — Copilot/Anthropic paths don't require `node-llama-cpp`
- [ ] Scenario tests from PLAN_1_LOCAL_SCENARIO_TESTS.md pass via this provider
- [ ] Returns `tokensUsed: 0, cost: 0` (local compute)

### Phase 4 (workflow integration)
- [ ] `provider` choice in `workflow_dispatch` inputs
- [ ] Provider persisted in `agentic-lib.toml` by schedule workflow
- [ ] Consumer repo (repository0) works with all three providers when secrets configured

### Phase 5 (MCP integration)
- [ ] `iterate` tool accepts `provider` parameter
- [ ] `config_get provider` / `config_set provider anthropic` work
- [ ] All three providers work through MCP server
