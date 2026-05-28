# Competitive Landscape Report — intentïon agentic-lib

**Date:** 2026-03-03
**Author:** Claude Code (claude-opus-4-6), commissioned by Antony Cartwright

## Executive Summary

The autonomous coding agent space has exploded in Q1 2026. GitHub itself entered with "Agentic Workflows" (tech preview, February 2026), Anthropic shipped an official Claude Code GitHub Action, and OpenAI shipped a Codex GitHub Action. The community has produced dozens of autonomous coding loop projects.

**No one appears to be aware of intentïon/agentic-lib specifically.** And no one is combining all of agentic-lib's differentiators: self-hosting/bootstrapping, planning theory foundations, reusable workflow distribution to consumer repos, and Copilot SDK integration.

---

## Tier 1: Direct Competitors (GitHub Actions + LLM Loops)

These share the core architecture of running LLM agents inside GitHub Actions to autonomously modify code through branches, PRs, and issues.

### 1. GitHub Agentic Workflows — `github/gh-aw`

| | |
|---|---|
| **Stars** | 3,729 |
| **Created** | 2025-08-12 |
| **Last active** | 2026-03-03 |
| **License** | MIT |

GitHub's official "Agentic Workflows" system. Write workflows in Markdown (not YAML), run AI agents within GitHub Actions. Multi-engine support (Copilot CLI, Claude Code, OpenAI Codex), natural language authoring, safe outputs subsystem, read-only-by-default permissions, MCP server integration.

**This is the most direct competitor architecturally.** Both run AI agents inside GitHub Actions. Key differences:
- GitHub uses Markdown workflow definitions; agentic-lib uses reusable YAML workflows
- GitHub's is a CLI extension (`gh aw`); agentic-lib is an npm package with init distribution
- agentic-lib has self-hosting/bootstrapping; GitHub's does not
- agentic-lib has planning theory foundations; GitHub's does not
- GitHub has vastly more resources, brand recognition, and a 3,700-star head start

**References to intentïon:** None found.

### 2. Anthropic Claude Code Action — `anthropics/claude-code-action`

| | |
|---|---|
| **Stars** | 5,988 |
| **Created** | 2025-05-19 |
| **Last active** | 2026-03-03 |

Official GitHub Action from Anthropic. Responds to @claude mentions in PRs/issues, performs code review, implements fixes, creates PRs. Supports Anthropic API, Bedrock, Vertex AI, Foundry.

A **single action** (review/implement), not a **system of workflows**. Reactive (triggered by mentions/events), not proactive (scheduled supervisor loops). No self-hosting, no bootstrapping, no multi-workflow orchestration, no planning theory. agentic-lib could use this as a building block.

**References to intentïon:** None found.

### 3. OpenAI Codex Action — `openai/codex-action`

| | |
|---|---|
| **Stars** | 841 |
| **Created** | 2025-10-01 |
| **Last active** | 2026-03-03 |

GitHub Action that runs OpenAI Codex CLI in CI/CD pipelines. Auto-fixes CI failures, proposes code changes via PRs.

Single action, not a workflow system. Focused on CI failure repair. No scheduling, no supervisor, no bootstrapping.

**References to intentïon:** None found.

### 4. `mirrajabi/aider-github-action`

| | |
|---|---|
| **Stars** | 54 |
| **Created** | 2023-12-30 |
| **Last active** | 2025-12-30 |

