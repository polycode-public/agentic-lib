# Plan: Benchmark Report 005 Fixes

**Source**: [BENCHMARK_REPORT_005.md](BENCHMARK_REPORT_005.md)
**Created**: 2026-03-09
**Status**: implemented — all 8 work items done + 5 additional fixes from benchmark 006 testing

---

## User Assertions

1. Explain each failure from the manual test runs
2. Fix all issues from BENCHMARK_REPORT_005.md
3. Apply multiple non-conflicting mitigations where possible
4. New feature: `agentic-lib-test.yml` creates GitHub issues with `instability` label on failure
5. New feature: telemetry job in `agentic-lib-workflow.yml` mechanically prioritises `instability` issues for dev

---

## Analysis of Manual Test Runs

### Q1: What bug was introduced between runs 22846681853 (pass) and 22847401310 (fail)?

**Bug**: `@vitest/expect` Symbol collision with Playwright's built-in expect.

```
TypeError: Cannot redefine property: Symbol($$jest-matchers-object)
    at node_modules/@vitest/expect/dist/index.js:680:9
```

The dev job's transform in run 22846681853 committed code that introduced (or caused to be resolved) the `@vitest/expect` package into the dependency tree. When the behaviour tests ran in the next cycle (run 22847401310), Playwright's built-in expect and `@vitest/expect` both attempted to define `Symbol($$jest-matchers-object)` as a global — the second definition fails because the property was already defined as non-configurable.

**Root cause**: The pre-commit test gate (`pre-commit-test` step in the dev job, line 1006) only runs **unit tests** (`npm test`). It does NOT run behaviour tests (`npm run test:behaviour`). A transform that breaks Playwright will pass the gate and get merged to main.

**What could prevent it**: Run behaviour tests as part of the pre-commit gate, OR add a dependency audit step that detects `@vitest/expect` being pulled into the Playwright test environment. See **W1** below.

### Q2: Why didn't run 22847720006 fix the problem?

Run 22847720006 was dispatched by the dispatch-fix mechanism from run 22847401310's failure. The full `agentic-lib-workflow` ran, but:

1. **The dispatch message doesn't flow to dev's issue selection.** The `message` field said "Build broken on main: agentic-lib-test run 22847401310 failed" — but the dev job picks the oldest issue with the `ready` label (line 964-975). The message is consumed by the **supervisor**, which creates a new issue. The dev job then picks the oldest `ready` issue, which may be an older unrelated issue, not the one the supervisor just created for the broken build.

2. **The supervisor created an issue, but timing matters.** The supervisor runs before dev, but the issue it creates needs the `ready` label for dev to pick it up. If the supervisor's issue isn't labelled `ready`, or if an older `ready` issue exists, dev works on the wrong thing.

3. **Even if dev worked on the right issue**, the min profile's limited context (4000 source chars) makes it unlikely the LLM would understand the vitest/Playwright Symbol collision from a truncated error message.

### Q3: Why didn't run 22847720006 dispatch a fix, and where is this configured?

The `dispatch-fix` job in `agentic-lib-test.yml` (line 119-124) has this condition:

```yaml
if: >-
  !cancelled()
  && github.ref == 'refs/heads/main'
  && (github.event_name == 'push' || github.event_name == 'schedule')
  && github.repository != 'xn-intenton-z2a/agentic-lib'
  && (needs.test.result == 'failure' || needs.behaviour.result == 'failure')
```

Run 22847720006 was triggered via **`workflow_dispatch`** (dispatched by the previous run). Since `workflow_dispatch` does not match `(github.event_name == 'push' || github.event_name == 'schedule')`, the dispatch-fix job was **skipped by design**.

This is configured in `agentic-lib/.github/workflows/agentic-lib-test.yml` line 122. The intent is to only auto-dispatch fixes when tests fail on organic triggers (push/schedule), not on fix-dispatches — to avoid infinite dispatch loops. Combined with the circuit breaker (>= 3 dispatches in 30 min, line 140), this forms a two-layer protection against runaway fixes.

**However**, this means a dispatch-triggered test run that still fails will NOT trigger another fix attempt. The pipeline relies on the next scheduled run (hourly cron at `:10`) to detect the ongoing failure.

### Q4: Why did run 22848259441 also fail to fix the problem?

This was a scheduled run. The dev job ran and **did fix the vitest crash** (added `npx playwright install --with-deps`), but introduced a **new problem**: the FizzBuzz demo HTML now renders 100 items instead of the 15 expected by the Playwright test assertion:

```
Expected: 15 elements matching '#fizzbuzz-demo li'
Received: 100 elements
```

