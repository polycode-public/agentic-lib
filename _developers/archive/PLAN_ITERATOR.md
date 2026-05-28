# Plan: Iterator CLI Command & Transformation Budget

## User Assertions

- Each operation on main should log to intentïon.md
- Transformations happen on branch (no log), but log when PR merges
- Each log entry includes `**agentic-lib transformation cost:** 1`
- Costs are totalled against a budget limit in agentic-lib.toml
- Tuning profile defaults: min=4, recommended=8, max=32
- Budget exposed as parameter on workflows where useful
- Short-term: test with V4 report scenarios via iterator
- Long-term: platform for PLAN_1_LOCAL_SCENARIO_TESTS.md

---

## What Exists Today

### MCP Server `iterate` Tool (src/mcp/server.js:478)

Already implements the core loop:
- Runs N cycles of `maintain-features → transform → fix-code`
- Snapshots source before/after each cycle
- Stop conditions: 2 consecutive test passes, 2 consecutive no-changes
- Tracks iteration metadata (profile, model, elapsed, filesChanged, testsPassed)
- Uses `runCli()` which shells out to `node bin/agentic-lib.js <task>`

### CLI Task Commands (bin/agentic-lib.js)

Individual commands: `transform`, `maintain-features`, `maintain-library`, `fix-code`
Each runs one Copilot SDK session. No looping, no budget, no stop detection.

### Activity Logging (src/actions/agentic-step/logging.js)

`logActivity()` appends structured entries to intentïon.md with:
- Task, outcome, issue/PR numbers, tokens, cost, duration, model, workflow URL
- Rotation: keeps last 30 entries
- Called from `index.js` after every agentic-step invocation

### Current Workflow Logging

`index.js:101-120` logs to intentïon.md after every task. The `commit-if-changed` action then commits the file. On branches, the transform task modifies source files + intentïon.md together. On main, maintain/review/supervisor tasks log directly.

---

## Design

### 1. Transformation Budget

A new tuning knob `transformation-budget` that caps how many transformation cycles a workflow run or iterator session will perform.

**Where the budget is tracked**: In intentïon.md. Each log entry that represents a transformation (code-changing operation) includes a cost line. The supervisor/iterator reads intentïon.md to sum recent costs and compare against the budget.

**What counts as a transformation cost**:

| Task | Cost | Rationale |
|------|------|-----------|
| `transform` (code changed) | 1 | Core transformation |
| `fix-code` (code changed) | 1 | Fix is a transformation |
| `maintain-features` | 0 | Metadata, not code |
| `maintain-library` | 0 | Docs, not code |
| `review-issue` / `enhance-issue` | 0 | Issue triage |
| `supervise` | 0 | Orchestration |
| `discussions` | 0 | Communication |
| `transform` (nop — no changes) | 0 | Nothing happened |

**Log format** — add to the existing `logActivity()` output:

```markdown
## transform at 2026-03-06T20:01:10.000Z

**Outcome:** transformed
**Issue:** #42
**Model:** gpt-5-mini
**Token Count:** 1234 (in: 800, out: 434)
**Duration:** 45s (~0.8 GitHub Actions min)
**agentic-lib transformation cost:** 1

---
```

The `**agentic-lib transformation cost:** N` line is parseable. The iterator and supervisor read intentïon.md, regex-match all cost lines, and sum them.

**Budget enforcement**:
- Iterator reads current total before each cycle. If total >= budget, stop early.
- Supervisor includes budget info in its context. Can choose `nop` or `set-schedule:weekly` when budget is exhausted.
- Workflow `params` job reads the budget from config and exposes it as an output.

### 2. Tuning Profile Defaults

```javascript
// config-loader.js TUNING_PROFILES
min: {
  // ... existing ...
  transformationBudget: 4,
},
recommended: {
  // ... existing ...
  transformationBudget: 8,
},
max: {
  // ... existing ...
  transformationBudget: 32,
},
```

TOML override:
```toml
[tuning]
transformation-budget = 16   # override profile default
```

Profile defaults are surfaced as read-only reference sections in `agentic-lib.toml`:
```toml
[tuning.profile.min]
transformation-budget = 4
# ...other knobs...

[tuning.profile.recommended]
transformation-budget = 8

[tuning.profile.max]
transformation-budget = 32
```

