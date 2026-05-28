# Benchmark Report 008

**Date**: 2026-03-14
**Operator**: Claude Code (claude-opus-4-6)
**agentic-lib version**: 7.4.14 (on npm)
**Previous report**: BENCHMARK_REPORT_007.md (roman-numerals, string-utils, cron-engine / gpt-5-mini / recommended)

---

## Scenario

| ID | Mission | Model | Profile | Budget | Outcome |
|----|---------|-------|---------|--------|---------|
| B1 | 3-kyu-evaluate-owl-ontology | gpt-5-mini | max | 128 | **mission-failed** (after 3 transforms, 132 log entries, ~12 hours) |

---

Prompt for this report:
```
Hello Claude, Please create a BENCHMARK_REPORT_*.md document like the other ones in ./agentic-lib which analyses a single experiment which ran from this init and purge at 1:05am           
https://github.com/xn-intenton-z2a/repository0/actions/workflows/agentic-lib-init.yml to work on 3-kyu-evaluate-owl-ontology and the logs are in here                                         
https://github.com/xn-intenton-z2a/repository0/tree/agentic-lib-logs. Please so these things with 1 and 2 in consecutively, then 2 through 6 concurrently, then 7 and 8 consecutively: 1.     
Build a timeline summarising the log activity and when changes (otherbhan logs) were committed to git. 2. Create a report similar to the other BENCHMARK_REPORT_*.md documents. 3. Add        
reccommedations to improve the workflows based on the report. 4. Take a deep dive into the logging documents and locate reported values which are counter intuative and suggest improvements. 
 5. Locate periods where the workflow seems stuck and suggest ways to mitigate this.6. Review the code that was actually created and make reccomendations which will skew the work towards    
extending the functionality of the core library. 7. Review the FEATURES.md against the report and suggest improvements to areas where we have a declared feature but the implemenation is     
weak or the actual behaviour is underperforming. 8.Re-assess the whole timeline and report covering itenms 1 through 7 we have workled on and extract any re-occuring patterns that could be  
optimised and suggest improvements.  
```

---

## Configuration

