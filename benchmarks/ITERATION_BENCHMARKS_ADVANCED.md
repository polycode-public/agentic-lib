# Advanced Iteration Benchmarks

Repeatable delivery benchmarks for **higher-complexity missions (4–1 kyu, dan)** on
the 8.x engine (`claude -p` + Bedrock). Same metric as the simple suite — **triggers
(transformations) to an acceptable PR** — but here the questions are about scaling:
how do iteration count, token cost, and success rate move as the kyu rung climbs,
and where does the cheap default model stop being enough? Results tracked in
[`reports/`](reports/).

Oversized intents (1-dan and up) are normally **decomposed into work items by the
marginalia supervisor**; for a standalone benchmark you drive the rungs directly and
record how the one-shot engine copes without a supervisor carving the intent.

## How a benchmark run works

No budget counter, no profile, **no agent "mission complete" signal**. A scenario
**passes** if an acceptable PR exists within the target trigger count; it **fails**
if it exceeds it. The operator (or the supervisor, in production) judges the PR.

| Kyu | Target triggers to an acceptable PR | Rationale |
|-----|-------------------------------------|-----------|
| 4 | **3** | Medium: a review/revise cycle plus a second `deliver-intent`. |
| 3 | **5** | Hard: domain algorithms / physics need iterative convergence. |
| 2 | **5** | Very hard: multi-output libraries. |
| 1 / dan | decomposed | Beyond one transformation — decompose into work items (marginalia) and benchmark the sub-items. |

## What we're measuring

1. **Kyu scaling** — triggers, token cost, success rate from 4 → 3 → 2 kyu.
2. **Mission-type difficulty** — encoding schemes vs structural analysis vs
   domain physics vs multi-output libraries.
3. **Model trade-off** — does Haiku 4.5 clear the rung, or does it need `sonnet` /
   `opus`? Re-run a failing tier with a bumped `ANTHROPIC_MODEL` and compare.
4. **Convergence** — do harder missions converge across triggers, or stall on
   code/test mismatch? (A stall shows as repeated triggers with no acceptable PR.)

## Model

Set `ANTHROPIC_MODEL` (Bedrock lane). Fleet default is **Haiku 4.5**
(`eu.anthropic.claude-haiku-4-5-20251001-v1:0`); for 3–2 kyu it's usually worth a
paired run at `sonnet` (`anthropic.claude-sonnet-4-6`) to quantify the trade. See
[`MODELS.md`](../MODELS.md).

## Run it

```bash
# scripts/benchmark-all.sh <owner> <mission> <repo> [repo ...]
scripts/benchmark-all.sh polycode-public 3-kyu-analyze-lunar-lander \
  3-kyu-analyze-lunar-lander sandbox
```

Per repo this runs `npx @polycode-public/agentic-lib init --purge --mission
<mission>` then dispatches the engine; each dispatch yields one draft PR (or
nothing). Re-trigger to add a transformation; count triggers to an acceptable PR.

**Monitor**, watching for convergence stalls (repeated triggers, no acceptable PR)
and multi-file source growth:

```bash
for REPO in 3-kyu-analyze-lunar-lander sandbox; do
  echo "=== $REPO ==="
  gh run list -R polycode-public/$REPO -L 3 --json status,conclusion,createdAt \
    --jq '.[] | "  \(.createdAt) \(.status) \(.conclusion)"'
  gh pr list -R polycode-public/$REPO --state all -L 5 \
    --json number,title,isDraft,additions,deletions \
    --jq '.[] | "  #\(.number) \(.title) +\(.additions)/-\(.deletions) draft=\(.isDraft)"'
done
```

## Record the result

Write to `benchmarks/reports/BENCHMARK_REPORT_ADVANCED_NNN.md` (next free number;
current: `BENCHMARK_REPORT_ADVANCED_019.md`, `_020.md`). Per scenario record repo,
mission, model, triggers, pass/fail vs target, token/cost, source-line and test-file
growth, and findings.

```markdown
# Benchmark Report NNN (Advanced)

**Date**: YYYY-MM-DD
**Operator**: Claude Code (model-id)
**agentic-lib version**: X.Y.Z · **engine**: claude -p + Bedrock (model: …)
**Previous report**: BENCHMARK_REPORT_ADVANCED_MMM.md (or "none")

| ID | Repo | Mission | Model | Triggers | Target | Pass? | ~Cost | Src lines | Test files | Notes |
|----|------|---------|-------|----------|--------|-------|-------|-----------|------------|-------|
| A1 | … | 4-kyu-apply-dense-encoding | haiku | N | 3 | YES/NO | $… | N | N | … |

## Kyu scaling
| Metric | A1 (4) | A2 (4) | A3 (3) | A4 (2) |
|--------|--------|--------|--------|--------|
| Triggers | … | … | … | … |
| Tokens / ~cost | … | … | … | … |

## Model trade-off (haiku vs sonnet on the failing tier)
…

## Findings
- **FINDING-N (POSITIVE / CONCERN / REGRESSION)**: …

## Comparison with previous reports
Compare against the prior report and the historical Copilot-era baselines in
`reports/` (budget/profile-based — not directly comparable).

## Recommendations
1. …
```

## Restore

```bash
# scripts/init-all.sh [--purge] <repo-dir> [repo-dir ...]
scripts/init-all.sh --purge ../sandbox
```
