# Plan: Self-Hosted Bootstrap Tests

## Problem Statement

agentic-lib distributes autonomous development workflows to consumer repos via `npx @xn-intenton-z2a/agentic-lib init --purge`. Today it can manage consumer repos (like repository0) but cannot manage itself. The computer science concept for a system capable of maintaining/reproducing itself is **self-hosting** (like a compiler that compiles its own source code).

The strongest proof of capability: if the system can maintain and recreate itself, it can maintain anything.

## Predecessor: PLAN_LOCAL_SCENARIO_TESTS.md

This plan extends the local scenario test framework defined in PLAN_LOCAL_SCENARIO_TESTS.md, which provides:

- `--local-llm` flag on `bin/agentic-lib.js` routing to node-llama-cpp (SmolLM2-360M)
- `scripts/scenario-runner.js` orchestrator (creates temp workspaces, invokes CLI, checks assertions)
- Grammar-constrained generation for reliable tool calls from tiny models
- Three base scenarios: `maintain-features`, `transform`, `full-loop`

PLAN_SELF_HOSTED adds four bootstrap-specific scenarios to the same framework.

## The Two Core Tests

### Test 1: Clone Self — "Can I improve myself?"

Clone agentic-lib's source tree into a temp workspace, write an intentïon that targets the SDK itself, run transform, and verify the system made a useful increment.

- Workspace: copy of agentic-lib source (minus `.git/`, `node_modules/`, `models/`)
- INTENTÏON.md: narrowly scoped so the tiny model can act (e.g., "Add JSDoc to exported functions in safety.js")
- agentic-lib.toml: source paths point at `src/actions/agentic-step/` (the SDK itself)
- `node_modules` symlinked from real repo for fast dependency resolution
- Assertions: file modified, still valid JS, diff is substantive (not just whitespace)

### Test 2: Empty Bootstrap — "Can I recreate myself from a description?"

Start from empty repo, `init --purge`, write INTENTÏON.md describing the delta between version N and N+1 (which already exists as a known target), run maintain-features then transform, verify convergence toward the known target.

- Workspace: empty, then `init --purge` creates seed state
- INTENTÏON.md: derived from a real historical commit diff (e.g., v7.1.30 → v7.1.31)
- Key insight: because the target already exists, convergence is objectively measurable
- Assertions: seed files created, features generated, source modified, valid JS
- Soft assertion: convergence score — keywords from the n+1 delta found in generated code

## Four Bootstrap Scenarios

### Scenario 4: `clone-self` (~15-30s)

```
1. copySourceTree(agenticLibRoot, workspace, ['.git', 'node_modules', 'models'])
2. git init in workspace
3. symlink node_modules from real repo
4. Write INTENTÏON.md targeting a specific single-file improvement
5. Write agentic-lib.toml with source = "src/actions/agentic-step/"
6. node bin/agentic-lib.js transform --target <workspace> --local-llm
7. Assert: file in src/actions/agentic-step/ modified, valid JS, diff substantive
```

### Scenario 5: `empty-bootstrap` (~20-35s)

```
1. Create empty workspace, git init
2. node bin/agentic-lib.js init --purge --target <workspace>
3. Write INTENTÏON.md describing known N→N+1 delta
4. Write feature files matching the delta
5. node bin/agentic-lib.js maintain-features --target <workspace> --local-llm
6. node bin/agentic-lib.js transform --target <workspace> --local-llm
7. Assert: seed files exist, features created, source modified, valid JS
8. Soft: convergence score (keywords from n+1 in generated code)
```

### Scenario 6: `version-increment` (~10-20s)

```
1. copySourceTree into workspace, git init, commit all
2. INTENTÏON.md: "Update package.json version from X to Y, update seeds to match"
3. agentic-lib.toml with package.json and src/seeds/ in writable paths
4. node bin/agentic-lib.js transform --target <workspace> --local-llm
5. Assert: package.json modified, still valid JSON
6. Soft: version field matches target, seeds updated
```

### Scenario 7: `seed-sync` (~10-20s)

```
1. copySourceTree into workspace
2. Tamper: modify src/seeds/zero-main.js with an outdated function
3. INTENTÏON.md: "Review seeds, ensure zero-main.js is a minimal placeholder matching zero-main.test.js"
4. node bin/agentic-lib.js transform --target <workspace> --local-llm
5. Assert: tampered file modified, still valid JS
```

## New Infrastructure

### Helper functions (in `scripts/scenario-runner.js`)

