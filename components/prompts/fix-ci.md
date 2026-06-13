<!-- prompt: fix-ci (one-shot) -->
# Transformation: fix CI

CI is red on {{work_item}} (a PR branch, or the default branch). Make it green in
one transformation and stop.

1. Read the failing job logs / test output provided in context. Read `AGENTS.md`.
2. Reproduce the failure locally (run the suite), find the root cause, and fix it.
   Prefer the smallest change that makes the suite pass honestly — do not delete or
   skip tests to go green.
3. Push one revision to the failing branch (for a PR), or open a draft PR with a
   `fixes #N` trailer (for the default branch) referencing the tracking work item.

Do not expand scope beyond making CI pass.
