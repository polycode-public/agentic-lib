# INTENTION_ROADMAP.md — the intentïon estate's cross-repo tracker

> **This is the one forward roadmap that spans all three estate repos**
> (`agentic-lib`, `repository0`, `xn-intenton-z2a.com`). It is an *index*: each
> item is one line with an owner repo, a status, and a pointer to where the detail
> lives. The roadmap holds the **summary**; detail lives in the named PLAN docs.
>
> **Read order for a cold-start agent:** this file first (esp. the **Handover** at
> the end), then the per-repo detail doc for whatever you're touching, then your
> inbox (`~/.claude/inboxes/intention.md` — transient peer-agent messages).
>
> | Detail doc | Repo | Holds |
> |---|---|---|
> | [`PLAN_ENGINE.md`](PLAN_ENGINE.md) | agentic-lib | the engine's open work (E1–E5) |
> | [`../xn-intenton-z2a.com/PLAN_SHOWCASE.md`](../xn-intenton-z2a.com/PLAN_SHOWCASE.md) | site | the showcase/embed surface |
> | [`../../polycode-projects/marginalia/PLAN_INTENTION.md`](../../polycode-projects/marginalia/PLAN_INTENTION.md) | marginalia | the **done** estate-move record (history, not forward) |
>
> **Status (2026-06-14):** estate migration complete; **cleanup/refocus done**;
> engine at **8.2.0** (`v8` is the moving BOM pin). What remains is a short list of
> engine/site follow-ons + one hard delivery (3-kyu) — see Handover.

---

## 0 · Cleanup & refocus — ✅ COMPLETE

