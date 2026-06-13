<!-- prompt: address-review (one-shot) -->
# Transformation: address review

A reviewer has left threads on PR #{{work_item}}. Address **all** of them in one
transformation and stop.

1. Read every open review thread on the PR. Read `AGENTS.md` and `INTENT.md`.
2. Make the changes that resolve the feedback. Update tests so the suite passes.
3. Push **one revision** to the same PR branch (one commit, or a tidy few). Do not
   open a new PR.
4. Reply to each thread you addressed and resolve it. Keep the `fixes #N` trailer
   intact.

One review round is one revision push — never a per-comment chain. If the branch
moved under you, re-read head and rebase; do not force unrelated changes.
