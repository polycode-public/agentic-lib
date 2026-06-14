# Advanced Iteration Benchmarks (3–2 kyu + sandbox wildcard)

Repeatable delivery benchmarks for the **harder tiers** on the 8.x engine
(`claude -p` + Bedrock). This suite shares the **two-brain method, the polling
executor, the frozen-Haiku engine, the limits, and the report schema** defined in
[`ITERATION_BENCHMARKS_SIMPLE.md`](ITERATION_BENCHMARKS_SIMPLE.md) — **read that
first**. This file adds only what is specific to the harder tiers: heavier
decomposition, the plateau protocol, and the `sandbox` wildcard. Results in
[`reports/`](reports/).

## Recap of the fixed method (see SIMPLE for the full text)

- **Engine frozen at Haiku 4.5** (`eu.anthropic.claude-haiku-4-5-20251001-v1:0`),
  Bedrock lane, `max_turns=30`. **Never escalate the model.** The only lever is the
  *process* — decomposition granularity + supplied context.
- **Orchestrator = Claude Code Opus 4.8 (me)**, the maximal standard; marginalia
  runs the same process on Haiku. The benchmark measures how much a smarter
  decomposer lifts the *same* engine's reliable-one-shot rate.
- **Delivery = decompose INTENT → one issue per one-shot-sized chunk → dispatch
  `on-intent` per issue → judge → merge or re-work → repeat to delivery or budget
  exhaustion.** Hands-free executor: one transformation in flight, **poll every
  30s**, dispatch the next on idle, **no throttle** (contrast marginalia's
  6h/1h/30m billing cadence).

## Where the harder tiers differ — decomposition is the whole game

At 8–6 kyu a chunk usually *is* the whole intent. At 3–2 kyu the intent is a
multi-capability library that **must be carved** before the engine can one-shot
any part of it. This is exactly where an Opus orchestrator should beat a Haiku one,
and where the measurement lives.

- **2-kyu `create-markdown-compiler`** is ~10 distinct feature areas (headings,
  inline formatting, links, lists, code blocks, blockquotes, tables, rules, task
  lists, auto-linking) plus XSS-safety. Carve one issue per feature area (or a
  small cluster), ordered so later issues build on a green core. Each issue → one
  PR → merge → next.
