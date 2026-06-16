# INTENTION_ROADMAP.md — the intentïon estate's cross-repo tracker

> **The one forward roadmap spanning all three estate repos** (`agentic-lib`,
> `repository0`, `xn-intenton-z2a.com`). An *index*: each item is a line with an
> owner repo, a status, and a pointer to where the detail lives. The roadmap holds
> the **summary**; detail lives in the named PLAN docs.
>
> **Read order for a cold-start agent:** this file first (esp. the **Handover** at
> the end), then the per-repo detail doc for whatever you're touching, then your
> inbox (`~/.claude/inboxes/intention.md` — transient peer-agent messages).
>
> | Detail doc | Repo | Holds |
> |---|---|---|
> | [`PLAN_ENGINE.md`](PLAN_ENGINE.md) | agentic-lib | the engine's open work (E1–E7) |
> | [`benchmarks/ITERATION_BENCHMARKS_SIMPLE.md`](benchmarks/ITERATION_BENCHMARKS_SIMPLE.md) + [`…_ADVANCED.md`](benchmarks/ITERATION_BENCHMARKS_ADVANCED.md) | agentic-lib | the benchmark method + executor |
> | [`MARGINALIA_DEPENDENCIES.md`](MARGINALIA_DEPENDENCIES.md) | agentic-lib | what we need from marginalia |
> | [`../xn-intenton-z2a.com/PLAN_SHOWCASE.md`](../xn-intenton-z2a.com/PLAN_SHOWCASE.md) | site | the showcase/embed surface |
> | [`../../polycode-projects/marginalia/PLAN_INTENTION.md`](../../polycode-projects/marginalia/PLAN_INTENTION.md) | marginalia | the **done** estate-move record (history) |
>
> **Status (2026-06-14):** estate migration + cleanup done; engine at **8.2.0**
> (`v8` is the moving BOM pin). What remains is the **benchmark run + process
> tuning** (now the live engine item), a few engine/site follow-ons, and the
> durable "three hands" framing — see Handover.

---

## The frame (the thing every item serves)

