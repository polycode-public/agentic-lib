# Simple Iteration Benchmarks (8–6 kyu)

Repeatable delivery benchmarks for the **simple tiers** on the 8.x engine
(`claude -p` + Bedrock). The companion suite for the harder tiers (3/2-kyu +
the `sandbox` wildcard) is [`ITERATION_BENCHMARKS_ADVANCED.md`](ITERATION_BENCHMARKS_ADVANCED.md);
both share the **same two-brain method, executor, and report schema** described
here. Results are tracked over time in [`reports/`](reports/).

## What this measures — the two-brain method

There are two brains in a delivery, and the benchmark holds one fixed and varies
the other.

| Brain | Role | In *this* (intentïon/Claude) run | In *marginalia's* run |
|---|---|---|---|
| **Engine** (fixed — the system under test) | runs one headless `claude -p` transformation per trigger → one PR | **Haiku 4.5 via Bedrock** | **Haiku 4.5 via Bedrock** |
| **Orchestrator** (the variable) | reads INTENT.md, consults the graph, **decomposes it into one-shot-sized issues**, judges PRs, merges | **Claude Code, Opus 4.8 (me)** — the maximal standard | **the marginalia graph, on Haiku** |

The engine is **frozen at Haiku 4.5** (`ANTHROPIC_MODEL =
eu.anthropic.claude-haiku-4-5-20251001-v1:0`) and is **never changed** — no
escalation to Sonnet/Opus, ever. Doing so would turn "tune the process" into
"brute-force with a bigger model" and break the comparison. **The only lever is
the process**: how finely the orchestrator carves INTENT into issues, and what
context it supplies. The benchmark measures **how much a smarter decomposer lifts
the same Haiku engine's reliable-one-shot rate** vs Haiku doing the sizing. When
Haiku cannot one-shot even the orchestrator's best/finest decomposition, **that
plateau is the result** — it locates the Haiku one-shot ceiling at the tested
granularity. The objective is the *same fixed agentic-lib + thin-repository0
config on different problems*, so we can tune the process and compare the
Opus-orchestrated standard against marginalia's Haiku-orchestrated run.

## The delivery model — decompose → deliver → re-work → merge

An INTENT.md of any size is delivered by breaking it into **chunks each sized for
one reliable one-shot Haiku PR**:

1. **Decompose.** The orchestrator (Opus 4.8) reads `INTENT.md`, consults the
   repo's marginalia graph via the **seon MCP** (`seon_describe` / `seon_impact` /
   `seon_search`) when available, and carves the intent into focused GitHub issues
   — each a self-contained slice the engine can land in a single PR.
2. **Dispatch.** Trigger `deliver-intent` per issue:
   `gh workflow run on-intent.yml -R polycode-public/<repo> -f work_item=<issue#>`
   (the deployed `on-intent.yml` exposes a `workflow_dispatch` with a `work_item`
   input). One issue → one draft PR carrying a `fixes #<issue>` trailer.
3. **Judge.** When the run finishes, the orchestrator reads the PR + CI checks and
   decides: **green + acceptable → merge**; not green → re-work.
4. **Re-work.** A new trigger — `on-review` (`address-review`, pushes one revision
   to the same branch) or a fresh `deliver-intent`. Iteration is always a *new
   trigger*, never an in-run loop.
