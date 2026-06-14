# Claude Code Memory - intentïon agentic-lib

> **DO NOT USE `cd <dir> && git ...` — USE `git -C <dir> ...` ALWAYS.**
> This is a multi-repo workspace. Each subdirectory is its own git repo.
> Using `cd` in compound commands triggers security prompts every time.
> This applies to YOU and to ANY AGENT YOU SPAWN. Never use the Agent tool
> for simple file reads or git operations in subdirectories either.

## Context Survival (CRITICAL — read this first after every compaction)

**After compaction or at session start:**

1. Read `~/.claude/inboxes/<your-handle>.md` and `.claude/messages.md` — another Claude session may have left messages for you
2. Read **`PLAN_ENGINE.md`** — the engine's *active* forward roadmap. (The other
   root `PLAN_*.md` are retrospective/historical.) Cross-estate strategy + the
   supervisor's plan live in the marginalia repo:
   `../../polycode-projects/marginalia/PLAN_INTENTION.md` and `PLAN_CODING_AGENT.md`.
3. Run `TaskList` to see tracked tasks with status
4. Do NOT start new work without checking these first

**During work:**

- When the user gives a new requirement, add it to the relevant `PLAN_*.md` or create a new one
- Track all user goals as Tasks with status (pending → in_progress → completed)
- Update `PLAN_*.md` with progress before context gets large

**PLAN file pattern:**

- Active plans live at project root: `PLAN_<DESCRIPTION>.md`
- Each plan has user assertions verbatim at the top (non-negotiable requirements)
- If no plan file exists for the current work, create one before starting
- Never nest plans in subdirectories — always project root

**Anti-patterns to avoid:**

- Do NOT drift to side issues when a plan file defines the priority
- Do NOT silently fail and move on — throw, don't skip
- Do NOT ask obvious questions — read the plan file

## What This Repository Is

The **delivery engine** for the intentïon fleet. As of **8.0.0** it is a **thin
wrapper over the 2026 agent stack** (`claude -p` + Amazon Bedrock, "Path B"), not a
bespoke agent loop. One trigger runs **one whole transformation** (work item →
PR-ready branch), then stops. The engine holds **no plan and no state** between
runs — decomposition and memory live in the **marginalia** supervisor graph.

- **Package**: `@polycode-public/agentic-lib` (npm scope `@polycode-public`; **not yet published** to npm — consumed via the `@v8` git ref)
- **Organisation**: `polycode-public` (GitHub, under the polycode-limited Enterprise)
- **License**: **`(AGPL-3.0-only OR MIT)`** — `LICENSE` (AGPL-3.0) + `LICENSE-MIT` both ship
- **What it ships**: `.github/workflows/transform.yml` (the reusable dispatch), `components/`, `missions/`, `seeds/`, `bin/agentic-lib.js`, `MODELS.md`

## What This Repository Is NOT

- Not a standalone application — it's consumed by other repos (repository0, the fleet)
- Not a web service — it's GitHub Actions reusable workflows + a small npx CLI
- Does not deploy to AWS directly (it only *calls* Bedrock from CI via OIDC)
- **No** bespoke agent loop, **no** `agentic-step` action, **no** committed plan
  engine — all deleted in the 8.0.0 port. The loop is the engine vendor's
  (`claude -p`); the plan/memory is marginalia's.

## Key Architecture

- **`.github/workflows/transform.yml`** — THE reusable dispatch (`workflow_call`,
  inputs `type` / `work_item` / `max_turns` / `model`). Checkout caller → OIDC→AWS
  (Bedrock lane) → assemble a one-shot prompt from `components/prompts/<type>.md` →
  `claude -p` under a turn cap → gate on a `fixes #N` trailer (C3) → `gh pr create`
  / push revision. Concurrency keyed on the work item (C8).
- **`.github/workflows/summary-export.yml`** — reusable; pulls the repo's marginalia
  graph summary and publishes `agentic-lib-logs/summary.json` (the file the
  intentïon.com embed fetches). No-ops until bound to a graph.
- **Provider selection is purely environment variables** — no code branch. Anthropic
  lane (`ANTHROPIC_API_KEY`) vs **Bedrock lane** (`CLAUDE_CODE_USE_BEDROCK=1` + OIDC
  AWS creds + `AWS_REGION=eu-west-2` + `ANTHROPIC_MODEL=<inference-profile-id>`). See
  `MODELS.md`.
- **Transformation types** = one one-shot prompt each in `components/prompts/`:
  `deliver-intent`, `address-review`, `fix-ci`, `tend`. Iteration is a *new trigger*,
  never an in-run loop counter.

## The actors

| Actor | What it is | Holds state? |
|---|---|---|
| **The `claude -p` engine** | `transform.yml` running one headless transformation per trigger. Stateless: its only state is the checkout. | No |
| **marginalia** | The supervisor graph (separate repo, `../polycode-projects/marginalia`). Holds the plan, provenanced memory (`mg:fixes` closure), decomposition, G5 prioritisation. The trigger source. | Yes |
| **M5 = GitHub App `intention-system`** | App ID 4048241, install_id 140151684, installed on all `polycode-public` repos. Creds in intention-prod SSM `/intention/m5/*`. How marginalia authenticates to dispatch work and read host state. | n/a |

