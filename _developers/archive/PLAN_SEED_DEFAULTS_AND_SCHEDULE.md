# Plan: Seed Defaults, Schedule Proportionality, Mission-Complete Externalisation, and Benchmark 016 Fixes

**Created**: 2026-03-20
**Status**: PENDING
**Branch**: `claude/seed-defaults-and-schedule`

---

## User Assertions

1. Seed files ship with default: schedule off, model gpt-5-mini, profile max, mission fizz-buzz
2. All workflows from the seed ship with no scheduled activities
3. Schedule workflow sets proportional schedules across init and test workflows
4. Schedule workflow uses agentic-lib.toml values as defaults when run with default parameters
5. Every workflow params job normalises inputs with matching defaults; blank params fall back to agentic-lib.toml
6. Merge repository0 GETTING-STARTED.md into seed README; update for current distribution and new defaults
7. No tests in test.yml use claude-sonnet-4 model
8. Init should purge by default
9. New mission type "random" — selects a random packaged seed mission; persisted in agentic-lib.toml
10. New mission type "generate" — asks LLM to generate a novel mission in the same range as shipped missions
11. Acceptance criteria threshold externalised as a parameter in agentic-lib.toml; mission difficulty sets threshold independently from profile (both knobs exist, neither overrides the other)
12. Audit all mission-complete criteria (director, bot, supervisor) and externalise configurable values to agentic-lib.toml; make range-appropriate values profile attributes
13. Add `npm install` as a post-transform step everywhere applicable to prevent lockfile desync (from Benchmark 016 FINDING-2)
14. Add `focus` parameter (`mission` | `maintenance`) to `[schedule]` in agentic-lib.toml; include in all LLM prompts and agent guidance (from Benchmark 016 Recommendation 2)
15. Switch acceptance criteria tracking from regex-matched MISSION.md checkboxes to a structured TOML format that avoids regex fragility (from Benchmark 016 FINDING-4/Recommendation 3)
16. Make maintain commits visually distinct: include test pass count / health status in commit messages; primary action of commit left-most in the message (from Benchmark 016 Recommendation 4)
17. Fix review-issues batch timeout (45% failure rate): add remaining-time guard in batch loop, add configurable `review-issues-cap` to profiles (min=2, med=3, max=4) (from Benchmark 016 FINDING-5)

---

## Current State

### Seed Defaults (W1, W2)
- `zero-MISSION.md`: Hamming distance mission (should be fizz-buzz)
- `agentic-lib.toml` `#@dist` markers: profile → `"max"` (correct), model → `"gpt-5-mini"` (correct — user confirmed the enum is `gpt-5-mini`)
- `agentic-lib.toml` `[schedule].supervisor` → `"daily"` `#@dist` marker: NONE (should be `"off"`)
- `agentic-lib-workflow.yml` `#@dist` schedule cron: `"0 6 * * 1"` (Monday 6am — should be never-fires `"0 0 31 2 *"`)
- `agentic-lib-test.yml` `#@dist` schedule cron: `"40 * * * *"` (hourly — should be never-fires)
- `agentic-lib-update.yml`: has `#@dist` schedule block — should also be never-fires

### Schedule Proportionality (W4)
Currently, the schedule workflow only updates `agentic-lib-workflow.yml`'s cron. It does NOT touch `agentic-lib-init.yml` or `agentic-lib-test.yml`. The user wants proportional schedules. User confirmed: at weekly frequency, test runs weekly and init runs monthly.

| Frequency | workflow (agentic-lib-workflow.yml) | init (agentic-lib-init.yml) | test (agentic-lib-test.yml) |
|-----------|------------------------------------|-----------------------------|------------------------------|
| continuous | every 20 min | every 4 hours | every hour |
| hourly | every hour | every day | every 4 hours |
| daily | every day | every week | every day |
| weekly | every week | every month | every week |
| off | never | never | never |

### Schedule Defaults from TOML (W5)
The schedule workflow reads `model` from `agentic-lib.toml` as a fallback, but `frequency` is a required input with no TOML fallback. When called with default parameters, it should read schedule/model/profile from the existing `agentic-lib.toml`.

