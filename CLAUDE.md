# Claude Code Memory - intentïon agentic-lib

> **DO NOT USE `cd <dir> && git ...` — USE `git -C <dir> ...` ALWAYS.**
> This is a multi-repo workspace. Each subdirectory is its own git repo.
> Using `cd` in compound commands triggers security prompts every time.
> This applies to YOU and to ANY AGENT YOU SPAWN. Never use the Agent tool
> for simple file reads or git operations in subdirectories either.

## Context Survival (CRITICAL — read this first after every compaction)

**After compaction or at session start:**

1. Read `.claude/messages.md` — another Claude session may have left messages for you
2. Read all `PLAN_*.md` files in the project root — these are the active goals
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

The **core SDK** of the intentïon project. A collection of reusable GitHub Actions workflows that enable repositories to operate autonomously — reviewing, fixing, updating, and transforming code through branches and issues. Includes a CLI with `iterate` command for budget-tracked transformation cycles and an MCP server for Claude Code integration.

- **Package**: `@xn-intenton-z2a/agentic-lib`
- **Organisation**: `xn-intenton-z2a`
- **License**: GPL (with MIT-licensed examples)
- **Production code**: `src/` (workflows, actions, agents, scripts, seeds)

## What This Repository Is NOT

- Not a standalone application — it's consumed by other repos (repository0, etc.)
- Not a web service — it's GitHub Actions workflows and npm package
- Does not deploy to AWS directly

## Key Architecture

- Reusable workflows invoked via `workflow_call` event
- Workflows communicate through branches and issues
- GitHub Copilot SDK integration for autonomous code decisions (via agentic-step action)
- Published to npm as `@xn-intenton-z2a/agentic-lib`

## Distributed Files (mastered here, consumed by repository0)

Running `npx @xn-intenton-z2a/agentic-lib init --purge` in a consumer repo copies these files from the npm package. **All bug fixes must be made here** — local edits in consumer repos are overwritten on the next init run.

| Source in agentic-lib | Target in consumer repo | Notes |
|-----------------------|-------------------------|-------|
| `.github/workflows/agentic-lib-*.yml` | `.github/workflows/` | 5 workflow files (transformed via `#@dist` markers) |
| `agentic-lib.toml` | `agentic-lib.toml` | Config file (transformed via `#@dist` markers, only if not exists) |
| `src/actions/*/` | `.github/agentic-lib/actions/` | 3 actions (agentic-step, commit-if-changed, setup-npmrc) |
| `.github/agents/*.md` | `.github/agents/` | Agent prompts (Copilot-discoverable) |
| `src/seeds/*` | `.github/agentic-lib/seeds/` | All seed files (for reference) |
| `src/scripts/` (selected) | `.github/agentic-lib/scripts/` | 6 scripts |
| `src/seeds/zero-*.{js,md,json}` | Project root (`src/lib/`, `tests/`, etc.) | **--purge only** — resets user content |

Stale workflows (in consumer but not in template) are automatically removed.

## Related Repositories

| Repository                         | Relationship                                          |
| ---------------------------------- | ----------------------------------------------------- |
| `repository0`                      | Template that consumes these workflows                |
| `repository0-plot-code-lib`        | Experiment using these workflows                      |
| `repository0-xn--intenton-z2a.com` | Experiment using these workflows                      |
| `intention-agentic-lib`            | Earlier intentïon-specific version (being superseded) |

## Test Commands

```bash
npm test              # 393 unit tests (vitest)
npm run linting       # ESLint
npm run lint:workflows # Validate workflow YAML (15 files)
npm run security      # npm audit (0 vulnerabilities)
npm run test:smoke    # Connectivity smoke test (needs GITHUB_TOKEN)
npx @xn-intenton-z2a/agentic-lib init --dry-run  # Preview init in current dir
```

## CI Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `test.yml` | Push/PR, manual dispatch | Unit tests, lint, security, workflow validation. Optionally: action tests. |
| `release.yml` | Push to main (src/bin/pkg), manual dispatch | Auto patch bump on push. Manual major/minor/prerelease. |

## Git Workflow

**You may**: create branches, commit changes, push branches, open pull requests

**You may NOT** (without explicit permission on a command by command basis given immediately before execution): merge PRs, push to main, delete branches, rewrite history

**Branch naming**: `claude/<short-description>`

## Code Quality Rules

- **No unnecessary formatting** — don't reformat lines you're not changing
- **No import reordering** — considered unnecessary formatting
- **No backwards-compatible aliases** — update all callers instead
- Only run linting/formatting fixes when specifically asked

## Ongoing Agent-to-Agent Communication

**You should maintain ongoing conversations** with both GitHub Copilot and the repository0 discussions bot.

