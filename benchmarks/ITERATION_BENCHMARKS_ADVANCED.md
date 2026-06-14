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

## Current fleet (2026-06-14) — repo ↔ mission map + prerequisites

The last advanced run (reports 019/020) used `repository0-random`,
`repository0-string-utils`, `repository0-plot-code-lib` — **those repos no longer
exist**. The estate moved to `polycode-public` and the fleet is now kyu-named repos,
each carrying *its own* mission as `INTENT.md`. Map the advanced rungs onto the
current fleet:

| Rung | Repo (run target) | Mission (`--mission`) | Notes |
|------|-------------------|-----------------------|-------|
| 4-kyu | `sandbox` | `4-kyu-apply-dense-encoding` (or `4-kyu-analyze-json-schema-diff`) | **No dedicated 4-kyu repo** — `4-kyu-apply-cron-engine` was deleted; benchmark a 4-kyu mission on the scratch `sandbox` repo. |
| 3-kyu | `3-kyu-analyze-lunar-lander` | `3-kyu-analyze-lunar-lander` | The repo IS its mission. |
| 2-kyu | `2-kyu-create-markdown-compiler` | `2-kyu-create-markdown-compiler` | The repo IS its mission. |
| 1-kyu / dan | `sandbox` | `1-kyu-create-ray-tracer` / `1-dan-*` | Beyond one shot — decompose via marginalia, or run on `sandbox` and record the stall. |

The fleet repos already carry **delivered content** from earlier runs, so a
benchmark must **reset each to a clean mission seed first** (`init --purge --mission`,
which `scripts/benchmark-all.sh` does per repo). Use `sandbox` for any mission whose
repo doesn't exist, so you never overwrite a "real" fleet repo's delivery.

### Prerequisites (all currently met)

1. **Bedrock Anthropic access** — enabled org-wide (eu-west-2 inference profiles).
2. **Org setting** "Allow GitHub Actions to create and approve PRs" — **on**.
3. **Per-repo CI config** (vars `CLAUDE_CODE_USE_BEDROCK=1`, `ANTHROPIC_MODEL`,
   `AWS_REGION=eu-west-2`; secret `AWS_OIDC_ROLE` = `intention-fleet-bedrock-role`).
   The fleet repos already have these; `sandbox` does too.
4. **`gh` authenticated** with dispatch rights on `polycode-public/*`.
5. **Cost budget**: ~$0.20–0.24 per substantial mission at the 20-turn cap; a full
   4→3→2-kyu pass with a haiku/sonnet comparison is a few dollars. Honour the
   one-repo/day Bedrock cadence (PLAN_CODING_AGENT §17) — crons stay disabled;
   dispatch deliberately.

## Run it

```bash
# scripts/benchmark-all.sh <owner> <mission> <repo> [repo ...]
# 3-kyu on its own repo + a sandbox replica:
scripts/benchmark-all.sh polycode-public 3-kyu-analyze-lunar-lander \
  3-kyu-analyze-lunar-lander sandbox
# 4-kyu has no dedicated repo — run the mission on sandbox:
scripts/benchmark-all.sh polycode-public 4-kyu-apply-dense-encoding sandbox
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
