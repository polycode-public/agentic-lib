# Plan: Benchmark V5 — Post Context-Quality Validation

## Context

agentic-lib v7.1.62 was released with the context-quality pipeline, iterator, TOML-driven profiles, self-descriptive config keys, and testScript wiring. repository0 was re-initialised at 20:48 UTC on 2026-03-06 with the hamming-distance mission. 9 scheduled workflow runs completed by 23:28.

This plan defines the next benchmark round to validate these changes and produce updated report documents.

---

## What Happened: v7.1.62 Experiment (2026-03-06 20:48–23:38)

### Timeline

| Time | Event | Run |
|------|-------|-----|
| 20:48 | init --purge (v7.1.61) | [#13](https://github.com/xn-intenton-z2a/repository0/actions/runs/22781401265) |
| 20:56 | workflow #44 — transform #2605 merged | [#44](https://github.com/xn-intenton-z2a/repository0/actions/runs/22781639068) |
| 21:13 | workflow #45 — maintain only (dev skipped) | [#45](https://github.com/xn-intenton-z2a/repository0/actions/runs/22782211296) |
| 21:31 | workflow #46 — maintain only (dev skipped) | [#46](https://github.com/xn-intenton-z2a/repository0/actions/runs/22782790265) |
| 21:54 | workflow #47 — maintain only (dev skipped) | [#47](https://github.com/xn-intenton-z2a/repository0/actions/runs/22783517332) |
| 22:11 | workflow #48 — transform #2611 merged | [#48](https://github.com/xn-intenton-z2a/repository0/actions/runs/22784060804) |
| 22:28 | workflow #49 — maintain only (dev skipped) | [#49](https://github.com/xn-intenton-z2a/repository0/actions/runs/22784575871) |
| 22:47 | workflow #50 — maintain only (dev skipped) | [#50](https://github.com/xn-intenton-z2a/repository0/actions/runs/22785123698) |
| 23:11 | workflow #51 — maintain only (dev skipped) | [#51](https://github.com/xn-intenton-z2a/repository0/actions/runs/22785816706) |
| 23:28 | workflow #52 — maintain only (dev skipped) | [#52](https://github.com/xn-intenton-z2a/repository0/actions/runs/22786279503) |
| 23:38 | init --purge (v7.1.62) | [#14](https://github.com/xn-intenton-z2a/repository0/actions/runs/22786522033) |

### Key Observations

- **2 transforms in 9 runs** — only runs #44 and #48 produced merged PRs (#2606, #2612)
- **7 out of 9 dev jobs skipped** — the transformation step ran but was skipped (no issue picked up or nop)
- **10 issues created, 10 closed** — all about hamming-distance variants, showing feature churn
- **Source code unchanged** — `src/lib/main.js` still has only the seed `main()` function, no hamming-distance implementation landed
- **Tests still seed-only** — single "should terminate without error" test
- **No features/ directory** — features were created then pruned each cycle
- **100% job success** — every run completed successfully, no crashes

### Problems to Investigate

1. **Transforms don't stick** — PRs merged but code didn't persist (re-init at 23:38 wiped it, but even before that, only 2 of 9 runs transformed)
2. **Feature churn** — maintain-features creates then prunes features each cycle instead of converging
3. **Issue churn** — each review creates a new issue variant instead of recognising existing similar ones
4. **No MISSION_COMPLETE signal** — the pipeline doesn't stop when the mission is done (if it ever gets done)
5. **Missing intentïon.md** — activity log not committed to repo root

---

## Benchmark V5 Test Plan

### What We're Testing

1. **Context quality pipeline** — does the clean/compress/limit pipeline produce better LLM decisions?
2. **Transformation budget** — does the budget enforcement prevent runaway cycles?
3. **MISSION_COMPLETE signal** — does the pipeline stop when the mission is accomplished?
4. **Profile scaling** — do min/recommended/max profiles produce different trade-offs?
5. **testScript wiring** — does `npm ci && npm test` work as the self-contained test command?
6. **Feature convergence** — do features stabilise instead of churning?
7. **Code quality** — does the transform actually implement the mission correctly?

### Scenarios

| # | Mission | Model | Profile | Budget | Goal |
|---|---------|-------|---------|--------|------|
| 1 | fizz-buzz | gpt-5-mini | min | 4 | Baseline — simplest mission, should complete in 2-3 transforms |
| 2 | fizz-buzz | gpt-5-mini | recommended | 8 | Compare min vs recommended context quality |
| 3 | hamming-distance | gpt-5-mini | recommended | 8 | Medium complexity — the mission that struggled above |
| 4 | hamming-distance | claude-sonnet-4 | recommended | 8 | Model comparison on same mission |

### How to Invoke

```bash
# Step 1: Init with purge for each scenario
gh workflow run agentic-lib-init -R xn-intenton-z2a/repository0 \
  -f mode=purge -f mission-seed=MISSION_NAME -f schedule=off

# Step 2: Wait for init to complete
gh run list -R xn-intenton-z2a/repository0 -L 3 -w agentic-lib-init

# Step 3: Manually set profile in agentic-lib.toml (if not default)
# Edit via gh api or commit directly

# Step 4: Run iterations (one at a time, observe results)
gh workflow run agentic-lib-workflow -R xn-intenton-z2a/repository0 \
  -f mode=full -f model=MODEL_NAME

# Step 5: Check status
gh run list -R xn-intenton-z2a/repository0 -L 3

# Step 6: After each run, record:
# - Commits on main
gh api repos/xn-intenton-z2a/repository0/commits -q '.[0:5] | .[] | .sha[0:8] + " " + (.commit.message | split("\n")[0])'
# - Source code state
gh api repos/xn-intenton-z2a/repository0/contents/src/lib/main.js -q '.content' | base64 -d | wc -l
# - Test results (check workflow logs)
# - Issues created/closed
gh api 'repos/xn-intenton-z2a/repository0/issues?state=all&per_page=10&sort=created&direction=desc' -q '.[] | select(.pull_request == null) | "#\(.number) \(.state) \(.title)"'
# - PRs merged
gh api 'repos/xn-intenton-z2a/repository0/pulls?state=all&per_page=10&sort=created&direction=desc' -q '.[] | "#\(.number) \(.state) merged=\(.merged_at // "no") \(.title)"'
# - MISSION_COMPLETE.md presence
gh api repos/xn-intenton-z2a/repository0/contents/MISSION_COMPLETE.md -q '.name' 2>/dev/null || echo "not yet"
```

### Stop Conditions per Scenario

1. **Mission accomplished** — MISSION_COMPLETE.md exists, tests pass, source implements the mission
2. **Budget exhausted** — transformation-budget reached, no more transforms attempted
3. **Convergence** — 2 consecutive iterations with no file changes (dev nop)
4. **Timeout** — 10 iterations without progress

### Metrics to Record per Iteration

| Metric | How to measure |
|--------|---------------|
| Transform outcome | Did the dev job run? Did it produce a PR? Was it merged? |
| Source lines | `wc -l` on src/lib/main.js after the run |
| Test count | Count of `test(` in tests/unit/main.test.js |
| Tests pass? | Check workflow log or run `npm test` on checkout |
| Issues created | Count new issues since last iteration |
| Issues closed | Count issues closed since last iteration |
| Features count | Number of .md files in features/ |
| Wall clock | Time from workflow start to completion |
| Transformation cost | Cost line in intentïon.md (if present) |
| MISSION_COMPLETE | Does the file exist? |

### Metrics to Record per Scenario (aggregate)

| Metric | Description |
|--------|-------------|
| Total iterations | How many workflow runs before stop condition |
| Total transforms | How many actually changed code |
| Time to first test pass | Iterations until tests pass for the first time |
| Time to mission complete | Iterations until MISSION_COMPLETE.md appears |
| Final source quality | Manual assessment: does the code correctly implement the mission? |
| Feature convergence | Did features stabilise or churn throughout? |
| Issue efficiency | Ratio of unique issues to total issues created |

---

## Output Documents

### REPORT_WORKFLOW_VALIDATION_V5.md

Replaces V4. Same structure:
- Method section with dispatch commands
- Per-scenario sections with iteration tables
- Each iteration row: run#, time, jobs, transform outcome, source state, test state
- Conclusions comparing V4 → V5 improvements

### REPORT_ITERATION_BENCHMARK.md (update)

Add new rows for V5 scenarios alongside existing data:
- Per-scenario summary row with iterations, transforms, time, outcome
- Profile comparison table (min vs recommended)
- Model comparison table (gpt-5-mini vs claude-sonnet-4)

### REPORT_MISSION_BENCHMARKS.md (update)

Add hamming-distance Run 2 (with v7.1.62 fixes) alongside Run 1 data.

---

## Pre-Flight Checklist

- [x] v7.1.62 released and published to npmjs
- [x] repository0 re-initialised with v7.1.62 (init #14 at 23:38)
- [ ] Confirm repository0 has v7.1.62 workflows (check agentic-lib.toml profiles sections)
- [ ] Confirm repository0 schedule is set to appropriate frequency
- [ ] Scenario 1: init fizz-buzz, run iterations, record results
- [ ] Scenario 2: init fizz-buzz (recommended profile), run iterations, record results
- [ ] Scenario 3: init hamming-distance, run iterations, record results
- [ ] Scenario 4: init hamming-distance (claude-sonnet-4), run iterations, record results
- [ ] Write REPORT_WORKFLOW_VALIDATION_V5.md
- [ ] Update REPORT_ITERATION_BENCHMARK.md
- [ ] Update REPORT_MISSION_BENCHMARKS.md