5. **On plateau** (a chunk won't go green after a revision): **decompose it finer
   and/or supply richer context** (graph facts, the failing-test output, the prior
   PR diff). Never reach for a bigger model.
6. **Deliver.** Repeat per issue, merging as each lands, until `INTENT.md`'s
   acceptance criteria are met on `main` — or the repo's budget is exhausted.

For the trivial tiers a single whole-intent shot is expected (no decomposition):
dispatch with `work_item=INTENT.md`.

## Scope of this suite

| Repo | INTENT | Target reliable one-shots | Budget (turn-limit) |
|---|---|---|---|
| `8-kyu-remember-hello-world` | Hello-World greeting | 1 (no decomposition) | **1** |
| `6-kyu-understand-roman-numerals` | int↔Roman, round-trip, range/type errors | 1–2 | **2** |

`max_turns = 30` per transformation (the **turn-size limit**). The **turn-limit**
is the per-repo transformation budget above; the executor hard-stops a repo when
it is reached and records exhaustion. (Budgets are the lean first-calibration
round; raise them in later rounds as the process is tuned.)

Also part of setup: run `init` on **repository0** to reset it to the clean
hello-world template, but **do not run delivery on it** — it is the template's
fixed point, not a benchmark target.

## The executor — hands-free, 30-second polling

The benchmark runs hands-free via [`scripts/benchmark-run.sh`](../scripts/benchmark-run.sh)
driven by the orchestrator. The protocol:

- **One transformation in flight at a time** (global serial gate). Dispatch the
  next trigger only when **no workflow run is in progress**.
- **Poll every 30 seconds** for workflow state changes (`gh run list`/`gh run view`).
- **Run to success or failure without throttling.** Unlike marginalia — which
  paces dispatches on a 6-hour / 1-hour / 30-minute cadence because it meters
  usage-based Bedrock billing — this harness dispatches the next transformation
  the instant the engine goes idle. The throttle is deliberately absent.
- **On each completion** the orchestrator judges the PR and chooses: merge /
  re-work / advance to the next issue / hard-stop on budget.

> **Why 30s and not in-process waiting:** the executor blocks on a backgrounded
> poll and re-invokes the orchestrator on each run completion — so the loop needs
> no human tick. marginalia's slower cadence is a billing artefact, not a
> correctness requirement; the standard-setting Opus run goes as fast as the
> engine completes.

## Limits and their progression (record this)

The headline output beyond pass/fail is **how the run moved through its limits** —
this is what tunes the next round:

- **turn-size limit** = `max_turns` per transformation (30). Record whether each
  transformation hit the cap (the engine commits a partial self-contained slice on
  `error_max_turns` — spend is never wasted).
- **turn-limit** = the per-repo transformation budget. Record transformations used
  vs budget, and whether the repo delivered or exhausted.
- **decomposition progression** = how the issue breakdown was refined between
  transformations (what got split, what context was added to break a plateau).

## Model & engine config

Frozen, identical for all repos: `ANTHROPIC_MODEL =
eu.anthropic.claude-haiku-4-5-20251001-v1:0`, Bedrock lane
(`CLAUDE_CODE_USE_BEDROCK=1` + OIDC AWS creds + `AWS_REGION=eu-west-2`),
`max_turns=30`. The consumer workflow's `model:` input is `haiku` and is a no-op
on the Bedrock lane (the env var wins) — see [`MODELS.md`](../MODELS.md). **Do not
change `ANTHROPIC_MODEL` on any repo, before, during, or after a run.**

## Prerequisites

1. **Bedrock Anthropic access** — enabled org-wide (eu-west-2 inference profiles).
2. **Org setting** "Allow GitHub Actions to create and approve PRs" — on.
3. **Per-repo CI config** — vars `ANTHROPIC_MODEL`/`AWS_REGION`/`CLAUDE_CODE_USE_BEDROCK`;
   secrets `AWS_OIDC_ROLE`, `MARGINALIA_API_KEY`, `MARGINALIA_GRAPH_ID`. (All 5
   fleet repos + sandbox are configured.)
4. **`gh` authenticated** with dispatch rights on `polycode-public/*`. Note: the
   HTTPS token may lack the `workflow` scope — so the executor **must not push
   `.github/workflows`** (it resets INTENT/src/tests only and cleans issues/PRs via
   `gh api`; the deployed workflows are kept).
5. **seon MCP** is a **soft dependency** — `@polycode-projects/marginalia-seon` is
   unpublished (npm 404) and `MARGINALIA_GRAPH_ID` is a write-only secret, so the
   orchestrator may not be able to consult the graph this round. If unavailable,
   decompose from `INTENT.md` + the codebase and record "graph not consulted." See
   [`MARGINALIA_DEPENDENCIES.md`](../MARGINALIA_DEPENDENCIES.md).

## Run it

```bash
# scripts/benchmark-run.sh <owner> <suite> [budget overrides…]
# Simple suite (8-kyu + 6-kyu), repository0 reset, hands-free to delivery/exhaustion:
scripts/benchmark-run.sh polycode-public simple
```

The orchestrator drives the decomposition + judgement; the script handles
init/reset, dispatch, the 30s poll loop, the budget hard-stop, and the running
ledger. (The old fire-and-forget `benchmark-all.sh` — which dispatched the now
*disabled* `on-schedule`/`tend` and never polled — is retired.)

## Record the result

Write a consolidated report to `benchmarks/reports/BENCHMARK_REPORT_SIMPLE_NNN.md`
(next free number; current baselines are Copilot-era 001–018 — *not directly
comparable*, they used budget/profiles, not this two-brain method). Per repo
capture: INTENT, # issues the decomposition produced, per-issue
triggers-to-green, merges, budget used / delivered-or-exhausted, the
limit-progression, plateau locations, the context that broke a plateau, and
recommendations feeding the next round's granularity.

```markdown
# Benchmark Report NNN (Simple)

**Date**: YYYY-MM-DD
**Orchestrator**: Claude Code (claude-opus-4-8[1m]) — maximal-standard decomposer
**Engine (under test)**: claude -p + Bedrock · **Haiku 4.5** (frozen)
**agentic-lib version**: X.Y.Z · **Previous report**: …_MMM.md (or "none")

| ID | Repo | INTENT | Issues | Triggers | Budget | Delivered? | Merged PRs | ~Cost | Notes |
|----|------|--------|--------|----------|--------|-----------|-----------|-------|-------|
| S1 | 8-kyu-remember-hello-world | hello-world | 0 (whole) | N | 1 | YES/NO | … | $… | … |

## Limit progression
| Repo | Transforms used / budget | max_turns hits | Decomposition refinements | Plateau? where |
|------|--------------------------|----------------|---------------------------|----------------|

## Findings
- **FINDING-N (POSITIVE / CONCERN / REGRESSION)**: …

## vs marginalia (Haiku orchestrator)
The Opus-orchestrated reliable-one-shot rate here is the maximal standard;
record the gap once marginalia runs the same process on these repos.

## Recommendations
1. …
```

## Restore

After collecting data, the executor leaves each repo **delivered on main** (PRs
merged) or at its clean mission seed. To reset a repo to its default seed by hand:

```bash
# scripts/init-all.sh [--purge] <repo-dir> [repo-dir ...]
scripts/init-all.sh --purge ../6-kyu-understand-roman-numerals
```