Runs Aider (Paul Gauthier's AI pair programmer) inside GitHub Actions. Label an issue with "aider", it auto-creates a branch, makes changes, opens a PR.

Closest small-scale competitor to agentic-lib's issue-to-PR pipeline. Single-tool integration (Aider only), no supervisor, no scheduled workflows, no self-hosting, no multi-workflow system.

**References to intentïon:** None found.

### 5. `jamiew/clactions`

| | |
|---|---|
| **Stars** | 4 |
| **Created** | 2025-10-08 |
| **Last active** | 2026-01-28 |
| **Topics** | agents, automation, claude, github-actions |

"Adventures in Claude + GitHub Actions automations. Update websites, scrape data, respond to webhooks, plus self-repair and autonomous improve code or even the Claude setup itself."

Very similar concept — Claude in GitHub Actions with self-repair. Exploratory/experimental, not a distributable SDK. The "self-repair" and "autonomous improve the Claude setup itself" language is remarkably close to agentic-lib's self-hosting concept.

**References to intentïon:** None found.

### 6. `cmAIdx/headless-claude-automation-template`

| | |
|---|---|
| **Stars** | 7 |
| **Created** | 2026-02-28 |
| **Last active** | 2026-03-03 |
| **Topics** | ai-agents, autonomous-coding, ci-cd, claude, github-actions, headless-agents, multi-agent |

"A reusable template for autonomous software delivery using headless Claude agents. Feed a requirements doc in, review pull requests out."

Reusable template approach similar to agentic-lib's template-repo model. Focused on Claude headless mode only, no self-hosting, no Copilot SDK, no multi-engine support, no planning theory. Very new (1 week old).

**References to intentïon:** None found.

### 7. `YoavLax/AutonomousCommitAgent` + `YoavLax/AutonomousRepo`

| | |
|---|---|
| **Stars** | 1 each |
| **Created** | 2026-01-27 |
| **Last active** | 2026-03-03 |
| **Topics** | agent, agentic-development, ai, copilot-sdk |

Autonomous agent making intelligent daily commits using GitHub Copilot SDK. The companion `AutonomousRepo` states: "This repository is entirely developed and maintained by GitHub Copilot SDK Agent."

Uses Copilot SDK (same as agentic-lib). The `AutonomousRepo` concept is similar to repository0 — a repo that evolves autonomously. Trivial scope (daily commits), no workflow system, no planning theory, no supervisor.

**References to intentïon:** None found.

---

## Tier 2: Adjacent Projects (Autonomous Agents, Different Architecture)

These share the goal of autonomous code improvement but don't run inside GitHub Actions or have different orchestration.

### 8. `AnandChowdhary/continuous-claude`

| | |
|---|---|
| **Stars** | 1,237 |
| **Created** | 2025-11-15 |
| **Last active** | 2026-03-03 |
| **Topics** | ai, ai-agents, claude, claude-code, continuous-ai |

"Ralph loop with PRs: Run Claude Code in a continuous loop, autonomously creating PRs, waiting for checks, and merging."

The "Ralph loop" pattern — continuous improvement from a terminal. Similar to agentic-lib's supervisor cycle but CLI-based (not GitHub Actions native), single-context-window loops, no multi-workflow system, no Copilot SDK, no bootstrapping, no planning theory.

**References to intentïon:** None found.

### 9. `alekspetrov/pilot`

| | |
|---|---|
| **Stars** | 163 |
| **Created** | 2026-01-26 |
| **Last active** | 2026-03-02 |
| **Topics** | agentic, agentic-workflow, ai-agent, autonomous-coding, claude, claude-code, dev-bot |

"AI that ships your tickets — autonomous dev pipeline with Claude Code." Picks up tickets from GitHub Issues, Linear, Jira, Asana, plans implementation, writes code, runs quality gates, opens PRs.

Similar ticket-to-PR pipeline. Runs as an external service (not within GitHub Actions), requires Claude API key, no self-hosting, no Copilot SDK, no bootstrapping.

**References to intentïon:** None found.

### 10. `SWE-agent/SWE-agent`

| | |
|---|---|
| **Stars** | 18,618 |
| **Created** | 2024-04-02 |
| **Last active** | 2026-03-03 |

"SWE-agent takes a GitHub issue and tries to automatically fix it, using your LM of choice." NeurIPS 2024 paper.

Pioneering academic project for issue-to-fix. Standalone tool (not CI-native), focused on benchmarking (SWE-bench), requires external compute, no GitHub Actions integration, no self-hosting.

**References to intentïon:** None found.

### 11. `AutoCodeRoverSG/auto-code-rover`

| | |
|---|---|
| **Stars** | 3,059 |
| **Created** | 2024-04-08 |
| **Last active** | 2026-03-03 |

"Project structure aware autonomous software engineer aiming for autonomous program improvement." 46.2% pass on SWE-bench verified.

The "autonomous program improvement" goal aligns exactly. Research tool (not CI-native), Python-based standalone, no GitHub Actions, no self-hosting.

**References to intentïon:** None found.

### 12. `tzachbon/smart-ralph`

| | |
|---|---|
| **Stars** | 230 |
| **Created** | 2026-01-11 |
| **Last active** | 2026-03-03 |
| **Topics** | agentic-coding, autonomous-coding, claude, claude-code, ralph-wiggum, spec-driven-development |

"Spec-driven development with smart compaction. Claude Code plugin combining Ralph Wiggum loop with structured specification workflow."

Spec-driven approach has parallels to agentic-lib's MISSION.md/FEATURES.md pattern. Claude Code plugin (not GitHub Actions), no CI/CD integration, no self-hosting.

**References to intentïon:** None found.

### 13. `drivecore/mycoder`

| | |
|---|---|
| **Stars** | 565 |
| **Created** | 2025-02-07 |
| **Last active** | 2026-03-02 |
| **Topics** | agent, agentic, ai, claude, coder, swe-agent |

"Simple to install, powerful command-line based AI agent system for coding." General-purpose coding agent. Not CI/CD native, no GitHub Actions, no self-hosting.

**References to intentïon:** None found.

### 14. GitHub Copilot Coding Agent (First-Party)

Built into GitHub. Assign an issue to "Copilot" and it creates a branch, plans, codes, tests, and opens a PR. Runs in GitHub Actions environment. Now GA for all paid plans.

First-party closed-source product doing much of what agentic-lib does. No self-hosting/bootstrapping, no open-source workflow system, no planning theory, no consumer repo distribution pattern.

### 15. `openai/codex`

| | |
|---|---|
| **Stars** | 62,859 |
| **Created** | 2025-04-13 |
| **Last active** | 2026-03-03 |

"Lightweight coding agent that runs in your terminal." Now available as a coding agent within GitHub (assignable to issues). Massive project, primarily a CLI tool + GitHub integration. Not a reusable workflow system.

---

## Tier 3: Partial Overlap

### 16. `qodo-ai/pr-agent` — 10,362 stars
PR review only. /review, /describe, /improve commands. No autonomous coding loops.

### 17. `sweepai/sweep` — 7,644 stars
Originally "AI-powered bot that turns GitHub issues into code changes." Has pivoted to a JetBrains coding assistant. The original concept was very close to agentic-lib's.

### 18. `sourceant/sourceant` — 197 stars
Open-source AI-assisted code reviews and agentic automation. Overlaps with review capabilities, narrower scope.

### 19. `github/copilot-sdk` — 7,532 stars (Official)
Multi-platform SDK for integrating GitHub Copilot Agent. agentic-lib **builds on** this SDK. The SDK is a building block, not a competitor — but every project using it is potentially competitive.

### 20. `SylphAI-Inc/adal-cli` — 46 stars
"Self-evolving coding agent that learns from your entire team and codebase." Commercial product, not CI-native.

### 21. `skullninja/coco-workflow` — 4 stars
Autonomous spec-driven development plugin for Claude Code. Full pipeline from PRD to PR. Claude Code plugin, not GitHub Actions.

### 22. `icksaur/caco` — 0 stars
Self-modifying Copilot-CLI SDK localhost client/server. Conceptually close (self-modifying + Copilot SDK) but localhost only, no CI/CD.

### 23. `krzysztofdudek/Yggdrasil` — 4 stars
Persistent semantic memory for AI agents. "Makes repositories self-aware." The repository self-awareness concept aligns with agentic-lib's planning documents approach. Different mechanism (semantic graph vs. planning documents).

---

## Are They Looking at Us?

### Search Results for "agentic-lib", "xn-intenton-z2a", "intentïon"

All code search results trace back to:

1. **Own repositories:** `xn-intenton-z2a/agentic-lib`, `xn-intenton-z2a/repository0`, and other org repos
2. **Own related repos:** `polycode-projects/bitpack-encoder`, `polycode-projects/apply-fixes-sarif-lib`, `antonycc/submit.diyaccounting.co.uk`
3. **Automated data collectors** (passive, no editorial awareness):
   - `rumca-js/RSS-Link-Database-2025` — RSS feed scraper that captured a Reddit r/programming post mentioning agentic-lib (2025-02-25)
   - `berkayzuhre/github-event-monitor` — GitHub event pipeline that captured push events
   - `SamuelSVG/Memoire` — academic study collecting GitHub repository metrics
   - `m7md6l3t/repos_finder` — automated repo discovery tool

**Verdict: No. Nobody is looking at us.** Zero external references with editorial awareness. Zero stars from outside the organisation. The only external trace is an RSS scraper that passively captured a Reddit mention from February 2025.

---

## Comparison Matrix

| Project | Stars | Architecture | Self-Hosting | Planning Theory | Copilot SDK | Multi-Workflow | Active |
|---------|------:|-------------|:-----------:|:--------------:|:-----------:|:-------------:|:------:|
| **intentïon/agentic-lib** | **0** | **GH Actions (reusable)** | **Yes** | **Yes** | **Yes** | **Yes (9 handlers)** | **Yes** |
| github/gh-aw | 3,729 | GH Actions (Markdown) | No | No | Yes (multi) | Yes (template) | Yes |
| anthropics/claude-code-action | 5,988 | GH Action (single) | No | No | No | No | Yes |
| openai/codex-action | 841 | GH Action (single) | No | No | No | No | Yes |
| Copilot Coding Agent (1P) | N/A | GH Actions (proprietary) | No | No | Yes (internal) | Yes | Yes |
| continuous-claude | 1,237 | CLI loop | No | No | No | No | Yes |
| pilot | 163 | External service | No | No | No | No | Yes |
| SWE-agent | 18,618 | Standalone tool | No | No | No | No | Yes |
| auto-code-rover | 3,059 | Standalone tool | No | No | No | No | Yes |
| smart-ralph | 230 | Claude plugin | No | No | No | No | Yes |
| clactions | 4 | GH Actions (exp.) | Self-repair | No | No | Partial | Yes |

---

## Strategic Implications

1. **github/gh-aw is the project to watch.** It validates agentic-lib's entire thesis but with GitHub's distribution advantage. It launched 3 weeks ago and already has 3,729 stars.

2. **The unique differentiators hold.** No competitor combines: self-hosting/bootstrapping + planning theory + reusable workflow distribution + multi-handler architecture + Copilot SDK. These are genuine moats.

3. **The zero-awareness problem is the most urgent issue.** The project needs visibility before the space consolidates around GitHub's official solution. The technical advantage is real but meaningless without users.

4. **The "Ralph loop" community is large.** continuous-claude (1,237 stars), smart-ralph (230 stars), and dozens of smaller projects represent a simpler approach that has mindshare. agentic-lib is more sophisticated but less visible.

5. **Big players validated the market.** Anthropic (5,988 stars), OpenAI (841 stars), and GitHub all now have official GitHub Actions for autonomous coding. This is good for market education but creates formidable competition.

6. **The Copilot SDK integration is a differentiator.** Most competitors use direct API calls to Claude or GPT. agentic-lib's Copilot SDK integration means zero API key management — a genuine UX advantage for GitHub-native users.

---

## References

### Tier 1 Projects
- [github/gh-aw](https://github.com/github/gh-aw)
- [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action)
- [openai/codex-action](https://github.com/openai/codex-action)
- [mirrajabi/aider-github-action](https://github.com/mirrajabi/aider-github-action)
- [jamiew/clactions](https://github.com/jamiew/clactions)
- [cmAIdx/headless-claude-automation-template](https://github.com/cmAIdx/headless-claude-automation-template)
- [YoavLax/AutonomousCommitAgent](https://github.com/YoavLax/AutonomousCommitAgent)

### Tier 2 Projects
- [AnandChowdhary/continuous-claude](https://github.com/AnandChowdhary/continuous-claude)
- [alekspetrov/pilot](https://github.com/alekspetrov/pilot)
- [SWE-agent/SWE-agent](https://github.com/SWE-agent/SWE-agent)
- [AutoCodeRoverSG/auto-code-rover](https://github.com/AutoCodeRoverSG/auto-code-rover)
- [tzachbon/smart-ralph](https://github.com/tzachbon/smart-ralph)
- [drivecore/mycoder](https://github.com/drivecore/mycoder)
- [openai/codex](https://github.com/openai/codex)

### Tier 3 Projects
- [qodo-ai/pr-agent](https://github.com/qodo-ai/pr-agent)
- [sweepai/sweep](https://github.com/sweepai/sweep)
- [sourceant/sourceant](https://github.com/sourceant/sourceant)
- [github/copilot-sdk](https://github.com/github/copilot-sdk)
- [SylphAI-Inc/adal-cli](https://github.com/SylphAI-Inc/adal-cli)
- [skullninja/coco-workflow](https://github.com/skullninja/coco-workflow)
- [icksaur/caco](https://github.com/icksaur/caco)
- [krzysztofdudek/Yggdrasil](https://github.com/krzysztofdudek/Yggdrasil)

### Press & Blog Posts
- [GitHub Blog: Automate repository tasks with GitHub Agentic Workflows](https://github.blog/ai-and-ml/automate-repository-tasks-with-github-agentic-workflows/)
- [GitHub Blog: GitHub Agentic Workflows Technical Preview](https://github.blog/changelog/2026-02-13-github-agentic-workflows-are-now-in-technical-preview/)
- [GitHub Blog: Build an agent into any app with the GitHub Copilot SDK](https://github.blog/news-insights/company-news/build-an-agent-into-any-app-with-the-github-copilot-sdk/)
- [The New Stack: GitHub Agentic Workflows Overview](https://thenewstack.io/github-agentic-workflows-overview/)
- [InfoQ: GitHub Agentic Workflows](https://www.infoq.com/news/2026/02/github-agentic-workflows/)
- [How to Build Self-Improving Coding Agents](https://ericmjl.github.io/blog/2026/1/17/how-to-build-self-improving-coding-agents-part-1/)
- [GitHub Copilot Coding Agent Docs](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)
