# Plan: Local Scenario Tests with Tiny LLM

## Spike Findings (from PLAN_1_LOCAL_SCENARIO_TESTS_SPIKE.md)

The spike is complete and **passed** with Llama-3.2-3B-Instruct Q4_K_M. Key findings that reshape this plan:

### Model Selection: Llama-3.2-3B-Instruct Q4_K_M (2GB)

The original plan assumed SmolLM2-360M-Instruct (386MB). The spike tested 4 models:

| Model | Size | Function Calling | Content Quality | Verdict |
|-------|------|-----------------|----------------|---------|
| SmolLM2-360M-Instruct Q8_0 | 386MB | None | N/A | Unusable — never calls tools |
| Qwen2.5-0.5B-Instruct Q8_0 | 676MB | Partial (read only) | N/A | Unusable — calls read but not write |
| Llama-3.2-1B-Instruct Q4_K_M | 808MB | Works but loops | Garbage | Unusable — infinite tool call loops |
| **Llama-3.2-3B-Instruct Q4_K_M** | **2.02GB** | **Works** | **Correct JS** | **Use this** |

**Default model URI**: `hf:bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M`
Override via `LOCAL_LLM_MODEL_URI` env var.

### Critical Finding: Tool Return Format

**Tool handlers MUST return plain strings, NOT `JSON.stringify({...})`.**

When handlers returned `JSON.stringify({content: "..."})`, the model echoed the JSON wrapper as file content. When handlers return the raw string, the model produces correct output. This means:
- `local-llm.js` tool handlers must return plain strings
- This differs from `createCliTools()` in `bin/agentic-lib.js` which returns JSON for the Copilot SDK

### Performance Baseline (macOS, CPU)

| Phase | Measured | Budget |
|-------|----------|--------|
| Model load (cached) | 10s | 15s |
| Model load (first download) | 16s + download | N/A (one-time) |
| Prompt time | 26-72s | 90s |
| Tool calls per prompt | 5-21 (expects 2) | Acceptable — extra calls don't break anything |

### API Corrections Applied

| Aspect | Original Plan | Correct API (verified) |
|--------|--------------|----------------------|
| Function registration | `session.defineChatSessionFunction()` | `defineChatSessionFunction()` standalone import |
| Function passing | Registered on session | Passed to `session.prompt(options.functions)` |
| System message | `{ content: "..." }` object | Plain string via `systemPrompt` constructor param |
| Response method | `session.sendMessage()` | `session.prompt()` returns string |
| Tool call loop | Manual loop in our code | Handled internally by node-llama-cpp |
| Tool return values | JSON objects | **Plain strings** (critical for small models) |

## Spike as CI Test

The spike script (`scripts/spike-local-llm.js`) is now exercised as a vitest test:

- **Test file**: `tests/spike-local-llm.test.js` — spawns the spike script, asserts exit code 0 and key output markers
- **npm script**: `npm run test:spike-llm` — runs `vitest --run tests/spike-local-llm.test.js`
- **CI job**: `test-spike-local-llm` in `.github/workflows/test.yml` — runs concurrently with other jobs, 15-minute timeout, model cached via `actions/cache@v4`

This gives us a continuous validation that node-llama-cpp function calling works in CI before building the full scenario tests on top.

## Problem Statement

Today, testing the full agentic iteration loop requires: merge agentic-lib -> npm publish -> npm update in repository0 -> run init workflow -> multiple workflow cycles. This takes 30+ minutes and many round-trips. The unit tests mock `runCopilotTask()` entirely — they prove the plumbing but never exercise a real LLM calling real tools on real files.

We want to prove the iteration loop works locally in ~90 seconds using a local LLM, with deliberately simple test missions. Non-determinism is expected and desired — the point is proving the mechanics, not producing great code.

## Architecture

### High-Level Flow

```
npm run test:scenario
  -> scripts/scenario-runner.js
    -> creates temp workspace (mktemp -d)
    -> runs: node bin/agentic-lib.js init --purge --target <workspace>
    -> writes MISSION.md into workspace
    -> runs: node bin/agentic-lib.js <task> --target <workspace> --local-llm
    -> checks assertions (file exists, file changed, valid JS)
    -> cleans up workspace
```

### Key Design Decision: CLI Extension

The `--local-llm` flag routes through the same CLI path as `--model claude-sonnet-4`, but swaps the Copilot SDK backend for a local node-llama-cpp backend. This means:

