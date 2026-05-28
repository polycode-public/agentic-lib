# Copilot SDK Available Models

Last updated: 2026-03-06 (via `client.listModels()`)

## Models

| ID                | Name            | Provider  | Premium   | Context | Max Output | Vision         | Tools          | Reasoning Effort       |
| ----------------- | --------------- | --------- | --------- | ------- | ---------- | -------------- | -------------- | ---------------------- |
| `claude-sonnet-4` | Claude Sonnet 4 | Anthropic | Yes (1x)  | 216K    | 16K        | Yes (5 images) | Yes (parallel) | No (has thinking mode) |
| `gpt-5-mini`      | GPT-5 mini      | OpenAI    | No (free) | 264K    | 64K        | Yes (1 image)  | Yes (parallel) | Yes (low/medium/high)  |
| `gpt-4.1`         | GPT-4.1         | OpenAI    | No (free) | 128K    | 16K        | Yes (1 image)  | Yes (parallel) | No                     |

## Default Models

There are two defaults in the system:

- **CLI default** (`npx agentic-lib init`): **`claude-sonnet-4`** (via Copilot SDK)
- **TOML/workflow default** (`agentic-lib.toml`, `agentic-lib-workflow.yml`): **`gpt-5-mini`**

The TOML `[tuning].model` field controls what model the workflow uses. The CLI default is for interactive use.

## Reasoning Effort

The `reasoning-effort` tuning parameter (low/medium/high/none) is only supported by:

- **gpt-5-mini** — mapped to OpenAI's reasoning effort parameter
- **o4-mini** — mapped to OpenAI's reasoning effort parameter

For other models (claude-sonnet-4, gpt-4.1), the parameter is silently ignored. Set `reasoning-effort = "none"` to explicitly disable it.

The allowlist is maintained in `src/actions/agentic-step/copilot.js` (`MODELS_SUPPORTING_REASONING_EFFORT`).

## Billing Tiers

Premium models (like Claude Sonnet 4) are restricted to:

- Pro, Pro Plus, Max, Business, Enterprise, Edu plans

Free models (GPT-5 mini, GPT-4.1) are available to all Copilot plans.

## Profile ↔ Model Guidance

Profiles control LLM-facing context limits (file read sizes, test output, listings). Choose a profile that fits your model's context window:

| Profile | Sized for | Max single read | Total context budget |
|---------|-----------|-----------------|---------------------|
| `min`   | gpt-4.1 (128K tokens) | 20K chars (~6K tokens) | Conservative — fast, cheap |
| `med`   | claude-sonnet-4 (216K tokens) | 50K chars (~14K tokens) | Balanced |
| `max`   | gpt-5-mini (264K tokens) | 100K chars (~28K tokens) | Full capability |

With `infinite-sessions: true` (enabled in med and max profiles), the Copilot SDK compacts earlier messages if context fills up. This means the limits above are per-tool-call caps, not hard session limits.

## Notes

- Model IDs are what you pass to `createSession({ model: "..." })`
- The previously used `claude-sonnet-4.5` is NOT a valid model ID
- Use `node scripts/test-copilot-local.js` to list current models
- Models may change — GitHub controls what's available through the Copilot API

---

# Benchmarking

Shared infrastructure for `ITERATION_BENCHMARKS_SIMPLE.md` and `ITERATION_BENCHMARKS_ADVANCED.md`. Both benchmark docs reference this section for common definitions, commands, and conventions.

## Target Repositories

All benchmark repos run concurrently, one scenario per repo.

