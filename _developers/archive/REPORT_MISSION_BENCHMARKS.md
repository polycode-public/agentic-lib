# Mission Benchmark Report

## Purpose

Track pipeline performance across different missions and LLM models. Each run starts with `init --purge` on repository0 and observes the pipeline until mission accomplished or timeout.

## Run 1: hamming-distance / gpt-5-mini / continuous

| Parameter | Value |
|-----------|-------|
| Mission | hamming-distance (L0 kata) |
| Model | gpt-5-mini (default) |
| Schedule | continuous (*/15 cron) |
| agentic-lib | 7.1.46 |
| Start | 2026-03-05T00:11Z |
| Init run | [#527](https://github.com/xn-intenton-z2a/repository0/actions/runs/22695724027) |
| Init PR | [#2499](https://github.com/xn-intenton-z2a/repository0/pull/2499) |

### Observations

- **00:11** — Init dispatched with `mode=purge schedule=continuous`
- **00:12** — Init PR #2499 created, automerge triggered
- **00:12:01** — Automerge completed. Multiple supervisors fired concurrently (5 supervisors in 30s)
- **00:12:17–00:12:46** — 5 supervisor runs, concurrent reviews cancelled each other
- **00:13** — Flow stabilised: supervisor → transform → review chain completed successfully
- **00:13** — 5 open issues created (#2500-#2504) — all about plot-code-lib (stale context from pre-purge state)
- **00:25** — Cron schedule did NOT fire. Root cause: `agent-supervisor-schedule.yml` committed workflow changes as `github-actions[bot]` — GitHub does not re-register cron for bot-authored pushes
- **00:25** — Stale issues #2500-#2504 manually closed

### Fixes Applied (agentic-lib 7.1.47–7.1.48)

- **7.1.47** — Use `gh api /user` with WORKFLOW_TOKEN to resolve PAT owner identity for git commits in `agent-supervisor-schedule.yml` and `init.yml`
- **7.1.48** — Purge `docs/` directory during `init --purge`

### Run 1b: Re-init with fixes

| Parameter | Value |
|-----------|-------|
| agentic-lib | 7.1.48 |
| Re-init | 2026-03-05T01:17Z |
| Init run | [#527](https://github.com/xn-intenton-z2a/repository0/actions/runs/22697591217) |
| Init PR | [#2515](https://github.com/xn-intenton-z2a/repository0/pull/2515) |

- **01:17** — Init --purge dispatched with agentic-lib@7.1.48
- **01:18** — Init PR #2515 created with `automerge` label
- **01:18** — Automerge job ran but saw `mergeable_state: unstable` (race condition — checks still running)
- **01:19** — All checks passed, PR is CLEAN but automerge already ran and missed it
- **01:21** — Waiting for supervisor cron (~01:30Z) to pick up stuck PR and validate cron fix

### Timeline

_Watching for first cron-triggered supervisor run..._

## Planned Runs

| # | Mission | Model | Schedule | Status |
|---|---------|-------|----------|--------|
| 1 | hamming-distance | gpt-5-mini | continuous | **In progress** |
| 2 | hamming-distance | claude-sonnet-4 | continuous | Pending |
| 3 | hamming-distance | gpt-4.1 | continuous | Pending |
