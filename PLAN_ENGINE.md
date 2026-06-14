# PLAN_ENGINE.md — agentic-lib's active forward roadmap

> **This is the one *active* plan in this repo.** The other root `PLAN_*.md` are
> retrospective/historical (PLAN_2_NARRATIVE = settled, PLAN_3_MARKETPLACE =
> obsolete, PLAN_BENCHMARK_018_FIXES = Copilot-era). **Cross-estate strategy and
> decomposition live in the marginalia repo** —
> [`../../polycode-projects/marginalia/PLAN_INTENTION.md`](../../polycode-projects/marginalia/PLAN_INTENTION.md)
> (the estate move + intentïon.com) and `PLAN_CODING_AGENT.md` §7 (this engine's
> port). marginalia is the supervisor that holds the plan/memory; this file is just
> the **engine's own** open work.

## Where the engine is (2026-06-14)

**Shipped: agentic-lib 8.0.0** — a thin wrapper over `claude -p` + Bedrock (Path B).
The Copilot-SDK loop / `agentic-step` / committed plan engine were deleted; the
engine is now `.github/workflows/transform.yml` (one trigger → one transformation →
one PR) + `summary-export.yml`. Provider by env var; license `(AGPL-3.0-only OR MIT)`;
fleet live (5 kyu repos + sandbox, all delivered, bound to marginalia graphs, embeds
seeding). Tag `v8` is the consumer pin.

## Active work (engine-scoped)

### E1 — Publish `@polycode-public/agentic-lib` to npm
Every doc says "not yet published — consumed via the `@v8` git ref". `release.yml`
publishes on tag. **Next:** decide public npm publish; add the `NPM_TOKEN` secret;
cut a release (or confirm the `@v8` git-ref consumption is the intended permanent
model and update the docs to say so). Status: **open.**

### E2 — Re-run the kyu benchmarks on `claude -p` + Bedrock
README / MISSIONS / FEATURES all *promise* a Bedrock benchmark run "alongside the
historical reports", but `benchmarks/reports/` are still Copilot-era 018–020. This
is the **most-promised-undelivered** item. **Next:** run `scripts/benchmark-all.sh`
across the mission tiers (8-kyu→2-kyu) on Haiku 4.5 (and a Sonnet comparison), using
"triggers-to-an-acceptable-PR" + cost/turns as the metric; write new
`benchmarks/reports/021+`. Feeds E3-tuning. Cost note: ~$0.10 simple / ~$0.20–0.24
substantial per run at the 20-turn cap. Status: **open.**

### E3 — Tune the engine defaults (model + `max_turns`)
From E2: pick good per-tier defaults. The substantial kyu missions hit the 20-turn
cap (partial-slice now commits, so spend is never wasted — `transform.yml` fix
`f03716c`), but a higher cap or a Sonnet tier may deliver fuller PRs. Fold the
*intent* of `_developers/backlog/PLAN_PARAMETER_TUNING.md` here (its profiles/
read-chars knobs are gone; the live knobs are `ANTHROPIC_MODEL` + `max_turns`).
Status: **open.**

### E4 — Revive the MCP server (`_developers/backlog/PLAN_MCP_SERVER.md`)
The one backlog idea that still fits 8.0.0: an MCP server exposing the engine
(run a mission at varying resource, watch convergence) — re-specified against
`claude -p` + Bedrock rather than the Copilot SDK. Status: **backlog → spec needed.**

### E5 — Runner hygiene
`actions/checkout@v4` / `setup-node@v4` emit the Node-20-deprecation warning
(forced to Node 24 from 2026-06-16). **Next:** bump the actions or set
`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`. Status: **open, low.**

## Done (recent, for context)
- 8.0.0 port; `transform.yml` hardened (reusable-workflow execution, partial-slice
  on max-turns, least-priv headless agent); `summary-export.yml` added + **wired**
  across the fleet (per-repo `MARGINALIA_GRAPH_ID`/`API_KEY`, `agentic-lib-logs/summary.json`
  published, embeds seeding); estate docs refreshed; backlog staleness-annotated.

## Backlog disposition (`_developers/backlog/`)
Revive: `PLAN_MCP_SERVER` (→ E4), intent of `PLAN_PARAMETER_TUNING` (→ E3).
Superseded: `PLAN_MULTI_LLM` (env-var lanes deliver it), `PLAN_SUPERVISOR`
(marginalia is the supervisor). Dead history: `PLAN_3_PLANNING` (the deleted plan
engine), `2-dan-create-agi`. Orthogonal product idea: `PLAN_NEWS_AGGREGATOR`.
