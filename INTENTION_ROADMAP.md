# INTENTION_ROADMAP.md — the intentïon estate's cross-repo tracker

> **This is the one forward roadmap that spans all three estate repos**
> (`agentic-lib`, `repository0`, `xn-intenton-z2a.com`). It is an *index*: each
> item is one line with an owner repo, a status, and a pointer to where the detail
> lives. The roadmap holds the **summary**; detail lives in the named PLAN docs.
>
> **Read order for a cold-start agent:** this file first, then the per-repo detail
> doc for whatever you're touching.
>
> | Detail doc | Repo | Holds |
> |---|---|---|
> | [`PLAN_ENGINE.md`](PLAN_ENGINE.md) | agentic-lib | the engine's open work (E1–E5) |
> | [`../xn-intenton-z2a.com/PLAN_SHOWCASE.md`](../xn-intenton-z2a.com/PLAN_SHOWCASE.md) | site | the showcase/embed surface |
> | [`../../polycode-projects/marginalia/PLAN_INTENTION.md`](../../polycode-projects/marginalia/PLAN_INTENTION.md) | marginalia | the **done** estate-move record (history, not forward) |
>
> Status: started 2026-06-14. The estate migration (move → GitHub `polycode-public`,
> AWS reboot, agentic-lib 8.0.0, fleet, embed) is **complete**; what remains is
> cleanup + a handful of engine/site follow-ons.

---

## 0 · Cleanup & refocus — do first