- The same `buildTaskPrompt()` functions construct the prompt
- The same tool handler logic (`read_file`, `write_file`, `list_files`, `run_command`) is reused
- node-llama-cpp handles the tool call loop internally (grammar-constrained generation forces valid JSON, library calls our handlers and feeds results back automatically)
- Scenarios exercise the real CLI end-to-end, just with a different LLM

### Building on the Spike

The spike proves the foundation. Scenario tests build on it by:

1. **Using the same model** — Llama-3.2-3B-Instruct Q4_K_M, proven to work
2. **Using the same tool return format** — plain strings, not JSON
3. **Going through the CLI** — spike calls node-llama-cpp directly; scenarios go through `bin/agentic-lib.js --local-llm` which exercises the full stack
4. **Testing real tasks** — spike tests raw function calling; scenarios test `maintain-features`, `transform`, and the full loop

## LLM Backend: node-llama-cpp

### Why node-llama-cpp

| Option | Pros | Cons |
|--------|------|------|
| **node-llama-cpp** | npm-installable, prebuilt binaries, built-in function calling with grammar-constrained generation, in-process (no HTTP), proven by spike | 2GB model download, ~30s per prompt on CPU |
| Ollama | Well-known, model management | External service dependency, HTTP overhead |
| Mock LLM | Fast, deterministic | Doesn't prove real LLM interaction |

**Grammar-constrained generation** is the killer feature: node-llama-cpp forces the model to output valid JSON matching the tool call schema, even from a 3B parameter model.

### Model Selection (Updated from Spike)

**Primary: Llama-3.2-3B-Instruct Q4_K_M** (~2GB GGUF)
- Only model that successfully completed the spike end-to-end
- Calls tools correctly and produces valid JavaScript
- Source: `hf:bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M`
- Performance: ~26-72s per prompt on macOS CPU

**Model download strategy:**
- Models are NOT committed to git (2GB)
- `resolveModelFile()` auto-downloads on first use from HuggingFace
- `models/` is gitignored
- CI caches the model directory between runs (`actions/cache@v4` with key `llm-model-llama-3.2-3b-q4km`)

### Performance Budget (Updated from Spike)

| Phase | Target | Notes |
|-------|--------|-------|
| Model load | 10-15s | One-time per test run, cached in memory |
| Prompt + generation | 30-90s | Llama-3.2-3B is slower than originally budgeted 360M |
| Tool execution | <0.5s | File I/O, no network |
| Total per scenario | 45-120s | Model loaded once, reused |
| Full suite (3 scenarios) | 90-180s | Sequential scenarios, shared model |

## File Inventory

### New Files

#### `src/actions/agentic-step/local-llm.js`

Purpose: Drop-in replacement for `runCopilotTask()` that uses node-llama-cpp. The tool call loop is handled internally by node-llama-cpp — no manual conversation loop needed.

Key differences from the Copilot SDK path:
- Tool handlers return **plain strings** (not JSON) — critical finding from spike
- System prompt is a **plain string** (not `{ content: "..." }`)
- Uses `session.prompt()` instead of `session.sendMessage()`
- Singleton model pattern — loaded once, reused across scenarios

#### `scripts/scenario-runner.js`

Purpose: Orchestrate scenario execution. Creates temp workspaces, invokes the CLI with `--local-llm`, checks assertions.

### Modified Files

#### `bin/agentic-lib.js`

Add `--local-llm` flag that routes to `local-llm.js` instead of the Copilot SDK.

#### `package.json`

```
"test:spike-llm": "vitest --run tests/spike-local-llm.test.js"   (DONE)
"test:scenario": "node scripts/scenario-runner.js"                 (TODO)
"test:scenario:maintain": "node scripts/scenario-runner.js maintain-features"
"test:scenario:transform": "node scripts/scenario-runner.js transform"
"test:scenario:loop": "node scripts/scenario-runner.js full-loop"
```

## Three Test Scenarios

### 1. maintain-features (~45-90s)

**Mission:** "Build a function that reverses a string."

**What it exercises:**
- CLI flag parsing and config loading
- `buildMaintainFeaturesPrompt()` prompt construction
- Local LLM receives prompt and makes tool calls
- `write_file` tool creates markdown files in `features/`
- Path writability check allows writing to `features/`

**Assertions (deliberately loose):**
- `features/` directory exists
- At least 1 `.md` file was created in `features/`

### 2. transform (~45-90s)

