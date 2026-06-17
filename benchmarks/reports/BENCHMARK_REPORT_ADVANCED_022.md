# Benchmark Report 022 (Advanced)

**Date**: 2026-06-17
**Orchestrator**: Claude Code (claude-opus-4-8[1m]) — maximal-standard decomposer
**Engine (under test)**: `claude -p` + Bedrock · **Haiku 4.5** (frozen) · `v8` @ the E8/E9 fixes
**agentic-lib version**: 8.2.0 (`v8`) · **Previous report**: BENCHMARK_REPORT_ADVANCED_021.md
**Method**: two-brain decompose→deliver→merge ([`ITERATION_BENCHMARKS_ADVANCED.md`](../ITERATION_BENCHMARKS_ADVANCED.md)); hands-free 30s-poll executor
**Purpose**: re-run the Advanced suite on the **E8/E9-improved engine** to measure the deltas vs 021.
**sandbox wildcard this run**: `4-kyu-apply-dense-encoding` (new — 021 used `4-kyu-apply-cron-engine`)

---

## Dashboard

| ID | Repo | INTENT | Issues | Triggers | Budget | Delivered? | Tests on main | ~Cost |
|----|------|--------|--------|----------|--------|-----------|---------------|-------|
| A1 | 3-kyu-analyze-lunar-lander | physics + autopilot | 2 | 5 | 6 | **YES** ✅ | 38/38 | ~$0.9 |
| A2 | 2-kyu-create-markdown-compiler | 10 GFM areas + XSS | 6 | 8 | 8 | **YES** ✅ | 108/108 | ~$1.5 |
| A3 | sandbox (dense-encoding) | base62/85/91 + UUID + custom | 2 of 3 | 3 | 3 | **partial (2/3 chunks)** | 27/27 | ~$0.5 |

All three end **green on `main`**; sandbox delivered the core encodings (UUID-shorthand +
custom-charset chunk not reached within budget 3). Screenshots distinct + rendered
(`check-showcase.mjs`); the `demo()` was **auto-wired by the engine** — no manual injection
this round.

---

## Headline: the E8 prompt fixes work where they apply — but the **re-work loop is broken**

The new prompts/contracts behaved as designed **on the first delivery of a chunk**. The
problem 022 exposed is **iteration**: every path for correcting a not-quite-green chunk is
broken or unreliable, so the suite took *more* triggers than 021 despite the fixes.

### What the E8 fixes delivered (positives)
- **`demo()` auto-wired (S3b contract):** both 3-kyu and 2-kyu deliveries exported a `demo()`
  exercising the API → **distinct screenshots with no manual injection** (021 I added `demo()`
  by hand post-run). Confirmed live (3-kyu 65.8KB, 2-kyu 63.3KB, both render).
- **F8 — `address-review` now fires on PR comments:** an `@agentic-lib` PR comment
  **auto-triggered `on-review`** (021 it never fired). The trigger + the `issue_comment` seed
  both work.
- **F9 — satisfiable tests:** the **3-kyu autopilot delivered green in ONE trigger** because
  the engine wrote a **grid test matching the INTENT's "≥10 combinations"** bar (021 wrote an
  over-strict 12-hard-combo test its own correct code failed, needing a 2nd autopilot attempt).
- **F10 — artifacts in-chunk:** 2-kyu committed **`docs/examples/sample.html` within the
  feature chunk** (021 needed a separate 7th chunk).
- **Orchestrator generalisation:** flagging the **leading-zero round-trip pitfall** in the
  sandbox C1 issue → base62/base85 (and later base91) **one-shot correct** on all edge cases
  (`[]`,`[0]`,`[0,0,0,0]`,`[0,0,5]`,…) — a genuinely bug-prone area, clean first try.

### What broke / persisted (the story of 022)
- **F11 (NEW) — `address-review` burns turns on *denied* tools:** the agent tried `node -e …`
  and `cat > debug.mjs` to debug, both **denied** (not in `allowedTools`), looped, and hit
  **`error_max_turns` (31 turns) without fixing anything**.
- **F12 (NEW) — `address-review` pushes to the wrong branch:** `transform.yml` computes the
  branch as `agentic-lib/address-review-${WI}`, **not the PR's head branch**
  (`agentic-lib/deliver-intent-${issue}`) — so the revision **never reaches the PR**.
  Together, F11+F12 make **comment-driven re-work a no-op**.
- **F13 (NEW) — `on-intent` re-dispatch re-delivers the WHOLE chunk → regressions:** the only
  working re-work path is a *fresh* full delivery, so it has full Haiku variance. It turned
  2-kyu C6 **100/101 → 8 failed/113**, and 3-kyu C1 **34/35 → 3 failed/41**, before later
  attempts recovered.
