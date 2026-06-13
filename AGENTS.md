# AGENTS.md — agentic-lib (the intentïon delivery engine)

AAIF-standard guidance for AI agents working **on** agentic-lib itself. Repo
conventions are in `CLAUDE.md`; estate-wide conventions in `../CLAUDE.md` (the
`polycode-public` parent). The engine-port plan is `PLAN_2_NARRATIVE.md` here and
§7 of `../polycode-projects/marginalia/PLAN_CODING_AGENT.md`.

## What this is

The delivery engine for the intentïon fleet: given a work item (an issue / an
`INTENT.md`), it runs **one whole transformation** (issue → PR-ready branch) and
stops. It holds **no plan and no state** between transformations — decomposition
and memory live in the marginalia supervisor graph. As of **8.0.0** the engine is
a **thin wrapper over the 2026 stack** (Path B = `claude -p` + Bedrock), not a
bespoke agent loop.

## Direction (8.x port)

- **Provider selection is purely env vars**: Anthropic lane `ANTHROPIC_API_KEY`;
  **Bedrock lane** `CLAUDE_CODE_USE_BEDROCK=1` + OIDC-vended AWS creds +
  `AWS_REGION=eu-west-2` + `ANTHROPIC_MODEL=<inference-profile-id>`.
- The reusable unit is `.github/workflows/transform.yml` (`workflow_call`: inputs
  `type` / `work_item` / `max_turns` / `model`) → `claude -p` → `fixes #N` trailer
  gate → `gh pr create`; concurrency keyed on the work item.
- **Deleted** in the port: `src/copilot/`, `src/actions/agentic-step/`, the plan
  engine, tools.js, ~5,500 of ~6,000 workflow lines. Thousands of JS lines → a few
  hundred lines of YAML/bash/markdown.
- **Kept**: the kyu/INTENT mission library, the benchmark harness + reports, the
  CLI (`bin/agentic-lib.js`, slimmed), `MODELS.md` (now the env-var matrix).

## Licensing

**Dual `(AGPL-3.0-only OR MIT)`** — `LICENSE` (AGPL-3.0) + `LICENSE-MIT` both
apply. Our engine IP is AGPL; the MIT offer is retained.

## Build / test

- `npm test` / `npx vitest`. Node 24+, ESM. Runtime dep ≈ `smol-toml` only after
  the port (the `@github/copilot-sdk` dep is removed).

## Estate-move notes (2026-06-13)

Moved off GitLab to `github.com/polycode-public`; npm scope is now
**`@polycode-public/agentic-lib`**; all `github.com/xn-intenton-z2a` →
`github.com/polycode-public` (the punycode showcase **domain**
`xn--intenton-z2a.com` is unchanged — do not rewrite it).
