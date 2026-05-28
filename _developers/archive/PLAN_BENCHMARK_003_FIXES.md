# Plan: Benchmark Report 003 Fixes + GitHub Issues

**Source**: [BENCHMARK_REPORT_003.md](../../BENCHMARK_REPORT_003.md), GitHub Issues [#1878](https://github.com/xn-intenton-z2a/agentic-lib/issues/1878), [#1879](https://github.com/xn-intenton-z2a/agentic-lib/issues/1879), [#1880](https://github.com/xn-intenton-z2a/agentic-lib/issues/1880), [#1881](https://github.com/xn-intenton-z2a/agentic-lib/issues/1881)
**Created**: 2026-03-08
**Status**: implemented — PR [#1882](https://github.com/xn-intenton-z2a/agentic-lib/pull/1882) open, awaiting CI + merge

## Current State (2026-03-09)

All 10 work items implemented in PR #1882 (`claude/benchmark-003-fixes`). 429 tests passing, 0 workflow lint errors.

**Additional fix pushed to main**: Double-dispatch bug in `discussions.js` — the bot's `request-supervisor` action dispatched `agentic-lib-workflow.yml` from both `discussions.js` (line 346) AND the bot workflow's `dispatch-supervisor` job. Removed the dispatch from `discussions.js` (commit a851c817). This fix is live on main; repository0 needs `init --purge` after CI passes to pick it up.

**Deployment sequence**: Merge PR #1882 → release → `npx @xn-intenton-z2a/agentic-lib init --purge` on repository0 → run benchmark 004

---

## User Assertions

- All 10 work items (W1–W10) must be addressed
- Fixes must be made in agentic-lib (mastered here, distributed to repository0 via init)
- No unnecessary formatting or refactoring
- W4: Do NOT lower `resolvedCount >= 2` threshold. Instead, add mission-complete readiness narrative and metrics dashboard to EVERY intentïon.md entry (not just when declaring complete). The metrics table must include hard indicators (open issues, resolved count, budget, transforms) AND soft indicators (rounds since last open issue, source lines, test count, export match, behaviour tests, etc.). Where a target value exists, state it. The purpose is observability — the LLM can't ignore what's explicitly in the log, and humans can evaluate performance from the metrics.

---

## Work Items

| # | Source | Title | Priority | Status |
|---|--------|-------|----------|--------|
| W1 | #1880 + FINDING-6 | Fix-stuck can't commit (missing git config) | HIGH | done |
| W2 | FINDING-4 | Dedup guard blocks cross-scenario issue creation | HIGH | done |
| W3 | FINDING-5 | Model from toml config ignored by params job | HIGH | done |
| W4 | #1881 + FINDING-7 | Narrate mission-complete into intentïon.md | HIGH | done |
| W5 | #1878 | Behaviour tests not cleaned up (ESM require error) | HIGH | done |
| W6 | #1879 | Gather build/test/behaviour results in telemetry | MEDIUM | done |
| W7 | FINDING-8 | Profile=unknown in tuning logs | LOW | done (already implemented) |
| W8 | Storm 2026-03-08 | Feedback loop — runaway dispatch cycle | HIGH | done |
| W9 | Storm 2026-03-08 | Post-commit test delegation from agentic-lib-workflow | HIGH | done |
| W10 | Storm 2026-03-08 | Purge should blank last 100 closed issues | MEDIUM | done |

---

## W1: Fix-stuck can't commit (missing git config)

**Issue**: [#1880](https://github.com/xn-intenton-z2a/agentic-lib/issues/1880)
**Finding**: FINDING-6
**Root cause**: `.github/workflows/agentic-lib-workflow.yml` lines 682-697 — the "Commit, push, and open PR for main build fix" step uses a raw `run:` block that calls `git commit` without configuring `user.name`/`user.email`. The other commit path (line 676-681) uses the `commit-if-changed` composite action which sets git config.

**Error from CI**:
```
Author identity unknown
*** Please tell me who you are.
fatal: empty ident name ... not allowed
Error: Process completed with exit code 128.
```

**File**: `.github/workflows/agentic-lib-workflow.yml`
**Fix**: Add two git config lines before `git add -A` at line 691:
```bash
git config --local user.email 'action@github.com'
git config --local user.name 'GitHub Actions[bot]'
```

**Scope**: 2 lines added.

---

## W2: Dedup guard blocks cross-scenario issue creation

**Finding**: FINDING-4
**Root cause**: `src/actions/agentic-step/tasks/supervise.js` lines 527-549 — the dedup guard checks the 5 most recently closed issues with a 1-hour window (`3600000`ms). After `init --purge`, old closed issues from a previous scenario still match, blocking new issue creation for the same mission.

**Impact**: S2 in benchmark was completely blocked — no transform possible because no issue could be created.

**File**: `src/actions/agentic-step/tasks/supervise.js`
**Fix**: Read the init timestamp from the TOML config and exclude issues closed before that timestamp from the dedup check.

**Implementation**:
1. The `config` object is already available in `executeSupervisor()` and can be passed to `executeCreateIssue()`
2. Read `config.init?.timestamp` (set by `npx @xn-intenton-z2a/agentic-lib init`)
3. In the dedup guard loop, add: skip issues where `closed_at < initTimestamp`
4. This preserves same-scenario dedup protection while allowing fresh starts after init

**Changes**:
- `executeCreateIssue()`: accept `config` parameter, read `config.init?.timestamp`
- Dedup filter: add `new Date(i.closed_at) > new Date(initTimestamp)` condition
- Callers of `executeCreateIssue()`: pass `config` through

---

## W3: Model from toml config ignored by params job

**Finding**: FINDING-5
**Root cause**: `.github/workflows/agentic-lib-workflow.yml` lines 130-131 — the params job hardcodes `MODEL='${{ inputs.model }}'` with fallback `gpt-5-mini`. It never reads `[tuning].model` from the TOML config.

**Impact**: S2 iterations 1-2 ran with gpt-5-mini instead of claude-sonnet-4.

**File**: `.github/workflows/agentic-lib-workflow.yml`
**Fix**: The params job doesn't have a checkout step, so it can't read the TOML file. Two options:

**(A) Add checkout to params job** — adds ~5s to every run but makes TOML authoritative:
```yaml
- uses: actions/checkout@v6
- name: Normalise params
  run: |
    MODEL='${{ inputs.model }}'
    if [ -z "$MODEL" ] && [ -f "${{ env.configPath }}" ]; then
      TOML_MODEL=$(grep '^model' "${{ env.configPath }}" | head -1 | sed 's/.*= *"\([^"]*\)".*/\1/')
      MODEL="${TOML_MODEL}"
    fi
    echo "model=${MODEL:-gpt-5-mini}" >> $GITHUB_OUTPUT
```

**(B) Read model in telemetry job** (already has checkout) and override downstream — more invasive.

**Recommendation**: Option A. Same pattern for `profile`.

---

## W4: Mission-complete readiness narrative + metrics dashboard in every intentïon.md entry

**Issue**: [#1881](https://github.com/xn-intenton-z2a/agentic-lib/issues/1881)
**Finding**: FINDING-7

**Goal**: Every time intentïon.md is appended to (every `logActivity()` call), include:
1. A **mission-complete readiness assessment** — a short narrative answering: "Are the conditions to declare mission complete met? If so, how was this determined? If not, what remains to close the gap?"
2. A **mission-complete metrics table** — a standardised table of all hard and soft indicators that contribute to the mission-complete decision, with target values where applicable, so that a human or LLM can evaluate readiness at a glance.

The purpose is **observability and consistency**: the LLM can't ignore metrics that are explicitly stated in the log it reads, and humans can evaluate pipeline performance by scanning the metrics in every entry.

**Files**:
- `src/actions/agentic-step/index.js` — where `logActivity()` is called, where context is assembled
- `src/actions/agentic-step/logging.js` — the log writer (add new sections)
- `src/actions/agentic-step/tasks/supervise.js` — supplies context (issues, PRs, resolved counts, budget, etc.)

### Part A: Mission-complete readiness narrative

Add a new `options.missionReadiness` field to `logActivity()`. This is a short (2-4 sentence) assessment generated by the caller in `index.js`, based on deterministic signals — not requiring an LLM call. Example output in intentïon.md:

```markdown
### Mission-Complete Readiness

Mission complete conditions are NOT met. 1 open issue remains (#2713: "Implement Hamming distance library"). The function naming does not match the mission spec (exports `hamming()` instead of `hammingDistance()`). No issues have been closed by review as RESOLVED yet.
```

Or when conditions are met:

```markdown
### Mission-Complete Readiness

Mission complete conditions ARE met. 0 open issues, 0 open PRs, 1 issue closed by review as RESOLVED (#2717). All acceptance criteria in the mission spec appear satisfied based on source exports matching expected API (`toRoman`, `fromRoman`).
```

**Logic in `index.js`** (deterministic, no LLM call):
- Read `openIssueCount`, `openPrCount`, `resolvedCount`, `cumulativeTransformationCost`, `transformationBudget`, `missionComplete`, `missionFailed` from `result` and config
- Compose a sentence: "conditions ARE/ARE NOT met" based on: `openIssueCount === 0 && openPrCount === 0 && resolvedCount >= 1`
- If NOT met: list what remains (open issues, open PRs, budget status)
- If met but not yet declared: note that the deterministic fallback should trigger next cycle
- If already declared: "Mission was declared complete at {timestamp}"

### Part B: Mission-complete metrics table

Add a new `options.missionMetrics` field to `logActivity()`. This is an array of metric objects rendered as a table. Every entry to intentïon.md includes this table.

```markdown
### Mission Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Open issues | 0 | 0 | MET |
| Open PRs | 0 | 0 | MET |
| Issues closed by review (RESOLVED) | 1 | >= 1 | MET |
| Transformation budget used | 2/16 | < 16 | OK |
| Cumulative transforms | 1 | >= 1 | MET |
| Rounds since last open issue | 3 | >= 2 | MET |
| Source lines (main.js) | 114 | > seed (35) | MET |
| Test count | 12 | > seed (5) | MET |
| Source exports match mission API | YES | YES | MET |
| README documents usage | YES | YES | MET |
| Behaviour tests pass | NO | YES | NOT MET |
| Mission complete declared | NO | — | — |
| Mission failed declared | NO | — | — |
```

**Hard indicators** (must-haves for mission-complete consideration):

| Metric | Source | Target |
|--------|--------|--------|
| Open issues | `ctx.issuesSummary.length` (from supervise) or counted in index.js | 0 |
| Open PRs | `ctx.prsSummary.length` or counted | 0 |
| Resolved issues | `ctx.recentlyClosedSummary` filtered for "RESOLVED" | >= 1 |
| Transformation budget remaining | `config.transformationBudget - cumulativeCost` | > 0 (or budget = 0 means unlimited) |
| Cumulative transforms | Parsed from intentïon.md cost entries | >= 1 |

**Soft indicators** (informational, no hard target but useful for evaluation):

| Metric | Source | Target |
|--------|--------|--------|
| Rounds since last open issue | Count supervisor entries in intentïon.md since last `created-issue` | >= 2 (heuristic) |
| Source lines | `wc -l src/lib/main.js` equivalent from result.changes or file stat | > seed baseline |
| Test count | Parse from test output or count test files | > seed baseline |
| Source exports match mission API | Compare `ctx.sourceExports` against mission-defined function names | YES |
| README documents usage | Check if README was modified post-init | YES |
| Behaviour tests pass | Result of last behaviour test run (from telemetry or workflow) | YES |
| Last test run conclusion | From GitHub API (latest agentic-lib-test) | success |

**Implementation in `index.js`**:

The metrics are assembled in `index.js` after the task completes, using the same data already available:
- `result` object from the task (contains `changes`, `outcome`, `narrative`)
- `config` object (contains budgets, limits, paths)
- `limitsStatus` array (already computed at line 156-164)
- For supervise tasks: `result` includes context data about issues/PRs/resolved counts

Add a helper function `buildMissionMetrics(config, result, limitsStatus)` that returns the array of `{ metric, value, target, status }` objects.

Add a helper function `buildMissionReadiness(metrics)` that generates the narrative string from the metrics table.

Both are passed to `logActivity()` as new fields.

### Part C: Update `logActivity()` in `logging.js`

Add two new optional parameters:
- `missionReadiness` (string) — rendered as `### Mission-Complete Readiness` section
- `missionMetrics` (array of `{ metric, value, target, status }`) — rendered as `### Mission Metrics` table

These sections are placed **after** the existing Limits Status and Prompt Budget sections, **before** Closing Notes. This ensures they appear in every entry and are visible in the last 20 lines of `recentActivity` read by the supervisor.

---

## W5: Behaviour tests — missing config path, purge gap, no write permission

**Issue**: [#1878](https://github.com/xn-intenton-z2a/agentic-lib/issues/1878)

### Root cause analysis

The `roman.spec.js` file at `tests/behaviour/roman.spec.js:1:26` was generated by the LLM during the roman-numerals mission. It uses CommonJS `require()` in an ESM project. But the real problem is deeper — there are 5 compounding issues:

1. **No configured path**: `agentic-lib.toml` has `tests = "test/tests/unit/"` but NO entry for behaviour tests. The `[paths]` section doesn't know `tests/behaviour/` exists.
2. **Purge doesn't clear it**: `initPurge()` calls `clearAndRecreateDir(testsPath, ...)` where `testsPath` resolves to `tests/unit/` from the TOML. The `tests/behaviour/` directory is **never cleared** — stale files from previous missions survive across purges.
3. **No write permission**: `WRITABLE_KEYS` in `config-loader.js` (line 38) includes `"tests"` but that maps to `tests/unit/`. The LLM's `write_file` tool calls `isPathWritable()` in `safety.js` which checks against the configured writable paths. `tests/behaviour/` is not in that list, so the LLM **cannot write** to it.
4. **Agent prompts contradict permissions**: All agent prompts (`agent-apply-fix.md`, `agent-issue-resolution.md`, etc.) explicitly tell the LLM to update `tests/behaviour/` files, but the permission system forbids it. The LLM may work around this by writing CJS files outside the normal tool path.
5. **Seed file is ESM but never reaches a clean slate**: `zero-behaviour.test.js` correctly uses ESM imports (`import { test, expect } from "@playwright/test"`), and the `SEED_MAP` maps it to `tests/behaviour/homepage.test.js`. But without clearing the directory first, old files like `roman.spec.js` persist alongside the seed.

### Files to change

| File | Change |
|------|--------|
| `agentic-lib.toml` | Add `behaviour = "test/tests/behaviour/"  #@dist "tests/behaviour/"` to `[paths]` |
| `src/actions/agentic-step/config-loader.js` | Add `"behaviour"` to `WRITABLE_KEYS` (line 38) and `PATH_DEFAULTS` (line 41) |
| `bin/agentic-lib.js` | Add `clearAndRecreateDir(behaviourPath, ...)` to `initPurge()` |
| `src/agents/agent-*.md` | Ensure prompts reference the configured behaviour path (already do, now backed by permissions) |

### Part A: Add `behaviour` path to `agentic-lib.toml`

In the `[paths]` section, add a new entry after `tests`:

```toml
[paths]
...
tests = "test/tests/unit/"                       #@dist "tests/unit/"
behaviour = "test/tests/behaviour/"              #@dist "tests/behaviour/"
...
```

The `#@dist` marker ensures consumer repos get `tests/behaviour/` while agentic-lib uses `test/tests/behaviour/` locally.

### Part B: Add `behaviour` to config-loader.js

**File**: `src/actions/agentic-step/config-loader.js`

1. Add to `WRITABLE_KEYS` (line 38):
```javascript
const WRITABLE_KEYS = ["source", "tests", "behaviour", "features", "dependencies", "docs", "readme", "examples", "web"];
```

2. Add to `PATH_DEFAULTS` (line 41):
```javascript
const PATH_DEFAULTS = {
  ...
  tests: "tests/unit/",
  behaviour: "tests/behaviour/",
  ...
};
```

This means:
- `isPathWritable("tests/behaviour/roman.spec.js", writablePaths)` now returns `true`
- The LLM's `write_file` tool can create/modify files in `tests/behaviour/`
- The `read_file` and `list_directory` tools already work (they're not gated by writable paths)

### Part C: Clear `tests/behaviour/` during purge

**File**: `bin/agentic-lib.js`

In `initPurge()`, after reading TOML paths, also read the behaviour path and clear it:

```javascript
function initPurge(seedsDir, missionName, initTimestamp) {
  console.log("\n--- Purge: Reset Source Files to Seed State ---");

  const { sourcePath, testsPath, behaviourPath, examplesPath, webPath } = readTomlPaths();
  clearAndRecreateDir(sourcePath, sourcePath);
  clearAndRecreateDir(testsPath, testsPath);
  clearAndRecreateDir(behaviourPath, behaviourPath);   // ← NEW
  clearAndRecreateDir(examplesPath, examplesPath);
  clearAndRecreateDir(webPath, webPath);
  clearAndRecreateDir("docs", "docs");
  ...
}
```

Update `readTomlPaths()` to also extract the behaviour path:

```javascript
function readTomlPaths() {
  let sourcePath = "src/lib/";
  let testsPath = "tests/unit/";
  let behaviourPath = "tests/behaviour/";   // ← NEW default
  let examplesPath = "examples/";
  let webPath = "src/web/";
  ...
  // Add regex for behaviour path
  const behaviourMatch = toml.match(/^\s*behaviour\s*=\s*"([^"]+)"/m);
  if (behaviourMatch) behaviourPath = behaviourMatch[1];
  ...
  return { sourcePath, testsPath, behaviourPath, examplesPath, webPath };
}
```

This ensures:
- `init --purge` clears **all** of `tests/behaviour/` (deletes `roman.spec.js`, `fizzbuzz.spec.js`, etc.)
- Then copies `zero-behaviour.test.js` → `tests/behaviour/homepage.test.js` (already in `SEED_MAP`)
- Fresh start: only the ESM seed file exists after purge

### Part D: Ensure LLM tool loop has permission for all configured writable paths

**File**: `src/actions/agentic-step/copilot.js` (where `defineTool` is called)

The writable paths are already passed through correctly:
- `index.js` line 56: `const writablePaths = getWritablePaths(config, writablePathsOverride);`
- `copilot.js` line 324: `tools: createAgentTools(writablePaths)`
- `tools.js` line 58-74: `write_file` handler checks `isPathWritable(resolved, writablePaths)`

Once `behaviour` is added to `WRITABLE_KEYS`, it flows through automatically:
1. `config-loader.js` includes `behaviour` path in `config.writablePaths`
2. `index.js` picks it up via `getWritablePaths(config, ...)`
3. `copilot.js` passes it to `createAgentTools()`
4. `tools.js` `write_file` handler allows writes to `tests/behaviour/**`

No additional changes needed in copilot.js or tools.js — the permission system is data-driven from TOML → config → writablePaths → tools.

### Part E: ESM instruction in agent prompts

The seed file `zero-behaviour.test.js` already uses ESM (`import { test, expect } from "@playwright/test"`). But the LLM still generates CJS files because the agent prompts don't explicitly require ESM.

Add to all agent prompts that mention behaviour tests (`agent-apply-fix.md`, `agent-issue-resolution.md`, `agent-maintain-features.md`, `agent-review-issue.md`):

```
**IMPORTANT**: The project uses `"type": "module"` in package.json. All files must use ESM syntax:
- `import { test, expect } from "@playwright/test"` (NOT `const { test, expect } = require(...)`)
- `import { execSync } from "child_process"` (NOT `const { execSync } = require(...)`)
```

### Part F: Verify the seed file (already correct)

`src/seeds/zero-behaviour.test.js` uses ESM:
```javascript
import { test, expect } from "@playwright/test";
```

No change needed to the seed file itself.

---

## W6: Gather build/test/behaviour results in telemetry

**Issue**: [#1879](https://github.com/xn-intenton-z2a/agentic-lib/issues/1879)
**Root cause**: The telemetry job (workflow lines 237-311) gathers repo state (issues, PRs, runs, mission) but doesn't capture actual test results from build/test/behaviour steps. And the pipeline never actually runs tests within the main workflow to get a fresh signal on branch health.

**Files**:
- `.github/workflows/agentic-lib-workflow.yml` — telemetry job + new live test step
- `.github/workflows/agentic-lib-test.yml` — reference for what tests are run externally
- `src/actions/agentic-step/config-loader.js` — tuning profile limits for clipping

### Part A: Run tests live in agentic-lib-workflow.yml (non-blocking)

Add a step to the telemetry job that **actually runs** unit tests and behaviour tests on the current branch state, capturing results without propagating a non-zero exit status. This gives a fresh signal every iteration without waiting for the disconnected test workflow.

```yaml
  telemetry:
    needs: params
    ...
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests (non-blocking)
        id: unit-tests
        run: |
          set +e
          TEST_CMD=$(grep '^\s*test\s*=' agentic-lib.toml 2>/dev/null | head -1 | sed 's/.*=\s*"\([^"]*\)".*/\1/')
          TEST_CMD="${TEST_CMD:-npm test}"
          OUTPUT=$(eval "$TEST_CMD" 2>&1)
          EXIT_CODE=$?
          echo "exit-code=$EXIT_CODE" >> $GITHUB_OUTPUT
          # Extract test count from output (vitest/jest patterns)
          PASS_COUNT=$(echo "$OUTPUT" | grep -oP '\d+ pass' | head -1 | grep -oP '\d+' || echo "0")
          FAIL_COUNT=$(echo "$OUTPUT" | grep -oP '\d+ fail' | head -1 | grep -oP '\d+' || echo "0")
          echo "pass-count=$PASS_COUNT" >> $GITHUB_OUTPUT
          echo "fail-count=$FAIL_COUNT" >> $GITHUB_OUTPUT
          # Save full output (clipped by profile)
          echo "$OUTPUT" | tail -100 > /tmp/unit-test-output.txt
          exit 0  # Always succeed

      - name: Run behaviour tests (non-blocking)
        id: behaviour-tests
        if: hashFiles('playwright.config.js') != '' || hashFiles('playwright.config.ts') != ''
        run: |
          set +e
          npx playwright install --with-deps chromium 2>/dev/null || true
          npm run build:web 2>/dev/null || true
          OUTPUT=$(npm run --if-present test:behaviour 2>&1)
          EXIT_CODE=$?
          echo "exit-code=$EXIT_CODE" >> $GITHUB_OUTPUT
          PASS_COUNT=$(echo "$OUTPUT" | grep -oP '\d+ passed' | head -1 | grep -oP '\d+' || echo "0")
          FAIL_COUNT=$(echo "$OUTPUT" | grep -oP '\d+ failed' | head -1 | grep -oP '\d+' || echo "0")
          echo "pass-count=$PASS_COUNT" >> $GITHUB_OUTPUT
          echo "fail-count=$FAIL_COUNT" >> $GITHUB_OUTPUT
          echo "$OUTPUT" | tail -50 > /tmp/behaviour-test-output.txt
          exit 0  # Always succeed
```

Key design: `set +e` and `exit 0` ensure the step always succeeds. The exit code and counts are captured as step outputs for the telemetry script.

### Part B: Query latest external test workflow run results

Add to the existing `actions/github-script` telemetry step:

```javascript
// Latest agentic-lib-test results (from push-triggered or scheduled run)
let externalTestResults = null;
try {
  const testRuns = await github.rest.actions.listWorkflowRuns({
    owner, repo,
    workflow_id: 'agentic-lib-test.yml',
    branch: 'main',
    per_page: 1,
  });
  const latestTest = testRuns.data.workflow_runs[0];
  if (latestTest) {
    const jobs = await github.rest.actions.listJobsForWorkflowRun({
      owner, repo,
      run_id: latestTest.id,
    });
    externalTestResults = {
      runId: latestTest.id,
      conclusion: latestTest.conclusion,
      created: latestTest.created_at,
      jobs: jobs.data.jobs.map(j => ({
        name: j.name,
        conclusion: j.conclusion,
      })),
    };
  }
} catch (e) { /* ignore */ }
```

### Part C: Gather additional useful signals

Extend the telemetry payload with everything useful for the supervisor and mission-complete metrics:

```javascript
// Source file stats
let sourceStats = null;
try {
  const sourcePath = 'src/lib/';
  if (fs.existsSync(sourcePath)) {
    const files = fs.readdirSync(sourcePath).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
    sourceStats = files.map(f => {
      const content = fs.readFileSync(`${sourcePath}${f}`, 'utf8');
      const lines = content.split('\n').length;
      const exports = [...content.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/g)].map(m => m[1]);
      return { file: f, lines, exports };
    });
  }
} catch (e) {}

// README modification check (was it modified post-init?)
let readmeModified = false;
try {
  const initTimestamp = '${{ steps.read-toml.outputs.init-timestamp }}';
  if (initTimestamp && fs.existsSync('README.md')) {
    const stat = fs.statSync('README.md');
    readmeModified = new Date(stat.mtime) > new Date(initTimestamp);
  }
} catch (e) {}

// Activity log stats
let activityStats = null;
try {
  const logPath = fs.existsSync('intentïon.md') ? 'intentïon.md' : (fs.existsSync('intention.md') ? 'intention.md' : null);
  if (logPath) {
    const log = fs.readFileSync(logPath, 'utf8');
    const entries = log.split('\n## ').length - 1;
    const costMatches = [...log.matchAll(/\*\*agentic-lib transformation cost:\*\* (\d+)/g)];
    const totalCost = costMatches.reduce((sum, m) => sum + parseInt(m[1], 10), 0);
    const lastIssueCreated = log.lastIndexOf('created-issue:');
    const entriesSinceLastIssue = lastIssueCreated >= 0
      ? log.substring(lastIssueCreated).split('\n## ').length - 1
      : entries;
    activityStats = { entries, totalTransformCost: totalCost, roundsSinceLastIssue: entriesSinceLastIssue };
  }
} catch (e) {}

// Mission complete/failed signals
const missionComplete = fs.existsSync('MISSION_COMPLETE.md');
const missionFailed = fs.existsSync('MISSION_FAILED.md');

// Assemble full telemetry
const telemetry = {
  issues: issuesSummary,
  prs: prsSummary,
  recentRuns: runsSummary,
  mission: mission.slice(0, 500),
  featureFiles: features,
  message: message || null,
  liveTests: {
    unit: {
      exitCode: parseInt('${{ steps.unit-tests.outputs.exit-code }}' || '0'),
      passCount: parseInt('${{ steps.unit-tests.outputs.pass-count }}' || '0'),
      failCount: parseInt('${{ steps.unit-tests.outputs.fail-count }}' || '0'),
    },
    behaviour: {
      exitCode: parseInt('${{ steps.behaviour-tests.outputs.exit-code }}' || '-1'),
      passCount: parseInt('${{ steps.behaviour-tests.outputs.pass-count }}' || '0'),
      failCount: parseInt('${{ steps.behaviour-tests.outputs.fail-count }}' || '0'),
    },
  },
  externalTestResults,
  sourceStats,
  readmeModified,
  activityStats,
  missionComplete,
  missionFailed,
};
```

### Part D: Clip telemetry output by tuning profile

The telemetry payload can get large. Clip it based on the active tuning profile's limits:

```javascript
// Read profile limits for clipping
let maxTelemetryChars = 60000; // default
try {
  if (fs.existsSync('agentic-lib.toml')) {
    const toml = fs.readFileSync('agentic-lib.toml', 'utf8');
    const profileMatch = toml.match(/^\s*profile\s*=\s*"(\w+)"/m);
    const profile = profileMatch ? profileMatch[1] : 'recommended';
    // Clip aggressiveness by profile
    const PROFILE_TELEMETRY_LIMITS = {
      min: 10000,
      recommended: 30000,
      max: 60000,
    };
    maxTelemetryChars = PROFILE_TELEMETRY_LIMITS[profile] || 30000;
  }
} catch (e) {}

// Clip test output files
const unitOutput = fs.existsSync('/tmp/unit-test-output.txt')
  ? fs.readFileSync('/tmp/unit-test-output.txt', 'utf8').slice(0, Math.floor(maxTelemetryChars / 6))
  : '';
const behaviourOutput = fs.existsSync('/tmp/behaviour-test-output.txt')
  ? fs.readFileSync('/tmp/behaviour-test-output.txt', 'utf8').slice(0, Math.floor(maxTelemetryChars / 12))
  : '';

telemetry.liveTests.unit.output = unitOutput;
telemetry.liveTests.behaviour.output = behaviourOutput;

// Clip full payload
const summary = JSON.stringify(telemetry);
core.setOutput('telemetry', summary.slice(0, maxTelemetryChars));
```

Profile-based clipping:

| Profile | Max telemetry chars | Unit test output | Behaviour output |
|---------|-------------------|------------------|------------------|
| min | 10,000 | ~1,600 chars | ~800 chars |
| recommended | 30,000 | ~5,000 chars | ~2,500 chars |
| max | 60,000 | ~10,000 chars | ~5,000 chars |

### Part E: Profile propagation audit

Three workflows accept `profile` as a parameter. Here's the current state and what needs fixing:

#### 1. `agentic-lib-schedule.yml` — GOOD, writes to TOML

- Accepts `profile` input (line 25-28 for workflow_call, line 56-65 for workflow_dispatch)
- Writes `[tuning].profile` to `agentic-lib.toml` (lines 158-162)
- Commits and pushes the updated TOML to main
- **Status**: Correct — schedule changes persist the profile to the config file

#### 2. `agentic-lib-init.yml` — GOOD, writes to TOML

- Accepts `profile` input (line 42 for workflow_call, line 109 for workflow_dispatch)
- Writes `[tuning].profile` to `agentic-lib.toml` (lines 241-246)
- Commits as part of the init operation
- **Status**: Correct — init persists the profile to the config file

#### 3. `agentic-lib-workflow.yml` — PARTIALLY GOOD, uses but doesn't persist

- Accepts `profile` input (line 27 for workflow_call, line 54 for workflow_dispatch)
- Applies profile to in-memory TOML config via `sed` (lines 354-359) — but this is a checkout copy, not committed
- Passes profile through to `agentic-step` action via the modified TOML on disk
- Passes profile to `update-schedule` job (line 998) — which DOES persist it
- **Status**: Correct for runtime use. When the user dispatches with a profile, the workflow uses it AND the schedule job persists it. The workflow itself correctly does NOT persist — it's a runtime override, not a config change.

#### What's missing

The **schedule cron trigger** doesn't pass profile — it uses whatever's in the committed TOML. This is correct because the schedule TOML was set by a prior `agentic-lib-schedule.yml` run. But the **dispatch-fix path** in `agentic-lib-test.yml` dispatches `agentic-lib-workflow.yml` with `mode=full` but does NOT pass model or profile:

```yaml
# agentic-lib-test.yml line 116-119
gh workflow run agentic-lib-workflow.yml \
  --repo "${{ github.repository }}" \
  -f mode=full \
  -f message="Build broken on main..."
```

**Fix needed**: dispatch-fix should NOT pass model/profile — it should let the workflow read from TOML config (which is already the intent of W3). Once W3 is implemented (params job reads model from TOML), dispatch-fix correctly inherits whatever's in the config. No change needed here.

**One gap**: When `agentic-lib-workflow.yml` is called via `workflow_call` from itself (schedule-based), the `schedule` input propagates `model` and `profile` (line 996-998). But the concurrency stamp in the schedule workflow's commit message doesn't include the profile. This is cosmetic.

**Conclusion**: Profile propagation is already correct across all 3 workflows. Schedule and init persist to TOML. Workflow reads from TOML (or overrides at runtime). The W3 fix (reading model from TOML in params) will close the last gap where an empty model input defaults to gpt-5-mini instead of reading from config.

---

## W7: Profile=unknown in tuning logs

**Finding**: FINDING-8
**Root cause**: The Copilot session log shows `profile=unknown` because the profile value from workflow inputs is empty when the TOML default is used. The agentic-step action logs the input value, not the resolved value from the config.

**File**: `src/actions/agentic-step/` (logging code or main entry point)
**Fix**: After loading the TOML config and resolving the tuning profile, use the resolved profile name for log output. If `inputs.profile` is empty, read `config.tuning?.profile` and use that in log messages.

**Scope**: Small — update the log line to prefer `config.tuning.profile` over the raw input when the input is empty.

---

## W8: Feedback loop — runaway dispatch cycle

**Source**: Storm observed 2026-03-08 on repository0. Deep dive analysis in [DEEP_DIVE_W8_FEEDBACK_LOOP.md](DEEP_DIVE_W8_FEEDBACK_LOOP.md).

### What happened

On 2026-03-08, repository0 experienced a runaway feedback loop that produced **572 commits** and **hundreds of workflow runs** over ~10 hours. The loop accelerated from a ~5 minute cycle to sub-minute bursts before being stopped by manually disabling 3 workflows.

| Count | Message |
|-------|---------|
| 361 | `schedule: set to off, model gpt-5-mini` |
| 178 | `agentic-step: maintain features and library` |
| 8 | Issue transforms |
| 6 | `init purge` |
| 19 | Other (benchmarks, docs, features) |
| **572** | **Total** |

Peak: **68 workflow runs in 10 minutes**, **41 commits in 33 minutes**.

### The primary loop

```
                    ┌──────────────────────────────────────┐
                    │                                      │
                    ▼                                      │
           agentic-lib-workflow                            │
                    │                                      │
                    │ maintain job pushes to main           │
                    │ (no test gate, always pushes)         │
                    ▼                                      │
              push to main                                 │
                    │                                      │
                    │ on.push trigger                       │
                    ▼                                      │
           agentic-lib-test                                │
                    │                                      │
                    │ test + behaviour both FAIL            │
                    ▼                                      │
             dispatch-fix job                              │
                    │                                      │
                    │ gh workflow run                       │
                    │ agentic-lib-workflow.yml              │
                    │ mode=full                             │
                    │                                      │
                    └──────────────────────────────────────┘
                         ~60 seconds per cycle
```

Why it's unbreakable from inside:
1. **maintain always pushes** — updates features/library docs, commits, pushes. No test gate.
2. **Tests always fail** — two bugs in the code (`assert` vs `with` in Node 24, CJS `require()` in ESM project). The workflow doesn't run these tests itself, so it doesn't know.
3. **dispatch-fix always fires** — its only guards are: on main, not a PR, not agentic-lib repo. All true. No rate limit, no cooldown.
4. **No concurrency control** — multiple instances run in parallel, each producing commits.

### The secondary loop (schedule-off spam)

A parallel loop explains the 361 `schedule: set to off` commits:

```
agentic-lib-workflow
    │
    ├── supervisor job
    │       │ LLM sees "tests failing" in telemetry
    │       │ LLM chooses: set-schedule:off
    │       ▼
    │   executeSetSchedule() ──▶ agentic-lib-schedule.yml
    │       │ Stamps date in workflow file (guarantees non-empty commit)
    │       │ Commits + pushes to main
    │       ▼
    │   push to main ──▶ agentic-lib-test ──▶ fails ──▶ dispatch-fix ──▶ back to top
    │
    └── maintain job ──push──▶ also triggers the primary loop
```

The supervisor rationally tries to stop the schedule but can't: dispatch-fix is the trigger, not the schedule. And the schedule workflow's date stamp (`new Date().toISOString()`) ensures a non-empty commit every time, even when the schedule is already "off".

### The complete dispatch graph

```
                    ┌──────────────────────────────┐
                    │     cron (hourly, if set)     │
                    └──────────┬───────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  agentic-lib-workflow.yml                        │
│                                                                 │
│  maintain ──push──▶ main     ◀── NO test gate                  │
│  dev ──────push──▶ branch ──merge──▶ main                      │
│  fix-stuck ─push─▶ branch ──PR──▶ main                         │
│  update-schedule ──workflow_call──▶ agentic-lib-schedule.yml    │
│                                                                 │
│  supervisor ──dispatchBot()──▶ agentic-lib-bot.yml             │
│  supervisor ──executeSetSchedule()──▶ agentic-lib-schedule.yml │
│  supervisor ──executeDispatch()──▶ any workflow (guarded*)      │
│                                                                 │
│  * Guard: skips if agentic-lib-workflow already in_progress     │
│    BUT only for dispatch:agentic-lib-workflow actions            │
│    NOT for dispatch-fix path                                    │
│                                                                 │
│  ⚠ CONCURRENCY: NONE (block is commented out, no #@dist)       │
└─────────────────────────────────────────────────────────────────┘
         │ push to main                    │ dispatchBot()
         ▼                                 ▼
┌────────────────────────┐   ┌─────────────────────────────────┐
│  agentic-lib-test.yml  │   │    agentic-lib-bot.yml          │
│                        │   │                                 │
│  on: push to main      │   │  dispatch-supervisor ──dispatch─▶│
│  on: schedule (hourly) │   │    agentic-lib-workflow.yml     │
│  on: workflow_call     │   │                                 │
│                        │   │  ⚠ CONCURRENCY: per-discussion  │
│  dispatch-fix ─────────┼───┘   (#@dist — active in consumers)│
│    ──dispatch──▶       │   └─────────────────────────────────┘
│    agentic-lib-workflow │
│                        │   ┌─────────────────────────────────┐
│  ⚠ NO circuit breaker  │   │  agentic-lib-schedule.yml        │
│  ⚠ NO concurrency      │   │                                  │
└────────────────────────┘   │  update-schedule ──push──▶ main  │
                             │  ⚠ NO concurrency               │
                             └─────────────────────────────────┘
```

### Why the workflow succeeded while tests failed

| Job in agentic-lib-workflow | Tests it runs | On failure |
|----|----|----|
| maintain | None | Always pushes to main |
| supervisor | None | Readonly analysis |
| dev | `[execution].test` pre-commit | `set +e` + `exit 0` — skips commit, job succeeds |
| fix-stuck | LLM tool loop reads test | `set +e` + `exit 0` — soft gate, job succeeds |

All test failures are soft — they skip downstream steps but never fail the job. The overall workflow always shows green.

### Root causes

| # | Root Cause | Impact |
|---|-----------|--------|
| RC1 | `agentic-lib-workflow` concurrency block has no `#@dist` markers | Unlimited parallel instances |
| RC2 | `dispatch-fix` has no circuit breaker | Unconditional re-dispatch on every failure |
| RC3 | `dispatch-fix` condition uses blacklist (`!= 'pull_request'`) not whitelist | Fires for workflow_dispatch, workflow_call, schedule — not just push |
| RC4 | Schedule-off dispatch produces a commit (date stamp guarantees non-empty) | Each supervisor's rational "stop" action adds fuel |
| RC5 | `agentic-lib-test` has no concurrency block | Multiple test runs fire dispatch-fix independently |
| RC6 | Workflow test failures are soft (exit 0) — addressed by W9 | Workflow can't detect it left things broken |

### Fixes

All changes in agentic-lib (source of truth), distributed to repository0 via init.

#### Fix 1: Enable concurrency on the workflow (RC1)

Change the concurrency block in `agentic-lib-workflow.yml` from plain `#` to `#@dist`:

```yaml
# Before (dead code):
#concurrency:
#  group: agentic-lib-workflow
#  cancel-in-progress: false

# After (activated in consumers via init):
#@dist concurrency:
#@dist   group: agentic-lib-workflow
#@dist   cancel-in-progress: false
```

**Effect**: Only one workflow instance runs at a time in consumer repos. New dispatches queue. `cancel-in-progress: false` preserves in-flight work.

#### Fix 2: Circuit breaker on dispatch-fix (RC2)

Add a check before dispatching: count recent workflow runs and skip if above threshold.

```yaml
  dispatch-fix:
    needs: [test, behaviour]
    if: >-
      !cancelled()
      && github.ref == 'refs/heads/main'
      && (github.event_name == 'push' || github.event_name == 'schedule')
      && github.repository != 'xn-intenton-z2a/agentic-lib'
      && (needs.test.result == 'failure' || needs.behaviour.result == 'failure')
    runs-on: ubuntu-latest
    steps:
      - name: Check circuit breaker
        id: breaker
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Count agentic-lib-workflow dispatches in last 30 minutes
          SINCE=$(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-30M +%Y-%m-%dT%H:%M:%SZ)
          COUNT=$(gh run list \
            --repo "${{ github.repository }}" \
            --workflow agentic-lib-workflow.yml \
            --json createdAt \
            --jq "[.[] | select(.createdAt >= \"$SINCE\")] | length")
          echo "recent-dispatches=$COUNT"
          if [ "$COUNT" -ge 3 ]; then
            echo "Circuit breaker tripped: $COUNT dispatches in last 30 min"
            echo "tripped=true" >> $GITHUB_OUTPUT
          else
            echo "tripped=false" >> $GITHUB_OUTPUT
          fi

      - name: Dispatch agentic-lib-workflow to fix broken build
        if: steps.breaker.outputs.tripped != 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          echo "Tests failed on main — dispatching agentic-lib-workflow to fix"
          gh workflow run agentic-lib-workflow.yml \
            --repo "${{ github.repository }}" \
            -f mode=full \
            -f message="Build broken on main: agentic-lib-test run ${{ github.run_id }} failed. Please fix."
```

**Effect**: Maximum 3 fix dispatches in any 30-minute window. After that, the loop stops and waits for human intervention or the next hourly test cron.

#### Fix 3: Whitelist dispatch-fix event types (RC3)

Change from:
```yaml
&& github.event_name != 'pull_request'
```
To:
```yaml
&& (github.event_name == 'push' || github.event_name == 'schedule')
```

**Effect**: dispatch-fix only fires for genuine external triggers (push, hourly cron). Does NOT fire when called via `workflow_call` (from post-commit test, W9) or `workflow_dispatch` (manual runs, dispatches from supervisor).

#### Fix 4: Suppress schedule-off stamp when already off (RC4)

In `agentic-lib-schedule.yml`, the date stamp at line 123 ensures a non-empty commit every time. When the schedule is already off and `frequency=off` is dispatched again, this still produces a commit → push → test failure → dispatch-fix → loop.

**Fix**: Before editing, check if the frequency is already set to the requested value and skip:

```javascript
// Before editing, check if the frequency is already set
const supervisorRegex = /^\s*supervisor\s*=\s*"([^"]*)"/m;
const currentMatch = toml.match(supervisorRegex);
const currentFreq = currentMatch ? currentMatch[1] : '';
if (currentFreq === frequency) {
  core.info(`Schedule already set to ${frequency} — no change needed`);
  // Don't write, commit step will find no changes and skip
  return;
}
```

**Effect**: Eliminates the 361 redundant schedule-off commits. The first `set-schedule:off` works; subsequent calls are no-ops.

#### Fix 5: Add concurrency to the test workflow (RC5)

```yaml
#@dist concurrency:
#@dist   group: agentic-lib-test-${{ github.ref_name }}
#@dist   cancel-in-progress: true
```

**Effect**: Rapid pushes to main cancel previous test runs (only the latest matters). Combined with the circuit breaker, this prevents dispatch-fix from firing N times for N rapid pushes.

#### Fix 6: Keep behaviour tests out of the agentic-step tool loop

Behaviour tests should only run in `agentic-lib-test.yml` as a separate quality signal. They must not be included in the dev, fix-stuck, or maintain jobs' agentic-step tool loops where they slow everything down and create confusion (the LLM tries to fix Playwright issues instead of focusing on the actual code).

Verify that no agentic-step invocation in `agentic-lib-workflow.yml` references behaviour tests, and that the agent prompts clearly scope the LLM's test responsibility to unit tests only within the tool loop.

### Fix priority and dependencies

```
Fix 1 (concurrency) ──── standalone, immediate relief
Fix 2 (circuit breaker) ── standalone, prevents escalation
Fix 3 (event whitelist) ── prerequisite for W9 (post-commit test)
Fix 4 (schedule no-op) ── standalone, eliminates amplifier
Fix 5 (test concurrency) ── standalone, reduces parallel dispatch-fix
Fix 6 (behaviour out) ── standalone, reduces confusion
```

Fixes 1–6 can be done in any order except Fix 6 (W9) depends on Fix 3 being in place.

**Minimum fix to prevent recurrence**: Fix 1 + Fix 2. Concurrency limits parallelism to 1; circuit breaker limits loop iterations to 3 per 30 minutes.

**Full fix**: All 6. Eliminates the loop entirely.

### What triggered the storm

The loop was always latent — it activates whenever: (1) tests fail on main, AND (2) the workflow is enabled, AND (3) the workflow pushes to main (maintain job runs). Before 2026-03-08 tests were passing, so dispatch-fix never fired. When the LLM introduced two bugs (assert syntax, CJS require), tests started failing and the loop engaged. The gradual acceleration is explained by overlapping cycles without concurrency control.

### Impact

| Metric | Value |
|--------|-------|
| Duration | ~10 hours |
| Total commits | 572 |
| Waste commits (schedule-off + maintain) | 539 (94%) |
| Productive commits | 33 (6%) |
| Workflow runs (peak 13 min) | 91 |
| GitHub Actions minutes consumed | ~150+ |
| Manual intervention required | Yes (disable 3 workflows) |
| Data loss | None |

---

## W9: Post-commit test delegation from agentic-lib-workflow

**Source**: Storm observation — the workflow shows green even when the code it pushed is broken. The test failure appears as a disconnected run triggered by the push event.

### The problem

agentic-lib-workflow.yml runs its own internal unit tests (in dev and fix-stuck jobs) to gate commits, but after it has pushed commits to main, there is no test run within the workflow to show the true status of the branch. The only signal comes from `agentic-lib-test.yml` being triggered asynchronously by the push event, disconnected from the workflow run that caused it.

This means:
- The workflow shows green even when the code it pushed is broken.
- It's impossible to tell from a workflow run whether it left the repository healthy.
- The disconnected test failure triggers dispatch-fix, creating the feedback loop (W8).

### Proposed solution

Add a final job to agentic-lib-workflow.yml that **calls agentic-lib-test.yml via `workflow_call`** after the last commit.

**File**: `.github/workflows/agentic-lib-workflow.yml` (source of truth in agentic-lib — distributed via `#@dist` markers)
**Also**: `.github/workflows/agentic-lib-test.yml` (the seed test workflow)

### Implementation detail

#### 1. New job in agentic-lib-workflow.yml

```yaml
  # ─── Post-commit validation: call test workflow to verify branch health ───
  post-commit-test:
    needs: [params, dev, fix-stuck, post-merge]
    if: >-
      !cancelled()
      && needs.params.outputs.dry-run != 'true'
      && needs.params.result == 'success'
    uses: ./.github/workflows/agentic-lib-test.yml
    secrets: inherit
```

This runs **after** all jobs that might push to main (`dev`, `fix-stuck`, `post-merge`). It uses `workflow_call` so the test results appear as nested jobs within the agentic-lib-workflow run. The caller sees a red workflow run if the code it pushed is broken.

The `!cancelled()` condition ensures it runs even if some upstream jobs were skipped (e.g., fix-stuck skipped because nothing was stuck). The `needs.params.result == 'success'` ensures we don't run tests when params couldn't even normalise.

Dry-run guard (`dry-run != 'true'`) prevents tests from running on manual dispatches that didn't push anything.

#### 2. Guard dispatch-fix in agentic-lib-test.yml

Current dispatch-fix condition (line 103-108 of agentic-lib-test.yml):
```yaml
  dispatch-fix:
    needs: [test, behaviour]
    if: >-
      !cancelled()
      && github.ref == 'refs/heads/main'
      && github.event_name != 'pull_request'
      && github.repository != 'xn-intenton-z2a/agentic-lib'
      && (needs.test.result == 'failure' || needs.behaviour.result == 'failure')
```

**Problem**: When called via `workflow_call` from agentic-lib-workflow, `github.event_name` is the *original* trigger event of the caller (e.g., `workflow_dispatch` or `schedule`), NOT `workflow_call`. So the `!= 'pull_request'` guard doesn't help — it would still fire, re-dispatching agentic-lib-workflow and restarting the loop.

**Fix**: Switch from blacklist to whitelist. Only dispatch-fix on events that represent genuine external triggers:

```yaml
    if: >-
      !cancelled()
      && github.ref == 'refs/heads/main'
      && (github.event_name == 'push' || github.event_name == 'schedule')
      && github.repository != 'xn-intenton-z2a/agentic-lib'
      && (needs.test.result == 'failure' || needs.behaviour.result == 'failure')
```

This means dispatch-fix fires ONLY when:
- `push` — a genuine code push to main (not coming from within our workflow)
- `schedule` — the hourly test cron (line 16 of agentic-lib-test.yml)

It does NOT fire for:
- `workflow_call` — when called from agentic-lib-workflow (post-commit test)
- `workflow_dispatch` — when manually triggered (the operator can fix manually)

#### 3. What about the push event from workflow commits?

When agentic-lib-workflow pushes to main, it triggers agentic-lib-test.yml via the `on.push` trigger. This ALSO has `github.event_name == 'push'`, so dispatch-fix would still fire from the push-triggered run.

**This is intentional for now** — the push-triggered test run is the "belt" (independent verification). Combined with W8's circuit breaker and concurrency controls, a single dispatch-fix from a push is acceptable. The key change is preventing the workflow_call path from adding a second dispatch-fix entry point per workflow run.

**Future consideration**: If the circuit breaker (W8) proves insufficient, add a second guard: check if the push was authored by `GitHub Actions[bot]` (i.e., came from our own workflow) and skip dispatch-fix for bot-authored pushes. This is a more aggressive change and should wait for observation.

#### 4. File mapping

Both files are in agentic-lib's `.github/workflows/` directory. During init, `agentic-lib-workflow.yml` is copied with `#@dist` marker transformation. `agentic-lib-test.yml` is the seed test workflow (currently at `.github/workflows/agentic-lib-test.yml` in agentic-lib, distributed as the same path to consumers).

No new files needed. Changes are confined to these two existing files.

---

## W10: Purge should blank last 100 closed issues

**Source**: User request — after `init --purge` resets a repository to a new mission, hundreds of stale closed issues remain with titles and bodies referencing the old mission. This creates noise and confusion for both the dedup guard (W2) and the supervisor's recently-closed context.

### The problem

`init --purge` resets files, configs, and the activity log. But GitHub Issues are external state — they persist across purges. When the supervisor runs after a purge:
1. It sees recently-closed issues with titles from the previous mission
2. The dedup guard matches new issue titles against these stale issues (W2 mitigates timing, but titles remain confusing)
3. The `recentlyClosedSummary` sent to the LLM contains stale context from old missions, polluting reasoning

### Proposed solution

During `npx @xn-intenton-z2a/agentic-lib init --purge`, after resetting files, blank the last 100 closed issues.

### Implementation detail

**File**: `bin/agentic-lib.js` — the `initPurge()` function (line 939+)

#### 1. Add issue cleanup step after file operations

```javascript
async function blankClosedIssues(owner, repo, token) {
  console.log("\n--- Purge: Blanking last 100 closed issues ---");

  const { Octokit } = await import("@octokit/rest");
  const octokit = new Octokit({ auth: token });

  let blanked = 0;
  let page = 1;
  const perPage = 100;

  // Fetch closed issues (most recently updated first)
  const { data: issues } = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    state: "closed",
    sort: "updated",
    direction: "desc",
    per_page: perPage,
    page,
  });

  // Filter out pull requests (GitHub API returns PRs in issues endpoint)
  const closedIssues = issues.filter(i => !i.pull_request);

  for (const issue of closedIssues) {
    // Skip issues that are already blanked
    if (issue.title === "unused github issue") continue;

    try {
      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: issue.number,
        title: "unused github issue",
        body: "unused github issue",
      });
      blanked++;
      // Rate limit: GitHub allows ~30 req/min for mutations
      if (blanked % 30 === 0) {
        console.log(`  Blanked ${blanked} issues, pausing for rate limit...`);
        await new Promise(r => setTimeout(r, 60000));
      }
    } catch (err) {
      console.log(`  WARN: Could not blank issue #${issue.number}: ${err.message}`);
    }
  }

  console.log(`  Blanked ${blanked} closed issues`);
}
```

#### 2. Determine the GitHub token

The init command runs in CI via `init.yml` which checks out with `WORKFLOW_TOKEN` (a classic PAT with `workflow` scope). This token also has `repo` scope which covers `issues: write`.

For local runs, the user's `GITHUB_TOKEN` environment variable or `gh auth token` output can be used:

```javascript
// In the --purge code path, after file operations
if (purge) {
  const token = process.env.GITHUB_TOKEN || (() => {
    try {
      return execSync("gh auth token", { encoding: "utf8" }).trim();
    } catch {
      return null;
    }
  })();

  if (token) {
    const remote = execSync("git remote get-url origin", { encoding: "utf8", cwd: target }).trim();
    const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      await blankClosedIssues(match[1], match[2], token);
    }
  } else {
    console.log("  SKIP: No GITHUB_TOKEN — cannot blank closed issues. Set GITHUB_TOKEN or run 'gh auth login'.");
  }
}
```

#### 3. Also blank open issues during purge

Open issues from a previous mission are equally stale. The purge should blank them too, and close them:

```javascript
// Also fetch and blank open issues
const { data: openIssues } = await octokit.rest.issues.listForRepo({
  owner, repo, state: "open", per_page: 100,
});
const openOnly = openIssues.filter(i => !i.pull_request);
for (const issue of openOnly) {
  await octokit.rest.issues.update({
    owner, repo, issue_number: issue.number,
    title: "unused github issue",
    body: "unused github issue",
    state: "closed",
  });
  blanked++;
}
```

#### 4. Dry-run support

When `--dry-run` is active, log what would be blanked without making API calls:

```javascript
if (dryRun) {
  console.log(`  DRY-RUN: Would blank ${closedIssues.length} closed + ${openOnly.length} open issues`);
  return;
}
```

#### 5. @octokit/rest dependency

`bin/agentic-lib.js` doesn't currently depend on `@octokit/rest`. Options:
- **(A)** Add `@octokit/rest` as a dependency — it's already a transitive dep via `@actions/github`, but bin scripts run outside Actions
- **(B)** Use raw `fetch()` calls to the GitHub API with the token as Bearer header — no new dependency
- **(C)** Shell out to `gh api` — available in CI and locally if `gh` is installed

**Recommendation**: Option C (shell out to `gh`) for simplicity and no new dependency:

```javascript
for (const issue of closedIssues) {
  if (issue.title === "unused github issue") continue;
  const cmd = `gh api repos/${owner}/${repo}/issues/${issue.number} -X PATCH -f title="unused github issue" -f body="unused github issue"`;
  if (!dryRun) {
    execSync(cmd, { stdio: "pipe", env: { ...process.env, GH_TOKEN: token } });
  }
  blanked++;
  console.log(`  BLANK: #${issue.number} "${issue.title}" → "unused github issue"`);
}
```

This avoids adding a dependency, works in CI (where `gh` is pre-installed), and works locally (where the user has `gh` installed for auth).

#### 6. Labels cleanup

Also remove all labels from blanked issues to prevent the supervisor or dedup from matching on labels:

```bash
gh api repos/{owner}/{repo}/issues/{number}/labels -X DELETE
```

---

## Execution Plan

### PR 1: Quick fixes (W1 + W7)
- W1: Add git config to fix-stuck raw commit block (2 lines in agentic-lib-workflow.yml)
- W7: Fix profile logging to use resolved value from config (index.js or config-loader.js)
- Both are small, low-risk changes

### PR 2: Dedup + model resolution (W2 + W3)
- W2: Add init-timestamp awareness to dedup guard (supervise.js `executeCreateIssue()`)
- W3: Add checkout + TOML read to params job for model/profile (agentic-lib-workflow.yml)
- Both relate to config/state resolution

### PR 3: Mission-complete metrics dashboard (W4)
- W4 Part A: Add `buildMissionReadiness()` helper in index.js — deterministic narrative from metrics
- W4 Part B: Add `buildMissionMetrics()` helper in index.js — structured metrics array
- W4 Part C: Add `missionReadiness` + `missionMetrics` params to `logActivity()` in logging.js
- Pass metrics and readiness into every `logActivity()` call in index.js
- Files: `src/actions/agentic-step/index.js`, `src/actions/agentic-step/logging.js`

### PR 4: Behaviour test config + purge + permissions (W5)
- Add `behaviour = "test/tests/behaviour/" #@dist "tests/behaviour/"` to `agentic-lib.toml` `[paths]`
- Add `"behaviour"` to `WRITABLE_KEYS` and `PATH_DEFAULTS` in `config-loader.js`
- Add `clearAndRecreateDir(behaviourPath, ...)` to `initPurge()` in `bin/agentic-lib.js`
- Update `readTomlPaths()` to extract behaviour path from TOML
- Add ESM requirement to agent prompts that reference behaviour tests
- Files: `agentic-lib.toml`, `src/actions/agentic-step/config-loader.js`, `bin/agentic-lib.js`, `src/agents/agent-*.md`

### PR 5: Telemetry enhancement (W6)
- Add `npm ci`, unit test step (non-blocking, `set +e` + `exit 0`), behaviour test step (non-blocking) to telemetry job
- Parse pass/fail counts from test output, capture as step outputs
- Query latest external agentic-lib-test run via GitHub API
- Gather source stats (file lines, exported functions), README modification flag, activity log stats, mission signals
- Clip test output and total payload by tuning profile (`min=10k`, `recommended=30k`, `max=60k` chars)
- Audit profile propagation: schedule and init persist to TOML (already correct), workflow reads at runtime (already correct), dispatch-fix inherits from TOML via W3
- File: `.github/workflows/agentic-lib-workflow.yml` (telemetry job)

### PR 6: Feedback loop remediation (W8)
- Fix 1: Enable `#@dist concurrency:` on agentic-lib-workflow.yml (change `#` to `#@dist`)
- Fix 2: Add circuit breaker to dispatch-fix in agentic-lib-test.yml (count recent runs, skip if >= 3 in 30 min)
- Fix 3: Whitelist dispatch-fix event types (`push` or `schedule` only, not `workflow_call`/`workflow_dispatch`)
- Fix 4: Suppress schedule-off stamp in agentic-lib-schedule.yml when frequency already matches (skip no-op edits)
- Fix 5: Add `#@dist concurrency:` to agentic-lib-test.yml with `cancel-in-progress: true`
- Fix 6: Verify behaviour tests stay out of agentic-step tool loop in dev/fix-stuck/maintain jobs
- Files: `.github/workflows/agentic-lib-workflow.yml`, `.github/workflows/agentic-lib-test.yml`, `.github/workflows/agentic-lib-schedule.yml`

### PR 7: Post-commit test delegation + dispatch-fix guard (W9)
- Add `post-commit-test` job to agentic-lib-workflow.yml calling agentic-lib-test.yml via `workflow_call`
- Job depends on: `[params, dev, fix-stuck, post-merge]`
- Update dispatch-fix guard in agentic-lib-test.yml: change `event_name != 'pull_request'` to `event_name == 'push' || event_name == 'schedule'` (whitelist)
- Files: `.github/workflows/agentic-lib-workflow.yml`, `.github/workflows/agentic-lib-test.yml`

### PR 8: Purge closed issue cleanup (W10)
- Add `blankClosedIssues()` function to `bin/agentic-lib.js`
- Call from `initPurge()` after file operations
- Use `gh api` to blank title/body of last 100 closed + all open issues
- Also close open issues and remove labels
- Supports `--dry-run` (log only, no API calls)
- Token from `GITHUB_TOKEN` env var or `gh auth token`
- File: `bin/agentic-lib.js`

### Release sequence
1. PR 1 (W1+W7) → merge → release
2. PR 2 (W2+W3) → merge → release
3. PR 3 (W4) → merge → release
4. PR 4 (W5) → merge → release
5. PR 5 (W6) → merge → release
6. PR 6 (W8) → merge → release
7. PR 7 (W9) → merge → release
8. PR 8 (W10) → merge → release
9. `npx @xn-intenton-z2a/agentic-lib init --purge` on repository0
10. Run benchmark report 004 to validate all fixes
