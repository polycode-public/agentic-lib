# PLAN 6 — Enhanced Purge & Supervisor Context

## User Assertions (verbatim, non-negotiable)

1. Init purge should delete all open AND closed issues — a clean slate
2. Init purge should delete all old GitHub Actions workflow executions (not including the init itself)
3. Anywhere the supervisor makes a decision, the list of actions since the last init (inclusive) should be included in context, along with the changes they produced in corresponding commits
4. This information should be included in context anywhere we currently share lists of issues or GitHub discussions
5. Consider further cleanup during purge to prevent bleeding between experiments
6. Look for places where additional context will improve decision quality

---

## Analysis

### Current State (bin/agentic-lib.js `initPurgeGitHub()`, lines 985-1164)

| What | Current behaviour | Gap |
|------|-------------------|-----|
| Open issues | Closed with comment | Not deleted — closed issues remain visible |
| Closed issues | Untouched | Litter from previous experiment bleeds into next |
| Open PRs | Init PRs closed (workflow only) | Non-init PRs survive purge |
| Closed PRs | Untouched | Stale PRs from previous experiment remain |
| Workflow runs | Not touched at all | Old runs clutter the Actions tab and confuse supervisor |
| Branches | Not touched | Stale branches from previous experiment remain |
| Labels | Not touched | Labels from previous experiment may mislead agents |
| Discussions | Open ones closed, new one created | OK — but closed discussions still visible |
| GitHub Pages deployments | Not touched | Old deployments from previous experiment may be cached |

### Supervisor Context (tasks/supervise.js `gatherContext()` + `buildPrompt()`)

Currently provides:
- Open issues (with labels, age)
- Recently closed issues (last 5)
- Open PRs
- Recent workflow runs (last 10, name/status/conclusion/date only)
- Recent activity from intentïon.md log (last 20 lines)
- Mission, features, library, config, budget

**Missing:**
- No awareness of when the last init happened (epoch boundary)
- No commit-level detail from workflow runs (what changed, which files)
- No correlation between workflow runs and their resulting commits/PRs
- Workflow run summaries lack the mode/issue-number context

### Discussion Bot Context (tasks/discussions.js)

Currently provides:
- Mission, contributing, features, recent activity, config

**Missing:**
- No issue list at all
- No workflow history
- No commit history
- No awareness of init boundary

### Review Issue / Enhance Issue Context

Currently provides:
- Source code, tests, web files, docs
- The specific issue

**Missing:**
- No recent commit context (what has changed recently)
- No workflow run context (what actions were taken)

---

## Implementation Plan

### Part A: Enhanced Purge (bin/agentic-lib.js)

#### A1. Delete all issues (open + closed)

GitHub API does not support deleting issues on github.com. Realistic options:
- **Option 1**: Close all open issues + lock ALL issues (open+closed) with reason "resolved", add purge comment. This hides them from casual view.
- **Option 2**: Close all open issues + use the `state_reason: "not_planned"` close reason to distinguish purge-closed from organically-closed. Lock them all.

**Decision: Option 2** — close with `not_planned`, lock all issues, add purge comment to open ones. The lock prevents stale notifications. The `not_planned` reason distinguishes purge from resolution.

Implementation:
```
1. List ALL issues (state: 'all', per_page: 100)
2. For open issues: close with state_reason 'not_planned', add comment, lock
3. For closed issues: lock (prevents further interaction)
```

#### A2. Close and lock all PRs

```
1. List all open PRs
2. Close each PR
3. Delete the head branch for each (cleanup)
```

#### A3. Delete old workflow runs

GitHub API: `DELETE /repos/{owner}/{repo}/actions/runs/{run_id}` deletes a workflow run.

```
1. List all workflow runs (up to 100)
2. Skip the currently-running init workflow run
3. Delete all others
```

Note: This is safe because the runs are historical artifacts. The workflow files themselves are preserved.

#### A4. Delete stale branches

```
1. List all remote branches
2. Keep: main, the current branch (if not main)
3. Delete all others (agentic-lib-issue-*, copilot/*, claude/*, etc.)
```

#### A5. Clear labels

```
1. Delete all labels except GitHub defaults (bug, documentation, duplicate, enhancement,
   good first issue, help wanted, invalid, question, wontfix)
2. Recreate the pipeline labels fresh: automated, ready, in-progress, merged, automerge
```

#### A6. Remove MISSION_FAILED.md

Currently `initReseed()` removes `MISSION_COMPLETE.md` but NOT `MISSION_FAILED.md`. Add it.

#### A7. Clear GitHub Pages deployments

Not critical — the new docs/ content will overwrite on next deploy. Skip for now.

### Part B: Init Epoch Tracking

#### B1. Write init timestamp to repo

After purge completes and commits to main, record the init event so downstream agents know the epoch boundary.

Options:
- Write timestamp into `agentic-lib.toml` under a `[init]` section
- Write a separate `INIT.md` or `.init-timestamp` file
- Rely on the init commit message + git log

**Decision**: Write `init-timestamp` into `agentic-lib.toml` under `[init]` section. This is already the config file agents read, so no new file needed.

```toml
[init]
timestamp = "2026-03-07T12:00:00Z"
mode = "purge"
mission = "hamming-distance"
version = "7.1.59"
```