| Function | Purpose |
|---|---|
| `copySourceTree(src, dst, excludes)` | Recursive copy via `fs.cpSync` with filter, skipping .git/node_modules/models |
| `diffIsSubstantive(before, after)` | True if diff contains real changes (not just whitespace/comments) |
| `assertValidJson(workspace, relPath)` | Verify file is parseable JSON |
| `convergenceScore(workspace, keywords)` | Score 0.0-1.0 based on target keywords found in generated files |

### npm scripts (in `package.json`)

```
test:scenario:clone-self    — Clone self test
test:scenario:bootstrap     — Empty repo bootstrap
test:scenario:version       — Version increment test
test:scenario:seed-sync     — Seed synchronization test
test:scenario:self-host     — All 4 bootstrap scenarios
test:scenario:all           — All 7 scenarios (base + bootstrap)
```

### Optional: n+1 intentïon generator (`scripts/generate-n-plus-1-intention.js`)

Utility that generates INTENTÏON.md + feature files from `git diff <from>..<to>`. Deferred to Phase 3 — initially the empty-bootstrap scenario hardcodes a known delta.

## Phased Implementation

### Phase 1: Core bootstrap tests (depends on PLAN_LOCAL_SCENARIO_TESTS)

1. Add `copySourceTree`, `diffIsSubstantive` helpers to scenario-runner.js
2. Implement `clone-self` scenario
3. Implement `empty-bootstrap` scenario with hardcoded n+1 delta
4. Add npm scripts for bootstrap scenarios

### Phase 2: Extended bootstrap tests

5. Implement `version-increment` scenario
6. Implement `seed-sync` scenario
7. Add `convergenceScore` helper

### Phase 3: Tooling

8. Build `scripts/generate-n-plus-1-intention.js` — parameterize empty-bootstrap across versions
9. Build `scripts/self-host-system-test.sh` — full-cycle test with real Copilot SDK (not local LLM)
10. Add canary self-host check to release.yml (informational, not blocking)

## Extensions to the Strategy

### A. Regression test from known fixes

Take historical bug fix commits, check out pre-fix state, write intentïon from the commit message, run transform, compare to actual fix. Has a known correct answer — stronger evidence than open-ended improvement.

### B. Canary self-host on every release

Add a `self-host-check` job to release.yml that runs `clone-self` before publishing. If the about-to-be-released code can't manage itself, flag it. Initially informational, becomes required after reliability is proven.

### C. Differential convergence scoring

Track empty-bootstrap convergence scores across versions. If convergence decreases between versions, the SDK became worse at self-hosting. Provides a numeric quality signal over time.

### D. Full-cycle with Copilot SDK

The ultimate test: same scenarios but with `--model claude-sonnet-4` instead of `--local-llm`. Proves real self-hosting capability (not just mechanics). Requires COPILOT_GITHUB_TOKEN. Script: `test:scenario:self-host:copilot`.

### E. Bootstrap from npm package

`npm pack` → install tarball in temp workspace → run init from installed package → verify working repo. Tests the published artifact (not local source). Validates that the `files` field in package.json captures everything needed.

## What This Proves vs What It Doesn't

**Proves (with local LLM):**

- The CLI can target its own codebase (self-reference works)
- Prompt construction handles SDK-shaped repos (not just consumer repos)
- Tool calls work on complex file trees (20+ files, 6700+ lines)
- Path writability enforcement works with SDK paths
- The init → features → transform pipeline can converge toward a known target
- Version and seed management can be handled by the transform pipeline

**Does NOT prove (requires Copilot SDK):**

- The system can produce high-quality SDK improvements
- Multi-file architectural changes work
- Real publishing works end-to-end (OIDC, npm, GitHub Releases)
- Multi-workflow orchestration (supervisor → transform → fix-code) works for self

**Key insight:** Local LLM tests prove the mechanics. Copilot SDK tests prove the capability. Both are needed for full self-hosting confidence.

## Assertions Summary

| Scenario | Hard (must pass) | Soft (informational) |
|---|---|---|
| clone-self | File modified, valid JS, diff substantive | Tests pass, change related to intentïon |
| empty-bootstrap | Seeds created, feature created, source modified, valid JS | Convergence > 0, n+1 keywords found |
| version-increment | package.json modified, valid JSON | Version matches target, seeds updated |
| seed-sync | Tampered file modified | Modification toward correctness |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Tiny model can't handle SDK complexity | High | Narrow intentïon to single file; fall back to Qwen2.5-0.5B |
| clone-self workspace missing node_modules | High | Symlink from real repo |
| n+1 delta too complex for tiny model | Medium | Choose JS-only delta, not YAML workflow changes |
| Tests are slow/flaky | Low-medium | Separate npm scripts; not in `npm test`; model loaded once |
| Tests prove mechanics, not real capability | Certain | Be explicit; add Copilot SDK variant for real proof |
