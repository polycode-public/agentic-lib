# Benchmark run 022 (Advanced) — live ledger
Started: 2026-06-16T23:44:01Z
Orchestrator: Claude Code Opus 4.8 | Engine: Haiku 4.5 via Bedrock (frozen) | v8=0182d8a
Measures E8/E9 impact vs 021. Sandbox wildcard: 4-kyu-apply-dense-encoding (new, ≠021's cron).
Budgets: 3k=6 2k=8 sandbox=3 | max_turns=30

## Event log
[23:44:56Z] 3-kyu RESET → lunar-lander baseline (new src/web seed). Decompose: C1 physics+scoring, C2 autopilot (verified law). Testing F9 (no over-strict test) + demo contract.
[23:45:17Z] 3-kyu C1 issue #19 (physics+scoring) dispatch (trigger 1).
[23:50:16Z] 3-kyu C1 (#20) = 34/35; engine AUTO-WIRED demo() (new contract ✓); 1 fail = step boundary bug (v=4 should be LANDED not crashed; used <4 not ≤4). Re-work via @agentic-lib PR COMMENT to test F8 (021 this no-op'd).
[23:55:31Z] 3-kyu re-work FINDINGS: F8 trigger works (on-review auto-fired on comment) BUT (F11) address-review wasted 31 turns on DENIED debug tools (node -e/cat not in allowedTools) → error_max_turns; (F12) transform.yml pushed revision to wrong branch agentic-lib/address-review-20 ≠ PR branch deliver-intent-19 → never reached PR. Re-work via on-intent re-dispatch instead.
[23:55:33Z] 3-kyu re-dispatch on-intent #19 with boundary note (trigger 3).
[23:58:43Z] 3-kyu C1 re-dispatch with EXACT step() boundary code inline (trigger 4). Haiku kept impl'ing <4 despite issue saying ≤4.
[00:02:00Z] 3-kyu C1 (#20) = 28/28 GREEN at trigger 4 → MERGED (021 did this in 1; 022 variance + boundary blind-spot + broken re-work ate budget). 4/6 used.
[00:02:01Z] 3-kyu autopilot issue #21 (verified law + INTENT-bar test instruction) dispatch (trigger 5). Headline F9 test.
[00:04:42Z] 3-kyu autopilot (#22) = 38/38 GREEN one-shot (18/48 grid). F9 WORKED: engine wrote a SATISFIABLE grid test (vs 021's over-strict 12-combo test). 3-kyu DELIVERED 5/6.
[00:05:12Z] 2-kyu RESET → markdown-compiler baseline. Decompose into feature chunks; testing F10 (sample.html committed in-chunk, no separate 7th chunk like 021).
[00:05:39Z] 2-kyu C1 issue #21 (core+escape) dispatch (trigger 1).
[00:08:43Z] 2-kyu C1 (#22) = 41/41 GREEN one-shot (XSS ✓, demo() ✓) → MERGED. Trigger 1/8.
[00:08:44Z] 2-kyu C2 #23 (links+images) dispatch (trigger 2).
[00:11:17Z] 2-kyu C2 (#24) = 52/52 GREEN → MERGED. Trigger 2/8.
[00:11:18Z] 2-kyu C3 #25 (lists) dispatch (trigger 3).
[00:13:59Z] 2-kyu C3 (#26) = 64/64 GREEN → MERGED. Trigger 3/8.
[00:14:00Z] 2-kyu C4 #27 dispatch (trigger 4).
[00:17:05Z] 2-kyu C4 (#28) = 76/76 GREEN → MERGED. Trigger 4/8.
[00:17:06Z] 2-kyu C5 #29 dispatch (trigger 5).
[00:19:51Z] 2-kyu C5 (#30) = 89/89 GREEN → MERGED. Trigger 5/8.
[00:19:52Z] 2-kyu C6 #31 (tasklist+autolink+sample.html) dispatch (trigger 6). F10 test: artifact in-chunk?
[00:23:49Z] 2-kyu C6 (#32) = 100/101; F10 WORKED (sample.html committed in-chunk, 3331b, no separate chunk vs 021). 1 fail = engine's OWN well-formedness test is naive (counts void elements <img/>/<hr/>/<input/> as unclosed: 83 vs 72, diff 11). F9-class over-strict test in a new spot. Re-dispatch with clarification (trigger 7).
[00:27:38Z] 2-kyu C6 re-dispatch (trigger 7) REGRESSED 100/101 → 8 fail/113. FINDING (F13): on-intent re-dispatch re-delivers the WHOLE chunk with high variance → regressions; combined with broken address-review (F11/F12), the re-work loop cannot reliably converge a multi-feature chunk. Final attempt trigger 8 with exact balance-checker.
[00:30:57Z] 2-kyu C6 (#32) = 108/108 GREEN at trigger 8 (exact balance-checker supplied). 2-kyu DELIVERED 8/8 (all 10 GFM + sample.html). vs 021's 7: F10 saved a chunk but C6 well-formedness-test variance + broken re-work cost it back.
[00:31:38Z] sandbox RESET → 4-kyu-apply-dense-encoding (NEW wildcard ≠021 cron; overfitting check). Decompose: encodings + UUID + custom + round-trip.
[00:32:24Z] sandbox C1 #13 (base62+base85, leading-zero-safe) dispatch (trigger 1).
[00:35:20Z] sandbox C1 (#14) = 27/27 GREEN one-shot; ALL leading-zero round-trip edge cases pass (pitfall warning worked). Trigger 1/3. Generalization looks good so far.
[00:35:21Z] sandbox C2 #15 (3rd encoding + listEncodings) dispatch (trigger 2).
[00:38:58Z] sandbox C2 (#16) = 38/40; base91 round-trip PERFECT (all edges) — 2 fails are engine's OWN listEncodings metadata tests (charsetSize 87≠86; bitsPerChar order). F9-class self-test bug. Re-dispatch (trigger 3, sandbox's last) pinning metadata + keep encode/decode as-is.
[00:41:49Z] sandbox C2 (#16) = 27/27 GREEN at trigger 3, round-trips intact (no regression). sandbox DELIVERED 2/3 chunks at budget 3 (base62/85/91 + listEncodings; UUID+custom NOT reached). Generalization OK — tracks 021's sandbox (2/3). RUN 022 COMPLETE.
