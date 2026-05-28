# intentïon `agentic-lib`

**Bootstrap any repository with autonomous code transformation powered by GitHub Copilot.** Install the SDK, run `init`, write a mission statement, and the agentic workflows will generate issues, write code, run tests, and open pull requests -- continuously transforming your repository toward its goal. 

## Quick Start

```bash
# In your repository:
npx @xn-intenton-z2a/agentic-lib init

# Write your mission:
echo "# Build a CLI tool that converts CSV to JSON" > MISSION.md

# Commit and push -- the workflows take over from here:
git add -A && git commit -m "Initialise agentic workflows" && git push
```

Or start from the [repository0 template](https://github.com/xn-intenton-z2a/repository0) which comes pre-initialised.

## How It Works

```
MISSION.md           Your project goals in plain English
    |
    v
[supervisor]         LLM gathers repo state, picks actions
    |
    +-----+-----+-----+-----+
    v     v     v     v     v
 transform  maintain  review  fix  discussions
    |         |        |      |       |
    v         v        v      v       v
Issue -> Code -> Test -> PR -> Merge -> Next Issue
    ^                                       |
    +---------------------------------------+
              Autonomous cycle
```

An LLM supervisor runs on a configurable schedule, gathers full repository context (open issues, PRs, workflow runs, features, activity), and strategically dispatches other workflows. Each workflow uses the `agentic-step` action to call the Copilot SDK with context from your repository and produce targeted changes. Users can interact with the system through a GitHub Discussions bot, which relays requests to the supervisor.

## Initialisation

### `npx @xn-intenton-z2a/agentic-lib init`

Populates your repository with the agentic infrastructure. Run it once to set up, or again to update to the latest version.

```bash
npx @xn-intenton-z2a/agentic-lib init           # install/update infrastructure
npx @xn-intenton-z2a/agentic-lib init --purge    # also reset source files to seed state
npx @xn-intenton-z2a/agentic-lib init --dry-run  # preview without writing
npx @xn-intenton-z2a/agentic-lib reset           # alias for init --purge
npx @xn-intenton-z2a/agentic-lib version         # show installed version
```

### What `init` Installs

After running `init`, your repository will contain:

```
your-repo/
├── agentic-lib.toml                          # [INIT] Config (created once, never overwritten)
│
├── .github/
│   ├── workflows/                            # [INIT] 8 workflow files (always overwritten)
│   │   ├── agentic-lib-workflow.yml           #   Core: supervisor + transform + maintain + review + dev
│   │   ├── agentic-lib-bot.yml               #   Bot: respond to GitHub Discussions
│   │   ├── agentic-lib-test.yml              #   CI: run unit + behaviour tests, dispatch fixes
│   │   ├── agentic-lib-init.yml              #   Infra: init/purge, optional seed issues
│   │   ├── agentic-lib-update.yml            #   Infra: update agentic-lib version
│   │   ├── agentic-lib-schedule.yml          #   Infra: change supervisor schedule
│   │   └── test.yml                          #   CI: run tests
│   │
│   └── agentic-lib/                          # [INIT] Internal infrastructure (always overwritten)
│       ├── actions/
│       │   ├── agentic-step/                 #   The Copilot SDK action (10 task handlers)
│       │   ├── commit-if-changed/            #   Composite: conditional git commit
│       │   └── setup-npmrc/                  #   Composite: npm registry auth
│       ├── agents/                           #   8 prompt files + config YAML
│       ├── seeds/                            #   Seed files for reset
│       └── scripts/                          #   Utility scripts
│
├── MISSION.md                                # [USER] You write this -- your project goals
├── src/lib/main.js                           # [USER] Your source code (seeded on --purge)
├── tests/unit/main.test.js                   # [USER] Your tests (seeded on --purge)
├── package.json                              # [USER] Your package config (seeded on --purge)
├── README.md                                 # [USER] Your readme (seeded on --purge)
├── intentïon.md                              # [GENERATED] Activity log (cleared on --purge)
├── features/                                  # [GENERATED] Feature definitions (cleared on --purge)
└── library/                                   # [GENERATED] Library documents
```

**Legend:**
- **[INIT]** -- Created or overwritten by `init` every time. You should not edit these.
- **[USER]** -- Your files. `init` never touches these. `init --purge` resets them to seed state.
- **[GENERATED]** -- Created by the agentic workflows during operation.

The `init.yml` workflow is distributed from seeds (like `test.yml`) and runs `npx @xn-intenton-z2a/agentic-lib init --purge` on a daily schedule to keep infrastructure up to date.

### What You Need Before Running `init`

| File | Required? | Notes |
|------|-----------|-------|
| `package.json` | Recommended | If missing, `init --purge` creates one from the seed |
| `.gitignore` | Recommended | Standard Node.js gitignore |
| `LICENSE` | Recommended | Your choice of license |
| Git repo | Yes | Must be a git repository with a remote on GitHub |

### GitHub Repository Settings

After `init`, configure your GitHub repository with the following tokens, permissions, and settings.

#### Required Secrets

| Secret | Type | Permissions | Purpose |
|--------|------|-------------|---------|
| `COPILOT_GITHUB_TOKEN` | Fine-grained PAT | **Copilot** (read) | Authenticates with the GitHub Copilot SDK for all agentic tasks |
| `WORKFLOW_TOKEN` | Classic PAT | **workflow** scope | Required by `init.yml` to push workflow file changes (GITHUB_TOKEN cannot modify `.github/workflows/`) |

**Creating `COPILOT_GITHUB_TOKEN`:**
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → Fine-grained tokens → Generate new token
2. Set repository access to your target repo (or all repos)
3. Under "Account permissions", enable **GitHub Copilot** → Read
4. Copy the token and add it as a repository secret: Settings → Secrets and variables → Actions → New repository secret

**Creating `WORKFLOW_TOKEN`:**
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → Tokens (classic) → Generate new token
2. Select the **workflow** scope (this includes repo access)
3. Set expiration (max 90 days for enterprise orgs)
4. Copy the token and add it as a repository secret

#### Repository Settings

| Setting | Where | Value | Purpose |
|---------|-------|-------|---------|
| GitHub Actions | Settings → Actions → General | Allow all actions | Workflows must be able to run |
| Workflow permissions | Settings → Actions → General | Read and write | Workflows need to create branches, PRs, and push commits |
| Allow GitHub Actions to create PRs | Settings → Actions → General | Checked | Required for automerge and init workflows |
| GitHub Discussions | Settings → General → Features | Enabled | Required for the discussions bot |
| Branch protection (optional) | Settings → Branches | Require PR reviews | Recommended: prevents direct pushes, ensures review |

#### Permissions Summary

The workflows use `permissions: write-all` in the workflow files. The key permissions used are:

| Permission | Used by | Purpose |
|------------|---------|---------|
| `contents: write` | All agent workflows | Create branches, push commits |
| `pull-requests: write` | Transform, fix-code | Create and update PRs |
| `issues: write` | Review, enhance, supervisor | Create, label, close issues |
| `actions: write` | Supervisor | Dispatch other workflows |
| `discussions: write` | Discussions bot | Post replies to discussions |

## Configuration

Configuration lives in `agentic-lib.toml` at your project root:

```toml
[schedule]
supervisor = "daily"         # off | weekly | daily | hourly | continuous

[paths]
mission = "MISSION.md"
source = "src/lib/"
tests = "tests/unit/"
features = "features/"
library = "library/"
docs = "docs/"
readme = "README.md"
dependencies = "package.json"
contributing = "CONTRIBUTING.md"
library-sources = "SOURCES.md"

[execution]
test = "npm ci && npm test"

[limits]
max-feature-issues = 2
max-maintenance-issues = 1
max-attempts-per-branch = 3
max-attempts-per-issue = 2
features-limit = 4
library-limit = 32

[tuning]
profile = "recommended"       # min | recommended | max
# model = "gpt-5-mini"        # override model per-profile
# transformation-budget = 8   # max code-changing cycles per run

[mission-complete]
min-resolved-issues = 2       # minimum closed-as-RESOLVED issues since init
max-source-todos = 0          # max TODO comments allowed in ./src (0 = none)

[bot]
log-prefix = "agent-log-"
log-branch = "agentic-lib-logs"
screenshot-file = "SCREENSHOT_INDEX.png"
```

### Persistent State

The system maintains `agentic-lib-state.toml` on the `agentic-lib-logs` branch to track counters, budget, and status across workflow runs. This file is automatically created on `init --purge` and updated after each `agentic-step` invocation. It tracks cumulative transforms, token usage, consecutive nop cycles (for backoff), and mission status.

### Tuning Profiles

The `profile` setting controls all tuning defaults. Three profiles are built in:

| Profile | Budget | Issues | Best for |
|---------|--------|--------|----------|
| `min` | 16 cycles | 5, 14d stale | CI testing, quick validation |
| `recommended` | 32 cycles | 20, 30d stale | Balanced cost/quality |
| `max` | 128 cycles | 100, 90d stale | Complex missions |

Override individual knobs in `[tuning]` to deviate from a profile. Limits (`[limits]`) also scale with the profile.

## The `agentic-step` Action

The core of the system is a single GitHub Action that handles all autonomous tasks:

| Task | Purpose |
|------|---------|
| `supervise` | Gather repo context, choose and dispatch actions strategically |
| `direct` | Evaluate mission status: complete, failed, or gap analysis |
| `transform` | Transform the codebase toward the mission |
| `resolve-issue` | Read an issue and generate code to resolve it |
| `fix-code` | Fix failing tests or lint errors |
| `maintain-features` | Generate and maintain feature definitions |
| `maintain-library` | Update library documentation and sources |
| `enhance-issue` | Add detail and acceptance criteria to issues |
| `review-issue` | Review and close resolved issues |
| `discussions` | Respond to GitHub Discussions |
| `implementation-review` | Review implementation completeness against mission |

Each task calls the GitHub Copilot SDK with context assembled from your repository (mission, code, tests, features) and writes changes back to the working tree. The supervisor can dispatch any of the other tasks via workflow dispatch.

## CLI Task Commands

Run Copilot SDK transformations locally from the command line. These are the same operations the GitHub Actions workflows perform, but you can run them interactively to see what happens.

```bash
npx @xn-intenton-z2a/agentic-lib transform            # advance code toward the mission
npx @xn-intenton-z2a/agentic-lib maintain-features     # generate feature files from mission
npx @xn-intenton-z2a/agentic-lib maintain-library      # update library docs from SOURCES.md
npx @xn-intenton-z2a/agentic-lib fix-code              # fix failing tests
npx @xn-intenton-z2a/agentic-lib iterate               # run N cycles with budget tracking
```

All task commands accept these flags:

| Flag | Default | Purpose |
|------|---------|---------|
| `--dry-run` | off | Show the prompt without calling the Copilot SDK |
| `--target <path>` | current directory | Target repository to transform |
| `--model <name>` | `claude-sonnet-4` | Copilot SDK model |
| `--mission <name>` | 6-kyu-understand-hamming-distance | Init with --purge before iterating (iterate only) |
| `--timeout <ms>` | 600000 | Session timeout in milliseconds (iterate only) |

### Example: Full Walkthrough

```bash
# 1. Start with a fresh repository
mkdir my-project && cd my-project && git init
npx @xn-intenton-z2a/agentic-lib init --purge

# 2. Write your mission
cat > MISSION.md <<'EOF'
# Mission: CSV to JSON Converter
Build a Node.js CLI tool that reads CSV from stdin and outputs JSON to stdout.
EOF

# 3. Install agentic-step dependencies
cd .github/agentic-lib/actions/agentic-step && npm ci && cd -

# 4. Generate features from your mission
npx @xn-intenton-z2a/agentic-lib maintain-features
# Output:
#   === agentic-lib maintain-features ===
#   [config] Loading agentic-lib.toml
#   [context] Mission loaded, features: 0, library: 0
#   [copilot] Creating session...
#   [copilot] Sending prompt...
#   [event] tool.call: write_file({"path":"features/csv-parsing.md",...})
#   === maintain-features completed in 12.3s ===

# 5. Transform code toward the mission
npx @xn-intenton-z2a/agentic-lib transform
# Output:
#   === agentic-lib transform ===
#   [context] Mission: # Mission: CSV to JSON Converter...
#   [context] Features: 2, Source files: 1
#   [copilot] Creating session...
#   [event] tool.call: write_file({"path":"src/lib/main.js",...})
#   [event] tool.call: run_command({"command":"npm test"})
#   === transform completed in 18.7s ===

# 6. Review the changes
git diff

# 7. If happy, commit
git add -A && git commit -m "Initial transform" && git push
```

Use `--dry-run` to see what prompt would be sent without calling the SDK:

```bash
npx @xn-intenton-z2a/agentic-lib transform --dry-run
```

### Iterator

The `iterate` command runs a single persistent Copilot SDK session that autonomously implements your mission — reading code, writing implementations and tests, running tests, and iterating until everything passes.

```bash
# Init a mission and iterate
npx @xn-intenton-z2a/agentic-lib iterate --mission 6-kyu-understand-hamming-distance --model gpt-5-mini

# Iterate on an existing workspace
npx @xn-intenton-z2a/agentic-lib iterate --target /path/to/workspace

# With a longer timeout (10 minutes)
npx @xn-intenton-z2a/agentic-lib iterate --mission 7-kyu-understand-fizz-buzz --timeout 600000
```

The session uses SDK hooks for observability (tool call tracking, error recovery) and infinite sessions for context management. The agent drives its own read-write-test loop until the mission is complete or the timeout is reached.

**Available missions** (see `src/seeds/missions/`). Mission names encode difficulty ([Codewars kyu/dan](https://docs.codewars.com/concepts/kata/)) and cognitive type ([Bloom's taxonomy](https://en.wikipedia.org/wiki/Bloom%27s_taxonomy)):

| Mission | Kyu/Dan | Bloom's | Description |
|---------|---------|---------|-------------|
| `8-kyu-remember-empty` | 8 kyu | Remember | Blank template |
| `8-kyu-remember-hello-world` | 8 kyu | Remember | Hello World |
| `7-kyu-understand-fizz-buzz` | 7 kyu | Understand | Classic FizzBuzz |
| `6-kyu-understand-hamming-distance` | 6 kyu | Understand | Hamming distance (strings + bits) |
| `6-kyu-understand-roman-numerals` | 6 kyu | Understand | Roman numeral conversion |
| `5-kyu-apply-ascii-face` | 5 kyu | Apply | ASCII face art |
| `5-kyu-apply-string-utils` | 5 kyu | Apply | 10 string utility functions |
| `4-kyu-apply-cron-engine` | 4 kyu | Apply | Cron expression parser |
| `4-kyu-apply-dense-encoding` | 4 kyu | Apply | Dense binary encoding |
| `4-kyu-analyze-json-schema-diff` | 4 kyu | Analyze | JSON Schema diff |
| `4-kyu-apply-owl-ontology` | 4 kyu | Apply | OWL ontology processor |
| `3-kyu-analyze-lunar-lander` | 3 kyu | Analyze | Lunar lander simulation |
| `3-kyu-evaluate-time-series-lab` | 3 kyu | Evaluate | Time series analysis |
| `2-kyu-create-markdown-compiler` | 2 kyu | Create | Markdown compiler |
| `2-kyu-create-plot-code-lib` | 2 kyu | Create | Code visualization library |
| `1-kyu-create-ray-tracer` | 1 kyu | Create | Ray tracer |
| `1-dan-create-c64-emulator` | 1 dan | Create | C64 emulator |
| `1-dan-create-planning-engine` | 1 dan | Create | Planning engine with POP and belief revision |
| `2-dan-create-self-hosted` | 2 dan | Create | Self-hosting bootstrap tests |

### Running Local Benchmarks

You can benchmark mission completion locally without GitHub Actions. This is useful for comparing models, tuning profiles, and measuring iteration speed.

**Prerequisites:**

1. A `COPILOT_GITHUB_TOKEN` (fine-grained PAT with Copilot read permission)
2. Node.js 24+

**Setup:**

```bash
# Set your token
export COPILOT_GITHUB_TOKEN=github_pat_...

# Or source from .env
source .env
```

**Run a benchmark:**

```bash
# Quick: hamming-distance with gpt-5-mini (6 kyu, ~1-2 min)
npx @xn-intenton-z2a/agentic-lib iterate \
  --mission 6-kyu-understand-hamming-distance --model gpt-5-mini --timeout 300000

# Medium: roman-numerals with claude-sonnet-4
npx @xn-intenton-z2a/agentic-lib iterate \
  --mission 6-kyu-understand-roman-numerals --model claude-sonnet-4

# Complex: string-utils with gpt-4.1 (5 kyu, 10 functions, longer timeout)
npx @xn-intenton-z2a/agentic-lib iterate \
  --mission 5-kyu-apply-string-utils --model gpt-4.1 --timeout 600000
```

**From a local clone** (development):

```bash
# From the agentic-lib directory
npx . iterate --mission 6-kyu-understand-hamming-distance --model gpt-5-mini --target /tmp/bench

# Or link globally
npm link
agentic-lib iterate --mission 6-kyu-understand-hamming-distance --model gpt-5-mini --target /tmp/bench
```

**Output:**

```
=== agentic-lib iterate ===
Target:  /tmp/bench
Model:   gpt-5-mini

[agentic-lib] Creating session (model=gpt-5-mini, workspace=/tmp/bench)
[agentic-lib] Session: sess_abc123
  [tool] read_file
  [tool] read_file
  [tool] write_file
  [tool] run_tests
  [tool] write_file
  [tool] run_tests

=== Results ===
Success:       true
Tests passed:  true
Session time:  47s
Total time:    52s
Tool calls:    6
Test runs:     2
Files written: 2
Tokens:        12400 (in=9200 out=3200)
End reason:    complete
```

### Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `COPILOT_GITHUB_TOKEN` | For live runs | Fine-grained PAT with "Copilot Requests" permission |
| (none) | For `--dry-run` | Dry-run shows the prompt without calling the SDK |

If `COPILOT_GITHUB_TOKEN` is not set, the CLI falls back to local `gh` CLI authentication.

## Three Ways to Start

| Method | How | Best for |
|--------|-----|----------|
| **Template** | Use [repository0](https://github.com/xn-intenton-z2a/repository0) as a GitHub template | New projects -- comes pre-initialised |
| **CLI** | `npx @xn-intenton-z2a/agentic-lib init` in any repo | Existing projects -- adds agentic workflows |
| **Website** | [xn--intenton-z2a.com](https://xn--intenton-z2a.com) | Guided setup with a web form |

## Safety

Built-in safety mechanisms:

- **WIP limits** -- maximum concurrent issues to prevent runaway generation
- **Attempt limits** -- maximum retries per branch and per issue
- **Transformation budget** -- caps code-changing cycles per run (profile-scaled)
- **Mission-complete signal** -- `MISSION_COMPLETE.md` gates budget-consuming jobs without LLM calls
- **Path enforcement** -- writable and read-only path separation
- **TDD mode** -- optionally require tests before implementation
- **Mission protection** -- MISSION.md is read-only to the agent

## Updating

To update to the latest version of the agentic infrastructure:

```bash
npx @xn-intenton-z2a/agentic-lib@latest init
git add -A && git commit -m "Update agentic-lib" && git push
```

This overwrites `.github/workflows/` and `.github/agentic-lib/` with the latest versions. Your source code, tests, mission, and config are never touched.

## Development

This repository is the source for the `@xn-intenton-z2a/agentic-lib` npm package. All distributed content lives in `src/`:

```
src/
├── workflows/     8 GitHub Actions workflow templates
├── actions/       3 composite/SDK actions (agentic-step, commit-if-changed, setup-npmrc)
├── agents/        9 agent prompt files + 1 config
├── seeds/         7 seed files (test.yml + 6 project seed files for --purge reset)
└── scripts/       7 utility scripts distributed to consumers
```

### Testing

431 unit tests across 27 test files, plus system tests:

```bash
npm test                  # Run all tests (vitest)
npm run linting           # ESLint
npm run lint:workflows    # Validate workflow YAML
npm run security          # npm audit
npm run test:smoke        # Connectivity smoke test (needs GITHUB_TOKEN)
npm run test:system       # System test: init/purge cycle
npm run test:system:dry-run  # System test: full flow with --dry-run
npm run test:system:live  # System test: full flow with Copilot SDK (needs COPILOT_GITHUB_TOKEN)
```

### Publishing

Both auto and manual publishing are handled by `release.yml`:

- **Auto-publish**: Pushing to `main` with changes in `src/`, `bin/`, or `package.json` triggers a patch version bump and npm publish.
- **Manual release**: Use `release.yml` workflow dispatch for major/minor/prerelease versions.

## Licensing

- Core SDK: [GPL-3.0](LICENSE) — `SPDX-License-Identifier: GPL-3.0-only`
- Distributed code (workflows, actions, seeds, scripts in `src/`): [MIT](LICENSE-MIT) — `SPDX-License-Identifier: MIT`
- All source files include SPDX license identifiers and copyright notices
- Copyright (C) 2025-2026 Polycode Limited

## Links

- [repository0 template](https://github.com/xn-intenton-z2a/repository0) -- start here
- [Getting Started Guide](https://github.com/xn-intenton-z2a/repository0/blob/main/GETTING-STARTED.md)
- [API Reference](API.md)
- [Website](https://xn--intenton-z2a.com)