Additionally, `init --purge` overwrites `agentic-lib.toml` with the seed version, losing custom values. The purge must preserve key values.

### Params Job Audit (W6)
Workflows with params jobs: `agentic-lib-workflow.yml`, `agentic-lib-init.yml`, `test.yml`, `agentic-lib-schedule.yml`. Need to audit each for missing TOML fallbacks on blank defaults.

### Seed README vs GETTING-STARTED.md (W7)
- `src/seeds/zero-README.md`: Basic setup guide with secrets table, file layout, test strategy
- `repository0/GETTING-STARTED.md`: Three-step guide with 18 missions table, Options A/B, init workflow dispatch

The seed README should incorporate the getting-started content and reflect the new defaults.

### test.yml Model (W8)
Line 86 of `test.yml` lists `claude-sonnet-4` in model options. Needs removing.

### Init Purge Default (W9)
Currently `init` CLI defaults to `--update` mode. The workflow defaults to `mode: "update"`. Both should default to `purge`.

### Post-Transform npm install (W15 — from Benchmark 016 FINDING-2)
The transform pipeline can edit `package.json` (e.g. adding `sharp`) but cannot run `npm install` to regenerate the lockfile. This caused a 3-hour CI outage in Benchmark 016. The fix: run `npm install` as a post-transform step in all places that commit code changes.

**Locations where post-transform `npm install` is needed:**
- `agentic-lib-workflow.yml`: after the `dev` job's transform commit, before `post-commit-test`
- `bin/agentic-lib.js`: in `transform` and `iterate` CLI commands, after the Copilot session writes files
- `src/actions/agentic-step/tasks/transform.js`: register an `npm install` step after file writes

### Focus Parameter (W16 — from Benchmark 016 Recommendation 2)
The current `supervisor = "maintenance"` mode conflates two things: "run on a maintenance schedule" and "focus on maintenance rather than mission advancement". These should be separated:

```toml
[schedule]
supervisor = "daily"              # off | weekly | daily | hourly | continuous
focus = "mission"                 # mission | maintenance
```

- `focus = "mission"`: LLM prompts emphasise working toward mission completion, creating issues from gaps, declaring mission-complete when criteria are met
- `focus = "maintenance"`: LLM prompts emphasise adding value to what exists — refactoring, test coverage, documentation, performance — without pushing for new feature issues or mission-complete

This is a remembered value (survives purge) and appears in all LLM prompts across all task handlers.

### Structured Acceptance Criteria (W17 — from Benchmark 016 FINDING-4)
The current regex-based checkbox matching is broken across reports 015 and 016 (0/8 criteria ticked despite all being met in code). The mechanism (`implementation-review.js:186-210`) does:
1. LLM returns `acceptanceCriteriaMet` array with criterion text
2. Code regex-escapes the text and matches against `- [ ] <text>` in MISSION.md
3. Replaces with `- [x] <text>`

This fails because: LLM text doesn't exactly match MISSION.md text (backticks, whitespace, rewording).

**Proposed fix**: Switch to a structured TOML checklist alongside (not replacing) the MISSION.md checkboxes.

```toml
[acceptance-criteria]
# Indexed checklist — updated by implementation-review, read by director
1 = false    # fizzBuzz(15) returns correct 15-element array
2 = false    # fizzBuzzSingle(3) returns "Fizz"
3 = false    # fizzBuzzSingle(5) returns "Buzz"
...
```

The init process generates this section by parsing the MISSION.md checkboxes and assigning indices. The implementation-review tool updates by index (not text matching). The director reads both the TOML state and the MISSION.md for human-readable criteria.

### Distinct Maintain Commits (W18 — from Benchmark 016 Recommendation 4)
Currently all maintain commits use the same message: `"agentic-step: maintain features and library"`. This makes it impossible to see CI health from `git log`.

**Proposed format**: Put the primary action first (left-most), followed by health info:
```
maintain(features+library): 28 tests passing, 0 failures [healthy]
maintain(features+library): 28 tests passing, 2 failures [unstable]
maintain(features): no test changes
```

The commit-if-changed action accepts a `commit-message` input — the workflow already constructs this. The maintain task should return test count and health, which the workflow interpolates into the commit message.

