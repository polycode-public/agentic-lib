# PLAN: Context Quality — Clean, Compress, then Limit

## User Assertions (non-negotiable)

- The current tuning limits use dumb truncation (substring/slice) — this wastes tokens on noise and loses valuable content
- We need a "clean → compress → limit" pipeline instead of "limit → hope for the best"
- `transformation-budget` is dead config — wire it up or remove it
- `source-content` is raw file substring truncation, not a summary — this is the highest-impact problem
- Source files are selected by filesystem order, not relevance — fix this

## Problem Statement

Every tuning parameter currently applies a blind truncation:

| Parameter | Mechanism | Problem |
|---|---|---|
| `source-content` | `.substring(0, N)` per file | Cuts mid-function. At 1000 chars you see imports + one function. At 5000 you get ~40% of a typical file. |
| `source-scan` | `.slice(0, N)` on `readdirSync` | Filesystem order. `z-utils.js` excluded in favour of `a-constants.js`. No relevance ranking. |
| `features-scan` | `.slice(0, N)` on `readdirSync` | Same. No priority by status, recency, or relevance. |
| `document-summary` | `.substring(0, N)` | Named "summary" but is a prefix chop. Loses structure. |
| `issues-scan` | GitHub API `per_page` + `.slice()` | Includes stale/bot issues. No dedup, no relevance. |
| `discussion-comments` | GraphQL `last: N` | Reasonable — already filters human vs bot post-fetch. Best of the lot. |
| `transformation-budget` | **Not implemented** | Config exists, never read by any handler. |

The net effect: the LLM receives a prompt stuffed with imports, license headers, bot noise, and stale issues — then the actually-useful content gets truncated away.

- When the workflow detects mission complete, it must persist a signal (`MISSION_COMPLETE.md`) that subsequent invocations can check WITHOUT an LLM call
- After mission complete, only budget-free actions are allowed (review, discuss, pr-cleanup) — NO transforms, fix-code, or maintain
- `maintain` (features + library) consumes transformation budget — it's LLM-driven content generation
- `init` (reseed or purge) clears the mission-complete signal
- The `[limits]` section values should vary with tuning profile

## Design Principles

1. **Clean first** — strip noise that has zero information value (headers, blank lines, bot comments)
2. **Compress second** — represent content structurally when full content isn't needed
3. **Limit last** — apply the budget cap to already-clean, already-compressed content
4. **Relevance over order** — sort by recency, activity, or task relevance, not alphabet

## Tier 1: Clean (no LLM needed, low effort, high impact)

### T1.1 — Source file noise stripping

In `scanDirectory()` (`copilot.js:223`), before applying `contentLimit`:

- Strip SPDX/license header blocks (lines starting with `// SPDX`, `// Copyright`, or `/* ... */` block at top)
- Collapse runs of blank lines to single blank line
- Strip `// eslint-disable` and similar linter directives

This is cheap string processing. A 5000-char file might drop to 4200 chars — not huge, but it means the limit captures more real code.

**Implementation:** Add a `cleanSource(raw)` function in `copilot.js`, called before `substring()`.

### T1.2 — Source file ordering by recency

In `scanDirectory()`, sort files by modification time (most recent first) instead of filesystem order.

When the LLM is transforming code, the most recently changed files are most likely relevant to the current task. `fs.statSync(f).mtimeMs` is cheap.

**Implementation:** After `readdirSync`, `sort((a, b) => stat(b).mtimeMs - stat(a).mtimeMs)` before `slice()`.

### T1.3 — Issue noise filtering

In `transform.js` and `supervise.js`, after fetching issues:

- Filter out issues with only bot-generated labels (e.g., `automated`, `stale`)
- Filter out issues with no activity in >30 days (configurable)
- Strip bot-generated comments from issue bodies before including
- Include only: `#number`, `title`, `labels`, `last human comment (first 200 chars)`

**Implementation:** Add `filterIssues(issues, options)` in `copilot.js`.

### T1.4 — Feature file ordering by status

Sort feature files so incomplete/active features appear first:

- Files containing `- [ ]` (unchecked items) sort before fully-checked files
- Within each group, sort by modification time

**Implementation:** In `scanDirectory` or a wrapper, read first 500 chars to check for `- [ ]`.

### T1.5 — Wire up `transformation-budget`

Track transformation count per workflow run. When the budget is consumed:

