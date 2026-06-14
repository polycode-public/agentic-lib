# PLAN_ENGINE.md — agentic-lib's active forward roadmap

> **This is the engine's active plan — the engine-detail companion to the
> cross-repo [`INTENTION_ROADMAP.md`](INTENTION_ROADMAP.md)** (which indexes E1–E5
> below alongside the site + template work). The only other root `PLAN_*.md` is
> `PLAN_2_NARRATIVE.md` (settled terminology record); the obsolete Copilot-era
> plans were deleted in the 2026-06-14 refocus. **Cross-estate strategy and
> decomposition live in the marginalia repo** —
> [`../../polycode-projects/marginalia/PLAN_INTENTION.md`](../../polycode-projects/marginalia/PLAN_INTENTION.md)
> (the estate move + intentïon.com, now a done record) and `PLAN_CODING_AGENT.md`
> §7 (this engine's port). marginalia is the supervisor that holds the plan/memory;
> this file is just the **engine's own** open work.

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

### E2 — Run the kyu benchmark (the two-brain method)
README / MISSIONS / FEATURES all *promise* a Bedrock benchmark run, but
`benchmarks/reports/` are still Copilot-era 018–020. The **most-promised-undelivered**
item. The method is now the **decompose → deliver → merge** loop with a **fixed Haiku
engine** and a **varying orchestrator brain** (Opus 4.8 here = maximal standard; Haiku
in marginalia's run), measured by **reliable one-shots per issue** + triggers + cost +
the limit-progression. **The model is frozen — never escalated.** Run via
`scripts/benchmark-run.sh` (the hands-free 30s-poll executor); write
`benchmarks/reports/021+`. Full method: `benchmarks/ITERATION_BENCHMARKS_{SIMPLE,ADVANCED}.md`.
Status: **in progress.**

### E3 — Tune the *process* defaults (granularity + context + `max_turns`)
From E2: the lever is the **process, not the model**. Pick a good
decomposition-granularity recipe and context recipe (graph facts / failing-test
output / prior PR diff to attach) per tier, and a `max_turns` default. The substantial
missions hit the turn cap (partial-slice commits, so spend is never wasted —
`transform.yml` `f03716c`); the answer is **finer decomposition**, not a bigger model.
The 3-kyu autopilot is the canonical plateau. Folds the *intent* of
`_developers/backlog/PLAN_PARAMETER_TUNING.md` (its profiles/read-chars knobs are gone;
the live knobs are issue granularity, supplied context, and `max_turns`). Status:
**open (feeds from E2).**

### E4 — Revive the MCP server (`_developers/backlog/PLAN_MCP_SERVER.md`)
The one backlog idea that still fits 8.0.0: an MCP server exposing the engine
(run a mission at varying resource, watch convergence) — re-specified against
`claude -p` + Bedrock rather than the Copilot SDK. Status: **backlog → spec needed.**

### E5 — Runner hygiene
`actions/checkout@v4` / `setup-node@v4` emit the Node-20-deprecation warning
(forced to Node 24 from 2026-06-16). **Next:** bump the actions or set
`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`. Status: **open, low.**

### E6 — Config consistency: `sonnet → haiku` (done)
The seed `on-intent.yml`/`on-review.yml`/`on-schedule.yml` and `agentic-lib.toml`
said `model: sonnet`; the Bedrock lane runs `ANTHROPIC_MODEL` (Haiku) regardless, so
this was a no-op at runtime but a latent Anthropic-lane landmine. Now `haiku`, so "the
system under test is Haiku" is unambiguous. The seed `on-intent.yml` also gained a
`workflow_dispatch` `work_item` input so a *hand* (human or harness) can drive
delivery — matching the deployed workflows. Status: **✅ done.**

### E7 — Benchmark executor harness (done/iterating)
`scripts/benchmark-run.sh`: init/reset (without pushing `.github/workflows` — the
token lacks `workflow` scope), per-issue `on-intent` dispatch, a 30-second poll loop,
a per-repo turn-limit hard-stop, and a running ledger for the report. Retires the
broken `benchmark-all.sh` (it fired the now-*disabled* `on-schedule`/`tend` and never
polled). Status: **in progress.**

## Done (recent, for context)
- 8.0.0 port; `transform.yml` hardened (reusable-workflow execution, partial-slice
  on max-turns, least-priv headless agent); `summary-export.yml` added + **wired**
  across the fleet (per-repo `MARGINALIA_GRAPH_ID`/`API_KEY`, `agentic-lib-logs/summary.json`
  published, embeds seeding); estate docs refreshed; backlog staleness-annotated.

## Backlog disposition (`_developers/backlog/`)
After the 2026-06-14 refocus only the two **revive** specs remain (the superseded /
dead-history / out-of-scope plans were deleted — see `INTENTION_ROADMAP.md` §D for
the full list and rationale):
- `PLAN_MCP_SERVER.md` → **E4** (re-spec against the 8.0.0 `claude -p`+Bedrock stack first).
- `PLAN_PARAMETER_TUNING.md` → its intent feeds **E3** (re-spec first; the live knobs are `ANTHROPIC_MODEL` + `max_turns`).