---

## Work Items

### W1: Change seed mission default to fizz-buzz
**Files**: `src/seeds/zero-MISSION.md`
**Change**: Replace Hamming distance content with content from `src/seeds/missions/7-kyu-understand-fizz-buzz.md`

### W2: Change seed TOML defaults (schedule off, model gpt-5-mini, profile max)
**Files**: `agentic-lib.toml` (both `#@dist` markers and local values for testing)
**Changes**:
- `[schedule].supervisor`: Add `#@dist "off"` marker (currently no dist marker)
- `[tuning].model`: Already `"gpt-5-mini"` — confirmed correct
- `[tuning].profile`: Already has `#@dist "max"` — confirmed correct
- Seed defaults in init workflow: change default `mission-seed` from `6-kyu-understand-hamming-distance` to `7-kyu-understand-fizz-buzz`

### W3: Remove all scheduled triggers from distributed workflows
**Files**: `agentic-lib-workflow.yml`, `agentic-lib-test.yml`, `agentic-lib-update.yml`
**Changes**:
- `agentic-lib-workflow.yml`: Change `#@dist` cron to `"0 0 31 2 *"` (never-fires)
- `agentic-lib-test.yml`: Change `#@dist` cron to `"0 0 31 2 *"` (never-fires)
- `agentic-lib-update.yml`: Same treatment

All workflows ship with schedule=off. The schedule workflow activates them proportionally after init.

### W4: Schedule workflow sets proportional crons across init and test
**Files**: `agentic-lib-schedule.yml`
**Changes**: Add `INIT_SCHEDULE_MAP` and `TEST_SCHEDULE_MAP`. Update the schedule step to edit `agentic-lib-init.yml` and `agentic-lib-test.yml` crons alongside `agentic-lib-workflow.yml`.

```javascript
// Workflow (main pipeline) — unchanged
const WORKFLOW_SCHEDULE_MAP = {
  off: '0 0 31 2 *',
  weekly: '25 6 * * 1',              // Monday 6:25am
  daily: '25 6 * * *',               // Every day 6:25am
  hourly: '25 * * * *',              // Every hour at :25
  continuous: '5,25,45 * * * *',     // Every 20 min
};

// Init — infrastructure updates (runs least often)
const INIT_SCHEDULE_MAP = {
  off: '0 0 31 2 *',
  weekly: '0 4 1 * *',              // 1st of month 4:00am
  daily: '0 4 * * 1',               // Monday 4:00am
  hourly: '0 4 * * *',              // Every day 4:00am
  continuous: '0 1,5,9,13,17,21 * * *', // Every 4 hours
};

// Test — CI health checks (runs more often than init, less than workflow)
const TEST_SCHEDULE_MAP = {
  off: '0 0 31 2 *',
  weekly: '40 6 * * 1',             // Monday 6:40am (same day as workflow)
  daily: '40 6 * * *',              // Every day 6:40am
  hourly: '40 0,4,8,12,16,20 * * *', // Every 4 hours at :40
  continuous: '40 * * * *',          // Every hour at :40
};
```

