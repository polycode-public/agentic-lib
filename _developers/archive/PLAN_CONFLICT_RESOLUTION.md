# Plan: PR Merge Conflict Resolution

## User Assertions (non-negotiable)

- Extend `fix-code` task to handle merge conflicts (not just failing checks)
- Two tiers: shell-level auto-resolve for trivial conflicts, LLM for complex ones
- `agentic-lib-workflow.yml` should detect stuck/conflicting PRs and invoke fix-code
- Do NOT delete PRs with conflicts — resolve them instead (deleting is wasteful)

## Problem

When a PR branch (e.g. `agentic-lib-issue-2563`) has merge conflicts with main:

1. **Current behaviour**: `pr-cleanup` closes stale conflicting PRs after 3 days, or removes the `automerge` label from fresh ones. All transform work is lost.
2. **`fix-stuck` job**: Only triggers on failing *checks* — it doesn't detect merge conflicts at all.
3. **Root cause**: While a PR waits for review/merge, other PRs merge to main and the branch diverges. Files like `intentïon.md` are the most common conflict source (fixed separately in PR #1844), but code conflicts also occur when multiple issues touch overlapping files.

## Design: Two-Tier Conflict Resolution

### Tier 1: Shell-level auto-resolve (no LLM, fast, free)

Run before the LLM tier. Handles predictable, trivial conflicts.

**Where**: New step in `fix-stuck` job, between "Checkout PR branch" and "Fix failing code".

**Logic**:
```bash
# Attempt to merge main into the PR branch
git fetch origin main
git merge origin/main --no-edit || {
  # Check if all conflicts are in trivial files
  CONFLICTED=$(git diff --name-only --diff-filter=U)
  TRIVIAL_PATTERN='intentïon\.md|intention\.md|package-lock\.json'
  NON_TRIVIAL=$(echo "$CONFLICTED" | grep -vE "$TRIVIAL_PATTERN" || true)

  if [ -z "$NON_TRIVIAL" ]; then
    # All conflicts are trivial — auto-resolve
    for f in $CONFLICTED; do
      case "$f" in
        *intentïon.md|*intention.md)
          # Take main's version (log file is append-only, branch version is stale)
          git checkout --theirs "$f"
          ;;
        package-lock.json)
          # Regenerate
          git checkout --theirs "$f"
          npm install
          ;;
      esac
      git add "$f"
    done
    git commit --no-edit
    echo "CONFLICTS_RESOLVED=trivial" >> $GITHUB_OUTPUT
  else
    # Non-trivial conflicts — abort merge, hand off to LLM tier
    git merge --abort
    echo "CONFLICTS_RESOLVED=none" >> $GITHUB_OUTPUT
    echo "NON_TRIVIAL_FILES=$NON_TRIVIAL" >> $GITHUB_OUTPUT
  fi
}
```

**Trivial conflict files** (always auto-resolvable):
- `intentïon.md` / `intention.md` — take main's version (branch shouldn't modify it per PR #1844)
- `package-lock.json` — regenerate via `npm install`

### Tier 2: LLM-powered resolution (via fix-code task)

When Tier 1 can't resolve all conflicts, fall back to the Copilot SDK.

**Changes to `fix-code.js`**:

1. **Detect conflict state**: Before checking for failing checks, check if the PR has merge conflicts (`mergeable_state === 'dirty'`).
2. **If conflicting**: Merge main, extract conflict markers, send to LLM with context from both sides.
3. **Prompt**: Include the conflicted file(s) with `<<<<<<<`/`=======`/`>>>>>>>` markers, the PR description, the issue it resolves, and instructions to resolve preserving the PR's intent.

```javascript
// In fix-code.js, new early path:
const { data: pr } = await octokit.rest.pulls.get({ ...repo, pull_number: Number(prNumber) });

if (pr.mergeable_state === 'dirty' || pr.mergeable === false) {
  return await resolveConflicts({ octokit, repo, config, pr, model, writablePaths, testCommand });
}

// Existing failing-checks path continues below...
```

**New function `resolveConflicts()`**:
```javascript
async function resolveConflicts({ octokit, repo, config, pr, model, writablePaths, testCommand }) {
  // The workflow step has already attempted `git merge origin/main`
  // and Tier 1 has handled trivial files. Remaining conflicts are in
  // files listed in the NON_TRIVIAL_FILES env var.

  // Read each conflicted file (with conflict markers)
  const conflictedFiles = (process.env.NON_TRIVIAL_FILES || "")
    .split("\n").filter(Boolean);

  if (conflictedFiles.length === 0) {
    return { outcome: "nop", details: "No non-trivial conflicts to resolve" };
  }

  // Read conflicted content (contains <<<<<<< / ======= / >>>>>>> markers)
  const conflicts = conflictedFiles.map(f => ({
    name: f,
    content: readFileSync(f, "utf8"),
  }));

  const prompt = [
    "## Task: Resolve Merge Conflicts",
    "",
    `PR #${pr.number}: ${pr.title}`,
    pr.body || "(no description)",
    "",
    "The PR branch has been merged with main but has conflicts.",
    "Resolve each conflict by keeping the PR's intended changes",
    "while incorporating any non-conflicting updates from main.",
    "",
    "## Conflicted Files",
    ...conflicts.map(f =>
      `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``
    ),
    "",
    "## Instructions",
    "1. Write resolved versions of each conflicted file",
    "2. Remove ALL conflict markers (<<<<<<, =======, >>>>>>>)",
    "3. Preserve the PR's feature/fix intent",
    "4. Run tests to validate: `" + testCommand + "`",
  ].join("\n");

  const { tokensUsed, inputTokens, outputTokens, cost } = await runCopilotTask({
    model,
    systemMessage: "You are resolving git merge conflicts. ...",
    prompt,
    writablePaths,
    tuning: config.tuning || {},
  });

  return {
    outcome: "conflicts-resolved",
    tokensUsed, inputTokens, outputTokens, cost, model,
    details: `Resolved ${conflicts.length} conflicted file(s) on PR #${pr.number}`,
  };
}
```

### Workflow Changes (`agentic-lib-workflow.yml`)

#### 1. `pr-cleanup` job: Stop deleting conflicting PRs

Replace lines 200-218 (the `dirty`/`false` branch):

**Before**: Close stale PRs, remove automerge from fresh ones.
**After**: Flag conflicting PRs for the `fix-stuck` job to resolve.

```yaml
# Instead of closing or removing label, set an output
} else if (fullPr.mergeable_state === 'dirty' || fullPr.mergeable === false) {
  core.info(`PR #${pr.number} has conflicts — will attempt resolution`);
  conflictingPRs.push(pr.number);
}
```

#### 2. `fix-stuck` job: Detect conflicts in addition to failing checks

Extend the PR scanning logic (lines 453-484) to also find PRs with `mergeable_state === 'dirty'`:

```javascript
// Existing: check for failing checks
const hasFailing = checkRuns.check_runs.some(c => c.conclusion === 'failure');