The init workflow already writes to `agentic-lib.toml` (for schedule/model). Extend it to write the init section.

### Part C: Enhanced Supervisor Context

#### C1. Gather workflow runs since last init (tasks/supervise.js)

In `gatherContext()`:

```js
// Read init timestamp from config
const initTimestamp = config.init?.timestamp || null;

// Fetch workflow runs since init (or last 20 if no init timestamp)
const { data: runs } = await octokit.rest.actions.listWorkflowRunsForRepo({
  ...repo, per_page: 20,
  created: initTimestamp ? `>=${initTimestamp}` : undefined,
});
```

#### C2. Correlate workflow runs with commits

For each workflow run, fetch the associated commits:

```js
for (const run of runs.workflow_runs) {
  // Get the head commit
  const commit = run.head_commit;
  const summary = {
    name: run.name,
    conclusion: run.conclusion,
    created: run.created_at,
    commitMessage: commit?.message || '',
    commitSha: run.head_sha?.substring(0, 7) || '',
    // For workflow_dispatch, extract inputs
    inputs: run.event === 'workflow_dispatch' ? '(dispatch)' : '',
  };
}
```

For transform runs that produce PRs, also fetch the PR diff stats:

```js
// If the run's branch starts with 'agentic-lib-issue-', fetch the PR
if (run.head_branch?.startsWith('agentic-lib-issue-')) {
  const { data: prs } = await octokit.rest.pulls.list({
    ...repo, head: `${repo.owner}:${run.head_branch}`, state: 'all',
  });
  if (prs.length > 0) {
    const pr = prs[0];
    summary.prNumber = pr.number;
    summary.prTitle = pr.title;
    summary.additions = pr.additions;
    summary.deletions = pr.deletions;
    summary.changedFiles = pr.changed_files;
  }
}
```

#### C3. Update supervisor prompt (tasks/supervise.js `buildPrompt()`)

Add a new section between "Recent Workflow Runs" and "Recent Activity":

```
### Actions Since Last Init (${initDate})
${actionsSummary}

Each entry shows: workflow name, outcome, commit summary, and files changed.
```

#### C4. Update discussion bot prompt (tasks/discussions.js `buildPrompt()`)

Add the same actions-since-init context:

```
### Recent Actions
${actionsSummary}

### Open Issues (${issues.length})
${issuesSummary}
```

Currently the discussion bot has NO issue awareness. Adding both actions and issues.

#### C5. Update review-issue context (tasks/review-issue.js)

Add recent commit context so the reviewer knows what has changed:

```
### Recent Commits (since init)
${commitsSummary}
```

This helps the reviewer understand whether recent changes address the issue.

### Part D: Additional Context Improvements

#### D1. Transform agent gets issue list

The transform agent (CLI `buildTransformPrompt()`) currently gets mission, features, and source code but no issue list. When running via the workflow, the issue body is passed. But the CLI transform has no issue awareness. Consider adding a summary of open issues.

#### D2. Discussions bot gets issue list

Already covered in C4.

#### D3. Supervisor gets init metadata

The supervisor prompt should include when the init happened and what mission was seeded, so it understands the experiment lifecycle.

---

## Execution Order

| Step | File(s) | Effort | Dependencies |
|------|---------|--------|-------------|
| A6 | bin/agentic-lib.js | S | None |
| A1 | bin/agentic-lib.js | M | None |
| A2 | bin/agentic-lib.js | M | None |
| A3 | bin/agentic-lib.js | M | None |
| A4 | bin/agentic-lib.js | M | None |
| A5 | bin/agentic-lib.js | M | None |
| B1 | bin/agentic-lib.js + agentic-lib-init.yml | M | A* |
| C1 | tasks/supervise.js | M | B1 |
| C2 | tasks/supervise.js | L | C1 |
| C3 | tasks/supervise.js | S | C1, C2 |
| C4 | tasks/discussions.js | M | C1 |
| C5 | tasks/review-issue.js | S | C1 |
| D1 | bin/agentic-lib.js | S | None |

S = small (< 20 lines), M = medium (20-60 lines), L = large (60+ lines)

## Risks

1. **GitHub API rate limits**: Deleting 100+ workflow runs one-by-one could hit rate limits. Mitigate with pagination and delay.
2. **Permission scope**: Deleting workflow runs requires `actions: write`. The init workflow already has `write-all`. The CLI uses `GH_TOKEN` which may need appropriate scopes.
3. **Init self-reference**: When deleting workflow runs, must not delete the currently-running init. Filter by `run_id !== currentRunId` or by `status !== 'in_progress'`.
4. **TOML write safety**: Writing the `[init]` section to `agentic-lib.toml` must not corrupt existing config. Use proper TOML serialization or careful regex replacement.
5. **Context size**: Adding commit diffs to the supervisor prompt could blow up token usage. Cap at summaries (commit message + stats), not full diffs.

## Success Criteria

- After `init --purge`, the repository has: 0 open issues, all issues locked, 0 open PRs, 0 old workflow runs, only `main` branch, clean label set, one fresh "Talk to the repository" discussion
- Supervisor prompt includes a section "Actions Since Last Init" with workflow name, outcome, commit message, and change stats
- Discussion bot prompt includes open issues and recent actions
- Review agent prompt includes recent commit summaries
- No bleeding of context from previous experiments into the current one
