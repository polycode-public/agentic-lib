# Plan: MCP Server

## User's Ideal Use Case

> "Hello Claude, please run the hamming distance mission with the lowest possible resources and see how many iterations it takes then increase resources to see what brings the best improvement"

This requires:
1. Create a workspace from a mission seed
2. Run iterative transform cycles with configurable resource levels (tuning profiles)
3. Observe progress (test pass rate, files changed, convergence)
4. Change resource level and compare results

## Architecture

```
Claude Code (or any MCP client)
    |
    | MCP protocol (JSON-RPC over stdio)
    |
agentic-lib MCP server (src/mcp/server.js)
    |
    | shells out to CLI
    |
bin/agentic-lib.js (existing CLI)
    |
    | Copilot SDK / local LLM
    |
Workspace on disk
```

The MCP server is a thin orchestration layer over the existing CLI. It manages workspaces and tracks iteration history. The CLI does the heavy lifting.

## Entry Point

```
npx @xn-intenton-z2a/agentic-lib mcp
```

Or in Claude Code settings:
```json
{
  "mcpServers": {
    "agentic-lib": {
      "command": "npx",
      "args": ["-y", "@xn-intenton-z2a/agentic-lib@latest", "mcp"],
      "env": { "COPILOT_GITHUB_TOKEN": "..." }
    }
  }
}
```

## MCP Tools

| Tool | Purpose |
|------|---------|
| `list_missions` | List available mission seeds |
| `workspace_create` | Create workspace from mission seed, run init --purge, npm install |
| `workspace_list` | List active workspaces with status |
| `workspace_status` | Mission, features, test results, iteration history |
| `workspace_destroy` | Clean up a workspace |
| `iterate` | Run N cycles of maintain-features -> transform -> test -> fix-code |
| `run_tests` | Run tests in a workspace, return pass/fail + output |
| `config_get` | Read agentic-lib.toml from a workspace |
| `config_set` | Update tuning profile, model, or individual knobs |

## Iterate Loop (per cycle)

1. `maintain-features` — ensure feature files exist and align with mission
2. `transform` — advance code toward mission
3. Run tests — check pass/fail
4. If tests fail: `fix-code` — attempt repair
5. Run tests again — record final status
6. Record: iteration number, model, profile, test pass/fail, files changed, elapsed time

Stop conditions:
- All tests pass for 2 consecutive iterations (stable)
- Max iterations reached
- No files changed for 2 consecutive iterations (stalled)

## Workspace Management

- Location: `~/.agentic-lib/workspaces/<mission>-<timestamp>/`
- Override via `AGENTIC_LIB_WORKSPACES` env var
- Each workspace has `.agentic-lib-workspace.json` metadata:
  ```json
  {
    "id": "hamming-distance-20260306T143200",
    "mission": "hamming-distance",
    "created": "2026-03-06T14:32:00Z",
    "profile": "min",
    "model": "gpt-5-mini",
    "iterations": [],
    "status": "created"
  }
  ```

## Resource Levels (maps to tuning profiles)

| Level | Profile | Model | What it means |
|-------|---------|-------|---------------|
| lowest | min | gpt-5-mini | Fast, cheap, small context |
| balanced | recommended | claude-sonnet-4 | Good quality, moderate cost |
| maximum | max | gpt-4.1 | Thorough, expensive, large context |

## Implementation

### Phase 1: Core MCP server (this PR)

1. Add `@modelcontextprotocol/sdk` dependency
2. Create `src/mcp/server.js` with all 9 tools
3. Add `mcp` command to `bin/agentic-lib.js`
4. Add `src/mcp/` to `files` in package.json
5. Test locally with Claude Code

### Phase 2: Iteration intelligence

6. Add convergence scoring (test coverage, feature completion)
7. Add comparison tool: `workspace_compare` — diff two workspace runs
8. Structured iteration summaries for Claude to reason about

### Phase 3: Local LLM integration

9. Wire `--local-llm` flag through MCP tools
10. Add `resource_levels` tool that lists available models with cost estimates

## Files

| File | Action |
|------|--------|
| `src/mcp/server.js` | Create — MCP server implementation |
| `bin/agentic-lib.js` | Edit — add `mcp` command |
| `package.json` | Edit — add MCP SDK dependency, add src/mcp/ to files |
| `PLAN_MCP_SERVER.md` | This file |
