# intentïon `agentic-lib`

**The delivery engine for the intentïon fleet — a thin wrapper over the 2026 agent
stack (`claude -p` + Amazon Bedrock).** One trigger runs **one whole
transformation** (work item → PR-ready branch), then stops. The agent holds no plan
and no state between runs: decomposition and memory live in the marginalia
supervisor graph. As of **8.0.0** the bespoke agent loop is gone — agentic-lib is a
**bill of materials**, not an engine.

> The category this once owned (an autonomous SDLC loop on GitHub Actions) is now a
> commodity — GitHub Agentic Workflows, the Copilot coding agent, and
> `anthropics/claude-code-action` all ship it. So agentic-lib stopped owning the
> loop and kept only the parts no platform ships: **the intent/benchmark library**
> and **the marginalia supervision**. See `CONCEPT.md`.

## What's in the package

| Piece | What it is |
|---|---|
| `.github/workflows/transform.yml` | **THE** reusable dispatch (`workflow_call`). The only abstraction agentic-lib still owns — a few hundred lines of YAML/bash. |
| `components/agents/` | AGENTS.md fragments (house conventions, definition of done, the `fixes #N` provenance contract). |
| `components/prompts/` | One one-shot prompt per transformation type: `deliver-intent`, `address-review`, `fix-ci`, `tend`. |
| `missions/` | The 19 kyu/dan-graded INTENT seeds + `index.toml` — the benchmark library. |
| `seeds/` | What `init` lays into a consumer repo: `INTENT.md`, `AGENTS.md`, `agentic-lib.toml`, the 3 thin consumer workflows, zero src/tests. |
| `bin/agentic-lib.js` | The `init` CLI (distribution mechanism — npx, not a runtime dependency). |
| `MODELS.md` | The env-var matrix: Anthropic lane vs Bedrock lane, model ids / inference-profile ids. |

## How it works

```
work item (issue / review / schedule)        the supervisor graph decides the rung
        │
        ▼
on-intent.yml  ──uses──▶  agentic-lib/.github/workflows/transform.yml@v8
                              │  checkout → OIDC→AWS creds (Bedrock lane)
                              │  → assemble prompt (trigger context + components/prompts/<type>.md)
                              │  → claude -p  (env-selected provider, --max-turns, --output-format json)
                              │  → gate on a `fixes #N` trailer (C3)
                              ▼  → gh pr create  /  push revision
                          one draft PR (or nothing)
```

Iteration is a **new trigger** (a review comment, a re-assignment), never an in-run
loop counter. "Done" is mechanical — a draft PR exists; the agent never
self-assesses completeness. Merge policy and decomposition stay with the supervisor
and the operator.

## Provider selection is purely environment variables

```
# Anthropic lane
ANTHROPIC_API_KEY = sk-ant-...

# Bedrock lane (the default — own daily caps, OIDC→AWS, no third party can freeze it)
CLAUDE_CODE_USE_BEDROCK = 1
AWS_REGION              = eu-west-2
ANTHROPIC_MODEL         = eu.anthropic.claude-sonnet-4-6-<profile-suffix>
```

The model upgrade is the value of one variable — `opus` → `fable` is just that
word. Full matrix in [`MODELS.md`](MODELS.md).

## Quick start (a consumer repository)

```bash
# Bootstrap a repo with INTENT.md, AGENTS.md, the 3 thin workflows, and a mission:
npx @polycode-public/agentic-lib init --purge --mission 7-kyu-understand-fizz-buzz

# List the built-in mission library:
npx @polycode-public/agentic-lib init --list-missions
```

Each consumer repo carries three ~10-line workflows that pin the dispatch:

- `on-intent.yml` — issue assigned/labelled, or `INTENT.md` changed → `deliver-intent`
- `on-review.yml` — PR review / `@agentic-lib` mention → `address-review`
- `on-schedule.yml` — cron → `tend` (or `fix-ci`)

Each is `trigger + uses: …transform.yml@v8 + inputs`. The only versioned coupling is
the `@v8` pin — model, tool loop, and MCP improvements all land beneath it without
either repo changing.

## Benchmarks

The kyu benchmark harness comes with the engine (`benchmarks/`). The cost problem
that stopped benchmarking on Copilot premium requests inverts on metered Bedrock —
graded, repeatable, regression-tracked delivery benchmarking. See
`benchmarks/ITERATION_BENCHMARKS_*.md` and `benchmarks/reports/`.

## Licence

Dual **`(AGPL-3.0-only OR MIT)`** — see `LICENSE` (AGPL-3.0) and `LICENSE-MIT`.
