# Benchmark run 021 — live ledger
Started: 2026-06-14T22:01:09Z
Orchestrator: Claude Code Opus 4.8 | Engine: Haiku 4.5 via Bedrock (frozen)
Sandbox wildcard this run: 4-kyu-apply-cron-engine
Budgets: 8k=1 6k=2 sandbox=3 3k=6 2k=8 | max_turns=30

## Event log
[22:06:20Z] sandbox RESET → 4-kyu-apply-cron-engine baseline pushed. on-init reset FAILED earlier (App lacks workflows perm) — using clone+SSH reset.
[22:06:20Z] sandbox issue #5 (chunk 1/3 parser) raised; dispatching on-intent (trigger 1/3).
[22:11:27Z] sandbox chunk-1 (#6) = 56/56 PASS → MERGED. Whole-intent baseline (#7, reset-push artifact) = 6 FAIL/41 PASS → CLOSED. Finding: decomposed slice green where un-decomposed whole-intent breaks on next-run/window. Triggers used: 2 (1 chunk + 1 reset-artifact).
[22:11:47Z] sandbox chunk-2 issue #8 (match/next-run) raised; dispatch (decomp trigger 2).
[22:12:23Z] HARNESS FIX: reset now disables on-intent around the INTENT.md push (no more whole-intent auto-trigger eating budget). Also FINDING: consumer repos have no test.yml → no CI gate; orchestrator runs vitest locally to judge PRs.
[22:14:32Z] sandbox chunk-2 (#9) = 89/89 PASS → MERGED (built on merged parser). Decomp trigger 2/3 green.
[22:14:32Z] sandbox chunk-3 issue #10 (edge cases) raised; dispatch (decomp trigger 3).
[22:18:17Z] sandbox chunk-3 (#11) PLATEAU = 5 FAIL/93 PASS. Bug: nextRuns('0 0 31 * *',3) → Jan,Oct,Dec (expected Jan,Mar,May); month-skip iteration overshoots. Applying plateau protocol: address-review with precise failing context (NOT a model change).
[22:19:13Z] sandbox address-review on #11 dispatched (re-work trigger 4, plateau protocol). NOTE: deployed on-review lacks issue_comment trigger — used workflow_dispatch.
[22:23:24Z] sandbox chunk-3 re-work (#11) STILL 6 FAIL/92 — month-skip iteration unbroken (leap-year sub-case OK). CEILING located. PR #11 NOT merged (red). Hard-stop sandbox: 2/3 chunks delivered green on main; edge-case chunk = the Haiku one-shot ceiling. Triggers: 4 used (3 decomp + 1 rework) + 1 reset-artifact.
[23:01:19Z] 8-kyu RESET → hello-world baseline. Dispatch whole-intent (budget 1).
[23:03:16Z] 8-kyu (#8) = 9/9 PASS one-shot → MERGED. Budget 1/1. DELIVERED. on-summary re-dispatched.
[23:03:36Z] 6-kyu RESET → roman-numerals baseline. Try whole-intent one-shot first (budget 2).
[23:06:11Z] 6-kyu (#7) = 32/32 PASS one-shot (1994↔MCMXCIV, 0→RangeError all ✓) → MERGED. Budget 1/2. DELIVERED whole-intent (no decomposition needed).
[23:07:02Z] 3-kyu chunk-1 issue #11 (physics+scoring) raised; dispatch (decomp trigger 1).
[23:09:38Z] 3-kyu chunk-1 (#12) = 30/30 PASS → MERGED (physics+scoring). Decomp trigger 1/6 green.
[23:09:39Z] 3-kyu chunk-2 issue #13 (autopilot nominal) raised; dispatch (decomp trigger 2).
[23:13:20Z] 3-kyu chunk-2 (#14) autopilot PLATEAU = 2 FAIL/34; even DEFAULT case crashes (final vel 56). Plateau protocol: re-work with explicit control algorithm (better context, not bigger model). Decomp trigger 2 → rework trigger 3.
[23:19:22Z] FINDING: address-review via workflow_dispatch+PR-comment is a NO-OP (no review thread) — context didn't reach engine. Orchestrator (Opus) solved+verified the autopilot control law locally (max(4,2.2*sqrt(alt)): default land +18/48 combos). Closing #14/#13; re-delivering with verified law embedded.
[23:19:23Z] 3-kyu autopilot issue #15 (verified law) raised; dispatch (decomp trigger 4).
[23:24:20Z] 3-kyu autopilot (#16) = 40/41 — verified law LANDS default + 18/48 grid (satisfies INTENT '≥10 combos'), but engine's SELF-WRITTEN range test sampled 12 hard combos needing 10, got 7. Engine's test STRICTER than INTENT. Re-deliver with verified law + verified test spec (grid→≥10). Trigger 5.
[23:26:20Z] 3-kyu autopilot v2 (#18) = 36/36 PASS → MERGED. 3-kyu DELIVERED (physics+scoring+autopilot) at trigger 5/6. PLATEAU CLEARED via Opus-verified control law (prior session: Haiku plateaued ~30/40 here).
[23:27:06Z] 2-kyu chunk-1 issue #7 (core+escape) raised; dispatch (decomp trigger 1).
[23:29:36Z] 2-kyu chunk-1 (#8) = 40/40 PASS (XSS-safe ✓) → MERGED. Trigger 1/8 green.
[23:29:39Z] 2-kyu chunk-2 issue #9 (links+images) dispatch (trigger 2).
[23:32:06Z] 2-kyu chunk-2 (#10) = 66/66 PASS → MERGED. Trigger 2/8 green.
[23:32:09Z] 2-kyu chunk-3 issue #11 (lists) dispatch (trigger 3).
[23:35:09Z] 2-kyu chunk-3 (#12) = 97/97 PASS → MERGED. Trigger 3/8 green.
[23:35:12Z] 2-kyu chunk-4 issue #13 (code+blockquote) dispatch (trigger 4).
[23:37:41Z] 2-kyu chunk-4 (#14) = 116/116 PASS → MERGED. Trigger 4/8 green.
[23:37:44Z] 2-kyu chunk-5 issue #15 (tables+rules) dispatch (trigger 5).
[23:40:13Z] 2-kyu chunk-5 (#16) = 139/139 PASS → MERGED. Trigger 5/8 green.
[23:40:16Z] 2-kyu chunk-6 issue #17 (tasklist+autolink+sample) dispatch (trigger 6).
[23:42:57Z] 2-kyu chunk-6 (#18) = 159/159 PASS (all 10 GFM areas, tasklist+autolink ✓) → MERGED. Trigger 6/8. Gap: docs/examples/sample.html not committed.
[23:43:00Z] 2-kyu chunk-7 issue #19 (sample.html) dispatch (trigger 7).
[23:45:36Z] 2-kyu chunk-7 (#20) = 163/163 PASS, sample.html committed → MERGED. 2-kyu DELIVERED (all 10 GFM areas) at trigger 7/8.
[23:45:36Z] === RUN COMPLETE. 8k delivered 1/1 · 6k delivered 1/2 · 3k delivered 5/6 (autopilot plateau cleared) · 2k delivered 7/8 (all 10 GFM) · sandbox 2/3 + ceiling (month-end cron). ===