| # | Item | Repo | Status |
|---|---|---|---|
| C1 | Drop `repository0` + the deleted `4-kyu-apply-cron-engine` from the showcase repo-bar (`public/agentic-lib-repositories.toml`); fix the `index.html` fallback/default to a live repo; add a "Create your own ↗" template CTA for `repository0`. | site | ✅ done |
| C2 | Delete the orphaned `public/all.html` stats page (referenced non-existent `repository0-*-stats.json`; not linked anywhere). | site | ✅ done |
| C3 | Delete the obsolete plan docs; keep `PLAN_2_NARRATIVE.md` + the MCP/parameter-tuning specs. See [§D of the disposition list below](#d--plan-doc-disposition). | agentic-lib | ☐ open |
| C4 | Refresh the stale `PLAN_SHOWCASE.md` (2026-03-21 Giscus/`MISSION.md` design) to current reality (marginalia embed + `summary.json` seed + repo-bar). | site | ☐ open |
| C5 | Doc-consistency: cold-start pointer → this file; drop `4-kyu-apply-cron-engine` from the agentic-lib `CLAUDE.md` **fleet** table (keep the *mission seed* `missions/4-kyu-apply-cron-engine.md` — library content, not the deleted repo); tidy the site `CLAUDE.md` "5 fleet INTENTs"→4 and the "autonomous evolution engine" phrasing. | all | ☐ open |
| C6 | Tell marginalia the `4-kyu-apply-cron-engine` **repo** is deleted → its pre-bound graph (`c71c35db-…`) is orphaned, safe to unbind. | marginalia (coord) | ☐ open |

**The live fleet is now 4 repos + sandbox:** `8-kyu-remember-hello-world`,
`6-kyu-understand-roman-numerals`, `3-kyu-analyze-lunar-lander`,
`2-kyu-create-markdown-compiler`, `sandbox`.

---

## 1 · agentic-lib (the engine) → detail in [`PLAN_ENGINE.md`](PLAN_ENGINE.md)

| # | Item | Status |
|---|---|---|
| E1 | Publish `@polycode-public/agentic-lib` 8.0.0 to npm, **or** ratify `@v8` git-ref consumption as permanent and update the docs that say "not yet published". | open |
| E2 | **Re-run the kyu benchmarks on `claude -p` + Bedrock** (021+). The most-promised-undelivered item — README/MISSIONS/FEATURES all promise it; `benchmarks/reports/` are still Copilot-era 018–020. | open |
| E3 | Tune engine defaults (model + `max_turns`) from E2. Folds the *intent* of `_developers/backlog/PLAN_PARAMETER_TUNING.md`. | open |
| E4 | Spec + revive the MCP server against the 8.0.0 stack (`_developers/backlog/PLAN_MCP_SERVER.md`). | backlog — spec needed |
| E5 | Runner hygiene: bump `checkout`/`setup-node` actions (Node-20 deprecation forced to Node 24 from 2026-06-16) or set `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`. | open, low |

---

## 2 · xn-intenton-z2a.com (the site) → detail in [`PLAN_SHOWCASE.md`](../xn-intenton-z2a.com/PLAN_SHOWCASE.md)

| # | Item | Status |
|---|---|---|
| S1 | Showcase cleanup → C1/C2/C4 above. | C1/C2 ✅, C4 open |
| S2 | Wire `intention-ci` OIDC/roles/cert for ci-env deploys (prod is live; ci env not yet wired — `ACTIONS_ROLE_ARN`/`DEPLOY_ROLE_ARN`/`CERTIFICATE_ARN` for `ci`). | open, low |
| S3 | Confirm the showcase panels (status `[N]`, VT100, screenshot) all derive cleanly from `summary.json` now the old engine's `agentic-lib-logs` artifacts are gone. | open, verify |

---

## 3 · repository0 (the template)

Clean / normalised — `INTENT.md` is its fixed point; no outstanding plan doc.
Only residual: confirm `on-screenshot` produces `SCREENSHOT_INDEX.png` across the
fleet (a repo whose `src/web` demo breaks the behaviour-test assert won't
screenshot — make that screenshot unconditional in `tests/behaviour/homepage.test.js`).

---

## 4 · Cross-session / marginalia-owned (coordination only — not our work)

The showcase chat is marginalia's `embed.html` (tier-0, anon). We provide the seed
(`summary.json`) + iframe params; these behaviours are **marginalia's** to fix
(tracked here so they don't get lost):

1. **Tier-0 answers about the wrong repo** — the embed isn't priming tier-0 with the
   seeded repo's `summary.json` (and/or the shared graph's self-memory leaks).
2. **No in-widget authentication** — add an in-widget auth affordance → authed
   full-model private-graph chat (today only an "open full session ↗" link).
3. **On-page context block** — inject the preamble (embedded on intentïon.com,
   several repos, anon=tier-0+hints, logged-in=full private graph).

Also: **M5 webhook approach** — per-repo webhooks are live; an App-level webhook
(single routing endpoint) needs the "Webhooks" repo perm or repo-admin. Decide with
marginalia. The **M5 GitHub App** itself (`intention-system`, App 4048241, install
140151684) is installed + verified.

---

## 5 · Done (estate move)

Parts A–D of the move + the M5/summary/embed follow-ons are complete and verified —
estate on GitHub `polycode-public`; AWS reboot (intention-ci `285034436101` /
intention-prod `813333281588`, GitHub-OIDC, eu-west-2); intentïon.com live on
intention-prod; agentic-lib **8.0.0** shipped; fleet delivered + merged; embeds
seeding. Full record: [`PLAN_INTENTION.md`](../../polycode-projects/marginalia/PLAN_INTENTION.md).

---

## D · Plan-doc disposition

What we did with every `PLAN_*.md` in the estate during the C3/C4 refocus.

**Deleted** (git history retains them):

| Doc | Why |
|---|---|
| `PLAN_3_MARKETPLACE.md` | obsolete — the `agentic-step` action it published was deleted in 8.0.0 |
| `PLAN_BENCHMARK_018_FIXES.md` | Copilot-era fix plan (the 018–020 *reports* stay as data) |
| `_developers/backlog/PLAN_3_PLANNING.md` | designs the deleted committed plan engine |
| `_developers/backlog/PLAN_MULTI_LLM.md` | superseded — env-var provider lanes deliver it |
| `_developers/backlog/PLAN_SUPERVISOR.md` | superseded — marginalia is the supervisor |
| `_developers/backlog/PLAN_NEWS_AGGREGATOR.md` | out-of-scope downstream product idea |
| `_developers/backlog/2-dan-create-agi.md` | dead history |
| `_developers/bluesky/PLAN_4_SELF_HOSTED.md` | aspirational, Copilot-era scenario tests |
| `_developers/bluesky/PLAN_5_LAUNCH.md` | aspirational launch strategy |
| `_developers/bluesky/PLAN_6_MONETIZATION.md` | aspirational monetization analysis |

**Kept:**

| Doc | Role |
|---|---|
| `PLAN_ENGINE.md` | the engine's active roadmap (E1–E5) |
| `PLAN_2_NARRATIVE.md` | terminology record (what the 8.0.0 rename actually landed) |
| `_developers/backlog/PLAN_MCP_SERVER.md` | detail spec behind E4 — re-spec against 8.0.0 before actioning |
| `_developers/backlog/PLAN_PARAMETER_TUNING.md` | detail spec behind E3 — re-spec against 8.0.0 before actioning |
| `../xn-intenton-z2a.com/PLAN_SHOWCASE.md` | site detail — refreshed, not deleted |

Non-plan material (`benchmarks/reports/`, `_developers/reference|examples|archive|REPORT_*`)
is data/history, not a plan — left untouched.