GitHub Copilot and the repository0 discussions-bot are **GONE** (removed in the
port). There is no longer any agent-to-agent Copilot/bot conversation to maintain.

## Distributed Files (mastered here, consumed by repository0 / the fleet)

`npx @polycode-public/agentic-lib init [--purge] [--mission <name>]` lays the
`seeds/` into a consumer repo. **All fixes must be made here** — local edits in
consumer repos are overwritten on the next init.

| Source in agentic-lib | Target in consumer repo | Notes |
|---|---|---|
| `seeds/INTENT.md` | `INTENT.md` | The fixed point (was `MISSION.md`); `--mission` overwrites it with a graded seed |
| `seeds/AGENTS.md` | `AGENTS.md` | Assembled from `components/agents/` (house conventions, definition of done, `fixes #N` provenance contract) |
| `seeds/agentic-lib.toml` | `agentic-lib.toml` | Slim engine config (provider, caps, paths) |
| `seeds/workflows/on-*.yml` | `.github/workflows/` | 3 thin consumer workflows pinning `transform.yml@v8` |
| `seeds/src-tests/*` | `src/lib/`, `tests/` | `--purge` only — resets to a minimal main.js + test |

The 3 thin consumer workflows: `on-intent.yml` (issue/INTENT change → `deliver-intent`),
`on-review.yml` (review / `@agentic-lib` mention → `address-review`), `on-schedule.yml`
(cron → `tend` / `fix-ci`). Each is `trigger + uses: …transform.yml@v8 + inputs`.

## AWS layout (Bedrock lane)

- **Accounts** (Workloads OU, mgmt `541134664601`): intention-ci **285034436101**,
  intention-prod **813333281588**. Region **eu-west-2** (us-east-1 only for the
  CloudFront ACM cert on the site).
- **Auth**: GitHub-OIDC → AWS (not GitLab). Fleet Bedrock-cred OIDC role
  `arn:aws:iam::285034436101:role/intention-fleet-bedrock-role` (Anthropic-invoke
  only, trust `repo:polycode-public/*`).
- **Bedrock**: Anthropic enabled org-wide via `aws bedrock put-use-case-for-model-access`
  at the mgmt account (inherited). Default model **Claude Haiku 4.5**
  (`eu.anthropic.claude-haiku-4-5-20251001-v1:0`) — ~$0.10/simple delivery,
  ~$0.20–0.24 substantial at the 20-turn cap.

## Related Repositories

| Repository | Relationship |
|---|---|
| `repository0` | MIT template that consumes `transform.yml@v8` via the 3 thin workflows; carries `INTENT.md` |
| `marginalia` (`../polycode-projects/marginalia`) | The supervisor graph — holds plans/memory/decomposition; dispatches work to the engine |
| The fleet | `8-kyu-remember-hello-world`, `6-kyu-understand-roman-numerals`, `4-kyu-apply-cron-engine`, `3-kyu-analyze-lunar-lander`, `2-kyu-create-markdown-compiler`, + `sandbox` |

## Test Commands

```bash
npx vitest run        # unit tests (vitest) — the canonical test command
npm test              # same (vitest --run)
npm run linting       # ESLint
npm run lint:workflows # validate workflow YAML (scripts/validate-workflows.js)
npm run security      # npm audit (--audit-level=high)
npx @polycode-public/agentic-lib init --list-missions   # list the mission library
```

## CI Workflows (this repo)

| Workflow | Trigger | Purpose |
|---|---|---|
| `test.yml` | Push/PR, manual dispatch | Unit tests + lint + security + workflow validation |
| `release.yml` | Push to main (src/bin/pkg), manual dispatch | Auto patch bump on push; manual major/minor/prerelease |

(`transform.yml` and `summary-export.yml` are reusable engine workflows consumed by
other repos, not CI for this repo.)

## Git Workflow

**You may**: create branches, commit changes, push branches, open pull requests

**You may NOT** (without explicit permission given immediately before execution):
merge PRs, push to main, delete branches, rewrite history, **move git tags** (the
`v8` moving tag is a release operation)

**Branch naming**: `claude/<short-description>`

## Code Quality Rules

- **No unnecessary formatting** — don't reformat lines you're not changing
- **No import reordering** — considered unnecessary formatting
- **No backwards-compatible aliases** — update all callers instead
- Only run linting/formatting fixes when specifically asked

## Inter-Session Communication (Claude Code ↔ Claude Code)

Two channels coordinate concurrent sessions:

- **Estate-wide inbox** — `~/.claude/inboxes/<handle>.md`, one file per session.
  Protocol in `~/.claude/inboxes/README.md`. Read your own inbox on start and
  between tasks; append to another session's inbox to message it.
- **Repo-local scratch** — `.claude/messages.md` for in-directory coordination
  (gitignored, ephemeral). **Read** at session start and before touching shared
  files; **append** (never edit/delete existing entries); claim files you're
  working on; note merges so the other session pulls.

## Security Checklist

- Never commit secrets — use GitHub Actions secrets
- Never commit API keys or tokens
- Verify workflow permissions follow least privilege
- OIDC trust policies scoped to specific repositories (`repo:polycode-public/*`)