- **F9-class self-test bugs persist in new spots:** even with F9, the engine wrote
  self-inconsistent tests elsewhere — 2-kyu's **well-formedness test counts XHTML void
  elements (`<img/>`,`<hr/>`,`<input/>`) as unclosed** (83 vs 72), and sandbox's
  **`listEncodings` charsetSize is off-by-one** (87 vs 86) with a reversed bits/char
  assertion. The library was correct in both cases; the engine's *test* was wrong.
- **Haiku variance:** 3-kyu C1 (deterministic physics; 021 **one-shot 30/30**) took **4
  triggers** in 022 — the engine repeatedly implemented the landing boundary as `< 4` despite
  the issue stating `≤ 4`, only converging once the **exact `step()` code** was supplied.
- **`test.yml` gate doesn't help judge engine PRs:** PRs opened by the Actions `GITHUB_TOKEN`
  **don't trigger `on: pull_request` workflows**, so the gate shows empty/`action_required` on
  engine PRs (it does run on `push` to `main` post-merge). Judging stayed local-`vitest`.

---

## 021 → 022 comparison

| Repo | 021 | 022 | Read |
|------|-----|-----|------|
| **3-kyu** | 5 triggers; autopilot needed 2 attempts (over-strict test) + verified law | 5 triggers; **autopilot 1-shot (F9 ✓)** but **C1 physics took 4** (variance + broken re-work) | net same count, budget *shifted* from autopilot to physics |
| **2-kyu** | 7 triggers (6 features + **separate** artifact chunk) | **8 triggers** (6 features + **2 on C6**: well-formedness self-test + a re-dispatch regression) | **F10 saved a chunk; broken re-work + F9-class self-test gave it back** |
| **sandbox** | cron, 2/3 chunks + a located ceiling | dense-encoding, 2/3 chunks (UUID/custom unreached) | **generalises** — new wildcard tracks 021's 2/3; no overfitting signal |

**Net:** the suite delivered green again, but **did not get cheaper** — the E8 first-delivery
wins were offset by the **broken re-work loop** (F11/F12/F13) + residual Haiku variance + F9-class
self-tests in new spots. The orchestrator (Opus) still carried the hard parts by supplying
verified code/pitfalls as issue context; the difference from 021 is that **iteration is now the
bottleneck, not first delivery.**

## Limit progression

| Repo | Triggers used / budget | max_turns hits | Re-work path | Plateau? |
|------|------------------------|----------------|--------------|----------|
| 3-kyu | 5 / 6 | 1 (address-review F11) | on-intent re-dispatch (address-review broken) | C1 boundary (converged with exact code) |
| 2-kyu | 8 / 8 (exhausted) | none | on-intent re-dispatch (×2 on C6) | C6 well-formedness self-test |
| sandbox | 3 / 3 (exhausted) | none | on-intent re-dispatch (×1 on C2) | listEncodings metadata; UUID/custom unreached |

## vs marginalia (Haiku orchestrator)

The broken re-work loop hits **marginalia harder**: its loop *is* review→revision (it can't
hand-supply verified code on a fresh dispatch the way Opus did here). F11/F12 mean a
marginalia-driven `address-review` would `error_max_turns` and push to a dangling branch. The
3-kyu autopilot remains the decisive cell, but **fixing the re-work loop (E10) is now the
prerequisite for any fair marginalia comparison.**

## Recommendations → E10 (fix the re-work loop) + broaden E8

1. **F12 — `transform.yml` must push the address-review revision to the PR's head branch**, not
   `address-review-${WI}`. (Resolve the PR's headRef from `${WI}` and check it out.)
2. **F11 — widen `allowedTools`** to let the agent run a scratch script (e.g. `Bash(node:*)`)
   so it can debug without burning turns on denials.
3. **F9 (broaden) — the "test the INTENT's stated bar" instruction should explicitly cover
   well-formedness/void-element and metadata tests** (don't count `<img/>` as unclosed; make
   `charsetSize` equal the real charset length).
4. **Surface the `test.yml`/GITHUB_TOKEN limitation** in the benchmark docs (engine PRs don't
   trigger the gate; judge locally or dispatch `test.yml --ref <branch>`).
5. **Re-run 022 after E10** to see if the suite finally gets *cheaper* — the first-delivery wins
   should then show up as lower trigger counts.

## Final on-`main` state

| Repo | Tests | Delivered |
|---|---|---|
| 3-kyu-analyze-lunar-lander | 38/38 | full (physics + autopilot) |
| 2-kyu-create-markdown-compiler | 108/108 | full (10 GFM areas + sample.html) |
| sandbox (dense-encoding) | 27/27 | partial (base62/85/91 + listEncodings; UUID/custom unreached) |

`finalize` re-published summary + screenshot on 3-kyu/2-kyu; `check-showcase.mjs` confirms
distinct + rendered. Raw ledger: `benchmarks/reports/_run_022_ledger.md`.