| Short Name | Full Name | GitHub CLI Flag | Website | Default Mission |
|-----------|-----------|----------------|---------|-----------------|
| `repository0-random` | `xn-intenton-z2a/repository0-random` | `-R xn-intenton-z2a/repository0-random` | `https://xn-intenton-z2a.github.io/repository0-random/` | `random` |
| `string-utils` | `xn-intenton-z2a/repository0-string-utils` | `-R xn-intenton-z2a/repository0-string-utils` | `https://xn-intenton-z2a.github.io/repository0-string-utils/` | `5-kyu-apply-string-utils` |
| `dense-encoder` | `xn-intenton-z2a/repository0-dense-encoder` | `-R xn-intenton-z2a/repository0-dense-encoder` | `https://xn-intenton-z2a.github.io/repository0-dense-encoder/` | `4-kyu-apply-dense-encoding` |
| `plot-code-lib` | `xn-intenton-z2a/repository0-plot-code-lib` | `-R xn-intenton-z2a/repository0-plot-code-lib` | `https://xn-intenton-z2a.github.io/repository0-plot-code-lib/` | `2-kyu-create-plot-code-lib` |

**Default Mission** is the "home" mission implied by each repository's name — used by `scripts/all-repositories-init.sh` and `scripts/all-repositories-flow.sh` and as the restore target after benchmarks.

**Shell variable for loops** (used throughout benchmark guides):

```bash
REPOS="repository0-random repository0-string-utils repository0-dense-encoder repository0-plot-code-lib"
```

## Benchmark Permissions

The operator has pre-approved these operations during benchmark runs (no confirmation needed):

- All `gh` read commands on all 4 repos (pr list, issue list, run list, api GET, etc.)
- `gh workflow run` dispatches on all 4 repos
- `gh api` mutations on all 4 repos (issues, PRs)
- Reading/writing report files in agentic-lib project root
- Pushing branches and opening PRs on agentic-lib
- Running `scripts/all-repositories-*.sh` scripts

## Mission Seed Catalogue

Each mission is a self-contained MISSION.md in `src/seeds/missions/`. Missions are categorised by kyu complexity.

### 7-8 kyu — Trivial (1-2 transforms expected)

| Mission | Functions | Acceptance Criteria | Notes |
|---------|-----------|-------------------|-------|
| `7-kyu-understand-fizz-buzz` | `fizzBuzz(n)`, `fizzBuzzSingle(n)` | 8 criteria | Simplest. If this fails, something fundamental is broken. |

### 6 kyu — Simple (2-4 transforms expected)

| Mission | Functions | Acceptance Criteria | Notes |
|---------|-----------|-------------------|-------|
| `6-kyu-understand-hamming-distance` | `hammingDistance(a,b)`, `hammingDistanceBits(x,y)` | 7 criteria | Unicode support, BigInt, input validation. |
| `6-kyu-understand-roman-numerals` | `toRoman(n)`, `fromRoman(s)` | 9 criteria | Round-trip property, subtractive notation. |

### 4-5 kyu — Medium (4-8 transforms expected)

| Mission | Functions | Acceptance Criteria | Notes |
|---------|-----------|-------------------|-------|
| `5-kyu-apply-string-utils` | 10 functions (slugify, truncate, camelCase, etc.) | 7 criteria | Bag-of-functions. Many independent functions to implement. |
| `4-kyu-apply-dense-encoding` | encode/decode, createEncoding, listEncodings | 6 criteria | Multiple encoding schemes, round-trip correctness. |
| `4-kyu-apply-cron-engine` | parseCron, nextRun, matches, etc. | 8 criteria | DST handling, special strings, validation. |
| `4-kyu-analyze-json-schema-diff` | diffSchemas, classifyChange, formatChanges, resolveLocalRefs | 10 criteria | Recursive structural diffing, $ref resolution, breaking-change classification. |

### 3 kyu — Hard (5-10 transforms expected)

| Mission | Functions | Acceptance Criteria | Notes |
|---------|-----------|-------------------|-------|
| `3-kyu-analyze-lunar-lander` | createState, step, simulate, autopilot, score | 7 criteria | Physics simulation, BFS autopilot search, multi-combo safety testing. |

### 2 kyu — Very Hard (5-10 transforms expected)

| Mission | Functions | Acceptance Criteria | Notes |
|---------|-----------|-------------------|-------|
| `2-kyu-create-plot-code-lib` | parseExpression, evaluateRange, renderSVG, svgToPng, CLI | 8 criteria | Multi-output library: expression parsing, SVG/PNG, CLI, CSV. |