The dev job again only runs unit tests as a pre-commit gate, so this behaviour test regression was merged to main. Then the dispatch-fix job tried to dispatch a new fix run but got:

```
HTTP 422: Cannot trigger a 'workflow_dispatch' on a disabled workflow
```

The user had disabled `agentic-lib-workflow.yml` at the GitHub level at this point, so no further automated fixes were possible.

---

## Work Items

All fixes are made in `agentic-lib/.github/workflows/` (mastered here, distributed to repository0 via init).

### W1: Add behaviour tests to pre-commit gate (HIGH — addresses Q1, FINDING-2, FINDING-7)

**Problem**: The dev job's pre-commit test (line 1006-1023) only runs unit tests. Transforms that break behaviour tests get merged to main.

**Fix**: After the existing unit test step, add a behaviour test step that runs `npm run test:behaviour` when a `playwright.config.js` exists. If behaviour tests fail, set `tests-passed=false` and skip commit/PR.

**File**: `agentic-lib/.github/workflows/agentic-lib-workflow.yml`, dev job, after step `pre-commit-test`

**Mitigation layers**:
- Primary: behaviour test gate blocks merge
- Secondary: item W6 (instability issue) catches anything that slips through

### W2: Include dispatch message in dev job's issue selection (MEDIUM — addresses Q2)

**Problem**: When dispatch-fix sends a message like "Build broken on main", the supervisor sees it but the dev job ignores it — dev always picks the oldest `ready` issue.

**Fix**: In the dev job's "Find target issue" step, if `needs.params.outputs.message` contains "broken" or "fix", prefer issues with the `instability` label (see W7) over the oldest `ready` issue. This makes fix-dispatches actually work on the broken build rather than unrelated issues.

**File**: `agentic-lib/.github/workflows/agentic-lib-workflow.yml`, dev job, step `Find target issue`

### W3: Allow `workflow_call` trigger in dispatch-fix (LOW — addresses Q3)

**Problem**: When `agentic-lib-test.yml` runs as `workflow_call` (from post-commit-test), the dispatch-fix is skipped because it only triggers on `push`/`schedule`.

**Fix**: Add `workflow_call` to the dispatch-fix condition. The circuit breaker (>= 3 in 30 min) already prevents runaway loops, so this is safe.

```yaml
&& (github.event_name == 'push' || github.event_name == 'schedule' || github.event_name == 'workflow_call')
```

**File**: `agentic-lib/.github/workflows/agentic-lib-test.yml`, dispatch-fix job `if` condition

### W4: Fix init profile parameter not written to toml (HIGH — FINDING-4)

**Problem**: `npx @xn-intenton-z2a/agentic-lib init --purge` with `PROFILE=min` copies `agentic-lib.toml` as-is from the npm package with `profile = "recommended"` regardless.

**Fix**: In the init script's toml copy step, if a `profile` argument is provided, substitute it in the copied toml. Add a post-copy `sed` or JS replacement.

**File**: `agentic-lib/bin/agentic-lib.js` (or wherever `initWorkflows()` copies the toml)

### W5: Break dedup guard deadlock (MEDIUM — FINDING-5)

**Problem**: When the supervisor's issue creation is blocked by the dedup guard 2+ times, the pipeline stalls with no issues for dev to work on.

**Fix**: When dedup blocks, the supervisor should create an issue with a different scope — e.g. "fix: resolve failing tests on main" with the `instability` label. This sidesteps the dedup guard (different title pattern) and directs dev to the actual problem.

**File**: `agentic-lib/src/agents/agent-supervisor.md` (supervisor prompt) or the supervise task handler in agentic-step

### W6: Create instability issues on test failure (NEW — user requirement #6)

**Problem**: When `agentic-lib-test.yml` fails, there's no durable record of the failure type and logs.

**Fix**: Add a new job `report-instability` to `agentic-lib-test.yml` that runs after `test` and `behaviour` when either fails. It:

1. Determines failure type: `unit`, `behaviour`, or `both`
2. Collects failure logs:
   - For unit: `npm test 2>&1 | tail -100`
   - For behaviour: `npm run test:behaviour 2>&1 | tail -100`
   - Grep generously (50 lines above/below failure markers) to stay within context limits
   - Use full logs if total < 50% of smallest model context (gpt-5-mini = 264K, so < ~132K chars)
3. Creates a GitHub issue with:
   - Title: `instability: [unit|behaviour|both] test failure on main`
   - Body: failure type, run ID, logs
   - Labels: `instability`
4. Dedup: check if an open issue with `instability` label already exists for the same failure type — if so, add a comment instead of creating a new issue