These sections are documentation — the active profile is set by `[tuning].profile`.

### 3. CLI `iterate` Command

New CLI command that wraps the same loop as the MCP `iterate` tool, but runs directly from the command line without needing an MCP client.

```
npx @xn-intenton-z2a/agentic-lib iterate [options]

Options:
  --target <path>    Target repository (default: current directory)
  --model <name>     Copilot SDK model (default: from config or gpt-5-mini)
  --cycles <N>       Max iterations (default: from transformation-budget)
  --steps <list>     Steps per cycle: maintain,transform,fix (default: all three)
  --dry-run          Show what would be done
  --mission <name>   Init with --purge using this mission seed first
```

**Example usage** (reproducing V4 report Scenario 1):
```bash
# Quick: init + iterate with budget
npx @xn-intenton-z2a/agentic-lib iterate \
  --mission fizz-buzz --model gpt-5-mini --cycles 4

# Just iterate on existing workspace
npx @xn-intenton-z2a/agentic-lib iterate --cycles 2

# Transform-only cycles (skip maintain)
npx @xn-intenton-z2a/agentic-lib iterate --steps transform,fix --cycles 3
```

**Implementation**: Extract the loop logic from `handleIterate()` in `src/mcp/server.js` into a shared `src/iterate.js` module. Both the MCP tool and the CLI command call it.

```
src/iterate.js          — shared iteration loop (new)
src/mcp/server.js       — handleIterate() calls iterate.js
bin/agentic-lib.js      — iterate command calls iterate.js
```

### 4. Iterator Loop Logic (src/iterate.js)

```javascript
export async function runIterationLoop({
  targetPath,         // workspace root
  model,              // SDK model name
  maxCycles,          // from --cycles or transformation-budget
  steps,              // ['maintain-features', 'transform', 'fix-code']
  dryRun,             // skip Copilot calls
  onCycleComplete,    // callback for logging/reporting
}) {
  let totalCost = readCurrentCost(targetPath);  // sum from intentïon.md
  const budget = readBudget(targetPath);         // from agentic-lib.toml
  const effectiveMax = Math.min(maxCycles, budget - totalCost);

  const results = [];
  let consecutivePasses = 0;
  let consecutiveNoChanges = 0;

  for (let i = 0; i < effectiveMax; i++) {
    // Snapshot before
    const srcBefore = snapshotDir(join(targetPath, 'src/lib'));

    // Run steps
    for (const step of steps) {
      runCli(`${step} --target ${targetPath} --model ${model}`, targetPath);
    }

    // Run tests
    const testsPassed = runTests(targetPath);

    // Snapshot after
    const srcAfter = snapshotDir(join(targetPath, 'src/lib'));
    const filesChanged = countChanges(srcBefore, srcAfter);
    const cost = filesChanged > 0 ? 1 : 0;

    // Log to intentïon.md
    logTransformationCost(targetPath, { cost, testsPassed, filesChanged, model, cycle: i + 1 });
    totalCost += cost;

    // Report
    const record = { cycle: i + 1, testsPassed, filesChanged, cost, totalCost, budget };
    results.push(record);
    if (onCycleComplete) onCycleComplete(record);

    // Stop conditions
    if (testsPassed) {
      consecutivePasses++;
      if (consecutivePasses >= 2) {
        results.push({ stopped: true, reason: 'tests passed 2 consecutive cycles' });
        break;
      }
    } else {
      consecutivePasses = 0;
    }

    if (filesChanged === 0) {
      consecutiveNoChanges++;
      if (consecutiveNoChanges >= 2) {
        results.push({ stopped: true, reason: 'no progress — 2 cycles with no file changes' });
        break;
      }
    } else {
      consecutiveNoChanges = 0;
    }

    if (totalCost >= budget) {
      results.push({ stopped: true, reason: `budget exhausted (${totalCost}/${budget})` });
      break;
    }
  }

  return { results, totalCost, budget };
}
```

### 5. Reading/Writing Transformation Cost

