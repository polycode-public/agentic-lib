# Plan: Pipeline Improvements for Mission Completion

## Context

Running benchmark Run 1 (hamming-distance / gpt-5-mini / continuous) revealed structural issues in the autonomous pipeline that would prevent or slow mission completion regardless of model capability. This plan catalogues those issues by severity and proposes fixes.

## Critical: The Loop Is Not Closed

### C1. Transform pushes directly to main — no PR, no CI gate

**Current:** `agent-flow-transform.yml` checks out `main`, runs the `transform` task, then `commit-if-changed` pushes directly to `${{ github.ref_name }}` (which is `main`). Code lands without any CI test or review.

**Impact:** Broken code can land on main with no gate. The review step runs *after* code is on main — it's retroactive, not preventive. The automerge workflow exists but is never triggered because no PR is created.

**Fix:** Transform should create a feature branch (`agentic-lib-issue-<N>`), push there, and open a PR with `automerge` label. This activates the existing CI → automerge → review chain.

**Alternative:** Wire up `resolve-issue` (which already exists as dead code) instead of `transform` for issue-targeted work.

### C2. Automerge races with checks

**Current:** The automerge job in `ci-automerge.yml` runs as part of the PR workflow, which triggers before checks complete. It sees `mergeable_state: unstable` and skips. No retry mechanism exists.

**Impact:** PRs with `automerge` label sit open until the next supervisor cycle (up to 15 minutes). During benchmarks this adds 15-minute latency per code change.

**Fix options:**
- (a) Trigger automerge from `check_suite: completed` (not from PR workflow)
- (b) Add automerge as a step in the `test.yml` workflow after all tests pass
- (c) Have the supervisor check for stuck automerge PRs and re-trigger

### C3. `resolve-issue` task is dead code

**Current:** `resolve-issue.js` exists and is registered in TASKS but no workflow invokes it. It was designed for per-issue branches but the wiring was never completed.

**Impact:** The pipeline has no issue-targeted code generation path. `transform` picks whichever issue interests the LLM, with no guarantee it addresses `ready`-labeled issues.

**Fix:** Either wire `resolve-issue` into `agent-flow-transform.yml` (replacing `transform`) or merge its issue-targeting logic into the `transform` task.

## High: Bottlenecks That Slow Convergence

### H1. Review processes only one issue per run

**Current:** `review-issue.js` targets the oldest `automated` issue, skipping those reviewed in the last 24 hours. One issue per review dispatch.

**Impact:** With 5 open issues, it takes 5 sequential supervisor→review cycles (potentially 75 minutes at */15 cron) to review them all. Meanwhile new issues keep being created.

**Fix:** Process up to 3 issues per review run (batch mode). Or dispatch multiple review workflows concurrently.

### H2. Enhance processes only one issue per run

**Current:** `enhance-issue.js` picks the first issue without the `ready` label and adds acceptance criteria + `ready`. One per run.

**Impact:** Same bottleneck as H1. New issues sit without `ready` for multiple cycles.

**Fix:** Batch 2-3 issues per enhance run.

### H3. Transform is not issue-targeted

**Current:** The `transform` task presents all open issues to the LLM and lets it choose. The LLM may pick the most "interesting" issue rather than the oldest `ready` one.

**Impact:** Some issues never get addressed. The LLM may repeatedly work on the same topic.

**Fix:** Pass the specific issue number (oldest with `ready` label) as context to the transform task. The supervisor already knows which issue is `ready`.

### H4. Concurrency group cancellation during rapid cycles

**Current:** `agent-flow-transform.yml` uses `concurrency: agentic-lib-transform, cancel-in-progress: true`. When supervisors fire concurrently (e.g. 5 in 30 seconds), each cancels the previous transform.

**Impact:** In Run 1, 5 supervisors fired in 30 seconds and cancelled each other's transforms. Only the last one completed.

**Fix:** The supervisor should not dispatch transform if one is already running. Check `gh run list --workflow agent-flow-transform.yml --status in_progress` before dispatching.

## Medium: Data Quality — LLM Makes Poor Decisions

### M1. Source/test content truncated to 2000 chars per file, max 10 files

**Current:** `scanDirectory` in `copilot.js` caps file content at 2000 chars and limits to 10 files.

**Impact:** For repos with >10 files or files >2000 chars, the LLM operates on incomplete code. Review verdicts and transform decisions are based on partial context.