**File**: `agentic-lib/.github/workflows/agentic-lib-test.yml`, new job after `dispatch-fix`

```yaml
  report-instability:
    needs: [test, behaviour]
    if: >-
      !cancelled()
      && github.ref == 'refs/heads/main'
      && github.repository != 'xn-intenton-z2a/agentic-lib'
      && (needs.test.result == 'failure' || needs.behaviour.result == 'failure')
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read
      actions: read
    steps:
      - uses: actions/checkout@v6

      - name: Determine failure type
        id: failure-type
        run: |
          UNIT="${{ needs.test.result }}"
          BEHAVIOUR="${{ needs.behaviour.result }}"
          if [ "$UNIT" = "failure" ] && [ "$BEHAVIOUR" = "failure" ]; then
            echo "type=both" >> $GITHUB_OUTPUT
          elif [ "$UNIT" = "failure" ]; then
            echo "type=unit" >> $GITHUB_OUTPUT
          else
            echo "type=behaviour" >> $GITHUB_OUTPUT
          fi

      - name: Collect failure logs
        id: logs
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          RUN_ID="${{ github.run_id }}"
          # Get failed job logs via gh CLI
          gh run view "$RUN_ID" --repo "${{ github.repository }}" --log-failed > /tmp/failed-logs.txt 2>&1 || true
          # Trim to reasonable size (keep last 200 lines per job, ~50 lines context)
          LOGS=$(tail -400 /tmp/failed-logs.txt)
          # Write to file for github-script to read
          echo "$LOGS" > /tmp/trimmed-logs.txt

      - name: Create or update instability issue
        uses: actions/github-script@v8
        with:
          script: |
            const fs = require('fs');
            const failureType = '${{ steps.failure-type.outputs.type }}';
            const runId = '${{ github.run_id }}';
            const runUrl = `https://github.com/${{ github.repository }}/actions/runs/${runId}`;
            const logs = fs.readFileSync('/tmp/trimmed-logs.txt', 'utf8').slice(0, 60000);

            const title = `instability: ${failureType} test failure on main`;
            const body = [
              `## Test Failure Report`,
              ``,
              `**Type**: ${failureType}`,
              `**Run**: [${runId}](${runUrl})`,
              `**Trigger**: ${context.eventName}`,
              `**Time**: ${new Date().toISOString()}`,
              ``,
              `## Failure Logs`,
              ``,
              '```',
              logs,
              '```',
            ].join('\n');

            // Check for existing open instability issue
            const { data: existing } = await github.rest.issues.listForRepo({
              ...context.repo, state: 'open', labels: 'instability', per_page: 5,
            });

            const match = existing.find(i => i.title.includes(failureType));
            if (match) {
              await github.rest.issues.createComment({
                ...context.repo, issue_number: match.number,
                body: `## Recurrence — run [${runId}](${runUrl})\n\n` + '```\n' + logs.slice(0, 30000) + '\n```',
              });
              core.info(`Updated existing issue #${match.number}`);
            } else {
              // Ensure label exists
              try {
                await github.rest.issues.createLabel({
                  ...context.repo, name: 'instability',
                  color: 'e11d48', description: 'Automated: test instability on main',
                });
              } catch (e) { /* label already exists */ }

              const { data: issue } = await github.rest.issues.create({
                ...context.repo, title, body,
                labels: ['instability', 'ready'],
              });
              core.info(`Created instability issue #${issue.number}`);
            }
```

### W7: Telemetry job checks instability issues and overrides dev topic (NEW — user requirement #7)

**Problem**: When instability issues exist, the dev job should prioritise them mechanically — not relying on the supervisor to decide.

**Fix**: Add a step to the telemetry job that queries open issues with the `instability` label and includes them in the telemetry output. Then, in the dev job's "Find target issue" step, **before** looking for oldest `ready` issue, check for open `instability`-labelled issues and pick the oldest one. This is mechanical — no supervisor decision involved.

**File**: `agentic-lib/.github/workflows/agentic-lib-workflow.yml`

**Telemetry addition** (after existing gather step):
```yaml
      - name: Check instability issues
        id: instability
        uses: actions/github-script@v8
        with:
          script: |
            const { data: issues } = await github.rest.issues.listForRepo({
              ...context.repo, state: 'open', labels: 'instability',
              sort: 'created', direction: 'asc', per_page: 10,
            });
            const numbers = issues.map(i => i.number);
            core.setOutput('issues', JSON.stringify(numbers));
            core.setOutput('count', String(numbers.length));
            if (numbers.length > 0) {
              core.info(`Found ${numbers.length} instability issue(s): ${numbers.join(', ')}`);
            }