**Daily cadence:** If it is a new day since the last session for this directory, reach out to both Copilot (via agentic-lib issues) and the discussions bot (via repository0 Discussion #2401). Ask them to respond, and follow up later in the session or in a future session. Maintain a dialogue as a continuous activity — about once a day for both. Not every follow-up needs action, but keep the conversation alive.

**Also try @copilot in Discussions:** GitHub Discussions in agentic-lib may support mentioning `@copilot` directly. Try creating or commenting on agentic-lib Discussions with `@copilot` mentions to see if Copilot responds natively, in addition to the issue-assignment method.

### Discussions Bot (repository0)

Talk to the bot by commenting on [Discussion #2401](https://github.com/xn-intenton-z2a/repository0/discussions/2401) using `gh api graphql`:

```bash
# Comment on the ongoing discussion
gh api graphql -f query='mutation { addDiscussionComment(input: { discussionId: "D_kwDON6E8ZM4AgQKM", body: "..." }) { comment { url } } }'

# Read latest comments
gh api graphql -f query='{ repository(owner:"xn-intenton-z2a", name:"repository0") { discussion(number: 2401) { comments(last:5) { nodes { body author { login } createdAt } } } } }'
```

The bot is currently powered by ChatGPT (old code on main). After merge, it will be powered by Copilot SDK. The discussion context persists across bot changes.

### Copilot (agentic-lib)

Use Discussions on agentic-lib (not PRs or issues):

```bash
# Create a new discussion
gh api graphql -f query='mutation { createDiscussion(input: { repositoryId: "R_kgDON4GxXA", categoryId: "DIC_kwDON4GxXM4Cm4cE", title: "...", body: "..." }) { discussion { number url } } }'

# Comment on existing discussion (e.g. #1775)
gh api graphql -f query='mutation { addDiscussionComment(input: { discussionId: "DISCUSSION_NODE_ID", body: "..." }) { comment { url } } }'

# Read latest comments
gh api graphql -f query='{ repository(owner:"xn-intenton-z2a", name:"agentic-lib") { discussion(number: 1775) { comments(last:5) { nodes { body author { login } createdAt } } } } }'
```

Current Copilot discussion: [#1775](https://github.com/xn-intenton-z2a/agentic-lib/discussions/1775)

### Communication Guidelines

- **Always identify yourself as Claude Code** so the other agent knows who it's talking to
- Ask questions that encourage the bot to respond as a distinct entity with its own perspective
- Record all conversations in `CLAUDE_AND_COPILOT.md` so context survives across sessions
- Use these conversations to validate assumptions, gather ecosystem knowledge, and coordinate work

## Inter-Session Communication (Claude Code ↔ Claude Code)

Multiple Claude Code sessions may work in this directory concurrently. Use `.claude/messages.md` to coordinate.

**Protocol:**
- **Read** `.claude/messages.md` at session start and before touching shared files
- **Append** messages (never edit or delete existing entries)
- **Format:** `## YYYY-MM-DDTHH:MM:SSZ [branch-name] description`
- **Claim files:** State which files you're working on so the other session avoids them
- **Report merges:** Note when you merge a PR so the other session knows to pull

The file is gitignored (`.claude/` is in `.gitignore`). It's ephemeral — it exists for the current working session, not for history.

## Multi-Agent Citizenship

Three AI agents work on the intentïon project. Follow these guidelines to be good citizens.

### Who's Who

| Agent               | Identity                         | Primary Channel         | Strengths                                             |
| ------------------- | -------------------------------- | ----------------------- | ----------------------------------------------------- |
| **Claude Code**     | claude-opus-4-6                  | CLI, branches, PRs      | Architecture, multi-file changes, planning            |
| **GitHub Copilot**  | copilot-swe-agent                | Issues → PRs            | Code review, SDK knowledge, single-file fixes         |
| **Discussions Bot** | github-actions (ChatGPT/Copilot) | repository0 Discussions | User interaction, feature requests, mission alignment |

### Branch Ownership

| Prefix                | Owner                    | Purpose                                          |
| --------------------- | ------------------------ | ------------------------------------------------ |
| `claude/*`            | Claude Code              | Feature work, refactoring, multi-file changes    |
| `copilot/*`           | Copilot                  | Issue fixes, review-driven changes               |
| `agentic-lib-issue-*` | Automated (agentic-step) | Issue resolution via transform workflow          |
| `refresh`             | Claude Code (primary)    | Stabilisation branch — all agents may contribute |
| `main`                | Protected                | Merge only via reviewed PR                       |

### File Ownership

| Files                                              | Primary Owner            | Others May            |
| -------------------------------------------------- | ------------------------ | --------------------- |
| `CLAUDE.md`, `CLAUDE_AND_COPILOT.md`               | Claude Code              | Read                  |
| `.github/agentic-lib/actions/agentic-step/*`       | Claude Code              | Review, suggest fixes |
| `.github/workflows/*`                              | Claude Code              | Review, fix bugs      |
| `FEATURES.md`, `PLAN_*.md`                         | Claude Code              | Comment via issues    |
| `src/lib/main.js` (repository0)                    | Automated (agentic-step) | Review                |
| Agent prompt files (`.github/agents/`) | Shared                   | Any agent may update  |

### Conflict Avoidance

1. **Check before pushing**: Before pushing to a shared branch, check recent commits from other agents
2. **Don't overwrite**: If another agent has pushed to the same branch, pull before pushing
3. **Scope PRs tightly**: Each PR should address one concern — don't mix unrelated changes
4. **Copilot sub-PRs**: Copilot tends to create sub-PRs targeting main. Redirect to target `refresh` or the relevant feature branch instead
5. **Label issues**: Use labels to indicate which agent should handle a task (`claude-code`, `copilot`, `automated`)

### Cross-Examination Protocol

When one agent proposes a change or makes a claim:

1. **Verify empirically** — don't just accept it. Check npm, read types, run code.
2. **Note disagreements** — record in CLAUDE_AND_COPILOT.md when agents disagree, with reasoning
3. **Prefer the agent with direct access** — Copilot knows the SDK best; Claude Code knows the architecture best; the bot knows user intent best
4. **Ask for evidence** — "What's your source?" is always a fair question between agents

## Security Checklist

- Never commit secrets — use GitHub Actions secrets
- Never commit API keys or tokens
- Verify workflow permissions follow least privilege