**Fix:** Increase limits (e.g. 5000 chars, 20 files). Or use intelligent selection — only include files relevant to the issue being resolved.

### M2. fix-code gets minimal diagnostic info

**Current:** `fix-code.js` reads `checkRun.output?.summary` — GitHub Actions check run summaries are often empty or minimal. The actual test stdout/stderr is not fetched.

**Impact:** The fix-code LLM has almost no information about what actually failed. Fixes are speculative.

**Fix:** Fetch the workflow run logs via `gh api repos/{owner}/{repo}/actions/runs/{run_id}/logs` and extract the test output. Or capture test output in a build artifact and read that.

### M3. Feature content capped at 500 chars in transform

**Current:** `scanDir(config.featuresPath, ".md")` in `buildTransformPrompt` uses defaults that cap feature content.

**Impact:** Feature specifications are truncated — the LLM sees partial requirements.

**Fix:** Increase feature content limit to 2000+ chars.

### M4. `scanDirectory` path concatenation bug

**Current:** `copilot.js` line 163: `readFileSync(`${dirPath}${f}`)` — no path separator between directory and filename. Works only if `dirPath` ends with `/`.

**Impact:** Any TOML config path without a trailing `/` silently produces empty file reads.

**Fix:** Use `path.join(dirPath, f)` instead of string concatenation.

## Low: Broken Features

### L1. `respond:discussions` action discards params

**Current:** `supervise.js` parses `message` and `discussion-url` from the LLM's `respond:discussions:...` action but dispatches `agent-discussions-bot` with empty `inputs: {}`.

**Impact:** Supervisor discussion responses go nowhere.

**Fix:** Forward `message` and `discussion-url` to the workflow dispatch inputs.

### L2. `set-schedule` may fail silently

**Current:** The supervisor dispatches `agent-supervisor-schedule.yml` using `GITHUB_TOKEN`. That workflow needs `WORKFLOW_TOKEN` to push workflow files to main.

**Impact:** If `GITHUB_TOKEN` lacks sufficient permissions, the schedule change silently fails.

**Fix:** Document that `WORKFLOW_TOKEN` must be available, or have the supervisor use `WORKFLOW_TOKEN` for this specific dispatch.

### L3. Review agent prompt mentions `docs/` check but gets no docs context

**Current:** `agent-review-issue.md` says "check that evidence artifacts exist under `docs/`" but `review-issue.js` never passes docs directory content to the LLM.

**Impact:** Evidence checks in review are impossible — the LLM cannot see the docs directory.

**Fix:** Include `docs/` listing in the review context.

### L4. `attempts-per-branch` config is loaded but never used

**Current:** Dead configuration key — loaded in config-loader.js but never referenced by any task handler.

**Impact:** False confidence in branch-level retry limits that don't exist.

**Fix:** Either implement or remove.

## Prioritised Execution Order

For progressing through benchmark scenarios, the recommended order is:

1. **C1 + C2** — Transform → PR → CI → automerge chain (closes the loop)
2. **H3 + H4** — Issue-targeted transforms without cancellation storms
3. **M2** — Better diagnostic info for fix-code
4. **H1 + H2** — Batch review/enhance
5. **M1 + M3** — Better context limits
6. **M4** — Path concatenation bug
7. **L1-L4** — Broken features cleanup

## Expected Impact on Benchmarks

| Improvement | L0 kata impact | L1-L2 impact | L3+ impact |
|-------------|----------------|--------------|------------|
| PR-based transform (C1+C2) | Prevents broken code on main | Critical — larger changes need CI gate | Critical |
| Issue-targeted transform (H3) | Faster convergence | Much faster — stops the LLM wandering | Essential |
| Batch review/enhance (H1+H2) | Moderate speedup | Significant — reduces cycle count | Significant |
| Better fix-code diagnostics (M2) | Moderate | High — complex test failures need context | Critical |
| Larger context limits (M1+M3) | Minimal | Moderate | High — more code to reason about |

## Notes

- These improvements are model-independent — they help gpt-5-mini, claude-sonnet-4, and gpt-4.1 equally
- The automerge race (C2) is the most immediately actionable fix
- The transform-to-PR change (C1) is the highest architectural impact
- All fixes should be tested against the L0 hamming-distance mission before benchmarking higher levels
