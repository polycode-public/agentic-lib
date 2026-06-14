# PLAN: Narrative Alignment

**Status:** Largely settled by the 8.0.0 port. This file records the terminology
that actually landed; the original Copilot-era rename table (which targeted
`src/copilot/`, `agentic-step`, the MCP server, `supervise.js`/`discussions.js`,
etc.) is **moot** — that machinery was **deleted**, not renamed. See `FEATURES.md`
and `CONCEPT.md` for the engine port.

---

## The fixed point is `INTENT.md`

The navigated-toward file is **`INTENT.md`** (formerly `MISSION.md`). The earlier
plan proposed `INTENTÏON.md` with the diaeresis; that was **not** adopted — the
plain-ASCII `INTENT.md` is the seed name, the config key is `intent`, and the
mission library lays one down as `INTENT.md`.

| Old term | Current term |
|---|---|
| `MISSION.md` | `INTENT.md` (seed in `seeds/INTENT.md`, config `[paths].intent`) |
| `missionFilepath` config key | `intent` (in `agentic-lib.toml`) |
| "mission" in prose | "intent" / "intentïon" (the kyu seeds are still colloquially "missions" in `missions/`) |
| `MISSION_COMPLETE.md` signal | **removed** — there is no agent "mission complete" signal in 8.x. "Done" is mechanical: a draft PR exists. Completeness is judged by the marginalia supervisor and the operator, not the engine. |

The `missions/` directory keeps its name as the **benchmark library** (kyu/dan
graded INTENT seeds); "mission" there means "a graded benchmark seed", distinct
from the per-repo `INTENT.md` fixed point.

## What was dropped (and stays dropped)

- The manufacturing metaphor, "machinery / record / materials / perspectives"
  vocabulary, and the "Discussions Bot" persona — all gone. `CONCEPT.md` carries
  the current, minimal vocabulary (fixed point, host-as-interface, product,
  engine vs supervisor).
- The `list_missions` MCP tool, `intentïon.log` activity log, `supervise.js`
  actions, and every other code-level rename in the old table — the code they
  targeted was removed in the port, so the renames are no longer applicable.

## Remaining narrative tidy (low priority)

- Keep README / CONCEPT / FEATURES / MODELS / MISSIONS consistent on **INTENT.md**
  (not MISSION.md, not INTENTÏON.md) and on **engine vs marginalia supervisor**.
- The diaeresis `intentïon` is reserved for the **brand / project name**, not file
  or config identifiers.
