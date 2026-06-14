# intentïon `agentic-lib` — Features (8.x)

8.0.0 is the "thin wrapper" port. The bespoke engine (the agent loop, `src/copilot/`
sessions, `tools.js`, the committed plan engine, ~6,000 lines of vendored workflows)
was **deleted**. What agentic-lib provides now is a bill of materials over the 2026
agent stack. Feature inventory below; the deleted machinery is recorded for history.

## What agentic-lib provides

| # | Feature | Notes |
|---|---|---|
| 1 | **The reusable dispatch** (`.github/workflows/transform.yml`) | `workflow_call` with inputs `type` / `work_item` / `max_turns` / `model`. Checkout → OIDC→AWS → assemble prompt → `claude -p` → `fixes #N` trailer gate → `gh pr create` / push revision. Concurrency keyed on the work item (C8). |
| 2 | **Env-var provider selection** | Anthropic lane (`ANTHROPIC_API_KEY`) vs Bedrock lane (`CLAUDE_CODE_USE_BEDROCK=1` + OIDC + `AWS_REGION` + `ANTHROPIC_MODEL`). Model upgrade = one variable. See `MODELS.md`. |
| 3 | **One-shot transformation types** | `deliver-intent`, `address-review`, `fix-ci`, `tend` — one prompt each in `components/prompts/`. Iteration is a new trigger, not a budget counter. |
| 4 | **AGENTS.md components** | House conventions, definition of done (draft PR is done; never merge; never self-assess complete), the `fixes #N` provenance contract — assembled at `init` from `components/agents/`. |
| 5 | **The intent / mission library** | 19 kyu/dan-graded INTENT seeds + `index.toml` (`missions/`). |
| 6 | **The benchmark harness + reports** | `benchmarks/ITERATION_BENCHMARKS_*.md`, `benchmarks/reports/` (018–020). Affordable again on metered Bedrock. |
| 7 | **The `init` CLI** | `init [--purge] [--mission <name>]` lays seeds into a consumer repo and (with `--purge`) cleans its GitHub side. npx, not a runtime dependency. |
| 8 | **Consumer seeds** | `INTENT.md`, assembled `AGENTS.md`, slim `agentic-lib.toml`, the 3 thin `on-*.yml` workflows pinning `transform.yml@v8`, zero src/tests (`seeds/`). |
| 9 | **The summary export** (`.github/workflows/summary-export.yml`) | Reusable `workflow_call`; pulls the repo's marginalia graph summary and publishes `agentic-lib-logs/summary.json` (the file the intentïon.com embed fetches). No-ops until bound to a graph. |
| 10 | **Distribution** | Versioned releases under `@polycode-public/agentic-lib` (not yet on npm — consumed via the `@v8` git ref); the `v8` moving tag is the bill-of-materials pin. |

## C1–C8 conformance (the counterparty contract)

The delivery-loop counterparty contract from the marginalia plan, satisfied by 8.x:

- **C1 programmatic trigger** — the graph's `work_item_assign` is a workflow dispatch; the graph is the trigger.
- **C2 brief → change proposal** — `deliver-intent` is the whole purpose.
- **C3 provenance grammar** — `fixes #N` trailer, gated by `transform.yml`.
- **C4 review-thread revision** — `address-review` (all threads, one push).
- **C5 CI responsiveness** — `fix-ci`.
- **C6 stable bot identity** — one identity, bot-actor filtered.
- **C7 host-resident state** — only state is the checkout; the graph holds the rest.
- **C8 idempotency** — concurrency groups + branch names keyed on the work item.

## Deleted in the port (history)

The old `src/copilot/` agent loop (13 modules), `src/actions/agentic-step/` step
runner + 12 task modules, `tools.js` + capability files, the committed
partial-order-plan engine, mission-complete detection, transform budgets, and the
old vendored `agentic-lib-*.yml` workflows. ~8,200 JS + ~6,000 YAML lines → a few
hundred lines of YAML/bash/markdown. Decomposition and memory moved to the
marginalia supervisor graph; the loop moved to the engine vendor (`claude -p`).
