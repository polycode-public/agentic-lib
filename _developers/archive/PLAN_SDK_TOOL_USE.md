# Plan: SDK Tool Loop Improvements

## User Assertions

- The system is designed for non-interactive execution — primarily from GitHub Actions workflows
- The CLI is for observing what happens in the actions close up, not a different path with interactive execution
- The GitHub runner IS the sandbox
- All 3 improvements below are approved directions

## Progress Summary (2026-03-13)

### DONE — Phase A: Fixes

All three fixes are implemented and committed on `claude/sdk-tool-improvements`:

1. **Fix 4: Centralise log config** ✅
   - Added `log-branch`, `screenshot-file` to `agentic-lib.toml` `[bot]` section
   - Updated `src/copilot/config.js` to expose `logBranch`, `screenshotFile`
   - Updated `agentic-lib-workflow.yml` params job to extract and output log config
   - All ~30 hardcoded log references in workflows replaced with config-driven values
   - Updated `push-to-logs.sh` to read `LOG_BRANCH` from env
   - Updated `agentic-lib-test.yml` screenshot push step

2. **Fix 6: Single log file** ✅
   - `logging.js` now creates ASCII fallback copy (`intention.md`) automatically
   - Workflow push-to-logs invocations simplified to use config value

3. **Fix 5: Discussion tools** ✅
   - Created `src/copilot/github-tools.js` with 3 factories:
     - `createDiscussionTools()` → 4 tools: fetch_discussion, list_discussions, post_discussion_comment, search_discussions
     - `createGitHubTools()` → 8 tools: create_issue, close_issue, label_issue, dispatch_workflow, list_issues, list_prs, get_issue, comment_on_issue
     - `createGitTools()` → 2 tools: git_diff, git_status
   - `discussions.js` migrated to `runCopilotSession` with `report_action` tool (replaces `[ACTION:]` text tags)

### DONE — Phase B: Core improvements (items 4-10)

4. **GitHub API tools added** ✅ — in `src/copilot/github-tools.js`
5. **Switched to `systemMessage.mode: "append"`** ✅ — with `overridesBuiltInTool: true` on all custom tools
6. **Transform handler migrated** ✅ — lean prompt with file listing summaries + attachments
7. **`excludedTools` per task type** ✅ — each handler excludes inappropriate tools
8. **`modifiedResult` and `additionalContext` in hooks** ✅ — read_file truncation at 20K chars, test failure guidance
9. **Hook-based truncation replaces `contentLimit`** ✅ — no more front-loaded content
10. **8 of 10 task handlers migrated** ✅ — transform, discussions, resolve-issue, fix-code, maintain-features, maintain-library, review-issue, enhance-issue all use `runCopilotSession`

### DONE — Remaining Phase B

11. **Simplify tuning parameters** ✅ — After migrating supervise.js and direct.js, confirmed that prompt-sizing params (`sourceScan`, `sourceContent`, `featuresScan`, `issueBodyLimit`, `documentSummary`, `testContent`) are only used by the MCP context path (`src/copilot/context.js`). `issuesScan` is shared (supervise.js + MCP). Added clarifying comments in `config.js`.
12. **Migrate supervise.js** ✅ — Rewrote to use `runCopilotSession` with `report_supervisor_plan` tool (handler executes actions via existing `executeAction`), lean prompt with counts/metrics, `createTools` factory with GitHub/discussion/git tools, `excludedTools: ["write_file", "run_command", "run_tests"]`, text-parsing fallback for backward compatibility. All 28 tests pass.
13. **Migrate direct.js** ✅ — Rewrote to use `runCopilotSession` with `report_director_decision` tool (captures decision/reason/analysis), lean prompt with counts/metrics, `createTools` factory with GitHub/git tools, `excludedTools: ["write_file", "run_command", "run_tests"]`, text-parsing fallback.

### DONE — Phase E: Agent Prompts & Website (user request 2026-03-13)

22. **Update agent prompts with context-gathering guidance** ✅
    - All 10 agent prompts (`src/agents/*.md`) updated with tailored "Context Gathering" sections
    - Code agents (issue-resolution, apply-fix, iterate): Check intentïon.md for past failures, search discussions for requirements, review closed issues to avoid repeating mistakes
    - Review agents (review-issue): Check intentïon.md for issues that were previously closed then re-opened, search discussions for user expectations
    - Maintenance agents (maintain-features, maintain-library): Check discussions for user requests, intentïon.md for implementation patterns
    - Discussion bot: Added "Narrative Awareness" section — reference recent progress, acknowledge setbacks, connect requests to history
    - Supervisor: Added "Trend Analysis" section — iteration trends, recurring failures, budget trajectory, mission progress
    - Director: Added context gathering for intentïon.md trends, discussions, and git history verification
    - Discovery: Check discussions and intentïon.md for project history before proposing missions