- **3-kyu `analyze-lunar-lander`** is physics + scoring + an **autopilot
  controller**. Physics/scoring decompose cleanly; the autopilot is one
  **irreducibly-hard algorithm** (history: Haiku plateaus ~30/40 of its
  range-cases — passing the basic cases doesn't help the hard ones, and the prior
  session's PRs #8/#10 stalled there). It is the canonical plateau test.

### The plateau protocol (the core experiment)

When a chunk won't go green after a revision:

1. **Decompose it finer** — split the algorithm into smaller, independently
   testable sub-behaviours (e.g. for the autopilot: descent-phase detection →
   thrust schedule for the nominal case → boundary/limit handling → the hard
   range-cases) and dispatch each as its own issue.
2. **Supply richer context** — attach the failing-test output, the prior PR diff,
   and graph facts from seon (`seon_describe` the module, `seon_impact` to see what
   the change touches) into the issue body.
3. **Retry within budget.** Record the granularity + context that *did* break the
   plateau — that is the tuned variable.
4. **If it still won't one-shot** after a couple of finer attempts, **stop spending
   on it, record it as "beyond Haiku one-shot at the tested granularity," and move
   on.** The plateau location is the headline measurement vs marginalia — **not** a
   cue to change the model.

## The `sandbox` wildcard — the anti-overfitting control

`sandbox` is seeded with a **random wildcard INTENT, re-picked at run time on every
run** — never a fixed seed. It is the held-out control: if the process generalises,
sandbox keeps pace with the tiers it was tuned on; if sandbox lags, that gap is the
**overfitting signal** (the decomposition recipe has been over-tuned to the four
known kyu missions). The orchestrator picks the wildcard at run time from outside
the already-benchmarked set — an unused mission seed (e.g. `4-kyu-apply-cron-engine`,
`4-kyu-apply-owl-ontology`, `3-kyu-evaluate-time-series-lab`) or a freshly
hand-written INTENT with no name-affinity. **Record which INTENT was picked each
run** so the result is interpretable, but do not freeze the choice.

## Scope of this suite

| Repo | INTENT | Decomposition | Target reliable one-shots | Budget (turn-limit) |
|---|---|---|---|---|
| `3-kyu-analyze-lunar-lander` | physics + scoring + autopilot | physics/scoring clean; autopilot is the plateau | per-chunk | **6** |
| `2-kyu-create-markdown-compiler` | ~10 GFM feature areas + XSS-safety | one issue per feature area/cluster | per-chunk | **8** |
| `sandbox` | **random wildcard, re-picked each run** | per the picked INTENT | per-chunk | **3** |

`max_turns=30` (turn-size limit). Budgets above are the **turn-limit** per repo
(lean first-calibration round); the executor hard-stops and records exhaustion.
Note `3-kyu` carries **leftover open PRs (#8/#10) + an issue** from the prior
session — the executor cleans these to a baseline before its run.

## Run it

```bash
# Advanced suite (3-kyu + 2-kyu + sandbox-wildcard), hands-free:
scripts/benchmark-run.sh polycode-public advanced
```

The script handles init/reset (without pushing `.github/workflows` — the token
lacks the `workflow` scope, and the deployed dispatch-capable workflows are kept),
the per-issue dispatch, the 30s poll loop, budget hard-stops, and the ledger. The
orchestrator (Opus 4.8) supplies the decomposition + PR judgement.

## Finalize & verify the showcase (MANDATORY after delivery)

As in the simple suite: the reset deletes `agentic-lib-logs`, so after delivering a
repo run `scripts/benchmark-run.sh finalize <repo>` (re-publishes `summary.json` **and**
`SCREENSHOT_INDEX.png`), then `node scripts/check-showcase.mjs` to verify with Playwright
that the screenshots render on https://xn--intenton-z2a.com/ **and in the "Show all"
grid** (`naturalWidth > 0`), and to catch the S3 byte-identical generic-render smell.
Full detail: [`ITERATION_BENCHMARKS_SIMPLE.md`](ITERATION_BENCHMARKS_SIMPLE.md#finalize--verify-the-showcase-mandatory-after-delivery).
A broken showcase panel means the repo is **not** "delivered" for the showcased fleet.

## Record the result

Write to `benchmarks/reports/BENCHMARK_REPORT_ADVANCED_NNN.md` (next free number;
the Copilot-era 019/020 used budgets/profiles and `repository0-*` repos that no
longer exist — **not directly comparable**). Use the schema in SIMPLE, plus the
decomposition + plateau detail the hard tiers need:

```markdown
# Benchmark Report NNN (Advanced)

**Date**: YYYY-MM-DD
**Orchestrator**: Claude Code (claude-opus-4-8[1m]) — maximal-standard decomposer
**Engine (under test)**: claude -p + Bedrock · **Haiku 4.5** (frozen)
**agentic-lib version**: X.Y.Z · **Previous report**: …_MMM.md (or "none")
**sandbox wildcard this run**: <the INTENT picked>

| ID | Repo | INTENT | Issues | Triggers | Budget | Delivered? | Merged PRs | Plateau? | ~Cost |
|----|------|--------|--------|----------|--------|-----------|-----------|----------|-------|
| A1 | 3-kyu-analyze-lunar-lander | … | N | N | 6 | YES/NO | … | autopilot@… | $… |

## Decomposition & plateau detail (per repo)
- **Issues raised** and the slice each covered; ordering rationale.
- **Plateau locations** — the chunk(s) Haiku could not one-shot, the finer splits
  tried, the context attached, and whether a split/context broke it or it was
  recorded as the ceiling.

## Limit progression
| Repo | Transforms used / budget | max_turns hits | Decomposition refinements | Plateau? where |

## Overfitting check (sandbox vs tuned tiers)
Does sandbox's reliable-one-shot rate track 3/2-kyu, or lag? Interpret.

## Findings · vs marginalia · Recommendations
…feeding the next round's granularity recipe.
```

## Restore

```bash
scripts/init-all.sh --purge ../3-kyu-analyze-lunar-lander ../2-kyu-create-markdown-compiler ../sandbox
```
