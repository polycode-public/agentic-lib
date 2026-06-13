<!-- prompt: tend (one-shot, scheduled) -->
# Transformation: tend

A scheduled maintenance pass. Make at most **one** small, self-contained
improvement and stop — or do nothing if nothing needs doing.

1. Read `INTENT.md` and `AGENTS.md`. Run the suite.
2. Look for a single low-risk improvement toward the intent: a missing test, a
   small refactor, a docs gap, a flaky test, a dependency bump. Pick the highest
   value one that fits in one transformation.
3. If found, implement it, ensure the suite passes, and open a draft PR with a
   `fixes #N` trailer if it closes a tracked work item (otherwise reference the
   tend schedule). If nothing needs doing, exit cleanly without a PR.

Never start large work on a tend pass — that is the supervisor's job to schedule as
explicit work items.