## Tuning Profiles

Profiles control context quality, budget, and limits. Set in `agentic-lib.toml` via `[tuning] profile = "..."`. The default distributed profile is **`max`**.

| Profile | Budget | Reasoning | Read Chars | Test Output | Feature Issues | Use Case |
|---------|--------|-----------|-----------|-------------|----------------|----------|
| `min` | 16 | low | 20,000 | 4,000 | 1 | Fast, cheap. CI testing. |
| `med` | 32 | medium | 50,000 | 10,000 | 2 | Balanced. Middle ground. |
| `max` | 128 | high | 100,000 | 20,000 | 4 | Thorough. Default for consumers. |

## Execution Scripts

All benchmark execution uses `agentic-lib-flow` via these scripts:

| Script | Purpose | Mode | Schedule | Report |
|--------|---------|------|----------|--------|
| `scripts/all-repositories-benchmarks-simple.sh` | Simple benchmarks (5-7 kyu) | purge | off | yes |
| `scripts/all-repositories-benchmarks-advanced.sh` | Advanced benchmarks (2-4 kyu) | purge | off | yes |
| `scripts/all-repositories-flow.sh` | Normal operation (default missions) | purge | hourly | no |
| `scripts/all-repositories-init.sh` | Init with default missions | purge | hourly | N/A |
| `scripts/all-repositories-purge.sh` | Reset repos (schedule off) | purge | off | N/A |

The `agentic-lib-flow` workflow runs: update → init → (test + bot + N×workflow) × rounds → verify → report. When `generate-report=true`, each repo commits a `BENCHMARK_REPORT_NNN.md` to its own main branch at the end of the flow.

## Pre-Flight Check

Before running a benchmark script, verify the script's scenario matrix matches the benchmark doc. The operator should:

1. **Read the script** to extract the mission-seed and repo for each scenario.
2. **Compare** against the Scenario Matrix in the benchmark doc.
3. **If they differ**, prompt the user: _"The script dispatches `<mission>` to `<repo>` but the doc says `<other-mission>`. Update the script, update the doc, or proceed as-is?"_
4. **Verify restore missions**: After benchmarks, repos should be restored to their **Default Mission** (from the Target Repositories table above). Check that `scripts/all-repositories-init.sh` uses these defaults.

## Monitoring Commands

Use these commands during or after benchmark runs to check status.

### Dashboard check (quick status of all 4)

```bash
REPOS="repository0-random repository0-string-utils repository0-dense-encoder repository0-plot-code-lib"

for REPO in $REPOS; do
  COMPLETE=$(gh api "repos/xn-intenton-z2a/$REPO/contents/MISSION_COMPLETE.md" \
    -q '.name' 2>/dev/null || echo "no")
  FAILED=$(gh api "repos/xn-intenton-z2a/$REPO/contents/MISSION_FAILED.md" \
    -q '.name' 2>/dev/null || echo "no")
  LAST_RUN=$(gh run list -R xn-intenton-z2a/$REPO -w agentic-lib-workflow -L 1 \
    --json status,conclusion --jq '.[0] | "\(.status)/\(.conclusion)"' 2>/dev/null || echo "none")
  echo "$REPO: complete=$COMPLETE failed=$FAILED last_run=$LAST_RUN"
done
```

### Read persistent state files

```bash
REPOS="repository0-random repository0-string-utils repository0-dense-encoder repository0-plot-code-lib"

for REPO in $REPOS; do
  echo "=== $REPO ==="
  gh api "repos/xn-intenton-z2a/$REPO/contents/agentic-lib-state.toml" \
    --jq '.content' -H "Accept: application/vnd.github.v3+json" \
    --method GET -f ref=agentic-lib-logs 2>/dev/null | base64 -d || echo "no state file"
  echo ""
done
```

Key fields: `log-sequence`, `cumulative-transforms`, `total-tokens`, `transformation-budget-used`/`cap`, `mission-complete`, `mission-failed`.