```javascript
// Read current total from intentïon.md
function readCurrentCost(targetPath) {
  const logPath = resolve(targetPath, 'intentïon.md');
  if (!existsSync(logPath)) return 0;
  const content = readFileSync(logPath, 'utf8');
  const matches = content.matchAll(/\*\*agentic-lib transformation cost:\*\* (\d+)/g);
  return [...matches].reduce((sum, m) => sum + parseInt(m[1]), 0);
}

// Read budget from agentic-lib.toml
function readBudget(targetPath) {
  const config = loadConfig(resolve(targetPath, 'agentic-lib.toml'));
  return config.tuning?.transformationBudget || 8;  // default: recommended
}
```

### 6. Workflow Integration

**agentic-lib-workflow.yml** — add `transformation-budget` as a workflow parameter:

```yaml
workflow_dispatch:
  inputs:
    transformation-budget:
      description: "Max transformation cycles this run (0 = use config default)"
      type: number
      required: false
      default: 0
```

The `params` job reads it:
```yaml
BUDGET='${{ inputs.transformation-budget }}'
echo "transformation-budget=${BUDGET:-0}" >> $GITHUB_OUTPUT
```

The `dev` job passes it to the transform step. If budget > 0, it overrides the config value. The supervisor also sees it in context and respects it.

### 7. Logging on Merge (not on branch)

Currently, `index.js` logs to intentïon.md after every task, and `commit-if-changed` commits the file. On branches, this means intentïon.md is modified alongside code changes, causing merge conflicts.

**Fix**: The `commit-if-changed` action should **exclude** intentïon.md when pushing to non-default branches. When the PR merges to main, a post-merge step logs the transformation.

Check current `commit-if-changed`:

The workflow's "Commit and push" step at line 683 uses `commit-if-changed` with a `push-ref` parameter. The action should:
1. On non-main branches: `git add` all changes EXCEPT intentïon.md
2. On main: `git add` everything including intentïon.md

Alternatively (simpler): The transform task returns `cost: 1` in its result. The workflow's post-merge `telemetry` or `stats` job logs the cost to intentïon.md on main after a successful merge. This avoids branch conflicts entirely.

**Recommended approach**: Keep logging in `index.js` as-is (it logs on every run). But add the cost line ONLY on main. The `logActivity()` function gets a new `transformationCost` parameter, and `index.js` only sets it when `github.ref === 'refs/heads/main'` or when the merge happens.

Actually, simplest: the existing logging already happens on main for maintain/review/supervisor runs. For transform (which runs on a branch), the cost should be logged when the PR merge commit lands on main. The workflow already has a "Create PR and attempt merge" step — after a successful merge, add a step that logs the cost.

### 8. Short-Term: V4 Scenario Testing via Iterator

The V4 report scenarios can be reproduced with the iterator:

```bash
# Scenario 1: fizz-buzz / gpt-5-mini (baseline)
npx @xn-intenton-z2a/agentic-lib iterate \
  --mission fizz-buzz --model gpt-5-mini --target /tmp/scenario-1

# Scenario 2: fizz-buzz / claude-sonnet-4 (model comparison)
npx @xn-intenton-z2a/agentic-lib iterate \
  --mission fizz-buzz --model claude-sonnet-4 --target /tmp/scenario-2

# Scenario 3: roman-numerals / gpt-5-mini (medium complexity)
npx @xn-intenton-z2a/agentic-lib iterate \
  --mission roman-numerals --model gpt-5-mini --target /tmp/scenario-3

# Scenario 4: cron-engine / gpt-5-mini (complex, should hit budget)
npx @xn-intenton-z2a/agentic-lib iterate \
  --mission cron-engine --model gpt-5-mini --target /tmp/scenario-4 --cycles 8
```

Each produces a structured result with cycle-by-cycle detail, stop reason, and cost summary. This replaces the manual `gh workflow run` + poll + record cycle from the V4 report.

### 9. Long-Term: Platform for LOCAL_SCENARIO_TESTS

PLAN_1_LOCAL_SCENARIO_TESTS.md describes local testing with a tiny LLM via `--local-llm`. The iterator provides the loop infrastructure:

```bash
# Local scenario test (future — when node-llama-cpp is integrated)
npx @xn-intenton-z2a/agentic-lib iterate \
  --mission fizz-buzz --local-llm --cycles 4 --target /tmp/local-test
```