Also needs to add/update `schedule:` blocks in init and test workflow files (may need `#@dist` lines added if they don't already have a schedule block to update).

### W5: Schedule workflow reads TOML defaults for blank parameters
**Files**: `agentic-lib-schedule.yml`
**Changes**: When `frequency` input is blank/default, read `[schedule].supervisor` from `agentic-lib.toml`. Same for `model` (already done) and `profile` (not done). Make `frequency` optional with default `""`.

### W6: Params job audit — all workflows fall back to TOML
**Files**: All workflow params jobs
**Audit checklist**:
- [ ] `agentic-lib-workflow.yml` params: `model` ✓ (reads toml), `profile` — needs toml fallback, `dry-run` — OK (event-based logic)
- [ ] `agentic-lib-init.yml` params: `mode` — needs toml fallback (default purge), `mission-seed` — should read `[init].mission-type` from toml, `model` — needs toml fallback, `profile` — needs toml fallback
- [ ] `agentic-lib-schedule.yml`: `frequency` — needs toml fallback (W5), `model` ✓, `profile` — needs toml fallback
- [ ] `test.yml` params: `model` ✓ (reads toml)
- [ ] `agentic-lib-test.yml`: check all params

### W7: Merge GETTING-STARTED.md into seed README
**Files**: `src/seeds/zero-README.md`
**Changes**: Incorporate from `repository0/GETTING-STARTED.md`:
- Three-step getting started flow (create repo, write mission, enable Copilot)
- Full mission table (18 built-in missions + new "random" and "generate")
- Init CLI and workflow dispatch instructions
- Update defaults to reflect: fizz-buzz default, schedule off, profile max, gpt-5-mini
- Remove outdated Configuration section pointing to `.github/agentic-lib/agents/agentic-lib.yml`
- Replace with `agentic-lib.toml` configuration reference
- Add init workflow dispatch instructions alongside CLI
- Include how to initialise using both the init workflow and CLI:
  ```bash
  # CLI
  npx @xn-intenton-z2a/agentic-lib init --purge --mission 7-kyu-understand-fizz-buzz

  # Workflow (from GitHub Actions tab)
  # Run "agentic-lib-init" with mode=purge, mission-seed=7-kyu-understand-fizz-buzz
  ```

### W8: Remove claude-sonnet-4 from test.yml model options
**Files**: `.github/workflows/test.yml`
**Change**: Remove `claude-sonnet-4` from the model choice list (line 86). Ensure no test job references or uses it.

### W9: Init purge by default
**Files**: `bin/agentic-lib.js`, `.github/workflows/agentic-lib-init.yml`
**Changes**:
- CLI: Change default mode from `update` to `purge`
- Workflow `workflow_call` default: `"update"` → `"purge"`
- Workflow `workflow_dispatch` default: `"update"` → `"purge"`

### W10: Preserve TOML values through purge
**Files**: `bin/agentic-lib.js` (initPurge function, around line 737)
**Changes**: Before overwriting `agentic-lib.toml` with seed version:
1. Read existing `agentic-lib.toml` if it exists
2. Save values for: `[schedule].supervisor`, `[schedule].focus`, `[tuning].model`, `[tuning].profile`, `[mission-complete].*`, `[init].*`, `[limits].*` (any explicit overrides)
3. Run the normal seed copy (which overwrites with `#@dist`-transformed toml)
4. Re-apply the saved values into the new toml

This ensures custom tuning survives purge.

### W11: New mission type "random"
**Files**: `bin/agentic-lib.js`, `.github/workflows/agentic-lib-init.yml`
**Changes**:
- Add `"random"` to mission-seed options in both workflow and CLI
- In CLI `initPurge()`: if mission is `"random"`, list `src/seeds/missions/`, pick one at random, copy it as MISSION.md
- Write `mission-type = "random"` to `[init]` section of `agentic-lib.toml`
- Write `mission = "<actual-selected-mission>"` to `[init]` section
- On next purge, if toml says `mission-type = "random"`, re-randomise (don't repeat the same)

### W12: New mission type "generate"
**Files**: `bin/agentic-lib.js`, `.github/workflows/agentic-lib-init.yml`
**Changes**:
- Add `"generate"` to mission-seed options
- In CLI: if mission is `"generate"`:
  1. Read a sample of existing missions for structure/range reference
  2. Call the LLM via the existing `runCopilotSession()` infrastructure (same code path as `transform`, `iterate`, etc. — see `bin/agentic-lib.js:291` which imports `../src/copilot/copilot-session.js`)
  3. The session gets a prompt with: mission template structure, difficulty range (8-kyu to 2-dan), list of existing mission topics (to avoid duplication), instruction to create 5-10 acceptance criteria as checkboxes
  4. Session uses `write_file` tool to write `MISSION.md`
  5. Write `mission-type = "generate"` to `[init]` section of `agentic-lib.toml`
- In workflow: `COPILOT_GITHUB_TOKEN` is available. In CLI: user must have the same token configured (same as for `iterate` and `transform` commands)

### W13: Externalise acceptance criteria threshold (per-mission, independent of profile)
**Files**: `agentic-lib.toml`, `src/copilot/config.js`, `src/actions/agentic-step/tasks/direct.js`
**Changes**:
- Add to `[mission-complete]` in `agentic-lib.toml`:
  ```toml
  acceptance-criteria-threshold = 50    # percentage of acceptance criteria that must be met (0-100)
  ```
- This is set per-mission by the init process based on mission difficulty:

  | Mission difficulty | Threshold |
  |-------------------|-----------|
  | 8-kyu (trivial) | 100 |
  | 7-kyu (simple) | 75 |
  | 6-kyu (moderate) | 60 |
  | 5-kyu (harder) | 50 |
  | 4-kyu (complex) | 50 |
  | 3-kyu (advanced) | 40 |
  | 2-kyu (expert) | 35 |
  | 1-kyu / dan | 30 |

- **Independently**, profile also has an `acceptance-criteria-threshold` in `[profiles.*]`. These are **separate knobs** — the mission threshold and profile threshold are both available in the config. The director evaluates against the mission-specific one from `[mission-complete]`. The profile value serves as a default when no mission-specific value is set.

- In `config.js`: read `mc["acceptance-criteria-threshold"]`, fall back to profile value, fall back to `50`
- In `direct.js:85`: replace `acceptance.met > acceptance.total / 2` with:
  ```js
  const threshold = thresholds.acceptanceCriteriaThreshold ?? 50;
  const acceptanceMet = acceptance.total > 0 && (acceptance.met / acceptance.total * 100) >= threshold;
  ```

### W14: Externalise remaining mission-complete criteria
**Files**: `agentic-lib.toml`, `src/copilot/config.js`, `src/actions/agentic-step/tasks/direct.js`, `src/copilot/telemetry.js`
**Changes**:

Add to `[mission-complete]`:
```toml
min-cumulative-transforms = 1      # minimum transform cycles completed
require-no-open-issues = true      # all issues must be closed
require-no-open-prs = true         # all PRs must be merged/closed
require-no-critical-gaps = true    # no critical implementation gaps
```

Add profile variations for range-appropriate values:
```toml
# [profiles.min]
min-resolved-issues = 1
min-cumulative-transforms = 1
max-source-todos = 2
acceptance-criteria-threshold = 30

# [profiles.med]
min-resolved-issues = 2
min-cumulative-transforms = 1
max-source-todos = 1
acceptance-criteria-threshold = 50

# [profiles.max]
min-resolved-issues = 3
min-cumulative-transforms = 2
max-source-todos = 0
acceptance-criteria-threshold = 75
```

Fix config divergence: `config.js:267` defaults `minResolvedIssues` to `3` — this should fall back to the active profile's value, not a hardcoded `3`.

Update `direct.js` `buildMetricAssessment()` to read all thresholds from config instead of hardcoding. Also update `telemetry.js:115-116` which has the same `minResolvedIssues ?? 3` fallback.

### W15: Post-transform npm install
**Files**: `agentic-lib-workflow.yml`, `src/actions/agentic-step/tasks/transform.js`, `bin/agentic-lib.js`
**Changes**:

The Copilot SDK session can edit `package.json` (add/remove deps) but cannot run `npm install`. This causes lockfile desync. Fix by running `npm install` as a post-transform step.

**In workflow** (`agentic-lib-workflow.yml`):
- After the `dev` job completes file changes and before the commit-if-changed step, add:
  ```yaml
  - name: Sync lockfile if package.json changed
    run: |
      if git diff --name-only HEAD | grep -q 'package.json'; then
        npm install --package-lock-only
        git add package-lock.json
      fi
  ```

**In CLI** (`bin/agentic-lib.js`):
- After `runCopilotSession()` returns for `transform` and `iterate`, check if `package.json` was modified and run `npm install --package-lock-only` if so.

**In agentic-step action** (`transform.js`):
- Register a post-transform hook that checks for `package.json` changes and runs `npm install`. This can use the existing `run_command` tool within the Copilot session, or be a step after the session completes.

**Also apply in**:
- `fix-code.js` — fix-code may also modify deps
- `post-commit-test` step — verify lockfile sync before running tests
- `maintain-features.js` and `maintain-library.js` — these don't typically modify deps, but should be guarded defensively

### W16: Focus parameter (mission vs maintenance)
**Files**: `agentic-lib.toml`, `src/copilot/config.js`, `agentic-lib-schedule.yml`, all task handlers in `src/actions/agentic-step/tasks/`, agent prompts in `src/agents/`
**Changes**:

Add to `[schedule]` in `agentic-lib.toml`:
```toml
focus = "mission"                 # mission | maintenance
```

**Config loading** (`config.js`): Parse `toml.schedule.focus` with default `"mission"`.

**Schedule workflow** (`agentic-lib-schedule.yml`):
- Add `focus` as an input parameter (optional, default `""`)
- When `frequency` is set to `maintenance`, automatically set `focus = "maintenance"` (preserving current behaviour)
- Otherwise, honour the explicit `focus` input, or fall back to toml value
- Write `focus` to `agentic-lib.toml` alongside `supervisor`

**Task handlers** — add focus awareness to all LLM prompts:
- `transform.js`: When `focus = "mission"`, prompt says "Work toward completing the mission. Implement missing capabilities, resolve gaps." When `focus = "maintenance"`, prompt says "The mission is substantially complete. Focus on adding value: improve test coverage, refactor for clarity, improve documentation, optimise performance. Do not create new feature issues or push for mission-complete."
- `direct.js`: When `focus = "maintenance"`, the director should not declare mission-complete or mission-failed. Instead, it should dispatch maintenance work.
- `maintain-features.js`: When `focus = "maintenance"`, generate maintenance-oriented features (refactoring, coverage, docs) rather than mission-gap features.
- `supervise.js`: When `focus = "maintenance"`, supervisor dispatches maintain and fix-code rather than transform cycles.

**Agent guidance** (`src/agents/*.md`): Add a paragraph about focus mode to each agent prompt file explaining:
- `mission` focus: advance toward mission completion, create issues from gaps, declare complete when criteria met
- `maintenance` focus: the mission is substantially done; explore how to add value to the existing codebase — refactoring, test coverage, documentation, performance, dependency updates

### W17: Structured acceptance criteria tracking
**Files**: `agentic-lib.toml`, `src/actions/agentic-step/tasks/implementation-review.js`, `src/copilot/telemetry.js`, `src/actions/agentic-step/tasks/direct.js`, `bin/agentic-lib.js` (init)
**Changes**:

**Init generates the checklist** (`bin/agentic-lib.js` initPurge):
After writing MISSION.md, parse its `- [ ]` checkboxes and generate an `[acceptance-criteria]` section in `agentic-lib.toml`:
```toml
[acceptance-criteria]
# Auto-generated from MISSION.md on init. Updated by implementation-review.
total = 8
1 = { text = "fizzBuzz(15) returns the correct 15-element array ending with FizzBuzz", met = false }
2 = { text = "fizzBuzzSingle(3) returns Fizz", met = false }
3 = { text = "fizzBuzzSingle(5) returns Buzz", met = false }
4 = { text = "fizzBuzzSingle(15) returns FizzBuzz", met = false }
5 = { text = "fizzBuzzSingle(7) returns 7", met = false }
6 = { text = "fizzBuzz(0) returns []", met = false }
7 = { text = "All unit tests pass", met = false }
8 = { text = "README documents usage with examples", met = false }
```

**Implementation-review updates by index** (`implementation-review.js:186-210`):
- The LLM tool `submit_review` gains a new parameter: `acceptanceCriteriaMetIndices` (array of integers)
- The prompt tells the LLM: "Here are the indexed acceptance criteria: 1. fizzBuzz(15)... 2. fizzBuzzSingle(3)... Return the indices of criteria you have verified are met."
- The handler updates `agentic-lib.toml` entries by index — no regex matching needed
- Also updates MISSION.md checkboxes for human readability (best-effort, not critical)

**Telemetry reads the TOML** (`telemetry.js:72-80`):
- `countAcceptanceCriteria()` reads from `agentic-lib.toml` `[acceptance-criteria]` as primary source
- Falls back to MISSION.md checkbox counting if TOML section doesn't exist (backwards compatibility)

**Director uses the TOML** (`direct.js:82-85`):
- Reads TOML acceptance criteria for the mechanical check
- Prompt still includes MISSION.md text for the LLM's qualitative assessment

### W18: Distinct maintain commit messages
**Files**: `agentic-lib-workflow.yml`, `src/actions/agentic-step/tasks/maintain-features.js`, `src/actions/agentic-step/tasks/maintain-library.js`
**Changes**:

**Task handlers return health info**:
- After the maintain task completes, run `npm test` (or read the most recent test result) to get pass/fail counts
- Return as part of the task result: `{ testsPassing: 28, testsFailing: 0, healthStatus: 'healthy' }`
- Health status: `healthy` (0 failures), `unstable` (some failures), `broken` (all failures or npm ci fails)

**Workflow constructs descriptive commit message**:
```yaml
commit-message: "maintain(features+library): ${{ steps.maintain.outputs.test-summary }}"
```

Example messages (primary action left-most):
```
maintain(features+library): 28 tests passing, 0 failures [healthy]
maintain(features+library): 28 tests passing, 2 failures [unstable]
maintain(features): 0 tests run [no test changes]
maintain(library): lockfile sync required [unhealthy]
```

The key insight: the **action** is first (`maintain(...)`), then the **status**. This makes `git log --oneline` immediately informative about CI health progression.

**Implementation note — npm ci failure handling**: The health check runs `npm ci && npm test` to get pass/fail counts. If the lockfile is desynced (the exact scenario from FINDING-3), `npm ci` will fail before `npm test` even runs. The commit message logic **must catch this explicitly** and report `[broken: npm ci failed]` rather than silently falling back to the old generic message or omitting health info. The try/catch should distinguish between: (a) `npm ci` failure → `[broken: npm ci failed]`, (b) `npm test` failure with counts → `[unstable: N failures]`, (c) `npm test` success → `[healthy]`. This is the whole point of W18 — making CI breakage visible from `git log` — so swallowing the error would defeat the purpose.

### W19: Review-issues batch timeout guard and configurable cap
**Files**: `src/actions/agentic-step/tasks/review-issue.js`, `agentic-lib.toml`, `src/copilot/config.js`, `.github/workflows/agentic-lib-workflow.yml`
**Changes**:

**Symptom**: The `review-features` job fails in ~45% of Phase 3 workflow runs with `The action 'Review issues' has timed out after 10 minutes`.

**Root cause**: `review-issue.js:241` batch-reviews up to 3 issues sequentially. Each review creates a Copilot session (timeout=480s) taking 2–5 minutes. With 3 issues at average 3.5 min each = 10.5 min, just over the 10-minute step timeout.

| Run ID | Issues | #1 | #2 | #3 | Total | Result |
|--------|--------|-----|-----|-----|-------|--------|
| 23345655168 | 3 (#8,#13,#15) | 2.2m | 3.2m | 3.0m | **8.4m** | SUCCESS (barely) |
| 23344363466 | 3 (#8,#13,#15) | 3.5m | 3.7m | killed@2.8m | **10.0m** | TIMEOUT |
| 23354425213 | 2 (#26,#30) | 4.0m | 2.0m | — | **6.0m** | SUCCESS |
| 23355097220 | 3 (#26,#30,#33) | 4.6m | 5.1m | killed@0.25m | **10.0m** | TIMEOUT |

**Pattern**: 2 issues always succeed (~6 min). 3 issues succeed only when individual reviews are fast. Not flaky — it's a race between batch size and timeout.

**Fix 1: Remaining-time guard** (`review-issue.js:251`):
Before starting the Nth review in the batch loop, check elapsed time. Skip remaining issues if < 4 minutes remain. This preserves work already done on earlier issues instead of losing everything to a timeout.

```javascript
const batchStart = Date.now();
const STEP_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes (matches workflow step timeout)
const MIN_REMAINING_MS = 4 * 60 * 1000; // need at least 4 min for a review

for (const num of issueNumbers) {
  const elapsed = Date.now() - batchStart;
  if (elapsed + MIN_REMAINING_MS > STEP_TIMEOUT_MS) {
    core.warning(`Skipping issue #${num} — only ${Math.round((STEP_TIMEOUT_MS - elapsed) / 1000)}s remaining (need ${MIN_REMAINING_MS / 1000}s)`);
    break;
  }
  // ... existing reviewSingleIssue call
}
```

**Fix 2: Configurable review-issues cap** (`agentic-lib.toml`):
Add `review-issues-cap` to `[limits]` and each profile:

```toml
[limits]
# review-issues-cap = 3           # max issues reviewed per batch (per workflow run)

[profiles.min]
review-issues-cap = 2              # conservative — fits in 10 min with margin

[profiles.med]
review-issues-cap = 3              # standard

[profiles.max]
review-issues-cap = 4              # thorough — may need step timeout increase
```

In `config.js`: read `limits["review-issues-cap"]` with profile resolution, default `3`.

In `review-issue.js:241`: replace hardcoded `3`:
```javascript
const reviewCap = config.limits?.reviewIssuesCap ?? 3;
const issueNumbers = await findUnreviewedIssues(octokit, repo, reviewCap);
```

The 10-minute step timeout stays as-is. The remaining-time guard (Fix 1) ensures we work within it gracefully — reviewing as many issues as time permits and preserving completed work.

---

## Implementation Order

| # | Work Item | Priority | Dependencies | Complexity | Theme |
|---|-----------|----------|--------------|------------|-------|
| 1 | W1: Seed mission → fizz-buzz | HIGH | None | Trivial | Seed defaults |
| 2 | W2: Seed TOML defaults (off, gpt-5-mini, max) | HIGH | None | Low | Seed defaults |
| 3 | W3: Remove scheduled triggers from dist workflows | HIGH | None | Low | Seed defaults |
| 4 | W8: Remove claude-sonnet-4 from test.yml | HIGH | None | Trivial | Seed defaults |
| 5 | W9: Init purge by default | HIGH | None | Low | Seed defaults |
| 6 | W10: Preserve TOML values through purge | HIGH | W2 | Medium | Seed defaults |
| 7 | W15: Post-transform npm install | HIGH | None | Medium | B016 fixes |
| 8 | W5: Schedule reads TOML defaults | MEDIUM | W2 | Low | Schedule |
| 9 | W6: Params job audit | MEDIUM | W5 | Medium | Schedule |
| 10 | W4: Proportional schedules across init/test | MEDIUM | W3 | Medium | Schedule |
| 11 | W16: Focus parameter (mission/maintenance) | MEDIUM | None | Medium | B016 fixes |
| 12 | W13: Externalise acceptance threshold | MEDIUM | None | Medium | Thresholds |
| 13 | W14: Externalise all mission-complete criteria | MEDIUM | W13 | Medium | Thresholds |
| 14 | W17: Structured acceptance criteria tracking | MEDIUM | W13 | High | B016 fixes |
| 15 | W19: Review-issues batch timeout guard + cap | MEDIUM | None | Low | B016 fixes |
| 16 | W18: Distinct maintain commit messages | LOW | None | Low | B016 fixes |
| 17 | W7: Merge GETTING-STARTED into seed README | LOW | W1,W2,W9,W11,W12 | Medium | Docs |
| 18 | W11: Random mission type | LOW | W10 | Medium | Mission |
| 19 | W12: Generate mission type | LOW | W11 | High | Mission |

---

## Summary

19 work items across 5 themes:
- **Seed defaults** (W1–W3, W8–W10): Out-of-box experience — fizz-buzz mission, schedule off, gpt-5-mini, max profile, purge by default, no active crons, TOML values survive purge
- **Schedule intelligence** (W4–W6): Proportional crons for init/test/workflow, TOML-driven defaults, consistent params normalisation
- **Mission flexibility** (W7, W11, W12): Random and generated missions, merged getting-started guide
- **Threshold externalisation** (W13, W14): Acceptance criteria threshold per-mission (independent of profile), all mission-complete criteria configurable via toml with profile defaults
- **Benchmark 016 fixes** (W15–W19): Post-transform lockfile sync, focus parameter for mission vs maintenance mode, structured TOML acceptance criteria tracking, descriptive maintain commit messages, review-issues batch timeout guard with configurable cap