### Read individual agent log files

```bash
# List log files for a specific repo
gh api repos/xn-intenton-z2a/REPO_NAME/git/trees/agentic-lib-logs \
  -q '.tree[].path' | grep '^agent-log-' | sort

# Read a specific log file
gh api "repos/xn-intenton-z2a/REPO_NAME/contents/FILENAME" \
  --jq '.content' -H "Accept: application/vnd.github.v3+json" \
  --method GET -f ref=agentic-lib-logs | base64 -d
```

### Download and view screenshots

```bash
REPOS="repository0-random repository0-string-utils repository0-dense-encoder repository0-plot-code-lib"

for REPO in $REPOS; do
  gh api "repos/xn-intenton-z2a/$REPO/contents/SCREENSHOT_INDEX.png" \
    --jq '.content' -H "Accept: application/vnd.github.v3+json" \
    --method GET -f ref=agentic-lib-logs 2>/dev/null | base64 -d > "/tmp/screenshot-$REPO.png" \
    && echo "$REPO: screenshot saved" || echo "$REPO: no screenshot"
done
```

### Fetch live websites

```bash
REPOS="repository0-random repository0-string-utils repository0-dense-encoder repository0-plot-code-lib"

for REPO in $REPOS; do
  curl -sL "https://xn-intenton-z2a.github.io/$REPO/" > "/tmp/website-$REPO.html" \
    && echo "$REPO: website fetched" || echo "$REPO: no website"
done
```

### GitHub API context (per-repo)

```bash
REPO=REPO_NAME

# Latest workflow runs
gh run list -R xn-intenton-z2a/$REPO -w agentic-lib-workflow -L 5

# Source code size
gh api repos/xn-intenton-z2a/$REPO/contents/src/lib/main.js \
  -q '.content' | base64 -d | wc -l

# Test files
gh api repos/xn-intenton-z2a/$REPO/contents/tests/unit \
  -q '.[].name' 2>/dev/null || echo "no test dir"

# Recent commits
gh api repos/xn-intenton-z2a/$REPO/commits \
  -q '.[0:5] | .[] | .sha[0:8] + " " + (.commit.message | split("\n")[0])'

# Issues (all states)
gh api "repos/xn-intenton-z2a/$REPO/issues?state=all&per_page=10&sort=created&direction=desc" \
  -q '.[] | select(.pull_request == null) | "#\(.number) \(.state) \(.title)"'

# PRs (all states)
gh api "repos/xn-intenton-z2a/$REPO/pulls?state=all&per_page=10&sort=created&direction=desc" \
  -q '.[] | "#\(.number) \(.state) merged=\(.merged_at // "no") \(.title)"'

# Activity log
gh api repos/xn-intenton-z2a/$REPO/contents/intenti%C3%B6n.md \
  -q '.content' 2>/dev/null | base64 -d | tail -30
```

## Collecting Reports from Repos

When `generate-report=true`, the `agentic-lib-flow` workflow commits a `BENCHMARK_REPORT_NNN.md` into each tested repository at the end of the flow. To build the consolidated agentic-lib report:

1. **Find the latest report file** in each repo:
   ```bash
   for REPO in $REPOS; do
     echo "=== $REPO ==="
     gh api "repos/xn-intenton-z2a/$REPO/contents" --jq '.[].name' | grep 'BENCHMARK_REPORT'
   done
   ```

2. **Fetch each report**:
   ```bash
   gh api "repos/xn-intenton-z2a/REPO_NAME/contents/BENCHMARK_REPORT_NNN.md" \
     --jq '.content' | base64 -d
   ```

3. **Synthesise** the per-repo reports into a single `BENCHMARK_REPORT_SIMPLE_NNN.md` or `BENCHMARK_REPORT_ADVANCED_NNN.md` in the agentic-lib project root, using the report template from the relevant benchmark doc.

## Outcome Determination