```

**Dev job "Find target issue" change**:
```javascript
// BEFORE looking for oldest 'ready' issue, check for instability issues
const { data: instabilityIssues } = await github.rest.issues.listForRepo({
  ...context.repo, state: 'open', labels: 'instability',
  sort: 'created', direction: 'asc', per_page: 1,
});
if (instabilityIssues.length > 0) {
  core.setOutput('issue-number', String(instabilityIssues[0].number));
  core.info(`Instability override: targeting issue #${instabilityIssues[0].number}: ${instabilityIssues[0].title}`);
  return;
}
// ... existing ready-issue logic follows
```

### W8: Review-features passivity investigation (LOW — FINDING-8)

**Problem**: Review-features returned `nop` on every iteration — it never reviewed or closed issues. This meant the convergence mechanism from Report 004 never engaged.

**Analysis**: Issues were closed by dev PRs (with `Closes #N` in the PR body) before review-features could evaluate them. The review-features job runs after supervisor but **before** dev. By the time dev's PR is merged, review-features has already completed with `nop`.

**Fix**: No code change needed — this is a timing/ordering issue that won't affect the instability mechanism. However, review-features should be updated to also check for issues that were closed in the current run and verify whether the closing PR actually resolved them (post-hoc review). This is LOW priority.

---

## Implementation Order

| # | Work Item | Priority | Dependencies | Files Changed |
|---|-----------|----------|--------------|---------------|
| 1 | W6 | HIGH | None | `agentic-lib-test.yml` |
| 2 | W7 | HIGH | W6 (needs instability issues to exist) | `agentic-lib-workflow.yml` |
| 3 | W1 | HIGH | None | `agentic-lib-workflow.yml` |
| 4 | W4 | HIGH | None | `bin/agentic-lib.js` |
| 5 | W2 | MEDIUM | W7 (instability label) | `agentic-lib-workflow.yml` |
| 6 | W5 | MEDIUM | W6 (instability label) | `agent-supervisor.md` or agentic-step |
| 7 | W3 | LOW | None | `agentic-lib-test.yml` |
| 8 | W8 | LOW | None | Investigation only |

**Non-conflicting groups** (can be implemented in parallel):
- Group A: W6 + W1 + W4 (different files)
- Group B: W7 + W2 (same file, but different jobs — W7 in telemetry, W2 in dev)
- Group C: W3 + W5 (different files)

---

## Implementation Notes

### W1: Behaviour test gate — DONE
Added `pre-commit-behaviour-test` step to dev job in `agentic-lib-workflow.yml`. Runs `npx playwright install`, `npm run build:web`, and `npm run test:behaviour` when a `playwright.config.js` exists. Commit/PR conditions updated to gate on `steps.pre-commit-behaviour-test.outputs.tests-passed != 'false'` (allows skip when no playwright config).

### W2: Message-aware issue selection — DONE (via W7)
The instability override in the dev job's issue picker means that when dispatch-fix sends "Build broken on main", the report-instability job creates an `instability` issue, which the dev job mechanically picks first.

### W3: Allow workflow_call in dispatch-fix — DONE
Added `|| github.event_name == 'workflow_call'` to `dispatch-fix` condition in `agentic-lib-test.yml`. Circuit breaker still prevents runaway loops.

### W4: Fix init profile parameter — DONE
Root cause: regex `/(\[tuning\][^\[]*?)(^\s*profile\s*=\s*"[^"]*")/m` failed because comment `# Profile definitions live in [profiles.*] sections below.` contains `[` which stops the `[^\[]*?` character class. Fixed by extracting the `[tuning]` section first using `[\s\S]*?` which matches any character, then doing replacements within that section.

### W5: Dedup deadlock recovery — DONE
Added guidance to `agent-supervisor.md` under "Stability Detection" instructing the supervisor to create a differently-scoped issue with `instability` + `ready` labels when dedup blocks.

### W6: Report instability issues — DONE
New `report-instability` job in `agentic-lib-test.yml`. Determines failure type (unit/behaviour/both), collects logs via `gh run view --log-failed`, creates GitHub issue with `instability` + `ready` + `automated` labels, or adds a comment to an existing instability issue of the same type. Added `issues: write` to workflow permissions.

### W7: Mechanical instability override — DONE
Dev job's "Find target issue" step now queries `instability`-labelled issues first, before checking for `ready` issues. Telemetry job also queries and includes instability issue numbers in telemetry output for supervisor visibility.

### W8: Review-features passivity — INVESTIGATED
Timing issue: dev PRs close issues (via `Closes #N`) before review-features can evaluate them. No code change — the instability mechanism (W6+W7) provides an alternative convergence path.