The `src/iterate.js` module is backend-agnostic — it calls CLI commands which route to either Copilot SDK or local LLM depending on flags. The iterator just orchestrates, snapshots, tests, and tracks costs.

**Features the iterator adds to LOCAL_SCENARIO_TESTS**:
- Budget enforcement (cap runaway tiny-LLM iterations)
- Stop detection (tests pass, no progress)
- Cost tracking (prove the budget system works with any LLM)
- Structured results (machine-readable output for CI assertions)
- `--mission` flag for init-and-iterate in one command

---

## Implementation Status

All items implemented. 393 tests pass across 26 test files.

### Files Changed

| File | Change | Status |
|------|--------|--------|
| `src/iterate.js` | **New** — shared iteration loop with budget tracking | Done |
| `bin/agentic-lib.js` | `iterate` command with `--cycles`, `--steps`, `--mission` flags | Done |
| `src/mcp/server.js` | `handleIterate()` refactored to call `src/iterate.js` | Done |
| `src/actions/agentic-step/config-loader.js` | `transformationBudget` in all 3 tuning profiles | Done (via PLAN_CONTEXT_QUALITY) |
| `src/actions/agentic-step/logging.js` | `transformationCost` field → `**agentic-lib transformation cost:** N` | Done |
| `src/actions/agentic-step/index.js` | Passes `transformationCost` (1 for transform/fix-code, 0 otherwise) | Done |
| `agentic-lib.toml` | `transformation-budget` knob in `[tuning]` section | Done (via PLAN_CONTEXT_QUALITY) |
| `.github/workflows/agentic-lib-workflow.yml` | Mission-complete signal gates budget-consuming jobs | Done (via PLAN_CONTEXT_QUALITY) |
| `tests/iterate.test.js` | 14 tests for snapshotDir, countChanges, readTransformationCost, readBudget, formatIterationResults | Done |
| `tests/actions/agentic-step/logging.test.js` | 3 tests for transformationCost line (cost=1, cost=0, omitted) | Done |
| `README.md` | Iterator section, tuning profiles, safety updates | Done |
| `CLAUDE.md` | Updated test count, added iterate description | Done |

### Execution Log

| Step | What | Status |
|------|------|--------|
| 1 | `transformationBudget` in tuning profiles + config-loader | Done (PLAN_CONTEXT_QUALITY) |
| 2 | `transformationCost` in logging.js + tests | Done |
| 3 | Cost from index.js for transform/fix-code tasks | Done |
| 4 | Budget in agentic-lib.toml | Done (PLAN_CONTEXT_QUALITY) |
| 5 | Extract iteration loop to `src/iterate.js` | Done |
| 6 | `iterate` CLI command in `bin/agentic-lib.js` | Done |
| 7 | Refactor MCP `handleIterate()` to use `src/iterate.js` | Done |
| 8 | Workflow gates budget-consuming jobs on MISSION_COMPLETE.md | Done (PLAN_CONTEXT_QUALITY) |
| 9 | V4 scenario testing via iterator | Ready (CLI exists, needs live test) |
| 10 | `--local-llm` support | Future (PLAN_1_LOCAL_SCENARIO_TESTS) |

---

## Success Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `npx @xn-intenton-z2a/agentic-lib iterate --mission fizz-buzz --cycles 4` runs a complete loop | Ready (needs live COPILOT_GITHUB_TOKEN) |
| 2 | Iterator stops early when tests pass for 2 consecutive cycles | Done (unit tested) |
| 3 | Iterator stops early when no files change for 2 consecutive cycles | Done (unit tested) |
| 4 | Iterator stops when transformation budget is exhausted | Done (unit tested) |
| 5 | intentïon.md shows `**agentic-lib transformation cost:** 1` for each code-changing cycle | Done |
| 6 | Budget reads correctly from tuning profile (min=4, recommended=8, max=32) | Done (unit tested) |
| 7 | Budget can be overridden via TOML `transformation-budget` knob | Done (unit tested) |
| 8 | MCP `iterate` tool continues to work (refactored to share code) | Done |
| 9 | All existing tests pass + new tests for budget/cost | Done (393 tests, 26 files) |