A scenario is complete when one of:
- `MISSION_COMPLETE.md` exists (supervisor declared mission complete)
- `MISSION_FAILED.md` exists (supervisor declared mission failed)
- Transformation budget is exhausted (check state file)
- 3+ consecutive nop iterations with no transform (manual convergence detection)
- Schedule is set to off by the director

## Acceptance Criteria Verification

For each repo, verify the final codebase against the mission's acceptance criteria:

```bash
REPO=REPO_NAME

# Read source
gh api repos/xn-intenton-z2a/$REPO/contents/src/lib/main.js \
  -q '.content' | base64 -d

# Read tests
gh api repos/xn-intenton-z2a/$REPO/contents/tests/unit -q '.[].name'

# Read README
gh api repos/xn-intenton-z2a/$REPO/contents/README.md \
  -q '.content' | base64 -d | head -50

# Download final screenshot
gh api "repos/xn-intenton-z2a/$REPO/contents/SCREENSHOT_INDEX.png" \
  --jq '.content' -H "Accept: application/vnd.github.v3+json" \
  --method GET -f ref=agentic-lib-logs | base64 -d > "/tmp/screenshot-final-$REPO.png"

# Fetch final website
curl -sL "https://xn-intenton-z2a.github.io/$REPO/" > "/tmp/website-final-$REPO.html"
```

**Include in the report:** A description of each screenshot and a summary of each website's HTML content.

## Restore After Benchmarks

After collecting all benchmark data, restore each repo to its **default mission** (from the Target Repositories table). The simplest approach is to run:

```bash
scripts/all-repositories-init.sh
```

This dispatches `agentic-lib-init` in purge mode with each repo's default mission and `schedule=hourly`. If you need repos left with `schedule=off`, use `scripts/all-repositories-purge.sh` instead.

**Verify restoration**: After all init workflows complete, check that each repo's `agentic-lib.toml` shows the expected mission-seed and schedule:

```bash
REPOS="repository0-random repository0-string-utils repository0-dense-encoder repository0-plot-code-lib"

for REPO in $REPOS; do
  echo "=== $REPO ==="
  gh api "repos/xn-intenton-z2a/$REPO/contents/agentic-lib.toml" \
    --jq '.content' | base64 -d | grep -E '(mission-seed|schedule|model|profile)'
done
```

## Conventions

- **Iteration numbering**: Start at 1 for the first workflow run after init per repo. If two runs fire concurrently on the same repo, label them 1a and 1b.
- **Transform?**: YES if the dev job produced a merged PR with code changes. NO if maintain-only, review-only, or nop.
- **Source lines**: Count of `src/lib/main.js` lines. If multi-file, note the total.
- **Tests**: Count of test files or test count, whichever is available.
- **Duration**: Wall-clock time from workflow start to completion.
- **Time format**: Use UTC throughout.
- **Run IDs**: Link to `https://github.com/xn-intenton-z2a/REPO_NAME/actions/runs/RUN_ID`.
- **Repo shortnames**: Use the short names from the Target Repositories table in prose (e.g. "dense-encoder" not "repository0-dense-encoder").

## What to Watch For

1. **Mission complete declaration** — Does the supervisor write MISSION_COMPLETE.md and set schedule to off?
2. **Mission failed declaration** — Does the supervisor detect budget exhaustion or stuck pipeline?
3. **Issue churn** — Are near-identical issues created each cycle? The dedup guard should prevent this.
4. **Test/code consistency** — Do tests match the implementation?
5. **State file accuracy** — Does `agentic-lib-state.toml` show correct cumulative values?
6. **Agent log quality** — Do individual agent-log files contain meaningful narratives?
7. **Screenshot assessment** — Does `SCREENSHOT_INDEX.png` show a functional website?
8. **Website front-end** — Does the GitHub Pages deployment render correctly with mission-specific content?
9. **Concurrent interference** — Any signs that 4 simultaneous runs cause GitHub API rate limiting or runner contention?
10. **Restoration completeness** — After restoring, is each repo back to its default mission?
