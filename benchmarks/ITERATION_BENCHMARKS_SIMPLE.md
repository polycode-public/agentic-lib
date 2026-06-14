# Simple Iteration Benchmarks

Repeatable delivery benchmarks for **simple missions (8–5 kyu)** on the 8.x engine
(`claude -p` + Bedrock). The metric is the same one that matters operationally:
**how many triggers (transformations) does it take to reach an acceptable PR for
each kyu tier?** Each transformation is one `transform.yml` run; iteration is a new
trigger, never an in-run loop. Results are tracked over time in
[`reports/`](reports/).

The cost that stopped benchmarking on Copilot premium requests **inverts on metered
Bedrock** — at the Haiku default a simple delivery is ~$0.10, so these run cheaply
and repeatably. Pace dispatches slowly anyway (own daily caps).

## How a benchmark run works

There is no budget counter, no profile, and **no agent "mission complete" signal**
in 8.x. A scenario **passes** if an acceptable PR exists within the target trigger
count for its tier; it **fails** if it exceeds that count. Completeness is judged by
the operator (and, in production, the marginalia supervisor) reading the PR — never
self-asserted by the engine.

| Kyu | Target triggers to an acceptable PR | Rationale |
|-----|-------------------------------------|-----------|
| 8, 7, 6 | **1** | Trivial-to-small; one transformation should land it. |
| 5 | **2–3** | A review/revise cycle (`address-review`) or a second `deliver-intent` may be needed. |

## Model

Set per repo/org variable `ANTHROPIC_MODEL` (Bedrock lane) or pass `model:` to the
consumer workflow. The fleet default is **Haiku 4.5**
(`eu.anthropic.claude-haiku-4-5-20251001-v1:0`). Bump to `sonnet` to measure the
capability/cost trade on a tier the cheaper model misses. See [`MODELS.md`](../MODELS.md).

## Run it

```bash
# Seed each repo with a mission and dispatch the engine:
#   scripts/benchmark-all.sh <owner> <mission> <repo> [repo ...]
scripts/benchmark-all.sh polycode-public 6-kyu-understand-roman-numerals \
  6-kyu-understand-roman-numerals sandbox
```

`benchmark-all.sh` runs, per repo: `npx @polycode-public/agentic-lib init --purge
--mission <mission>` (lays down `INTENT.md` + the 3 thin workflows) then dispatches
the engine. Each dispatch produces one draft PR (or nothing).

**Monitor** the resulting runs and PRs:

```bash
for REPO in 6-kyu-understand-roman-numerals sandbox; do
  echo -n "$REPO: "
  gh run list -R polycode-public/$REPO -L 1 --json status,conclusion \
    --jq '.[0] | "\(.status) \(.conclusion)"'
  gh pr list -R polycode-public/$REPO --state all -L 3 --json number,title,isDraft \
    --jq '.[] | "  #\(.number) \(.title) draft=\(.isDraft)"'
done
```

Re-trigger (a new `on-intent` dispatch, a review comment, or a `tend` schedule) to
add a transformation when the first PR is incomplete; count the triggers to an
acceptable PR.

## Record the result

Write a consolidated report to `benchmarks/reports/BENCHMARK_REPORT_SIMPLE_NNN.md`
(next free number; current baselines: `BENCHMARK_REPORT_SIMPLE_018.md`,
`BENCHMARK_REPORT_ADVANCED_019.md`, `BENCHMARK_REPORT_ADVANCED_020.md`). Capture per
scenario: repo, mission, model, triggers-to-acceptable-PR, pass/fail vs target,
token/cost estimate, and notable findings.

```markdown
# Benchmark Report NNN (Simple)

**Date**: YYYY-MM-DD
**Operator**: Claude Code (model-id)
**agentic-lib version**: X.Y.Z · **engine**: claude -p + Bedrock (model: …)
**Previous report**: BENCHMARK_REPORT_SIMPLE_MMM.md (or "none")

| ID | Repo | Mission | Model | Triggers | Target | Pass? | ~Cost | Notes |
|----|------|---------|-------|----------|--------|-------|-------|-------|
| S1 | … | 6-kyu-understand-roman-numerals | haiku | N | 1 | YES/NO | $… | … |

## Findings
- **FINDING-N (POSITIVE / CONCERN / REGRESSION)**: …

## Comparison with previous reports
Compare triggers/cost against the prior report and the historical Copilot-era
baselines in `reports/` (note: those used budget/profiles, not directly comparable).

## Recommendations
1. …
```

## Restore

After collecting data, restore each repo to its default mission:

```bash
# scripts/init-all.sh [--purge] <repo-dir> [repo-dir ...]
scripts/init-all.sh --purge ../sandbox
```