| # | Item | Repo | Status |
|---|---|---|---|
| C1 | Drop `repository0` + deleted `4-kyu-apply-cron-engine` from the showcase repo-bar; fix `index.html` fallback/default; add a "Create your own ↗" template CTA. | site | ✅ done |
| C2 | Delete the orphaned `public/all.html` stats page. | site | ✅ done |
| C3 | Delete the obsolete plan docs; keep `PLAN_2_NARRATIVE.md` + the MCP/parameter-tuning specs. (See [§D](#d--plan-doc-disposition).) | agentic-lib | ✅ done |
| C4 | Refresh the stale `PLAN_SHOWCASE.md` to current reality (marginalia embed + `summary.json` seed + repo-bar). | site | ✅ done |
| C5 | Doc-consistency: cold-start pointer → this file; drop `4-kyu` from the agentic-lib `CLAUDE.md` fleet table (mission *seed* kept); tidy site `CLAUDE.md`. | all | ✅ done |
| C6 | Tell marginalia the `4-kyu-apply-cron-engine` repo is deleted → graph `c71c35db-…` orphaned. | marginalia (coord) | ✅ done (marginalia ack'd) |

**Live fleet: 4 repos + sandbox** — `8-kyu-remember-hello-world`,
`6-kyu-understand-roman-numerals`, `3-kyu-analyze-lunar-lander`,
`2-kyu-create-markdown-compiler`, `sandbox`.

---

## 1 · agentic-lib (the engine) → detail in [`PLAN_ENGINE.md`](PLAN_ENGINE.md)

**Shipped this session — 8.0.0 → 8.2.0** (`v8` moved; **npm-unpublished**, consumed via `@v8` git ref):
- **8.1.0** — marginalia-seon **MCP wiring** in `transform.yml` (attaches the repo's graph-memory tools to `claude -p` when `MARGINALIA_API_KEY` + `.mcp.json` present; graceful); clean **product-skeleton seed** (identity lib + web demo + behaviour test, no delivered example); `init` now **seeds `.mcp.json` + merges package.json** (engine CLI scripts + tooling deps) so a re-init never goes backwards; `--purge` removes delivered extras.
- **8.2.0** — **`on-init`**: remote `agentic-lib init` (reusable `init.yml` + `on-init.yml` consumer, dispatch flavours `mode`/`mission`/`dry_run` → draft PR). The init analogue of `on-intent`.
- **Deps refreshed** (eslint held at 9.x — 10's plugin ecosystem isn't ready).

| # | Open item | Status |
|---|---|---|
| E1 | **npm-publish `@polycode-public/agentic-lib`.** `release.yml` fires on a `vN.N.N` tag → npm publish (needs **`NPM_TOKEN` secret — NOT SET**) → moves `v8`. Until set, `v8` is moved **manually** on release. **Next:** add `NPM_TOKEN`, then tag `v8.2.0` for a real publish; or ratify the git-ref model and drop the "not yet published" doc wording. | open (NPM_TOKEN blocker) |
| E2 | **Re-run the kyu benchmarks on `claude -p` + Bedrock** (021+). Run plan adapted to the current fleet in `benchmarks/ITERATION_BENCHMARKS_ADVANCED.md` (4-kyu→sandbox; 3/2-kyu on their own repos). Reports still Copilot-era 018–020. | open (doc ready) |
| E3 | Tune engine defaults (model + `max_turns`) from E2. Folds `PLAN_PARAMETER_TUNING` intent. **3-kyu shows Haiku plateaus on hard chunks** (see Handover) — likely needs a per-tier Sonnet escalation. | open |
| E4 | Spec the agentic-lib **own** MCP server (`PLAN_MCP_SERVER.md` — drive a mission at varying resource, watch convergence). NB distinct from the *marginalia-seon* consumer MCP now wired. | backlog — spec needed |
| E5 | Runner hygiene: bump `checkout`/`setup-node` (Node-20 deprecation) or set `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`. | open, low |

---

## 2 · xn-intenton-z2a.com (the site) → detail in [`PLAN_SHOWCASE.md`](../xn-intenton-z2a.com/PLAN_SHOWCASE.md)

**Shipped this session:** showcase cleanup (C1/C2/C4); **deps refreshed** — pom
`--release 25` (house JDK), aws-cdk-lib 2.259.0, constructs 10.6.0, junit 5.14.4
(+ explicit `junit-platform-launcher`); **`deploy.yml` CI JDK bumped 21→25** (the
first deploy failed on the mismatch); **redeployed live**. Screenshots re-published
(see below).

| # | Open item | Status |
|---|---|---|
| S2 | Wire `intention-ci` OIDC/roles/cert for ci-env deploys (`ACTIONS_ROLE_ARN`/`DEPLOY_ROLE_ARN`/`CERTIFICATE_ARN` for `ci`). Prod is live; ci not wired. | open, low |
| S3 | Confirm the showcase panels (status `[N]`, VT100, screenshot) derive cleanly from `summary.json`. Screenshots now publish + serve (HTTP 200), but **6/3/2-kyu `SCREENSHOT_INDEX.png` are identical byte size** — likely a generic/fallback render, not the repo's real demo. Verify + fix the per-repo demo (or make the screenshot unconditional). | open, verify |

---

## 3 · repository0 (the template)

**Cleaned this session:** product reset to the clean identity skeleton (fizzbuzz
example — incl. the engine-delivered `fizzBuzzRange` — removed; `INTENT.md` keeps
FizzBuzz as the *undelivered* smoke-test target); engine CLI npm scripts added;
`.mcp.json` shipped; README rewritten (CLI/actions/MCP/webhooks/`on-init`); deps
refreshed; `on-init.yml` added. `INTENT.md` is its fixed point — no plan doc needed.

---

## 4 · Cross-session / marginalia-owned

- **The 3 embed bugs are FIXED + deployed** (marginalia, 2026-06-14): tier-0
  wrong-repo (verified live), in-widget login → private-graph full-model chat,
  on-page tier/context block. ✅
- **Outbound actuator built** (marginalia `repo_dispatch`): the graph can now
  dispatch a bound repo's `on-intent`/`on-review`/`on-summary`/`on-screenshot`/
  `on-schedule` (owner posture, 1/turn + caps) — the C1 "graph is the trigger" rung.
- **marginalia-seon MCP is private/unpublished** (`@polycode-projects/marginalia-seon`,
  npm 404). Our `.mcp.json` (all 6 repos) + `transform.yml` are ready; the MCP
  **attaches only once marginalia publishes the server** (operator-gated). Until
  then it silently doesn't attach — by design.
- **M5 GitHub App** `intention-system` (App 4048241, install 140151684) installed +
  verified; per-repo webhooks live; SSM creds mirrored to marginalia-prod.

---

## 5 · Done (estate move + this session)

Estate move + AWS reboot + M5/summary/embed are complete (full record:
[`PLAN_INTENTION.md`](../../polycode-projects/marginalia/PLAN_INTENTION.md)). This
session added: cross-repo roadmap + plan cleanup; estate-wide dep refresh; the
marginalia-seon MCP wiring; the clean-template seed + `init` package.json/.mcp.json
seeding; `on-init` (remote init); site dep refresh + redeploy; screenshots
re-published.

---

## Handover — read this to resume (2026-06-14, end of session)

**Released + propagated:**
- **agentic-lib 8.2.0**, `v8` → the 8.2.0 commit (moved manually — npm publish
  deferred, no `NPM_TOKEN`). Carries: `transform.yml` MCP wiring, `init.yml` (remote
  init reusable), clean seed skeleton, `init` package.json/.mcp.json seeding.
- **All 6 repos** (repository0 + 5 fleet) got: refreshed `package.json` (engine CLI
  scripts + latest tooling deps + fresh lockfile), `.mcp.json`, **`on-init.yml`**.
  Pushed. (NB: pushing **workflow files needs SSH** — gh's HTTPS token lacks the
  `workflow` scope.)
- **Site** redeployed live on JDK 25 / CDK 2.259.

**Open / next session:**
1. **3-kyu lunar-lander is RED on main** (incomplete delivery — pre-existing, not
   from our changes). Failing area is **only `autopilot()`** (12 tests; physics/
   scoring pass). Demonstrated the decompose model: focused issue **#9** → scoped
   Haiku delivery → **PR #10**, but **Haiku plateaus at ~30/40** — the autopilot is
   one irreducibly-hard algorithm. PRs **#8 + #10 open, neither green.** Decision
   needed: escalate this chunk to **Sonnet** (set the repo's `ANTHROPIC_MODEL` var,
   re-deliver, merge if green, revert) — needs explicit user OK (changing a shared
   CI var + closing a PR was auto-denied); or accept partial. **The model is right:
   one one-shot Haiku delivery per PR; decompose INTENT into many one-shot issues.**
2. **E1 — add `NPM_TOKEN`** to agentic-lib, then a `v8.2.0` tag for a real npm
   publish (today `v8` is moved by hand on each release).
3. **E2 — run the adapted advanced benchmarks** (`ITERATION_BENCHMARKS_ADVANCED.md`)
   → reports 021+; feeds E3 tuning (and likely a Sonnet tier for 3–2 kyu).
4. **S3 — screenshot content:** 6/3/2-kyu PNGs are identical-size (generic render?).
   Verify each repo's `src/web` demo actually renders its delivery; make the
   behaviour-test screenshot unconditional so a broken demo still publishes.
5. **marginalia-seon MCP** lights up fleet-wide the moment marginalia publishes the
   npm package — no change needed our end.

**Inbox:** marginalia is live and collaborative — message
`~/.claude/inboxes/marginalia.md` directly (these are transient peer messages, not
a durable record). Last exchange: they confirmed seon-unpublished + embed fixes +
`repo_dispatch`; we confirmed 8.2.0 / screenshots / 3-kyu.

---

## D · Plan-doc disposition

What we did with every `PLAN_*.md` in the estate during the C3/C4 refocus.

**Deleted** (git history retains them): `PLAN_3_MARKETPLACE.md`,
`PLAN_BENCHMARK_018_FIXES.md`, `_developers/backlog/PLAN_3_PLANNING.md`,
`PLAN_MULTI_LLM.md`, `PLAN_SUPERVISOR.md`, `PLAN_NEWS_AGGREGATOR.md`,
`2-dan-create-agi.md`, and the three `_developers/bluesky/PLAN_{4,5,6}_*.md`.

**Kept:** `PLAN_ENGINE.md` (active engine roadmap), `PLAN_2_NARRATIVE.md`
(terminology record), `_developers/backlog/PLAN_MCP_SERVER.md` (→ E4, re-spec),
`_developers/backlog/PLAN_PARAMETER_TUNING.md` (→ E3, re-spec), and the site's
refreshed `PLAN_SHOWCASE.md`. Non-plan material (`benchmarks/reports/`,
`_developers/reference|examples|archive|REPORT_*`) is data/history — untouched.