**Mission:** "Make src/lib/main.js export a function `hello()` that returns 'Hello, World!'."

**What it exercises:**
- `buildTransformPrompt()` prompt construction with existing source code context
- `read_file` tool reads current source
- `write_file` tool modifies source
- Path writability check allows `src/lib/`

**Assertions:**
- `src/lib/main.js` content changed from seed state
- `src/lib/main.js` is valid JavaScript (`node --check`)

### 3. full-loop (~90-120s)

**Mission:** "Make src/lib/main.js export a function `add(a, b)` that returns a + b."

**What it exercises:**
- Both `maintain-features` and `transform` in sequence
- The transform task sees features created by maintain-features
- Model reloading is avoided (singleton pattern)

**Assertions:**
- Feature files exist after maintain-features
- Source changed after transform
- Source is valid JavaScript

## What This Tests vs What It Doesn't

### Tests (proves mechanics work)
- CLI flag parsing, config loading, TOML parsing
- Prompt construction for maintain-features and transform
- Tool definitions are callable and produce correct responses
- Path writability enforcement works end-to-end
- Blocked git command detection works
- `--target` path resolution through the entire stack
- File I/O tools create/modify real files on real filesystem
- The task pipeline (maintain-features -> transform) works in sequence

### Does NOT Test
- Copilot SDK authentication or session management
- Copilot SDK's tool calling protocol (different from node-llama-cpp's)
- Model quality or code correctness
- GitHub Actions workflow integration
- Network connectivity or API availability
- Concurrent execution or race conditions
- Large codebases or complex missions

## Implementation Order

Steps 0-2 are **DONE** (spike + CI integration):

0. ~~**Run the spike**~~ DONE — see PLAN_1_LOCAL_SCENARIO_TESTS_SPIKE.md
1. ~~**Add `node-llama-cpp` devDependency**~~ DONE — `^3.17.1` in package.json
2. ~~**Spike as CI test**~~ DONE — `test:spike-llm` script + `test-spike-local-llm` CI job

Remaining steps:

3. **Create `src/actions/agentic-step/local-llm.js`** — local LLM backend with plain-string tool returns
4. **Modify `bin/agentic-lib.js`** — add `--local-llm` flag
5. **Create `scripts/scenario-runner.js`** — scenario orchestrator
6. **Run first scenario** — `npm run test:scenario:maintain`
7. **Debug and iterate** — expect 2-3 rounds of adjusting prompts/timeouts (spike showed model makes 5-21 tool calls instead of 2, so assertions must be loose)
8. **Add remaining scenarios** — transform, full-loop
9. **Add `test:scenario:*` scripts** to package.json
10. **Add scenario CI job** — similar to `test-spike-local-llm` but with longer timeout

## Resolved Questions

1. **Which model works?** — Llama-3.2-3B-Instruct Q4_K_M. SmolLM2-360M, Qwen2.5-0.5B, and Llama-3.2-1B all failed the spike. See PLAN_1_LOCAL_SCENARIO_TESTS_SPIKE.md for details.

2. **node-llama-cpp function calling API** — Verified against v3.17.1. `defineChatSessionFunction()` is a standalone import; functions are passed to `session.prompt({ functions })`. The library handles the tool call loop internally. System prompt is a plain string.

3. **Tool return format** — **Plain strings, not JSON.** This is the most important finding from the spike. JSON-wrapped returns confuse the model into echoing JSON as file content.

4. **No separate `local-tools.js` needed** — Tools are defined inline using `defineChatSessionFunction()` and passed to `session.prompt()`. No bridge module required.

5. **CI integration** — Yes, viable. Model cached via `actions/cache@v4`. Spike runs in CI as `test-spike-local-llm` job with 15-minute timeout.

6. **node-llama-cpp minimum version** — `^3.17.1` (current stable, spike-verified).

## Open Questions

1. **Module resolution across nested package.json** — `local-llm.js` in `src/actions/agentic-step/` (which has its own `package.json`) importing `node-llama-cpp` from root `devDependencies`. The spike script lives in `scripts/` so it imports from root fine. Need to verify the nested path works.

2. **CI performance on Ubuntu** — Spike was measured on macOS. Ubuntu runners may be faster (more CPU cores) or slower (no Metal GPU). The 15-minute timeout for the CI job should cover it.

3. **Model download reliability** — HuggingFace is the source. If it's down, the CI job fails. Consider mirroring or pre-baking the model in a custom runner image for reliability.