1. **`agentic-lib-workflow.yml` must error** — the workflow step should exit with a non-zero code so the run shows as failed. This makes budget exhaustion visible in the Actions UI and prevents silent over-spend.
2. **The bot (supervisor) checks the budget before invoking transform** — if the budget is consumed, the supervisor does NOT dispatch another transform. It can still respond to discussions and issues with the extra context that the transformation budget has been consumed (e.g., "Transformation budget exhausted for this run — no further code changes will be made").
3. **Log each transformation against the budget** — `[budget] transformation 3/8 used` so the intentïon log shows the countdown.

**Implementation:**
- Add a `transformationCount` counter in the workflow or pass it as state between steps
- In `supervise.js`: read current count, compare to `transformation-budget`, skip transform dispatch if exhausted but include budget status in supervisor prompt
- In `agentic-lib-workflow.yml`: check exit status and fail the step if budget exceeded
- Log budget status to intentïon.log on each transformation

### T1.6 — Mission-complete signal (skip LLM on subsequent runs)

**Problem:** Currently every workflow run pays LLM tokens to re-discover the mission is already complete. The `transform.js` prompt says "if the mission is satisfied, make no file changes" — but the LLM still runs, still burns tokens, and still has to re-evaluate from scratch.

**Signal file:** `MISSION_COMPLETE.md` in the project root. Visible, human-readable, markdown:

```markdown
# Mission Complete

- **Timestamp:** 2026-03-06T14:30:00Z
- **Detected by:** transform
- **Reason:** All acceptance criteria satisfied, all issues resolved

This file was created automatically. To restart transformations, delete this file or run `npx @xn-intenton-z2a/agentic-lib init --reseed`.
```

**How the signal gets set:**

1. **`transform` task** — when the LLM returns `outcome: "nop"` with details indicating mission satisfaction, write `MISSION_COMPLETE.md`
2. **`discussions` task** — when the bot returns `[ACTION:mission-complete]`, write `MISSION_COMPLETE.md`
3. **`supervise` task** — the supervisor can also set it via a new action: `mission-complete | reason: <text>`

**How the signal is checked (NO LLM needed):**

In `agentic-lib-workflow.yml`, early in jobs that consume transformation budget:

```yaml
- name: Check mission-complete signal
  id: mission-check
  run: |
    if [ -f MISSION_COMPLETE.md ]; then
      echo "mission-complete=true" >> $GITHUB_OUTPUT
      echo "Mission is complete — skipping budget-consuming tasks"
      cat MISSION_COMPLETE.md
    else
      echo "mission-complete=false" >> $GITHUB_OUTPUT
    fi
```

Then gate the budget-consuming steps:

```yaml
- name: Run transformation
  if: steps.mission-check.outputs.mission-complete != 'true' && ...
```

**What still runs after mission complete (budget-free):**

| Job | Runs? | Reason |
|---|---|---|
| `pr-cleanup` | Yes | No LLM, just merge/close stale PRs |
| `telemetry` | Yes | No LLM, just gather repo state |
| `supervisor` | Yes | LLM, but coordination only — told mission is complete |
| `review-features` | Yes | LLM, but reviews/closes issues, no code changes |
| `maintain` | **No** | Consumes transformation budget (LLM-driven content generation) |
| `dev` (transform) | **No** | Consumes transformation budget |
| `fix-stuck` (fix-code) | **No** | Consumes transformation budget |

**What the supervisor sees:**

The supervisor prompt gets extra context:

```
### Mission Status: COMPLETE
The mission was declared complete on 2026-03-06T14:30:00Z.
Transformation budget is frozen — no transform, maintain, or fix-code dispatches allowed.
You may still: review/close issues, respond to discussions, adjust schedule.
```

This lets the supervisor wind down gracefully — e.g., `set-schedule:weekly` or `set-schedule:off`.

**How init clears the signal:**

In `initReseed()` (`bin/agentic-lib.js:796`), add:

```javascript
removeFile(resolve(target, "MISSION_COMPLETE.md"), "MISSION_COMPLETE.md");
```

This means `init --reseed` and `init --purge` both clear the signal. A new mission starts fresh.

**Edge cases:**

