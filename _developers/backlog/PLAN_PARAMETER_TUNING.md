# Plan: Parameter Tuning for Workflows

## Goal

Fine-tune the values in `agentic-lib.toml` to find a reliable and efficient default configuration for consumers.
Use the local CLI for fast iteration and the GitHub Actions path for real-world validation.

---

## Phase 1: Validate Both Paths

**Goal**: Prove that the pipeline works identically via CLI and Actions, using the scenario matrix from `ITERATION_BENCHMARKS_SIMPLE.md` as the validation suite.

### GitHub Actions validation

One clean run of the ITERATION_BENCHMARKS_SIMPLE.md scenario matrix constitutes Actions validation. The procedure is:

1. **Init purge** — `gh workflow run agentic-lib-init -R xn-intenton-z2a/repository0 -f mode=purge -f mission-seed=MISSION_NAME -f schedule=off`
2. **Dispatch workflow** — `gh workflow run agentic-lib-workflow -R xn-intenton-z2a/repository0`
3. **Monitor** — Read `agentic-lib-state.toml` and agent-log files from `agentic-lib-logs` branch
4. **Collect metrics** — tokens, duration, transforms, budget, mission-complete/failed
5. **Verify acceptance** — read source, tests, README, screenshot, website
6. **Record** — write `BENCHMARK_REPORT_NNN.md` using the template in ITERATION_BENCHMARKS_SIMPLE.md

#### Scenario matrix (from ITERATION_BENCHMARKS_SIMPLE.md)

| ID | Mission | Model | Profile | Budget | Purpose |
|----|---------|-------|---------|--------|---------|
| S1 | 7-kyu-understand-fizz-buzz | gpt-5-mini | recommended | 32 | Baseline — default config on simplest mission |
| S2 | 7-kyu-understand-fizz-buzz | gpt-5-mini | max | 128 | Profile comparison (max vs recommended) |
| S3 | 6-kyu-understand-hamming-distance | gpt-5-mini | recommended | 32 | Medium complexity baseline |
| S4 | 6-kyu-understand-hamming-distance | claude-sonnet-4 | recommended | 128 | Model comparison |
| S5 | 6-kyu-understand-roman-numerals | gpt-5-mini | recommended | 32 | Medium complexity baseline |
| S6 | 6-kyu-understand-roman-numerals | claude-sonnet-4 | max | 128 | Model comparison |

A successful validation means all scenarios reach mission-complete within budget.

### CLI validation

Construct an equivalent local validation using the agentic-lib CLI.

> **Note:** The `iterate`, `transform`, `maintain-features`, `maintain-library`, and `fix-code` commands
> require `@github/copilot-sdk` which is not bundled in the npm package. Use the local build
> (`node bin/agentic-lib.js`) after running `npm ci` in the agentic-lib repo, or run from a checkout
> that has the SDK installed.

#### Prerequisites

```bash
# Ensure agentic-lib dependencies (including @github/copilot-sdk) are installed
cd /path/to/agentic-lib && npm ci

# Set the Copilot token (required for all iterate/transform/task commands)
export COPILOT_GITHUB_TOKEN=<token>
```

#### Workspace setup (equivalent to init-purge)

```bash
# Create a clean workspace with a git repo, then init-purge with a mission seed
rm -rf ./tmp/bench-ws
mkdir -p ./tmp/bench-ws && cd ./tmp/bench-ws && git init

# Init distributes workflows, actions, agents, seeds, scripts, and config
node /path/to/agentic-lib/bin/agentic-lib.js init --purge --mission 7-kyu-understand-fizz-buzz

# Install workspace dependencies (required before running tests or iterate)
# Note: freshly-seeded workspaces have no package-lock.json, so use npm install (not npm ci)
npm install
```

#### Run each mission via CLI

