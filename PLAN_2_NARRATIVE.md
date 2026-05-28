# PLAN: Narrative Alignment — Concrete File Renames

**Status:** Pre-implementation. Scope narrowed from broad vocabulary overhaul to concrete file renames. No renames executed yet. Codebase has advanced since plan creation (MCP server, iterate CLI, supervise task, 429 tests, TOML config).

**Prerequisite:** CONCEPT.md updated to remove dropped terminology (manufacturing table, perspectives section, machinery/record/materials/perspective vocabulary rows). PLAN_3, PLAN_4, PLAN_5 also cleaned up.

---

## Scope

Concrete file renames and code updates only. No category-level vocabulary changes. The following were explicitly dropped:

- "Machinery" (umbrella for workflows/actions/config) — use concrete names
- "Record" (umbrella for docs/logs/tests) — use concrete names
- "Materials" (umbrella for library/features/cache) — use concrete names
- "Perspectives" (how agents see) — dropped entirely, agent prompts speak for themselves
- Manufacturing metaphor table — dropped, keep only "Product"
- All feature name renames (e.g. "Discussions Bot" → ~~"Narrator Perspective"~~)
- Directory renames: agents/ stays, features/ stays, library/ stays
- File renames: agent-*.md stays
- Config key renames: intentionBot stays, intentionFilepath stays

---

## The Rename Table

| Current | New | Where |
|---|---|---|
| `MISSION.md` | `INTENTÏON.md` | repository0, all seeds, docs, config, agent prompts |
| `MISSION_COMPLETE.md` | `INTENTÏON_REALISED.md` | supervise.js, discussions.js, transform.js, maintain-features.js, maintain-library.js, index.js, agent-supervisor.md |
| (new) | `INTENTÏON_BLOCKED.md` | supervise.js (new action), agent-supervisor.md |
| `intentïon.md` (activity log) | `intentïon.log` | All task handlers, logging.js, config, workflows |
| `MISSION-*.md` seeds | `INTENTÏON-*.md` | src/seeds/, src/seeds/missions/ |
| `zero-MISSION.md` | `zero-INTENTÏON.md` | src/seeds/ |
| `missionFilepath` config key | `intentionFilepath` | agentic-lib.yml, agentic-lib.toml, config-loader.js |
| `list_missions` MCP tool | `list_intentions` | src/mcp/server.js |
| `mission-complete` supervisor action | `intentïon-realised` | supervise.js, agent-supervisor.md |
| (new action) | `intentïon-blocked` | supervise.js, agent-supervisor.md |
| `src/seeds/missions/` dir | `src/seeds/intentions/` | src/seeds/ |
| "mission" text in agent prompts | "intentïon" | src/agents/agent-*.md |

---

## Code Changes Required

### MISSION.md → INTENTÏON.md

- `src/agents/agentic-lib.yml`: `missionFilepath` key value
- `src/agents/agent-*.md`: all 8 prompt files reference "MISSION.md"
- `src/actions/agentic-step/config-loader.js`: default path
- `src/mcp/server.js`: workspace_create, list_missions descriptions
- `src/seeds/`: all MISSION-*.md filenames and content
- `agentic-lib.toml`: mission path config
- repository0 root: `MISSION.md` file itself

### MISSION_COMPLETE.md → INTENTÏON_REALISED.md

- `src/actions/agentic-step/index.js` (line 44): existsSync check
- `src/actions/agentic-step/tasks/transform.js` (lines 30-32): existsSync + messages
- `src/actions/agentic-step/tasks/maintain-features.js` (lines 23-24): existsSync
- `src/actions/agentic-step/tasks/maintain-library.js` (lines 23-25): existsSync
- `src/actions/agentic-step/tasks/supervise.js` (lines 114, 117, 435, 606, 807): all refs
- `src/actions/agentic-step/tasks/discussions.js` (lines 308, 319-320): write + log
- `src/agents/agent-supervisor.md` (lines 11, 15, 40, 62-63, 101, 106): all refs

### New INTENTÏON_BLOCKED.md

- `src/actions/agentic-step/tasks/supervise.js`: new action handler
- `src/agents/agent-supervisor.md`: new action description

### intentïon.md → intentïon.log

- `src/actions/agentic-step/logging.js`: output filename
- All task handlers that reference the log filename
- `src/agents/agentic-lib.yml`: intentionFilepath value
- `agentic-lib.toml`: intention filepath config
- Workflow files that reference the log

### MCP tool renames

- `src/mcp/server.js`: `list_missions` → `list_intentions`, mission param descriptions

---

## Documents to Update

Light-touch term replacements (MISSION → INTENTÏON, mission-complete → intentïon-realised) in:

- Both READMEs (agentic-lib, repository0)
- GETTING-STARTED.md
- API.md
- MCP_SERVER.md
- CLAUDE.md files
- copilot-instructions.md files

---

## Execution Order

1. CONCEPT.md update (done — manufacturing table, perspectives section, vocabulary rows removed)
2. File renames (MISSION→INTENTÏON seeds, missions/→intentions/ dir)
3. Code updates (condition checks, string literals, config keys)
4. Agent prompt updates
5. MCP tool renames
6. Doc updates
7. Test updates (expectations referencing old names)
8. Run `npm test`

---

## Verification

```
grep -ri "MISSION" --include="*.md" --include="*.yml" --include="*.js" --include="*.toml" | grep -v node_modules | grep -v _archive | grep -v permission | grep -v commission
```
Should return zero hits (outside the above exclusions).

```
grep -ri "MISSION_COMPLETE" --include="*.js" --include="*.md"
```
Should return zero.

```
grep -r "intentïon\.md" --include="*.js" --include="*.yml" --include="*.toml"
```
Should return zero (now intentïon.log).

```
grep -r "list_missions" --include="*.js"
```
Should return zero.

All tests pass: `npm test`