- **Manual override:** A human can delete `MISSION_COMPLETE.md` to restart transformations without a full init
- **Git tracking:** `MISSION_COMPLETE.md` should be committed so it persists across workflow runs (it's created on the runner, needs to be pushed). The `commit-if-changed` action will pick it up naturally.
- **False positives:** If the LLM incorrectly declares mission complete, deleting the file (manually or via init) resets it. The signal is conservative — it requires explicit declaration, not inference.

## Tier 2: Compress (moderate effort, high impact)

### T2.1 — Structural outline mode for source files

The single highest-impact change. Replace raw content with a structural outline when the full file doesn't fit in the budget.

**Outline format** (generated without an LLM, pure AST/regex parsing):

```
// file: src/lib/main.js (847 lines, 24KB)
// imports: fs, path, @actions/core, ../config.js
// exports: run, configure, VERSION
//
// function run(options) — lines 45-120
// function configure(config, overrides) — lines 122-180
// class Pipeline — lines 182-400
//   constructor(name, steps)
//   async execute(context) — lines 210-350
//   _validate(step) — lines 352-398
// const VERSION = "7.1.59"
// const DEFAULT_CONFIG = { ... } — line 402
```

This captures the full shape of a file in ~300-500 chars instead of a 5000-char prefix that cuts mid-function. The LLM can then use `defineTool()` file-read to fetch full content of files it needs.

**Strategy per file:**
- If `raw.length <= contentLimit`: include full content (current behaviour)
- If `raw.length > contentLimit`: include structural outline + first `contentLimit/2` chars of the file

**Implementation:** Add `generateOutline(raw, filePath)` in `copilot.js`. Use regex-based extraction:
- `/^import\s.+/gm` for imports
- `/^export\s+(default\s+)?(function|class|const|let|var)\s+(\w+)/gm` for exports
- `/^(export\s+)?(async\s+)?(function|class)\s+(\w+)/gm` for declarations
- `/^\s+(async\s+)?(\w+)\s*\(/gm` for class methods

This doesn't need a full AST parser — regex works for 90% of JS/TS patterns, and gracefully degrades (you just get fewer outline entries for unusual syntax).

### T2.2 — Feature summary extraction

Instead of prefix-truncating feature docs, extract structured metadata:

```
Feature: #12 — Copilot SDK Integration
Status: 8/10 items complete
Remaining: [ ] Error recovery, [ ] Token tracking
```

**Implementation:** Parse markdown for `# title`, count `- [x]` vs `- [ ]`, extract unchecked items.

### T2.3 — Issue summary compression

Instead of including full issue bodies, include:

```
#42: Fix retry logic in transform (bug, high-priority)
  Last comment (user, 2d ago): "Still failing on large repos"
```

Drop: full body text, bot comments, automated labels, milestone details.

**Implementation:** Add `summariseIssue(issue)` in `copilot.js`.

## Additional Tuning Parameters

Beyond the current parameters, these would give maximum context without confusion:

### A. `test-content` (new parameter)

Currently test files share `source-content` limit. Tests are often larger than source but less information-dense (setup/teardown boilerplate). A separate, lower limit for test files would help.

### B. `issue-body-limit` (new parameter)

Issue bodies vary wildly — some are one-liners, some have full reproduction steps and logs. A per-issue body limit (e.g., 500 chars) would prevent one verbose issue from consuming all the context.

### C. `config-include` (new boolean, default true)

The full `agentic-lib.toml` and `package.json` are included verbatim in several prompts. These are ~2-4KB each of mostly-boilerplate. A flag to exclude them (or include only the `[paths]` and `[limits]` sections) would save ~3000 chars.

### D. Enriched intentïon.log entries

The current log entry format (from `logging.js`) captures: outcome, model, tokens, duration, workflow URL, and a one-line details string. This is the minimum. Here's what we should add:

**Current format (example from live repository0):**
```markdown
## maintain-library at 2026-03-06T21:34:51.210Z

**Outcome:** library-maintained
**Model:** gpt-5-mini
**Token Count:** 64235 (in: 59461, out: 4774)
**Duration:** 75s (~1.3 GitHub Actions min)
**Workflow:** [link](link)

Maintained library (0 docs, limit 32)

---
```

**Enriched format:**
```markdown
## maintain-library at 2026-03-06T21:34:51.210Z

**Outcome:** library-maintained
**Model:** gpt-5-mini
**Profile:** recommended
**Token Count:** 64235 (in: 59461, out: 4774)
**Duration:** 75s (~1.3 GitHub Actions min)
**Workflow:** [link](link)

### What Changed
- Created `library/copilot-sdk-reference.md` (new, 2.4KB)
- Updated `library/github-actions-patterns.md` (was 1.8KB, now 2.1KB)
- Deleted `library/deprecated-api-notes.md`

### Context Notes
Maintained library from 3 sources in SOURCES.md. 2 URLs returned valid content,
1 URL returned 404 (https://example.com/old-docs) — consider removing from SOURCES.md.

### Limits Status
| Limit | Value | Capacity | Status |
|---|---|---|---|
| transformation-budget | 3/8 | 5 remaining | |
| features | 2/4 files | 2 remaining | |
| library | 3/32 docs | 29 remaining | |
| feature-issues | 1/2 open | 1 remaining | |
| maintenance-issues | 0/1 open | 1 remaining | |
| attempts-per-issue | — | — | n/a this task |
| attempts-per-branch | — | — | n/a this task |

### Prompt Budget
| Section | Size | Files | Notes |
|---|---|---|---|
| mission | 450 chars | 1 | full |
| features | 3200 chars | 2/4 | 2 outlined |
| source | 8500 chars | 6/10 | 4 full, 2 outlined |
| issues | 1200 chars | 15/20 | 3 stale filtered |
| config | 2100 chars | — | toml + package.json |
| **total** | **15450 chars** | | **~3900 tokens** |

### Closing Notes
Library approaching 0% capacity (3/32) — no concerns.
Transformation budget at 37% (3/8 used) — on track for this run.
1 source URL returned 404 — may need manual cleanup in SOURCES.md.

---
```

**Key additions:**

1. **Profile** — which tuning profile is active, so the reader knows what defaults are in play

2. **What Changed** — a diff summary listing files created, updated, deleted with sizes. Generated by comparing filesystem state before/after the task (or from the Copilot SDK tool call log). This is the most important addition — the current log says "Maintained library (0 docs, limit 32)" which tells you nothing about what actually happened.

3. **Context Notes** — english-language observations from the task. Not LLM-generated prose — structured notes about what the task encountered: how many sources were crawled, which returned errors, whether any issues were stale, whether the feature set is converging, etc. Each task handler generates these from its own data.

4. **Limits Status** — every profile-scaled limit, showing current value vs limit, remaining capacity. This is the key observability requirement: at a glance you can see which limits are being approached. Limits not relevant to the current task show "n/a".

5. **Prompt Budget** — per-section breakdown of the prompt that was sent to the LLM. Shows how context budget was allocated: how many files were included vs available, how many were outlined vs full, how many issues were filtered as stale. This makes tuning data-driven.

6. **Closing Notes** — english-language concerns about limits being approached or breached. Generated automatically from the limits status:
   - Any limit at >80% → "approaching capacity"
   - Any limit at 100% → "at capacity — actions will be blocked"
   - Any errors encountered (404s, API failures, etc.)
   - Transformation budget countdown

**Implementation:**

- Extend `logActivity()` in `logging.js` to accept new fields: `profile`, `changes`, `contextNotes`, `limitsStatus`, `promptBudget`, `closingNotes`
- Each task handler returns these alongside the existing `outcome`/`details` fields
- The `changes` list comes from either: (a) comparing file state before/after, or (b) logging tool calls to `write_file` during the Copilot SDK session
- Limits status is computed in `index.js` from `config` before calling `logActivity()`
- Closing notes are generated from limits status by a `generateClosingNotes(limitsStatus)` function

### E. `stale-issue-days` (new parameter, default 30)

Configurable threshold for T1.3 issue filtering. Issues with no activity beyond this age are excluded or deprioritised.

## Limits Section: Analysis and Profile-Based Scaling

The `[limits]` section has six values. Here's what each does and whether it should vary by profile:

| Limit | Current Value | Where Used | Verdict |
|---|---|---|---|
| `feature-issues = 2` | `resolve-issue.js:46` — WIP limit for concurrent in-progress issues | **Used, should scale with profile.** At `min` (cheap/fast), 1 concurrent issue is enough. At `max`, allow 4+ parallel issue resolution. |
| `maintenance-issues = 1` | `supervise.js:132` — shown to supervisor in prompt, but **not enforced in code** | **Partially used.** Supervisor sees it but nothing blocks based on it. Either enforce or remove. Should scale if kept. |
| `attempts-per-branch = 3` | `config-loader.js:214` — loaded but **never consumed** by any task handler | **Dead config.** The workflow uses hardcoded `maxFixAttempts: "3"` env var instead (`agentic-lib-workflow.yml:104`). Either wire it up (replace the hardcoded env var) or remove it. |
| `attempts-per-issue = 2` | `resolve-issue.js:38` — checks commit count on issue branch, returns nop if exceeded | **Used, should scale with profile.** At `min`, 1 attempt is enough (fast fail). At `max`, allow 4+ retries. |
| `features-limit = 2` | `maintain-features.js` (via `config.paths.features.limit`) — caps max feature files | **Used, should scale with profile.** At `min`, 2 features. At `recommended`, 4. At `max`, 8+. More features = more context for the LLM. |
| `library-limit = 32` | `maintain-library.js:28`, `supervise.js:30` — caps max library docs | **Used, should scale with profile.** At `min`, 8 docs. At `recommended`, 32 (current). At `max`, 64. |

### Recommended profile-based limits

```toml
[limits.profile.min]
feature-issues = 1
maintenance-issues = 1
attempts-per-branch = 2
attempts-per-issue = 1
features-limit = 2
library-limit = 8

[limits.profile.recommended]
feature-issues = 2
maintenance-issues = 1
attempts-per-branch = 3
attempts-per-issue = 2
features-limit = 4
library-limit = 32

[limits.profile.max]
feature-issues = 4
maintenance-issues = 2
attempts-per-branch = 5
attempts-per-issue = 4
features-limit = 8
library-limit = 64
```

### Action items

1. **`attempts-per-branch`**: Wire it up to replace the hardcoded `maxFixAttempts: "3"` env var in `agentic-lib-workflow.yml`. The workflow should read it from the TOML config. Scale with profile.
2. **`maintenance-issues`**: Wire it up — enforce in `maintain-features.js`/`maintain-library.js` (block if WIP limit reached, like `resolve-issue.js` does for `feature-issues`). Scale with profile.
3. **Profile resolution**: Extend the `resolveTuning()` pattern in `config-loader.js` to also resolve limits from profiles. The `[tuning]` profile already sets scan/content defaults — `[limits]` should work the same way: profile defaults with per-value overrides.
4. **All six limits scale with profile** — every limit varies by min/recommended/max.

## Cleanup: Archive Completed Plans

Six plan files are 95-100% complete. Their remaining items are either absorbed into this plan or are operational activities (not code). Archive them to reduce clutter and make the active plan set clear.

**Move to `_archive/plans/`:**

| File | Status | Remaining items |
|---|---|---|
| `PLAN_CONFLICT_RESOLUTION.md` | 100% done | — |
| `PLAN_ONE_WORKFLOW.md` | 100% done | — |
| `PLAN_PIPELINE_IMPROVEMENTS.md` | 100% done | — |
| `PLAN_MCP_SERVER.md` | 95% done | — |
| `PLAN_MISSION_SEEDS.md` | 90% done | "Done" detection → `MISSION_COMPLETE.md` (this plan). Evidence gathering → future. |
| `PLAN_V4_RESOLUTIONS.md` | 95% done | `max-iterations` → `transformation-budget` (this plan). MCP docs + multi-model testing → trivial/operational. |
| `PLAN_ITERATOR.md` | Partially done | Budget work → this plan. Iterator CLI → future. |

**Update `_developers/MODELS.md`:**
- Add reasoning-effort support column (only gpt-5-mini, o4-mini)
- Clarify two defaults: CLI defaults to `claude-sonnet-4`, TOML/workflows default to `gpt-5-mini`
- Note refresh command: `node scripts/test-copilot-local.js`

**Active plans after cleanup (5):**

| Plan | Focus |
|---|---|
| `PLAN_CONTEXT_QUALITY.md` | **This plan** — tuning, limits, logging, MISSION_COMPLETE.md |
| `PLAN_1_LOCAL_SCENARIO_TESTS.md` | Local LLM scenario testing |
| `PLAN_2_NARRATIVE.md` | Vocabulary alignment with CONCEPT.md |
| `PLAN_3_IMPLEMENTATION.md` | CONCEPT.md architecture redesign |
| `PLAN_4_SELF_HOSTED.md` | Self-hosting bootstrap tests |
| `PLAN_5_LAUNCH.md` | Go-to-market strategy |

Plus `_developers/PLAN_SUPERVISOR.md` and `_developers/PLAN_MARKETPLACE.md` as reference/future.

## Implementation Order

Recommended sequence, each independently shippable:

1. **T1.1 + T1.2** — Clean source + sort by recency. Small change in `copilot.js`, immediate improvement.
2. **T1.5 + T1.6 + D** — Wire up `transformation-budget` (maintain consumes budget too) with workflow error + supervisor check. Add `MISSION_COMPLETE.md` signal. Add prompt budget logging to intentïon.log. These three are interconnected: budget enforcement, mission gating, and observability.
3. **A + B + E + Limits** — Add `test-content`, `issue-body-limit`, `stale-issue-days` to config profiles. Move `[limits]` to profile-based resolution. Wire up or remove `attempts-per-branch` and `maintenance-issues`. Small config-loader + task handler changes.
4. **T2.1** — Structural outline mode. The biggest single improvement.
5. **T1.3 + T1.4** — Issue filtering + feature ordering. Uses `stale-issue-days` from step 3.
6. **T2.2 + T2.3** — Feature + issue compression. Natural follow-on from T2.1.
7. **C** — Config include flag. Polish — low priority.

## Files to Modify

| File | Changes |
|---|---|
| `src/actions/agentic-step/logging.js` | Enriched log entries: profile, changes list, context notes, limits status table, prompt budget table, closing notes with limit concerns |
| `src/actions/agentic-step/index.js` | Compute limits status from config, pass to `logActivity()`, snapshot filesystem before/after task for changes list |
| `src/actions/agentic-step/copilot.js` | `cleanSource()`, `generateOutline()`, `filterIssues()`, `summariseIssue()`, sort-by-mtime in `scanDirectory()` |
| `src/actions/agentic-step/tasks/transform.js` | Use new functions, track transformation count against budget, error when exhausted, return context notes + changes |
| `src/actions/agentic-step/tasks/review-issue.js` | Use new functions, separate `test-content` limit |
| `src/actions/agentic-step/tasks/supervise.js` | Check transformation budget before dispatching transform, include budget + mission-complete status in prompt, use issue filtering |
| `src/actions/agentic-step/tasks/discussions.js` | Write `MISSION_COMPLETE.md` on `[ACTION:mission-complete]` |
| `src/actions/agentic-step/tasks/maintain-features.js` | Use feature summary extraction, feature ordering |
| `src/actions/agentic-step/config-loader.js` | Add `test-content`, `issue-body-limit`, `stale-issue-days` to profiles; wire up `transformation-budget` reading |
| `agentic-lib.toml` | Add new parameters to profile reference sections |
| `.github/workflows/agentic-lib-workflow.yml` | Fail step when transformation budget exhausted; gate `dev`, `maintain`, and `fix-stuck` jobs on `MISSION_COMPLETE.md` signal; replace hardcoded `maxFixAttempts` with config value |
| `bin/agentic-lib.js` | Clear `MISSION_COMPLETE.md` in `initReseed()` |
| `tests/` | New tests for each utility function |

## Success Criteria

- At `min` profile: prompt contains useful structural information about all source files, not just imports of the first 3
- At `recommended` profile: the LLM can identify which files to modify for a given issue without tool calls for discovery
- At `max` profile: the LLM has comprehensive context without prompt bloat from noise
- `transformation-budget` is enforced: workflow errors when exhausted, supervisor checks before dispatching
- `MISSION_COMPLETE.md` signal: written when mission declared complete, checked without LLM on subsequent runs, gates `dev`, `maintain`, and `fix-stuck` jobs, cleared by `init --reseed` and `init --purge`
- `maintain` (features + library) consumes transformation budget — blocked when budget exhausted or mission complete
- Supervisor receives mission-complete and budget status in its prompt, can wind down gracefully
- `[limits]` values scale with tuning profile (min/recommended/max)
- `attempts-per-branch` is either wired up to replace hardcoded `maxFixAttempts` env var, or removed
- `maintenance-issues` is either enforced in maintain tasks, or removed
- intentïon.log contains per-section prompt budget breakdown for every task invocation
- Tuning is data-driven: users can read the log and adjust limits based on real prompt composition
- Test files use a separate `test-content` limit, not the same as source files
- Stale issues (>N days) are filtered out, configurable via `stale-issue-days`
- Issue bodies respect `issue-body-limit` — verbose issues don't consume all context