```bash
# Single iteration — reads MISSION.md, transforms code, runs tests, iterates autonomously
node bin/agentic-lib.js iterate \
  --mission 7-kyu-understand-fizz-buzz --model gpt-5-mini

# Discovery mode — generates MISSION.md from project context, then iterates
node bin/agentic-lib.js iterate --here

# List available built-in mission seeds
node bin/agentic-lib.js iterate --list-missions

# Individual task handlers (all require COPILOT_GITHUB_TOKEN)
node bin/agentic-lib.js transform --target ./tmp/bench-ws --model gpt-5-mini
node bin/agentic-lib.js maintain-features --target ./tmp/bench-ws --model gpt-5-mini
node bin/agentic-lib.js maintain-library --target ./tmp/bench-ws --model gpt-5-mini
node bin/agentic-lib.js fix-code --target ./tmp/bench-ws --model gpt-5-mini
```

#### Available CLI commands

| Command | Description |
|---------|-------------|
| `init` | Update workflows, actions, agents, seeds, scripts |
| `init --reseed` | Also clear features + activity log (keep source code) |
| `init --purge` | Full reset — reseed + replace source files with seeds |
| `update` | Alias for `init` |
| `reset` | Alias for `init --purge` |
| `version` | Show version |
| `iterate` | Single Copilot SDK session — reads, writes, tests, iterates autonomously |
| `iterate --here` | Discover the project and generate a MISSION.md, then iterate |
| `iterate --list-missions` | List available built-in mission seeds |
| `transform` | Transform code toward the mission |
| `maintain-features` | Generate feature files from mission |
| `maintain-library` | Update library docs from SOURCES.md |
| `fix-code` | Fix failing tests |

#### Key CLI options

| Option | Description | Default |
|--------|-------------|---------|
| `--target <path>` | Target repository | current directory |
| `--mission <name>` | Mission seed name (purge only) | `6-kyu-understand-hamming-distance` |
| `--mission-file <path>` | Custom mission file | — |
| `--model <name>` | Copilot SDK model | `claude-sonnet-4` |
| `--agent <name>` | Agent prompt to use | `agent-iterate` |
| `--timeout <ms>` | Session timeout | `600000` |
| `--issue <N>` | GitHub issue number for context | — |
| `--pr <N>` | GitHub PR number for context | — |
| `--dry-run` | Show what would be done | — |

#### Metrics to collect

For each CLI run, record: tokens (from session result), duration (wall-clock), transforms (files changed), pass/fail (test exit code).

#### CLI ↔ Actions comparison

| Metric | CLI | Actions |
|--------|-----|---------|
| Mission complete within budget | ? | ? |
| Transforms to first working code | ? | ? |
| Total tokens | ? | ? |
| Wall-clock time | ? | ? |
| Test pass rate | ? | ? |
| Code quality (source lines, exports, tests) | ? | ? |

### Regression checklist

Last run: 2026-03-17, version 7.4.24-0, model gpt-5-mini, mission 7-kyu-understand-fizz-buzz

- [x] `npm ci` succeeds in agentic-lib (installs @github/copilot-sdk) — 0 vulnerabilities
- [x] `npm test` passes in agentic-lib (577+ unit tests) — 577 passed, 31 test files
- [x] `npm run lint:workflows` passes — 9 workflow files, 0 errors
- [x] Init distributes actions, agents, seeds, scripts, copilot modules correctly — 117 changes
- [x] `npm install` succeeds in init-purged workspace — 291 packages, 0 vulnerabilities
- [x] CLI `iterate` completes 7-kyu-understand-fizz-buzz — 107s, 16 tool calls, 3 files written, 131K tokens, tests pass
- [x] CLI `iterate --here` discovers and generates MISSION.md — found existing MISSION.md, verified tests pass, 158s, 218K tokens
- [x] CLI `iterate --list-missions` lists all available seeds — 19 missions listed
- [x] CLI `transform` runs a single transform cycle — 45s, 7 tool calls, 51K tokens, outcome=transformed
- [x] CLI `maintain-features` generates feature files — 32s, 6 tool calls, 103K tokens, tests verified
- [x] CLI `maintain-library` updates library docs — 72s, 12 tool calls, 129K tokens, tests verified
- [x] CLI `fix-code` fixes failing tests — correctly skipped ("Tests already pass — nothing to fix")
- [x] Token tracking produces correct numbers — all commands reported in/out token counts
- [ ] Profile tuning (min/recommended/max) works in both paths — not yet tested
- [ ] Supervisor creates issues successfully (Actions only — W1 inline param parsing) — not yet tested
- [ ] Dispatch forwards mode and issue-number correctly (Actions only — W2/W3) — not yet tested