| Parameter | Value |
|-----------|-------|
| Mission seed | 3-kyu-evaluate-owl-ontology |
| Model | gpt-5-mini |
| Profile | max |
| Budget | 128 |
| Init run | [23076868530](https://github.com/xn-intenton-z2a/repository0/actions/runs/23076868530) |
| Init time | 01:07 UTC |
| Schedule | initially continuous, set to weekly at 13:13 UTC |
| Final source lines | 544 (main.js) |
| Test files created | 12 (defineClass, defineProperty, addIndividual, individuals, query, persistence, stats, cli, define-class, define-property, main, web) |
| Feature specs created | 8 (CLI, DEFINE_CLASS, DEFINE_PROPERTY, INDIVIDUAL_MANAGEMENT, PERSISTENCE, QUERY, SEED_DATA, STATS) |
| Library docs created | 17 (CANONICALIZATION, DOCUMENT_LOADER, JSONLD_JS, JSON_LD, JSON_LD_API, LINKED_DATA, N3, ONTOLOGY_PIPELINE, OWL, OWL_EVALUATION, OWL_PRACTICAL, OWL_TOOLKIT, RDF, RDFLIB, SEMANTIC_WEB, SIGNING, SOURCES_DIGEST) |

---

## Timeline

### Phase 1: Init & Setup (01:05-01:21 UTC) — 16 minutes

| Time (UTC) | Event | Detail |
|------------|-------|--------|
| 01:04 | agentic-lib-test | Pre-init test run on main |
| 01:06 | agentic-lib-update | Updated to agentic-lib@7.4.14 |
| 01:07 | **agentic-lib-init** | Init purge with mission `3-kyu-evaluate-owl-ontology` |
| 01:08 | Init committed | `d1631b08` — init purge (agentic-lib@7.4.14) |
| 01:08 | Issues created | #2978 (Initial unit tests), #2979 (Initial web layout) |
| 01:21 | First schedule run | agentic-lib-schedule dispatched |

### Phase 2: Active Development (02:04-05:36 UTC) — 3.5 hours

| Time (UTC) | Task | Outcome | Tokens | Duration | Key Commit |
|------------|------|---------|--------|----------|------------|
| 02:04 | workflow | Cron schedule update | — | — | `50fe5656` Update cron schedule |
| 02:06 | maintain-features | features-maintained | 81,743 | 97s | Wrote PERSISTENCE feature spec |
| 02:07 | maintain-library | sources-discovered | 73,679 | 122s | Wrote SOURCES.md with 8 curated sources |
| 02:08 | maintain-library | committed | — | — | `0ec9a947` Add curated sources |
| **02:21** | **TRANSFORM #1** | **transformed** | **486,269** | **307s** | **PR [#2980](https://github.com/xn-intenton-z2a/repository0/pull/2980) — resolved issue #2978** |
| 02:22 | PR merged | PR #2980 merged | — | — | `f58c8731` agentic-step: transform issue #2978 |
| 03:17 | maintain-features | features-maintained | 95,939 | 107s | Created 7 feature specification files |
| 03:20 | maintain step | committed | — | — | `4f292e51` maintain features and library |
| **03:34** | **TRANSFORM #2** | **transformed** | **277,859** | **294s** | **PR [#2981](https://github.com/xn-intenton-z2a/repository0/pull/2981) — resolved issue #2979** |
| 03:34 | PR merged | PR #2981 merged | — | — | `3eb7374b` agentic-step: transform issue #2979 |
| 04:07 | workflow | **cancelled** | — | — | One workflow run cancelled |
| 04:10 | maintain-features | features-maintained | 133,851 | 137s | Added MODEL_VALIDATION spec to PERSISTENCE |
| 04:14 | maintain-library | library-maintained | — | — | `be3e6ff2` Add library documents: JSON_LD, JSONLD_JS, RDF, OWL, N3, RDFLIB |
| 04:57 | maintain-features | features-maintained | 113,177 | 113s | Updated CLI feature spec (import/export) |
| 05:01 | maintain step | committed | — | — | maintain features and library |
| 05:31 | maintain-features | features-maintained | **625,997** | 280s | Updated INDIVIDUAL_MANAGEMENT.md |
| **05:31** | **implementation-review** | **implementation-reviewed** | **647,695** | **282s** | Full review of all 11 elements — all implemented, all unit tested |
| **05:36** | **mission-failed** | budget exhausted | — | — | `fccf22ba` mission-failed: Transformation budget exhausted |

### Phase 3: Post-Failure Cycling (05:59-08:18 UTC) — 2.3 hours

| Time (UTC) | Task | Outcome | Notes |
|------------|------|---------|-------|
| 05:59 | implementation-review | **nop** | Mission failed declared: YES. Cumulative transforms: 0. |
| 06:06 | maintain step | committed | `d1a51364` maintain features and library |
| 06:25 | implementation-review | **nop** | Same state. All metrics MET except cumulative transforms = 0. |
| 06:28 | maintain step | committed | `147db1b1` maintain features and library |
| 07:02 | implementation-review | **nop** | No change. Still stuck. |
| 07:06 | maintain step | committed | `900f64eb` maintain features and library |
| 07:27 | maintain step | committed | `8ae702e8` maintain features and library |
| 07:39 | implementation-review | **nop** | Still stuck on cumulative transforms = 0. |
| 07:44 | maintain-library | library-maintained | Created CANONICALIZATION library doc |
| 07:57 | direct | **nop** | 0s duration. Mission failed. |
| 07:59 | issue #2982 created | Untitled issue | Auto-created |
| **08:17** | **TRANSFORM #3** | **transformed** | **1,345,198 tokens**, **614s**, 42 tool calls, 10 files written |
| 08:18 | PR #2983 merged | resolved #2982 | `2cd40539` agentic-step: transform issue #2982 |
| 08:19 | implementation-review | **nop** | Cumulative transforms still 0. Mission failed: YES. |

### Phase 4: Terminal Stuck Loop (08:36-13:13 UTC) — 4.6 hours

From 08:36 onwards, the system entered a steady-state loop of `implementation-review → nop → maintain → commit` cycling approximately every 20 minutes. **All 20+ iterations in this phase produced identical outcomes:**

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Open issues | 0 | 0 | MET |
| Open PRs | 0 | 0 | MET |
| Issues resolved | 3 | >= 2 | MET |
| Dedicated test files | 0 | >= 0 | MET |
| Source TODO count | 0 | <= 0 | MET |
| Transformation budget used | 0/128 | < 128 | OK |
| Cumulative transforms | **0** | **>= 1** | **NOT MET** |
| Mission failed declared | **YES** | — | — |

At 11:40, a SIGNING document was committed (`3f0e1531`). At 13:13, the schedule was finally set to weekly (`188e79e1`), ending the continuous cycling.

**Total log files on agentic-lib-logs branch: 132**

---

## Acceptance Criteria Assessment

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Can define classes and properties | **PASS** | `defineClass()` and `defineProperty()` implemented with validation; 12 test files covering these |
| Can add individuals and query them | **PASS** | `addIndividual()`, `getIndividual()`, `updateIndividual()`, `removeIndividual()` + `query()` with subclass inference |
| Data persists to and loads from JSON-LD files | **PASS** | `save()` writes one-file-per-class layout; `load()` reads back; tested in persistence.test.js |
| At least one example ontology populated in data/ | **PARTIAL** | Seed data exists at `src/web/data/ontology.jsonld` (animal taxonomy) but not at project root `data/` as MISSION.md specifies |
| `stats()` returns correct counts | **PASS** | stats.test.js verifies class/property/individual counts |
| All unit tests pass | **PASS** | Post-commit tests pass on all transform PRs |
| README documents the API with examples | **PASS** | README updated by transform #1 |

---

## Scenario Summary

| Metric | Value |
|--------|-------|
| Total workflow runs | 82 (including pages-build-deployment) |
| Total log entries | 132 |
| Total iterations (meaningful) | ~38 (excluding pages/test runs) |
| Transforms | 3 (iterations at 02:21, 03:34, 08:17) |
| Issues resolved | 3 (#2978, #2979, #2982) |
| PRs merged | 3 (#2980, #2981, #2983) |
| Convergence | **Did not converge** — mission-failed declared |
| Final source lines | 544 (main.js) |
| Acceptance criteria | **6/7 PASS** (seed data location mismatch) |
| Mission complete | **NO** |
| Time (init to mission-failed) | ~4h 29m (01:07 to 05:36) |
| Time (init to working code) | ~1h 14m (01:07 to 02:21, transform #1) |
| Time (mission-failed to schedule-off) | ~7h 37m (05:36 to 13:13) |
| Total experiment duration | ~12h 6m (01:07 to 13:13) |
| Estimated total tokens consumed | >4,000,000 |

---

## Comparison with Previous Reports

| Metric | Report 005 (fizz-buzz/min) | Report 006 (hamming/rec) | Report 007 (3 missions/rec) | **Report 008 (owl-ontology/max)** |
|--------|---------------------------|-------------------------|---------------------------|-----------------------------------|
| Version | 7.1.100 | 7.2.1 | 7.2.1 | **7.4.14** |
| Profile | min | recommended | recommended | **max** |
| Budget | 16 | 32 | 32 | **128** |
| Tier | 1 | 2 | 2-3 | **4+ (complex)** |
| Missions tested | 1 | 1 | 3 | **1** |
| Mission complete | NO | YES | YES (all 3) | **NO** |
| Transforms | 2 | 2 | 5 total | **3** |
| Time to working code | ~3 min | ~7 min | ~8-9 min | **~74 min** |
| Time to outcome | N/A (stuck) | 34 min | 22-93 min | **~4.5h (fail) / 12h (total)** |
| Dedicated tests created | YES | NO | NO | **YES (12 files)** |
| Post-failure waste | unknown | N/A | N/A | **~7.6h of nop cycling** |

---

## Findings

### FINDING-1: Cumulative Transform Counter Reset — The Root Cause of Mission Failure (CRITICAL BUG)

The implementation-review logs consistently report `Cumulative transforms | 0 | >= 1 | NOT MET` and `Transformation budget used | 0/128`, even though 3 transforms were successfully completed (PRs #2980, #2981, #2983 all merged). The counter appears to reset between workflow runs.

The mission-failed commit at 05:36 states "Transformation budget exhausted and acceptance criteria remain unmet" — but the budget was 128 and only 3 of 128 were used. The contradiction proves the counter is being reset or not persisted across workflow runs.

**Impact:** This is the sole reason the mission failed. All acceptance criteria were met (6/7 PASS with one minor location mismatch). The code was correct, tested, and functional. The mission should have been declared **mission-complete**.

**Root cause hypothesis:** The `implementation-review` task handler appears to count transforms within its own invocation context rather than reading the persisted count from the activity log or workflow state. Each new workflow run starts with `Cumulative transforms: 0`.

### FINDING-2: 7.6 Hours of Wasteful Post-Failure nop Cycling (CRITICAL WASTE)

After mission-failed was declared at 05:36, the system continued cycling for 7 hours 37 minutes until the schedule was manually set to weekly at 13:13. During this period:

- **20+ iterations** produced identical `implementation-review → nop` outcomes
- Each cycle consumed GitHub Actions minutes (workflow run + pages-build-deployment)
- maintain-library continued creating library documents (CANONICALIZATION, SIGNING)
- One unnecessary transform (#3 at 08:17) consumed **1,345,198 tokens** — the single most expensive operation in the entire experiment

**Cost estimate:** ~20 workflow runs × ~5 min each = ~100 minutes of GitHub Actions time wasted. Plus the 1.3M token transform.

**The system has no circuit breaker.** Once mission-failed is declared, the schedule should be automatically set to `off` or at minimum `weekly`. The continuous schedule kept dispatching work that could never converge.

### FINDING-3: Massive Token Consumption for Feature Spec Refinement (CONCERN)

The maintain-features task consumed disproportionate tokens relative to the value produced:

| Time | Task | Tokens | Duration | What it did |
|------|------|--------|----------|-------------|
| 02:06 | maintain-features | 81,743 | 97s | Wrote PERSISTENCE spec |
| 03:17 | maintain-features | 95,939 | 107s | Created 7 feature specs |
| 04:10 | maintain-features | 133,851 | 137s | Updated PERSISTENCE with MODEL_VALIDATION |
| 04:57 | maintain-features | 113,177 | 113s | Updated CLI spec |
| 05:31 | maintain-features | **625,997** | **280s** | Updated INDIVIDUAL_MANAGEMENT.md |

The 05:31 invocation used **625,997 tokens** — more than the first transform (486,269 tokens) — to update a single feature specification file. This is a 5.5x increase over the same task earlier in the run.

The 8 feature specs created were never used to drive transforms. Only 2 issues (#2978, #2979) were created at init time and resolved by the first two transforms. The feature specs were being refined in a vacuum — no issues were being created from them.

### FINDING-4: Implementation Review Shows Complete Implementation But Declares Not Complete (COUNTER-INTUITIVE)

The implementation-review at 05:31 produced a thorough assessment showing **all 11 elements implemented and unit tested**:

| Element | Implemented | Unit Tested |
|---------|-------------|-------------|
| defineClass | YES | YES |
| defineProperty | YES | YES |
| addIndividual | YES | YES |
| query | YES | YES |
| load | YES | YES |
| save | YES | YES |
| stats | YES | YES |
| Named exports | YES | YES |
| Seed ontology | YES | NO |
| Unit tests (CRUD, query, persistence) | YES | YES |
| Website demo | YES | YES |

Despite this clean bill of health, the same log declares `Mission failed declared | NO` at that point, but subsequent cycles declare `Mission failed declared | YES` because `Cumulative transforms | 0 | >= 1 | NOT MET`.

The system found everything working correctly but couldn't declare mission-complete because a phantom counter said no transforms had occurred. This is the most counter-intuitive aspect of the entire experiment.

### FINDING-5: "max" Profile Produces Richer Output but Same Structural Issues (OBSERVATION)

Compared to the "recommended" profile experiments in Report 007:

| Aspect | Recommended (Report 007) | Max (Report 008) |
|--------|--------------------------|-------------------|
| Feature specs created | 0 | 8 |
| Library docs created | 0 | 17 |
| Test files created | 0 | 12 |
| Source lines | 104-230 | 544 |
| CRUD operations | basic | full (add/get/update/remove) |
| Validation | none | validate() with error reporting |
| CLI | none | full CLI with 10 commands |
| Persistence | none | one-file-per-class layout |
| Subclass inference | N/A | query with inference chains |

The "max" profile successfully drove the LLM to produce significantly more sophisticated output. However, the additional feature specs and library docs consumed tokens without being used to drive further transforms — they represent unrealised potential.

### FINDING-6: Feature Spec → Issue Pipeline is Broken (CRITICAL GAP)

The maintain-features task created 8 detailed feature specifications:
- CLI.md, DEFINE_CLASS.md, DEFINE_PROPERTY.md, INDIVIDUAL_MANAGEMENT.md
- PERSISTENCE.md, QUERY.md, SEED_DATA.md, STATS.md

But these were never converted into issues. The only issues created were #2978 and #2979 (auto-created at init time). The pipeline from `feature spec → issue creation → transform → PR` is not closing the loop.

In Report 007, missions completed without any feature specs because the init issues were sufficient. Here, the feature specs describe work that would improve the code (update/remove individuals, CLI commands, validation) — some of which was actually implemented by the transforms anyway — but the feature lifecycle management never created issues from them.

### FINDING-7: Library Document Proliferation Without Consumption (LOW)

17 library documents were created covering JSON-LD, OWL, RDF, N3, semantic web, canonicalization, and signing. These are well-researched reference documents, but:

1. The transforms did not reference them (the code doesn't use jsonld.js, rdflib, or N3 libraries)
2. The code implements a custom JSON-LD format rather than using W3C-compliant tools
3. The library docs represent knowledge that could have guided better implementation choices but wasn't consumed

This is a "knowledge creation without knowledge consumption" pattern — the maintain-library pipeline runs in parallel with transforms but doesn't feed into them.

### FINDING-8: One Cancelled Workflow Run (MINOR)

At 04:07, an `agentic-lib-workflow` run was cancelled. This didn't affect the overall experiment but suggests occasional scheduling conflicts or timeouts.

---

## Recommendations

### R1: Fix the Cumulative Transform Counter (CRITICAL — Blocks All Missions)

The counter that tracks cumulative transforms must persist across workflow runs. Options:

1. **Read from git history**: Count merged PRs matching the `agentic-lib-issue-*` branch pattern since the last init
2. **Read from activity log**: Parse intentïon.md for transform entries since the init timestamp
3. **Store in a state file**: Write a `.agentic-lib-state.json` to the repo tracking the counter

This is the #1 priority. Without this fix, any mission running on the max profile with a high budget will fail even when all code is correct.

### R2: Auto-Disable Schedule on Mission-Failed (CRITICAL — Prevents Waste)

When mission-failed is declared, the system should automatically:
1. Set the schedule to `off` in `agentic-lib.toml`
2. Push the change to main
3. Stop dispatching new workflow runs

The 7.6 hours of nop cycling after mission-failed cost GitHub Actions minutes and produced no value. A circuit breaker would have saved ~100 Actions minutes and 1.3M tokens.

### R3: Feed Feature Specs into Issue Creation (HIGH — Unblocks Feature Lifecycle)

The maintain-features → issue creation pipeline needs to be connected. When feature specs exist with uncovered acceptance criteria, the supervisor should:
1. Select the highest-priority unimplemented feature spec
2. Create an issue from its acceptance criteria
3. Dispatch a transform to resolve the issue

Without this, the feature specs are documentation artifacts that don't drive code changes.

### R4: Limit Maintain-Features Token Budget (MEDIUM — Prevents Runaway Costs)

The maintain-features task should have a per-invocation token cap. The 625,997-token invocation at 05:31 used more tokens than a full transform — to update a markdown file. Suggested cap: 150,000 tokens per maintain-features invocation.

### R5: Feed Library Documents into Transform Context (MEDIUM — Improves Code Quality)

The transform task should receive relevant library documents as context. For the OWL ontology mission, the JSON_LD, OWL, and RDF library docs contain information about W3C-compliant formats that could have guided the implementation toward using established libraries (jsonld.js, rdflib) rather than a custom format.

### R6: Add Mission-Failed Root Cause to the Commit Message (LOW — Improves Debugging)

The mission-failed commit at 05:36 says "Transformation budget exhausted and acceptance criteria remain unmet" — which is factually wrong (budget was 128, only 3 used). The commit message should include which specific criteria failed, e.g., "mission-failed: Cumulative transforms counter shows 0 (target: >= 1)".

### R7: Exponential Backoff on Consecutive nop Cycles (LOW — Reduces Waste)

If 3+ consecutive implementation-review cycles produce `nop`, increase the interval between cycles exponentially (20 min → 40 min → 80 min). This reduces waste when the system is stuck without completely stopping it.

---

## Deep Dive: Counter-Intuitive Log Values

### DV-1: `Transformation budget used | 0/128` Despite 3 Transforms Merging

Every implementation-review log from 05:59 onwards shows `Transformation budget used | 0/128` even though 3 transform PRs were merged. The budget counter and the merge state are tracked independently, and the budget counter appears to not persist.

**Recommendation:** The implementation-review step should independently verify transform count by querying merged PRs or commit messages matching the transform pattern.

### DV-2: `Cumulative transforms | 0` Concurrent with `Issues resolved (review or PR merge) | 3 | >= 2 | MET`

These two metrics contradict each other. If 3 issues were resolved via PR merge, then at least 3 transforms occurred. The metrics should be reconciled — either `Issues resolved` should drive `Cumulative transforms`, or both should read from the same source.

### DV-3: `Mission failed declared | YES` Alongside All Other Metrics MET

From 05:59 onwards, every metric is MET except cumulative transforms. The system knows:
- 0 open issues (MET)
- 0 open PRs (MET)
- 3 issues resolved (MET, above the threshold of 2)
- 0 source TODOs (MET)
- Budget not exhausted (OK)

Yet it declares mission-failed. This is the log equivalent of a doctor saying "all your tests came back normal but you're dead."

### DV-4: Token Spike in maintain-features (625,997 tokens)

The maintain-features invocation at 05:31 used 7.6x the tokens of its first invocation (81,743). Possible causes:
- The context grew as more feature specs and library docs accumulated
- The task re-read all existing specs before updating one
- The max profile's `reasoning-effort: high` amplified the cost

### DV-5: Transform #3 (1,345,198 tokens) After Mission-Failed

The largest single token expenditure occurred at 08:17 — a transform resolving issue #2982 that was auto-created. This happened 2.5 hours after mission-failed was declared. The system created a new issue and then spent 614 seconds and 1.3M tokens transforming it, even though the mission was already failed.

---

## Stuck Period Analysis

### Stuck Period 1: Feature Spec Refinement Loop (04:10-05:31 UTC) — 81 minutes

Between transforms #2 (03:34) and mission-failed (05:36), the system ran 3 maintain-features cycles that refined feature specs without creating issues or triggering transforms. No forward progress was made on code.

**Mitigation:** After 2 consecutive maintain-features cycles without a transform, the supervisor should either (a) create an issue from an existing feature spec, or (b) dispatch a transform directly.

### Stuck Period 2: Post-Failure nop Loop (05:59-08:17 UTC) — 2.3 hours

After mission-failed, the system ran 6 consecutive nop cycles before accidentally creating issue #2982 and transforming it. Each cycle took ~20 minutes and produced identical output.

**Mitigation:** Implement R2 (auto-disable schedule) and R7 (exponential backoff).

### Stuck Period 3: Terminal nop Loop (08:19-13:13 UTC) — 4.9 hours

After transform #3 resolved #2982, the system returned to the same nop loop. This persisted for almost 5 hours until manual intervention.

**Mitigation:** Same as Stuck Period 2. Additionally, if the mission-failed state is terminal, the system should never auto-create new issues.

### Stuck Period Summary

| Period | Duration | Cause | Transforms | Tokens Wasted |
|--------|----------|-------|------------|---------------|
| Feature refinement loop | 81 min | No issue creation from feature specs | 0 | ~870,000 |
| Post-failure nop #1 | 2.3 hours | Counter bug + no circuit breaker | 1 (wasteful) | ~1,500,000 |
| Terminal nop loop | 4.9 hours | Counter bug + no circuit breaker | 0 | ~500,000 |
| **Total stuck time** | **~8 hours** | | 1 | **~2,870,000** |

---

## Code Review: Library Extension Recommendations

The generated code (544 lines in `src/lib/main.js`) implements a self-contained OWL-like ontology manager. Here's what was built well and what should change to extend the core library.

### What Was Built Well

1. **Clean API surface**: `createOntology()` factory returns a well-encapsulated Ontology instance with full CRUD operations
2. **JSON-LD serialization**: `toJSONLD()` and `fromJSONLD()` implement a reasonable custom JSON-LD format
3. **Query with inference**: `query()` supports subclass traversal with explain mode and `reasonLevel` option
4. **Validation**: `validate()` checks domain/range references and orphaned individuals
5. **One-file-per-class persistence**: Save splits by class — good for version control
6. **Full CLI**: 10 commands including seed, import/export
7. **Browser compatibility**: Dual Node/browser support with `isNode` detection

### Recommendations for Core Library Extension

**CR-1: Extract the Ontology class as a reusable module (HIGH)**

The code is entirely in `main.js`. For core library reuse:
- Extract `class Ontology` to `src/lib/ontology.js`
- Extract JSON-LD serialization to `src/lib/jsonld-serializer.js`
- Extract the CLI to `src/lib/cli.js`
- Keep `main.js` as the module entry point re-exporting everything

This mirrors the pattern the LLM used in Report 007 (string-utils → browser.js, cron-engine → cron.js) but didn't apply here despite the much larger codebase.

**CR-2: Use W3C-compliant JSON-LD context (HIGH)**

The current `@context` is `{ "@vocab": "http://example.org/" }`. For a library claiming OWL evaluation:
- Use proper OWL/RDFS vocabulary: `"owl": "http://www.w3.org/2002/07/owl#"`, `"rdfs": "http://www.w3.org/2000/01/rdf-schema#"`
- Use `owl:Class` instead of `rdfs:Class`
- Add `owl:ObjectProperty` / `owl:DatatypeProperty` distinction

The library docs (OWL.md, RDF.md, JSON_LD.md) contain exactly this information — if they had been fed to the transform, the code would likely use proper vocabulary.

**CR-3: Add SPARQL-like query syntax (MEDIUM)**

The current `query({ class: "Animal", property: "hasName", value: "Fido" })` is functional but proprietary. A SPARQL-inspired interface would make the library more useful for semantic web developers:
```js
ontology.query("SELECT ?x WHERE { ?x a :Mammal ; :hasName ?name }")
```

**CR-4: Add OWL reasoning beyond subclass (MEDIUM)**

The current reasoning only handles subclass inference. OWL defines:
- Transitive properties
- Inverse properties
- Domain/range inference
- Union/intersection classes
- Equivalent classes

Even basic inverse property support would significantly extend the library's utility.

**CR-5: Integrate jsonld.js for proper JSON-LD processing (LOW)**

The custom `toJSONLD()`/`fromJSONLD()` works but doesn't handle JSON-LD features like `@list`, `@set`, `@language`, `@graph` nesting, or compact/expand operations. The jsonld.js library (documented in JSONLD_JS.md) handles all of these.

---

## FEATURES.md Cross-Reference

### Features Where Implementation is Weak or Underperforming

| Feature # | Feature Name | Declared Status | Actual Behaviour in This Experiment | Assessment |
|-----------|-------------|-----------------|--------------------------------------|------------|
| **1** | Autonomous Code Transformation | Done | 3 transforms completed but counter bug caused false mission-failure | **UNDERPERFORMING** — the core proposition failed due to state management bug |
| **2** | Issue Lifecycle Management | Done | Only 3 issues created (2 at init + 1 auto). Feature specs didn't generate issues. | **WEAK** — the feature→issue pipeline is disconnected |
| **3** | Feature Lifecycle Management | Done | 8 feature specs created and refined but never consumed by the transform pipeline | **WEAK** — features are created but don't drive work |
| **7** | Statistics & Observability | Done | Counter values are counter-intuitive and contradict each other (see DV-1, DV-2) | **WEAK** — metrics are unreliable and misleading |
| **13** | Configuration & Safety | Done | "max" profile correctly applied higher limits but no circuit breaker exists | **PARTIAL** — safety doesn't include stuck-state detection |
| **15** | Library & Knowledge Management | Done | 17 library docs created but not consumed by transforms | **WEAK** — knowledge pipeline is write-only |
| **16** | Maintenance & Hygiene | Done | Post-failure: 7.6 hours of nop cycling. No stuck-state recovery. | **UNDERPERFORMING** — hygiene should include self-termination |
| **22** | Supervisor (Reactive + Proactive) | Done | Supervisor never intervened to fix the stuck state or create issues from feature specs | **WEAK** — supervisor is passive during stuck states |
| **23** | TDD Workflow | Done | 12 test files created but some contain TODO placeholders alongside real assertions | **PARTIAL** — tests exist but TDD discipline is inconsistent |

### Features Performing Well

| Feature # | Feature Name | Evidence |
|-----------|-------------|----------|
| 4 | Code Generation & Fixing | 3 transforms all produced working, tested code |
| 5 | Auto-Merge & Branch Management | All 3 PRs auto-merged successfully |
| 8 | Publishing Pipeline | N/A (not tested in this experiment) |
| 12 | CI/CD & Code Quality | All tests passed on every merge |
| 14 | Template System | Init purge correctly set up the repo |
| 17 | Scripts & Utilities | Log pipeline worked (132 log files committed) |

---

## Recurring Patterns & Optimization Opportunities

After analyzing the full 12-hour timeline covering all aspects (timeline, recommendations, logs, stuck periods, code, and features), these recurring patterns emerge:

### Pattern 1: "Write-Only" Pipelines

Three pipelines produce output that is never consumed downstream:

| Pipeline | Produces | Consumer | Consumed? |
|----------|----------|----------|-----------|
| maintain-features | Feature specs in `features/` | Issue creation (supervisor/maintain-features) | **NO** |
| maintain-library | Library docs in `library/` | Transform task (agent context) | **NO** |
| implementation-review | Detailed review with gaps | Issue creation or supervisor | **NO** |

**Optimization:** Each pipeline should have an explicit consumer. Feature specs should generate issues. Library docs should be included in transform context. Implementation review gaps should generate issues.

### Pattern 2: Counter/State Amnesia

Multiple systems lose state between workflow runs:
- Cumulative transform counter resets to 0
- Budget used counter resets to 0
- Implementation-review doesn't remember previous reviews

**Optimization:** Introduce a persistent state file (`.agentic-lib-state.json`) or use git-based state (tags, commit messages, activity log) as the source of truth for cross-run state.

### Pattern 3: No Feedback Loops Between Parallel Pipelines

The maintain-features, maintain-library, transform, and implementation-review pipelines run independently with no cross-communication:

```
maintain-features ──→ feature specs     ──→ (nothing)
maintain-library  ──→ library docs      ──→ (nothing)
transform         ──→ code + tests      ──→ merged PR
impl-review       ──→ gap analysis      ──→ (nothing)
```

Should be:
```
maintain-features ──→ feature specs     ──→ issue creation ──→ transform
maintain-library  ──→ library docs      ──→ transform context
transform         ──→ code + tests      ──→ merged PR
impl-review       ──→ gap analysis      ──→ issue creation ──→ transform
```

**Optimization:** Wire these feedback loops so that each pipeline's output feeds the next pipeline's input.

### Pattern 4: No Escalation on Repeated Failure

The system repeated the same failing pattern (nop → maintain → nop) 20+ times without changing strategy:

- No escalation to a different task type
- No escalation to a different model
- No escalation to human intervention (create a discussion, file an issue)
- No self-termination

**Optimization:** Implement a retry budget with escalation:
1. After 3 consecutive nops: try a different task sequence
2. After 6 consecutive nops: create a discussion requesting help
3. After 9 consecutive nops: set schedule to off and create a summary issue

### Pattern 5: Token Cost Grows Non-Linearly With Context

| Invocation # | maintain-features tokens | Cumulative feature/library docs |
|-------------|--------------------------|--------------------------------|
| 1 | 81,743 | ~1 |
| 2 | 95,939 | ~8 |
| 3 | 133,851 | ~14 |
| 4 | 113,177 | ~20 |
| 5 | 625,997 | ~25 |

The 5th invocation used 7.6x the tokens of the 1st, likely because the growing context (feature specs + library docs) is being re-read each time.

**Optimization:** Implement context windowing — only include the feature spec being modified plus a summary index of others, rather than loading all specs into context every time.

### Pattern 6: Mission-Failed is Terminal But Treated as Recoverable

Once mission-failed is declared, the system continues cycling as if recovery is possible. But the current code has no mechanism to un-declare mission-failed — it's a one-way transition that the system doesn't respect.

**Optimization:** Make mission-failed truly terminal: set schedule to off, create a summary issue documenting what was achieved vs. what failed, and stop all workflow dispatches.

---

## Conclusion

The 3-kyu-evaluate-owl-ontology experiment produced **functionally correct code** (544 lines, 12 test files, full CRUD + persistence + query + CLI) but was declared mission-failed due to a **counter persistence bug** that reset the cumulative transform count to 0 between workflow runs.

The experiment consumed approximately 12 hours of continuous workflow time and an estimated 4M+ tokens, of which approximately 2.87M tokens (~72%) were wasted in stuck periods after the code was already complete.

The three highest-priority fixes are:
1. **Fix the cumulative transform counter** (R1) — this directly caused the false failure
2. **Auto-disable schedule on mission-failed** (R2) — this would have saved 7.6 hours of waste
3. **Wire feature specs to issue creation** (R3) — this would close the feature lifecycle loop

The "max" profile successfully produced more sophisticated output than "recommended" (12 test files vs. 0, full CRUD vs. basic, CLI, validation, inference) but also amplified the cost of the counter bug — a higher budget means more time stuck when things go wrong.