// NEW: check for merge conflicts
const { data: fullPr } = await github.rest.pulls.get({
  owner, repo, pull_number: pr.number,
});
const hasConflicts = fullPr.mergeable_state === 'dirty' || fullPr.mergeable === false;

if (!hasFailing && !hasConflicts) continue;
```

#### 3. `fix-stuck` job: Add Tier 1 step before LLM fix

Insert between "Checkout PR branch" and "Fix failing code":

```yaml
- name: Auto-resolve trivial conflicts
  if: env.FIX_PR_NUMBER != ''
  id: trivial-resolve
  run: |
    git fetch origin main
    if ! git merge origin/main --no-edit 2>/dev/null; then
      CONFLICTED=$(git diff --name-only --diff-filter=U)
      TRIVIAL_PATTERN='intentïon\.md|intention\.md|package-lock\.json'
      NON_TRIVIAL=$(echo "$CONFLICTED" | grep -vE "$TRIVIAL_PATTERN" || true)
      if [ -z "$NON_TRIVIAL" ]; then
        for f in $CONFLICTED; do
          git checkout --theirs "$f"
          git add "$f"
        done
        npm install 2>/dev/null || true  # regenerate lock if needed
        git add package-lock.json 2>/dev/null || true
        git commit --no-edit
        echo "resolved=trivial" >> $GITHUB_OUTPUT
      else
        git merge --abort
        echo "resolved=none" >> $GITHUB_OUTPUT
        echo "non_trivial<<EOF" >> $GITHUB_OUTPUT
        echo "$NON_TRIVIAL" >> $GITHUB_OUTPUT
        echo "EOF" >> $GITHUB_OUTPUT
      fi
    else
      echo "resolved=clean" >> $GITHUB_OUTPUT
    fi
```

#### 4. Conditional LLM invocation

Only invoke fix-code LLM if:
- Tier 1 didn't resolve everything (`resolved != 'trivial'` and `resolved != 'clean'`), OR
- There are still failing checks after conflict resolution

```yaml
- name: Fix failing code or resolve complex conflicts
  if: |
    env.FIX_PR_NUMBER != '' &&
    (steps.trivial-resolve.outputs.resolved == 'none' ||
     steps.trivial-resolve.outputs.resolved == '')
  uses: ./.github/agentic-lib/actions/agentic-step
  env:
    NON_TRIVIAL_FILES: ${{ steps.trivial-resolve.outputs.non_trivial }}
  with:
    task: "fix-code"
    ...
```

## File Changes Summary

| File | Change |
|------|--------|
| `src/actions/agentic-step/tasks/fix-code.js` | Add conflict detection + `resolveConflicts()` function |
| `.github/workflows/agentic-lib-workflow.yml` | (1) pr-cleanup: stop deleting conflicting PRs, (2) fix-stuck: detect conflicts + Tier 1 auto-resolve step + conditional LLM |
| `src/agents/agent-apply-fix.md` | Update instructions to cover conflict resolution scenario |

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| LLM resolves conflict incorrectly | Tests must pass after resolution; commit-if-changed only pushes if tests pass |
| Infinite fix loops on unresolvable conflicts | Existing `maxFixAttempts` (3) limit still applies; after 3 failed attempts, remove automerge label |
| Tier 1 takes wrong side of conflict | Only used for files we're certain about (log files → main, lock files → regenerate) |
| `mergeable_state` not yet computed by GitHub | GitHub API sometimes returns `null` for mergeable. Skip these — next cycle will pick them up |
| Concurrent fix attempts on same PR | Existing concurrency groups prevent this |

## Success Criteria

1. PR with `intentïon.md` conflict is auto-resolved without LLM (Tier 1)
2. PR with code conflict is resolved by LLM (Tier 2) and tests pass
3. No more PRs closed/deleted due to merge conflicts
4. `maxFixAttempts` limit still works as a safety valve
5. Fix attempts are logged to intentïon.md (on main, after merge)

## Immediate Unblock (PR #2564)

PR #1844 prevents the `intentïon.md` conflict from recurring. For the existing PR #2564 in repository0, either:
- Manually resolve: `git merge origin/main`, take main's `intentïon.md`, push
- Wait for this plan to be implemented and let it auto-resolve
- Close and re-run (wasteful but works)

Once PR #1844 is merged and init'd to repository0, new PRs won't have this conflict.