### CLI validation run results (2026-03-17)

| Command | Duration | Tool calls | Tokens (in/out) | Files written | Tests | Outcome |
|---------|----------|------------|-----------------|---------------|-------|---------|
| `iterate --mission 7-kyu-understand-fizz-buzz` | 107s | 16 | 127K / 5K | 3 (main.js, fizzbuzz.test.js, README.md) | pass | complete |
| `iterate --here` | 158s | 14 | 215K / 3K | 0 (already done) | pass | complete |
| `transform` | 45s | 7 | 49K / 2K | 0 (already done) | pass | transformed |
| `maintain-features` | 32s | 6 | 103K / 1K | 0 | pass | transformed |
| `maintain-library` | 72s | 12 | 127K / 2K | 0 | pass | transformed |
| `fix-code` | 0s | 0 | — | 0 | pass | skipped (nop) |

**Observations:**
- `iterate` completed fizz-buzz from seed state in a single session (107s, 131K tokens total)
- The agent wrote `src/lib/main.js` (fizzBuzz + fizzBuzzSingle with edge cases), `tests/unit/fizzbuzz.test.js`, and `README.md`
- All subsequent commands found nothing to do — the iterate session satisfied all acceptance criteria
- `fix-code` correctly detected tests already passing and exited immediately
- Behaviour test (Playwright) fails without a browser runtime — expected in CLI environment

---

## Phase 2: Tune Locally

**Goal**: Use the fast local iteration loop to explore models, reasoning effort, and profile parameters — things that take hours via Actions but minutes locally.

### Mission tiers for tuning

| Tier | Mission | Complexity | Expected transforms | Observed wall-clock |
|------|---------|-----------|---------------------|---------------------|
| Easy (7-kyu) | `7-kyu-understand-fizz-buzz` | 2 functions, 8 criteria | 1–2 | ~20 min (Report 004) |
| Medium (6-kyu) | `6-kyu-understand-hamming-distance` | 2 functions + Unicode + BigInt, 7 criteria | 2–4 | ~21 min (Summary 009) |
| Hard (4-kyu) | `4-kyu-apply-cron-engine` | 5 functions + DST + validation, 8 criteria | 4–8 | ~93 min (Report 007) |

### Core tuning knobs (`[tuning]` section)

| Parameter | Values | Impact | What to watch |
|-----------|--------|--------|---------------|
| `profile` | min / recommended / max | Sets defaults for all limits and reasoning | min may under-budget hard missions; max may over-spend |
| `model` | gpt-5-mini / claude-sonnet-4 / gpt-4.1 | LLM capability vs cost | gpt-5-mini is fast+cheap; claude-sonnet-4 is highest code quality |
| `reasoning-effort` | low / medium / high / none | Depth of reasoning (gpt-5-mini, o4-mini only) | Higher effort → more tokens but potentially fewer transforms |
| `transformation-budget` | 4–128 | Max code-changing cycles per run | Hamming used 5/32; cron-engine used 6/32 |
| `infinite-sessions` | true / false | Session compaction for long runs | May lose context in multi-iteration scenarios |

### Limit knobs (`[limits]` and `[profiles.*]`)