**A consumer repo cannot self-drive.** `on-schedule` is disabled (and only does a
`tend` "one small improvement" pass); `on-intent`/`on-review` need an externally
raised issue, a pushed `INTENT.md`, or a manual dispatch. Delivery is driven by one
of **three hands**: **a human**, **Claude + the benchmark harness** (the `intention`
session), or **marginalia** (the supervisor graph via `repo_dispatch`, one piece at
a time). An `INTENT.md` of any size is delivered by **decomposing it into many
one-shot-sized issues, each a single PR, re-worked until green, then merged** — one
reliable one-shot per issue. The benchmark holds the **Haiku-4.5 engine fixed** and
varies only the *orchestrator brain* (Opus 4.8 here = maximal standard; Haiku in
marginalia's run) to measure how much better decomposition lifts the same engine.

---

## 0 · Cleanup & refocus — ✅ COMPLETE

C1–C6 done (showcase repo-bar fixed, orphan pages deleted, plan docs pruned,
`PLAN_SHOWCASE.md` refreshed, doc-consistency pass, marginalia told of the deleted
`4-kyu-apply-cron-engine` repo). Detail in [§D](#d--plan-doc-disposition).

**Live fleet: 4 kyu repos + sandbox** — `8-kyu-remember-hello-world`,
`6-kyu-understand-roman-numerals`, `3-kyu-analyze-lunar-lander`,
`2-kyu-create-markdown-compiler`, `sandbox` (random-wildcard).

---

## 1 · agentic-lib (the engine) → detail in [`PLAN_ENGINE.md`](PLAN_ENGINE.md)

**Shipped (8.0.0 → 8.2.0):** thin `claude -p`+Bedrock engine; `transform.yml` (one
trigger → one transformation → one PR, partial-slice on max-turns, `fixes #N` gate);
`summary-export.yml`; marginalia-seon MCP wiring; clean product-skeleton seed; `init`
seeds `.mcp.json` + merges `package.json`; **`on-init`** (remote init). **This
session:** seed `model: sonnet → haiku` (the engine under test is unambiguously
Haiku); seed `on-intent.yml` gains a `workflow_dispatch` `work_item` input (so a
*hand* can drive it); benchmark suite + executor overhauled.

| # | Open item | Status |
|---|---|---|
| E1 | **npm-publish `@polycode-public/agentic-lib`** (or ratify the `@v8` git-ref model). `release.yml` publishes on a `vN.N.N` tag → needs **`NPM_TOKEN` (NOT SET)**; until then `v8` is moved by hand. **Next:** add `NPM_TOKEN` + tag `v8.2.0`, or update docs to bless the git-ref model permanently. | open (NPM_TOKEN blocker) |
| E2 | **Run the kyu benchmark** (decompose → deliver → merge; Opus orchestrator / fixed Haiku engine; hands-free 30s-poll executor). **✅ done — `reports/BENCHMARK_REPORT_{SIMPLE,ADVANCED}_021.md`.** Result: all 5 repos run; 8/6/3/2-kyu **delivered green** (incl. the 3-kyu autopilot plateau **cleared** via an Opus-verified control law); sandbox 2/3 + a located cron ceiling. Next: marginalia's Haiku-orchestrated pass for the head-to-head. | ✅ done (021) |
| E3 | **Tune the *process* defaults from E2** — issue granularity + the context recipe (graph facts / failing-test output / prior diff) + `max_turns`. **Not the model** (frozen Haiku). Folds the *intent* of `PLAN_PARAMETER_TUNING`. The 3-kyu autopilot is the canonical plateau to push with finer decomposition. | open (feeds from E2) |
| E4 | **Spec the agentic-lib *own* MCP server** (`_developers/backlog/PLAN_MCP_SERVER.md`) — drive a mission at varying resource, watch convergence. NB distinct from the *marginalia-seon* consumer MCP already wired. | backlog — spec needed |
| E5 | **Runner hygiene** — bump `checkout`/`setup-node` (Node-20 deprecation, forced Node-24 from 2026-06-16) or set `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`. | open, low |
| E6 | **Config-consistency: `sonnet → haiku`** in `seeds/{workflows/on-*.yml, agentic-lib.toml}`. No Bedrock-runtime change (env wins) but removes the Anthropic-lane landmine and makes "the system under test is Haiku" unambiguous. | ✅ done (this session) |
| E7 | **Benchmark executor harness** (`scripts/benchmark-run.sh`) — init/reset (clone + local `init --purge` + SSH-push of non-workflow files), per-issue `on-intent` dispatch, 30s poll, budget hard-stop, ledger; retires the broken `benchmark-all.sh`. **✅ done + proven** across the full 021 run. | ✅ done |
| E8 | **Engine-prompt + seed fixes from 021** — **done**: `address-review.md` now acts on PR comments + work-item context (F8); `deliver-intent.md` tests the INTENT's stated bar, produces required artifacts, and wires the `src/web` demo to exercise the API (F9/F10/S3b); new `seeds/workflows/test.yml` mechanical green/red gate (F5); `on-review.yml` gains `workflow_dispatch` (F6). Live for future deliveries once `v8` moves to the fix commit. | ✅ done |
| E9 | **FINDING-3 — `on-init` workflow-file push.** Root cause: `init.yml` pushed with the Actions `GITHUB_TOKEN`, which GitHub bars from modifying `.github/workflows` (no grant fixes it). **Code done:** `init.yml` now mints the M5 App token (which has the granted `workflows: write`) via OIDC→SSM and pushes with it, degrading gracefully without it. **Operator remaining:** give the OIDC role `ssm:GetParameter`+`kms:Decrypt` on `/intention/m5/github-app-*` (see `MARGINALIA_DEPENDENCIES.md` §4b). | code done; operator SSM/IAM pending |

---

## 2 · xn-intenton-z2a.com (the site) → detail in [`PLAN_SHOWCASE.md`](../xn-intenton-z2a.com/PLAN_SHOWCASE.md)

**Shipped:** showcase cleanup (C1/C2/C4); deps refreshed (pom `--release 25`,
aws-cdk-lib 2.259, constructs 10.6, junit 5.14.4); `deploy.yml` CI JDK 21→25;
redeployed live; screenshots re-published; README notes the site is a **read-only
view** driven by the three hands.

| # | Open item | Status |
|---|---|---|
| S2 | Wire `intention-ci` OIDC/roles/cert (`ACTIONS_ROLE_ARN`/`DEPLOY_ROLE_ARN`/`CERTIFICATE_ARN` for `ci`). Prod live; ci not wired. | open, low |
| S3a | **Screenshots render** — broken-image cards (post-benchmark `agentic-lib-logs` deletion + missing `on-screenshot`) **fixed**: regenerated all 4, verified live with Playwright (`scripts/check-showcase.mjs`); harness `finalize` + the benchmark guides now re-publish + verify screenshots after every delivery. | ✅ done |
| S3b | **Screenshot content** — **fixed**: the seed `src/web` now *exercises* `src/lib/main.js` (`renderDemo` invokes the API; the page shows mission + delivered API + live output), enforced by an agent-runnable jsdom `web.test.js`; the deliver-intent prompt asks each delivery to wire a `demo()`. Applied to the 4 showcased repos → screenshots now **distinct** (36.7K/41.0K/41.9K/50.2K, was identical 30.4K) and render live. | ✅ done |

---

## 3 · repository0 (the template)

Clean identity skeleton; `INTENT.md` keeps **Hello-World/FizzBuzz** as the
*undelivered* smoke-test fixed point; engine CLI scripts + `.mcp.json` + `on-init.yml`
shipped; README now carries a **"Driving delivery by hand"** operator section
(the three hands). Open: confirm `init`/`on-init` round-trips cleanly; the benchmark
**resets repository0 to this clean template but does not deliver on it**.

---

## 4 · Cross-session / marginalia-owned → see [`MARGINALIA_DEPENDENCIES.md`](MARGINALIA_DEPENDENCIES.md)

- **The 3 embed bugs are FIXED + deployed** (marginalia, 2026-06-14). ✅
- **The outbound `repo_dispatch` actuator is live both directions** (marginalia
  drove all five of 8-kyu's repo actions from chat turns; the C1 "graph is the
  trigger" rung). ✅
- **marginalia-seon MCP is private/unpublished** (`@polycode-projects/marginalia-seon`,
  npm 404) and `MARGINALIA_GRAPH_ID` is a write-only secret. So seon does **not**
  attach for the CI agents, and the orchestrator can't read graph ids to consult it
  locally — a **soft dependency** for the benchmark. Asks tracked in
  [`MARGINALIA_DEPENDENCIES.md`](MARGINALIA_DEPENDENCIES.md) (publish seon or bless a
  local/git-ref `.mcp.json`; an operator key + per-repo graph ids).
- **`on-schedule` is disabled** in the fleet (a faithful 422 from `repo_dispatch`) —
  intentional; not a delivery driver (the "three hands" framing).
- **M5 GitHub App** `intention-system` (App 4048241, install 140151684) live;
  creds mirrored to marginalia-prod SSM `/marginalia/prod/github-app-*`.

---

## 5 · Done (estate move + sessions to date)

Estate move + AWS reboot + M5/summary/embed complete (record:
[`PLAN_INTENTION.md`](../../polycode-projects/marginalia/PLAN_INTENTION.md)). Recent
sessions added: the cross-repo roadmap + plan cleanup; estate-wide dep refresh; the
marginalia-seon MCP wiring; the clean-template seed + `init` package.json/.mcp.json
seeding; `on-init`; site dep refresh + redeploy; screenshots; the seed Haiku
consistency + `workflow_dispatch` hand-driveability; the benchmark overhaul.

---

## Handover — read this to resume (2026-06-14, end of session)

**Released + propagated:** agentic-lib **8.2.0** (`v8` → the 8.2.0 commit, moved by
hand — npm publish deferred, no `NPM_TOKEN`). All 6 repos carry refreshed
`package.json` + `.mcp.json` + `on-init.yml`. Site live on JDK 25 / CDK 2.259.
(NB: pushing **workflow files needs SSH** — gh's HTTPS token lacks the `workflow`
scope; the benchmark executor therefore **never pushes `.github/workflows`**.)

**This session's deliverables:** the two-brain benchmark method + the hands-free
30s-poll executor (`scripts/benchmark-run.sh`); `INTENTION_ROADMAP.md` rewritten as
the all-repo feature plan; `MARGINALIA_DEPENDENCIES.md` added; "three hands" +
benchmark framing captured durably in the engine/template CLAUDE.md + repository0
README; seed `sonnet→haiku` + `workflow_dispatch`. **Then the benchmark was run** →
`reports/BENCHMARK_REPORT_{SIMPLE,ADVANCED}_021.md`.

**Open / next session:**
1. **E2/E3 — read the 021 reports**, tune the decomposition-granularity + context
   recipe, raise budgets, re-run. The 3-kyu autopilot plateau is the thing to push
   with finer decomposition (never a bigger model).
2. **E1 — add `NPM_TOKEN`**, tag `v8.2.0` for a real publish (or bless the git-ref
   model in the docs).
3. **S3 — screenshot content** (6/3/2-kyu identical-size PNGs).
4. **marginalia-seon** lights up fleet-wide the moment marginalia publishes / blesses
   a resolvable `.mcp.json` form + hands over an operator key + graph ids
   (`MARGINALIA_DEPENDENCIES.md`).
5. **marginalia's own benchmark** (same process, Haiku orchestrator) → the
   comparison the 021 reports are the maximal-standard half of.

**Inbox:** marginalia is live and collaborative — message
`~/.claude/inboxes/marginalia.md` directly (transient peer messages, not a durable
record).

---

## D · Plan-doc disposition

**Deleted** (git history retains them): `PLAN_3_MARKETPLACE.md`,
`PLAN_BENCHMARK_018_FIXES.md`, `_developers/backlog/PLAN_3_PLANNING.md`,
`PLAN_MULTI_LLM.md`, `PLAN_SUPERVISOR.md`, `PLAN_NEWS_AGGREGATOR.md`,
`2-dan-create-agi.md`, and the three `_developers/bluesky/PLAN_{4,5,6}_*.md`.

**Kept:** `PLAN_ENGINE.md` (active engine roadmap), `PLAN_2_NARRATIVE.md`
(terminology record), `MARGINALIA_DEPENDENCIES.md` (marginalia asks),
`_developers/backlog/PLAN_MCP_SERVER.md` (→ E4), `_developers/backlog/PLAN_PARAMETER_TUNING.md`
(→ E3), and the site's `PLAN_SHOWCASE.md`. Non-plan material
(`benchmarks/reports/`, `_developers/reference|examples|archive`) is data/history.
