# Benchmark Report 021 (Simple)

**Date**: 2026-06-15
**Orchestrator**: Claude Code (claude-opus-4-8[1m]) — maximal-standard decomposer
**Engine (under test)**: `claude -p` + Bedrock · **Haiku 4.5** (`eu.anthropic.claude-haiku-4-5-20251001-v1:0`), **frozen**
**agentic-lib version**: 8.2.0 (`v8`) · **engine workflow**: `transform.yml@v8`
**Previous report**: BENCHMARK_REPORT_SIMPLE_018.md (Copilot-era — *not comparable*: budgets/profiles)
**Method**: two-brain decompose→deliver→merge ([`ITERATION_BENCHMARKS_SIMPLE.md`](../ITERATION_BENCHMARKS_SIMPLE.md)); hands-free 30s-poll executor `scripts/benchmark-run.sh`
**Companion**: [`BENCHMARK_REPORT_ADVANCED_021.md`](BENCHMARK_REPORT_ADVANCED_021.md) (3/2-kyu + sandbox + all infra findings)

---

## Dashboard

| ID | Repo | INTENT | Issues (decomp) | Triggers | Budget | Delivered? | Tests on main | ~Cost |
|----|------|--------|-----------------|----------|--------|-----------|---------------|-------|
| S1 | 8-kyu-remember-hello-world | hello-world | 0 (whole-shot) | 1 | 1 | **YES** | 9/9 ✅ | ~$0.05 |
| S2 | 6-kyu-understand-roman-numerals | int↔Roman, round-trip, errors | 0 (whole-shot) | 1 | 2 | **YES** | 32/32 ✅ | ~$0.10 |

Both **delivered green on `main` in a single whole-intent shot** — no decomposition
needed. Each was reset to a clean mission-seed baseline, delivered, judged (vitest
run locally — there is no CI gate, see ADVANCED FINDING-5), and merged.

---

## Findings

- **FINDING-1 (calibration):** the simple tiers are **one-reliable-one-shot sized as
  written** — the Haiku engine delivers them whole, first time. 8-kyu (9/9) and 6-kyu
  (32/32, incl. `1994↔MCMXCIV` and `0→RangeError`) both passed every acceptance
  criterion in one trigger. **No decomposition value to add here** — the orchestrator's
  job at this tier is just to dispatch and judge.
- **FINDING-2 (budget):** 6-kyu came in **under budget** (1 of 2). The 2-trigger
  budget reserved a decomposition/revise slot that wasn't needed. Next round: 6-kyu
  budget → 1 is safe.
- **FINDING-3 (no CI gate):** as in the advanced suite, the consumer repos ship no
  `test.yml`, so "green" was the orchestrator running `vitest` on the PR branch
  locally. → candidate engine item (ship a minimal `test.yml` seed).

## Limit progression

| Repo | Triggers / budget | Decomposition | Plateau? |
|------|-------------------|---------------|----------|
| 8-kyu | 1 / 1 | none (whole-shot) | no |
| 6-kyu | 1 / 2 | none (whole-shot) | no |

## vs marginalia (Haiku orchestrator)

At this tier the orchestrator brain barely matters — both Opus and Haiku should
dispatch a single whole-intent shot and land it. The interesting divergence is at
3-kyu/2-kyu (see ADVANCED_021), where decomposition + verified context is the lever.

## Recommendations

1. Drop 6-kyu budget to 1; keep 8-kyu at 1.
2. Ship a minimal `test.yml` seed so the green/red gate is mechanical.
3. The simple tier is a stable regression baseline — re-run cheaply each round to
   confirm no engine regression before spending on the hard tiers.