| Parameter | min | recommended | max | Effect |
|-----------|-----|-------------|-----|--------|
| `max-feature-issues` | 1 | 2 | 4 | Concurrent feature development issues |
| `max-maintenance-issues` | 1 | 1 | 2 | Concurrent maintenance issues |
| `max-attempts-per-branch` | 2 | 3 | 5 | Transform retries before abandoning a branch |
| `max-attempts-per-issue` | 1 | 2 | 4 | Transform retries before abandoning an issue |
| `features-limit` | 2 | 4 | 8 | Max feature spec files in `features/` |
| `library-limit` | 8 | 32 | 64 | Max library reference docs in `library/` |
| `max-issues` | 5 | 15 | 30 | Max open issues fetched from GitHub |
| `stale-days` | 14 | 30 | 90 | Days before issue considered stale |
| `max-discussion-comments` | 3 | 10 | 20 | Max discussion comments fetched |

### Mission-complete thresholds (`[mission-complete]`)

| Parameter | Default | Effect |
|-----------|---------|--------|
| `min-resolved-issues` | 1 | Minimum closed-as-resolved issues before mission-complete |
| `max-source-todos` | 0 | Max TODO comments allowed in `./src` |

### Tuning matrices

#### Reasoning effort × Model (run on all 3 tier missions)

| Model | low | medium | high |
|-------|-----|--------|------|
| gpt-5-mini | Baseline | Current default | ? |
| claude-sonnet-4 | ? | ? | N/A (auto-skipped) |
| gpt-4.1 | ? | ? | ? |

For each cell: record tokens, wall-clock, transforms, pass/fail, code quality.

#### Profile × Mission (gpt-5-mini / medium reasoning)

| Mission | min | recommended | max |
|---------|-----|-------------|-----|
| 7-kyu-understand-fizz-buzz | ? | Report 004 data | ? |
| 6-kyu-understand-hamming-distance | ? | Summary 009 data | ? |
| 4-kyu-apply-cron-engine | ? | Report 007 data | ? |

### What to observe (from benchmark history)

| Metric | Hamming (Summary 009) | Cron-engine (Report 007) | What it means |
|--------|-----------------------|--------------------------|---------------|
| Tokens per transform | 410K (main transform) | ~300K per transform | LLM cost per code-changing step |
| Wall-clock per iteration | ~10 min | ~12 min | CI overhead + LLM latency |
| Budget consumption | 5/32 (16%) | 6/32 (19%) | Headroom for harder missions |
| Feature specs created | 4 (first maintain) | 3 | Context the transform agent receives |
| Library docs created | 7 (second maintain) | 6 | Reference material quality |
| Issue lifecycle | 3m 45s | ~5 min | Supervisor → dev → merge cycle |
| Convergence | 2 workflow runs | 8 workflow runs | Instability = more iterations |

### What to look out for (known failure patterns)

| Pattern | Source | Mitigation |
|---------|--------|------------|
| Behaviour test instability consuming budget | Report 007 (50-75% of transforms) | W1 retry logic, W2 explicit waits |
| Supervisor inline params not parsed | Benchmark 010 (0 transforms in 2 iterations) | W1 inline param parsing fix (v7.4.18) |
| Dispatch with placeholder issue numbers | Benchmark 010 | W2 numeric validation (v7.4.18) |
| Premature mission-complete | Report 006 | Dedicated test file requirement (W3) |
| Maintain commit push failure after rebase | Report 009 W8 | HEAD-matches-origin check |
| Context contamination between missions | Report 008/009 | Init purge resets logs branch |
| Transform not running tests internally | Summary 009 (0 test runs in agent) | Post-commit-test gate catches this |

### Output

Results go in `BENCHMARK_REPORT_NNN.md` using the template from ITERATION_BENCHMARKS_SIMPLE.md, with:
- Side-by-side comparison tables for all model/effort/profile combinations
- Token cost analysis (per-transform and cumulative)
- Recommendations for default profile settings
- Findings on which parameters provide measurable improvement
- Fix plan in `PLAN_BENCHMARK_NNN_FIXES.md` for any issues discovered