---

## Additional Fixes (from Benchmark 006 testing, 2026-03-10)

These fixes were discovered during benchmark 006 (fizz-buzz / gpt-5-mini / recommended / budget 32) when PRs #2780 and #2781 became permanently CONFLICTING.

### W9: Fix-stuck incremental 3-tier conflict resolution — DONE

**Problem**: The fix-stuck job used `git merge -X theirs` followed by `commit-if-changed`, which did `git pull --rebase` before pushing. This caused binary file conflicts (SCREENSHOT_INDEX.png) when main moved during the same workflow run (maintain job pushes to main).

**Fix**: Replaced with 3 escalating tiers, each pushing directly (no `commit-if-changed`, no `git pull --rebase`):
1. **Tier 1**: Simple `git merge origin/main` → push → check PR mergeability
2. **Tier 2**: `git merge -X theirs origin/main` → push/force-push → check
3. **Tier 3**: Save src/tests to /tmp, `git reset --hard origin/main`, copy back → force-push → check
4. **Hard fail** if PR still CONFLICTING after all 3 tiers

Also replaced `commit-if-changed` for PR fix pushes with direct `git push`.

**Files**: `agentic-lib-workflow.yml` (both repos)

### W10: Screenshot push only on schedule — DONE

**Problem**: `agentic-lib-test.yml` pushed SCREENSHOT_INDEX.png to main on every trigger (push, workflow_call, dispatch), causing binary conflicts in PR branches.

**Fix**: Added `push-screenshot` input parameter (default false). Screenshot push now only happens on `schedule` or when `push-screenshot=true` is explicitly set.

**Files**: `agentic-lib-test.yml` (both repos)

### W11: Count PR-merge-closed issues as RESOLVED — DONE

**Problem**: Mission-complete metric "Issues closed by review (RESOLVED)" only counted issues with an "Automated Review Result" comment from the review-issue LLM. Issues closed by PR merge (GitHub's `Closes #N` linking) were not counted, so mission-complete could never trigger even when all work was done.

**Fix**: Now checks issue events for commit-linked closures (PR merges) in addition to review comments. Only counts issues with the `automated` label (excludes purged issues). Updated metric label to "Issues resolved (review or PR merge)".

**Files**: `supervise.js`, `index.js` (both repos)

### W12: Deterministic mission-complete threshold lowered to 1 — DONE

**Problem**: Deterministic mission-complete fallback required `resolvedCount >= 2`. A single-issue mission could never trigger it.

**Fix**: Changed threshold to `resolvedCount >= 1`.

**Files**: `supervise.js` (both repos)

### W13: Maintenance mode for schedule workflow — DONE

**Problem**: After mission-complete, the schedule was unconditionally set to "off". No way to transition to a maintenance mode for ongoing discussions-bot-triggered changes.

**Fix**: Added `maintenance` frequency option to `agentic-lib-schedule.yml` that:
1. Removes MISSION_COMPLETE.md and MISSION_FAILED.md
2. Sets transformation-budget = 0 (unlimited)
3. Sets schedule to weekly
4. Stores supervisor = "maintenance" in toml

Also: `executeMissionComplete` and `executeMissionFailed` now check if schedule is already "off" or "maintenance" before dispatching — won't override maintenance mode.

**Files**: `agentic-lib-schedule.yml`, `supervise.js` (both repos)

### W14: skipMaintain workflow input — DONE

**Problem**: Needed to test fix-stuck in isolation without the maintain job pushing to main mid-run.

**Fix**: Added `skipMaintain` input to `agentic-lib-workflow.yml` (default false). When true, the maintain job is skipped.

**Files**: `agentic-lib-workflow.yml` (both repos)

---

## Success Criteria

1. A failing `agentic-lib-test.yml` run creates an `instability` issue with logs and correct label
2. The dev job in `agentic-lib-workflow.yml` picks `instability` issues before `ready` issues, mechanically
3. Behaviour tests run as part of the pre-commit gate in the dev job
4. `init --purge` with `PROFILE=min` writes `profile = "min"` to consumer's `agentic-lib.toml`
5. All existing tests pass (429 unit tests in agentic-lib) — **VERIFIED**
6. Workflow lint passes (`npm run lint:workflows`) — **VERIFIED (0 errors)**
7. Fix-stuck resolves CONFLICTING PRs via 3-tier approach — **VERIFIED** (PRs #2780, #2781 resolved)
8. Mission-complete triggers with PR-merge-closed issues — **VERIFIED** (benchmark 006 completed)
9. Schedule not overridden when already off/maintenance — **IMPLEMENTED** (not yet live-tested)