23. **MISSION.md lightbox on xn--intenton-z2a.com** ✅
    - Added clickable mission link at top of page
    - Fetches MISSION.md from repository0 main branch via raw.githubusercontent.com
    - Displays in a lightbox with website link and GitHub link (directly to MISSION.md)
    - Moved a/b/c steps block to bottom of window

### NOT DONE — Phase C: Polish

14. **Use `session.abort()` for budget exhaustion** instead of deny-in-hook
15. **Use `client.listModels()` for dynamic reasoning effort** detection
16. ~~**Update agent prompts** in `src/agents/` to reference the new tools~~ — Done in Phase E (item 22)
17. **Deprecate `runCopilotTask`** ✅ — All task handlers migrated. Added `@deprecated` JSDoc tag to `runCopilotTask` in `session.js`. Only retained for spike script.

### DONE — Phase D: Observability & Purge (user request 2026-03-13)

18. **Init purge: reset images with seed** ✅ — Added `zero-SCREENSHOT_INDEX.png` to `SEED_MAP` in `initPurge()` in `bin/agentic-lib.js`
19. **Make intentïon.md and SCREENSHOT_INDEX.png available to all LLM task handlers** ✅
    - All 4 "Fetch log from log branch" workflow steps now also fetch SCREENSHOT_FILE
    - `index.js` resolves `logFilePath` and `screenshotFilePath` from config and passes them in the context
    - All 8 migrated task handlers destructure these from context and pass them as `attachments` to `runCopilotSession`
    - Files are gitignored at root level (already in `zero-.gitignore` seed)
20. **Update xn--intenton-z2a.com** ✅ — Already reads from `agentic-lib-logs` branch (no changes needed)
21. **Add link in vt100 emulator** ✅ — Added `#terminal-link` element in top-left of terminal container, links to `intentïon.md` on the logs branch, opens in new tab

### Test Status

All 577 tests pass (33 test files). All 10 task handler tests mock `runCopilotSession` (none use `runCopilotTask`).

## Current Architecture

### Two integration patterns for the same Copilot SDK tool loop

**Pattern 1: `runCopilotTask`** (src/copilot/session.js — DEPRECATED)

- Front-loaded prompts with all context in the prompt text
- No hooks, no budget control, basic event logging for token counts
- 4 tools: read_file, write_file, list_files, run_command
- All task handlers migrated — retained only for spike script

**Pattern 2: `runCopilotSession`** (src/copilot/copilot-session.js, used by all 10 task handlers + CLI + MCP)

- Single persistent session with SDK hooks for observability
- `onPreToolUse` — logs every tool call with timing, enforces tool-call budget
- `onPostToolUse` — tracks files written, detects test pass/fail, truncates large reads, injects guidance
- `onErrorOccurred` — error recovery with retry
- Standard tools (read_file, write_file, list_files, run_command, run_tests) + custom tools via `createTools`
- `excludedTools` per task type, `attachments` for SDK-native context
- `systemMessage.mode: "append"` with `overridesBuiltInTool: true`
- Lean prompts: file listing summaries (names + sizes), model explores via tools

### Key files

| File | Status | Purpose |
|------|--------|---------|
| `src/copilot/copilot-session.js` | Updated | Core session runner with hooks, createTools, excludedTools, attachments |
| `src/copilot/github-tools.js` | NEW | Discussion tools, GitHub API tools, git tools (3 factory functions) |
| `src/copilot/tools.js` | Updated | Standard agent tools with overridesBuiltInTool |
| `src/copilot/config.js` | Updated | Exposes logBranch, screenshotFile from [bot] config |
| `src/copilot/session.js` | Deprecated | runCopilotTask — @deprecated, no task handlers use it |
| `src/actions/agentic-step/tasks/*.js` | Updated | All 10 handlers migrated to runCopilotSession |
| `agentic-lib.toml` | Updated | [bot] section with log-branch, screenshot-file |
| `.github/workflows/agentic-lib-workflow.yml` | Updated | Config-driven log references |

## Risk Assessment

- **More tool-call round trips** — lean prompts mean more read_file calls. This costs more API calls but uses less context window. Net token usage may be similar or lower.
- **Model exploration quality** — the model must know what to read. The file listing in the prompt serves as a roadmap. If the model reads irrelevant files, it wastes budget.
- **`"append"` mode interactions** — switching from `"replace"` to `"append"` changes the system prompt foundation. Needs testing with each agent type.
- **`attachments` behaviour** — how the SDK handles directory attachments needs testing with large repos.
- **Text-parsing fallback** — supervise.js and direct.js retain text-parsing (`parseActions`, `parseDirectorResponse`) as fallback when the model doesn't call the reporting tool. The workflow YAML still handles supervisor text-parsing for dispatch.
- **Discussion tool migration** — bot now uses `report_action` tool instead of `[ACTION:]` tags. The bot workflow's dispatch-supervisor job logic may need updating.
