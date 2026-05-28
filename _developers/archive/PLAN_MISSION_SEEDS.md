# Plan: Mission Seeds for Pipeline Benchmarking

## User Assertions

- The pipeline is being used to benchmark agentic-lib with different LLMs, not to test LLMs in isolation
- Using npm dependencies is fine — the LLM choosing a good library is a valid strategy
- Missions are JS library + unit tests (the pipeline's current capability)
- Metrics that matter: **duration and cost to achieve the mission**, not intermediate pipeline metrics
- Data-gathering missions (like owl-ontology) are in scope — the repo accumulates content
- All missions share the common zero files (zero-main.js, zero-main.test.js, zero-package.json, etc.)
- Each mission is a single `.md` file, named descriptively
- Mastered in agentic-lib, distributed via init
- Init gets a parameter to pick a mission; default is hamming-distance (simplest bounded mission)
- **"Done" matters**: simple missions should have a clear completion state where the supervisor drops the schedule to off. The pipeline should be able to declare mission accomplished and stop.

## Current State

- `src/seeds/zero-MISSION.md` — the current default (plot-code-lib)
- `src/seeds/zero-MISSION-empty.md` — a blank template (exists but not auto-copied)
- `init.yml` already has a `mission` input that writes freeform text to MISSION.md (lines 121-125)
- `initPurge()` in `bin/agentic-lib.js` always copies `zero-MISSION.md` → `MISSION.md` (line 840)
- The init.yml `mission` input overwrites MISSION.md _after_ purge copies the default — so custom text wins

## Design

### 1. Mission seed files

Add mission `.md` files to `src/seeds/missions/`:

```
src/seeds/missions/
├── hamming-distance.md       # L0 kata — single function, clear done state
├── fizz-buzz.md              # L0 kata — trivial, pipeline smoke test
├── roman-numerals.md         # L0 kata — encode + decode, edge cases
├── lunar-lander.md           # L1 — physics sim + autopilot controller
├── string-utils.md           # L1 easy — bag of string functions
├── dense-encoding.md         # L2 — binary-to-text encoding, maximise printable density
├── plot-code-lib.md          # L2 medium — current default (move from zero-MISSION.md)
├── cron-engine.md            # L3 hard — cron parsing + scheduling
├── owl-ontology.md           # data-gathering — structural knowledge accumulation
├── time-series-lab.md        # data-gathering — temporal data discovery + forecasting
└── empty.md                  # blank template (move from zero-MISSION-empty.md)
```

Each file is a complete MISSION.md (starts with `# Mission`). No other seed files per mission — they all share the common zero-main.js etc.

### 2. Init CLI change

Add `--mission <name>` flag to `bin/agentic-lib.js`:

- `--mission plot-code-lib` → copies `src/seeds/missions/plot-code-lib.md` as `MISSION.md`
- `--mission string-utils` → copies `src/seeds/missions/string-utils.md` as `MISSION.md`
- Default (no flag): `hamming-distance` (simplest bounded mission — validates the pipeline converges and stops)
- Unknown mission name: error with list of available missions
- Only applies during `--purge` (same as current MISSION.md copy)

Implementation: in `initPurge()`, replace the hardcoded `"zero-MISSION.md": "MISSION.md"` entry in SEED_MAP with a lookup into `src/seeds/missions/`.

Keep `zero-MISSION.md` as a symlink or alias to `missions/plot-code-lib.md` for backwards compatibility (or just remove it and always use the missions directory).

### 3. Init workflow change

Update `src/seeds/init.yml`:

- Rename the existing `mission` input to `mission-text` (freeform override, kept for flexibility)
- Add new `mission` input: a dropdown/choice of seed names (plot-code-lib, string-utils, cron-engine, owl-ontology, empty)
- Default: `hamming-distance`
- Pass `--mission <name>` to the init CLI command
- The freeform `mission-text` still overwrites MISSION.md after init (existing behaviour), so it takes priority if both are provided

### 4. "Done" — mission accomplished detection

The supervisor already controls the schedule via `agent-supervisor-schedule.yml`. The missing piece is telling it **when to stop**.

**Mechanism**: The supervisor prompt (`agent-supervisor.md`) gets new guidance:

> When all open issues are closed AND tests pass AND the MISSION.md acceptance criteria are met, set the schedule to `off`. The mission is accomplished.

For kata-level missions, "done" is unambiguous: all tests pass, no open issues, the exported functions work. The supervisor should:

1. Check: are there open issues? If no →
2. Check: do tests pass? (they must, since CI gates commits) →
3. Check: does the code satisfy MISSION.md? (the supervisor reads it) →
4. If all yes: dispatch `agent-supervisor-schedule.yml` with `frequency: off`
5. Add a final entry to `intentïon.md`: `mission-accomplished`

For open-ended missions (time-series-lab, owl-ontology), "done" is never — they run until manually stopped. The mission file should say this explicitly: `This is an ongoing mission. Do not set schedule to off.`

For bounded missions (katas, string-utils, cron-engine, plot-code-lib), the mission file includes explicit **acceptance criteria** that the supervisor can evaluate:

```markdown
## Acceptance Criteria
- [ ] Exported function `hammingDistance(a, b)` returns correct distance
- [ ] Throws on strings of unequal length
- [ ] All unit tests pass
- [ ] README documents usage with examples
```

The supervisor checks these criteria. When all are met and no issues are open, it declares done.

**Implementation**: This is a prompt change to `src/agents/agent-supervisor.md` plus a convention in mission files. No workflow code changes needed — the supervisor already has the ability to dispatch schedule changes.

### 5. Mission content (drafts)

#### fizz-buzz.md (L0 — pipeline smoke test)

A JS library exporting a single function `fizzBuzz(n)` that returns an array of strings from 1 to n, replacing multiples of 3 with "Fizz", multiples of 5 with "Buzz", and multiples of both with "FizzBuzz". Also export `fizzBuzzSingle(n)` for a single value. Acceptance criteria: both functions work correctly, edge cases (0, negative, non-integer) handled, all tests pass, README has examples. This is the simplest possible mission — if the pipeline can't complete this and stop, something is fundamentally broken.

#### hamming-distance.md (L0 — kata)

A JS library exporting `hammingDistance(a, b)` that computes the Hamming distance between two strings of equal length (number of positions where characters differ). Throw an error if strings have different lengths. Also export `hammingDistanceBits(x, y)` for integers (count differing bits). Acceptance criteria: both functions correct, error on unequal length, handles Unicode, all tests pass.

#### roman-numerals.md (L0 — kata with encode/decode)

A JS library exporting `toRoman(n)` and `fromRoman(s)`. Convert integers 1-3999 to Roman numeral strings and back. Handle subtractive notation (IV, IX, XL, XC, CD, CM). Throw on out-of-range or invalid input. Acceptance criteria: round-trip property holds (`fromRoman(toRoman(n)) === n` for all valid n), edge cases handled, all tests pass.

#### lunar-lander.md (L1 — physics simulation + autopilot)

A JS library that simulates a lunar lander descent and provides an autopilot controller. Inspired by the classic coding interview problem (see [Carleton CS111](https://www.cs.carleton.edu/faculty/dmusican/cs111s11/lunarlander.html), [Berkeley CS4](https://people.eecs.berkeley.edu/~jrs/4/lunar.html), [Hackaday autopilot challenge](https://hackaday.com/2024/08/16/lunar-lander-game-asks-you-to-write-a-simple-autopilot/)).

**Physics model** (1D simplified):
- Initial altitude: 1000m, initial velocity: 40 m/s (toward surface), fuel: 25 units
- Gravity: adds 2 m/s per tick
- Thrust: each fuel unit burned reduces velocity by 4 m/s
- Landing: altitude reaches 0. Safe if velocity ≤ 4 m/s, crash if > 4 m/s

**Exported functions**:
- `createLander(opts?)` — create a lander state object with configurable initial conditions
- `step(lander, thrust)` — advance one tick, burn `thrust` fuel units, return new state
- `simulate(lander, controller)` — run to completion using a controller function `(state) => thrustUnits`
- `autopilot(state)` — a built-in controller that lands safely (the interesting algorithmic part)
- `score(result)` — score a landing: 0 for crash, higher for less fuel used + lower landing velocity

**Why this is good for benchmarking**: It requires physics modelling (get the equations right), algorithm design (write an autopilot that doesn't crash), and API design (composable simulation). The autopilot is the hard part — a greedy burn-at-the-last-moment strategy is optimal but tricky to get right. The pipeline needs to both build the simulation AND solve it.

Acceptance criteria: autopilot lands safely across a range of initial conditions (varying altitude 500-2000m, velocity 20-80 m/s, fuel 10-50 units), all tests pass, README shows example simulation output.

#### string-utils.md (L1 — easy baseline)

A JS library of string utility functions: slugify, truncate, camelCase, kebabCase, titleCase, wordWrap, stripHtml, escapeRegex, pluralize, levenshteinDistance. Export each as a named function. Comprehensive edge case handling (Unicode, empty strings, null). This is a bag-of-functions problem — each function is independent. Should be achievable in 1-3 transform cycles.

#### dense-encoding.md (L2 — binary-to-text encoding density)

A JS library that explores the frontier of binary-to-text encoding density using printable characters. Inspired by the progression from base64 (6 bits/char) → base85 (6.4 bits/char) → base91 (6.5 bits/char) → base122 (6.9 bits/char), and by projects like [uuid-encoder](https://www.npmjs.com/package/uuid-encoder) and [uuid-base62](https://www.npmjs.com/package/uuid-base62) that make UUIDs shorter and printable.

The library should build encoding tables by cherry-picking safe printable characters to maximise byte density while remaining safe across different contexts. The benchmark: **produce the shortest possible printable representation of a v7 UUID**.

**Exported functions**:
- `encode(buffer, encoding)` / `decode(str, encoding)` — encode/decode arbitrary binary data
- `encodeUUID(uuid)` / `decodeUUID(str)` — shorthand for UUID encoding (strip dashes, encode 16 bytes)
- `createEncoding(name, charset)` — define a custom encoding from a character set string
- `listEncodings()` — return available encodings with their bit density and charset info

**Built-in encodings** (the library should discover/implement progressively):
- `base62` — `[0-9a-zA-Z]`, 5.95 bits/char, URL-safe, 22 chars for a UUID
- `base85` (Ascii85/Z85) — 6.41 bits/char, 20 chars for a UUID
- `base91` — 6.50 bits/char, ~20 chars for a UUID
- Custom higher bases — cherry-pick from printable Unicode (Latin-1 Supplement, etc.) to push density further

**Testing requirements**:
- Round-trip property: `decode(encode(x)) === x` for all inputs
- Test across character representations: ASCII, UTF-8, UTF-16, various terminals/consoles
- Verify "safe" printability: no control chars, no ambiguous chars (0/O, 1/l/I), no chars that break in JSON/URLs/HTML/shell
- Compare encoded UUID lengths across all encodings
- Benchmark: measure encoding/decoding throughput

Acceptance criteria: at least 3 working encodings (base62, base85, one higher), round-trip correct for arbitrary binary data including edge cases (all zeros, all 0xFF, random), UUID encoding shorter than base64 (22 chars) for the densest encoding, all tests pass, README shows UUID encoding comparison table.

This is a good L2 mission because it requires both algorithmic thinking (how to pack bits into characters efficiently) and careful engineering (character safety across contexts). The pipeline should iteratively discover denser encodings.

#### cron-engine.md (L3 — algorithmic)

A JS library that parses cron expressions (standard 5-field + optional 6-field with seconds), computes next N run times from a given date, checks if a date matches a cron expression, and supports special strings (@yearly, @monthly, @weekly, @daily, @hourly). No dependencies required but allowed. Edge cases: DST transitions, month-end boundaries, Feb 29. Should stress the pipeline's ability to handle combinatorial logic.

#### owl-ontology.md (data-gathering — structural)

A JS library that manages a simple OWL-like ontology stored as JSON-LD files in a `data/` directory. Functions: defineClass, defineProperty, addIndividual, query (basic SPARQL-like pattern matching). The library reads/writes JSON-LD files in the repo. The pipeline should both build the library AND populate it with example ontology data (animals, taxonomy, etc.) over successive transform cycles. This tests stateful accumulation across cycles.

#### time-series-lab.md (data-gathering — temporal)

A JS library that finds, normalises, refreshes, and analyses temporal data. The repo's `data/` directory accumulates CSV/JSON datasets over successive transform cycles. Core capabilities:
- **Discover**: find publicly available time series data (APIs, open data portals) and fetch snapshots into `data/`
- **Normalise**: parse heterogeneous date/time formats, resample to uniform intervals, handle missing values
- **Refresh**: on each transform cycle, update existing datasets with newer observations (append, not replace)
- **Forecast**: implement basic forecasting (moving average, exponential smoothing, linear regression)
- **Correlate**: find relationships between datasets (cross-correlation, lag analysis, Granger-like causality tests)
- **Report**: generate a `REPORT.md` summarising datasets, trends, and discovered correlations

This is the most demanding mission — it tests the pipeline's ability to do stateful accumulation, external data fetching, and iterative refinement across many cycles. The library grows richer with each run. Success is measured not just by tests passing but by the richness of accumulated data and analysis.

### 6. Evidence gathering in transform steps

The transform agent should produce **test evidence** — raw artifacts that demonstrate the library's behaviour — stored under `docs/` (already configured in agentic-lib.toml as `paths.docs = "docs/"`).

**What gets gathered**:
- **Raw data**: test output logs, benchmark results (JSON/CSV), coverage reports
- **Images**: generated plots (SVG/PNG from plot-code-lib), encoding comparison tables rendered as images, simulation traces
- **Documents**: auto-generated API docs, example walkthroughs, comparison tables (markdown)
- **Videos/animations**: (future) GIF/MP4 of simulation runs, step-by-step visual walkthroughs

**Folder structure**:
```
docs/
├── evidence/           # raw test output, benchmark data
│   ├── test-results.json
│   ├── benchmark.csv
│   └── coverage.json
├── examples/           # generated example output (images, text)
│   ├── plot-sin-x.svg
│   ├── uuid-comparison.md
│   └── lander-trace.txt
└── reports/            # summary documents for consumers
    ├── stats.json      # machine-readable metrics
    ├── walkthrough.md  # human-readable step-by-step
    └── infographic.svg # visual summary
```

**Prompt changes**:

1. **Transform agent** (`agent-issue-resolution.md`) — add guidance:
   > When implementing features, also produce evidence artifacts under `docs/`. Include:
   > - Example output files demonstrating the feature works (images, data files, text)
   > - A `docs/examples/` walkthrough showing usage with real output
   > - Machine-readable results in `docs/evidence/` (JSON/CSV) for downstream consumers (stats dashboards, infographics)
   > Design the library API with hooks that make it easy to capture evidence: return structured result objects, support file output options, emit events that observers can record.

2. **Review agent** (`agent-review-issue.md`) — add guidance:
   > When reviewing, check that evidence artifacts exist under `docs/` for implemented features. If a feature works but has no evidence, create an issue requesting evidence generation.

3. **Supervisor** (`agent-supervisor.md`) — add to mission lifecycle:
   > When evaluating mission completion, check that `docs/` contains evidence of the library working: example outputs, test results, and at least one human-readable walkthrough.

**API design principle** — the mission descriptions should encourage the library to expose hooks for evidence capture. For example:
- plot-code-lib: `plot(expr, range, { outputFile: 'docs/examples/sin.svg' })`
- lunar-lander: `simulate(lander, autopilot, { trace: 'docs/examples/landing-trace.json' })`
- dense-encoding: `compareEncodings(uuid, { report: 'docs/examples/comparison.md' })`

This isn't about testing the library — it's about the library **producing artifacts that demonstrate it works**, which makes the benchmark results visible and shareable.

### 7. Tests

- Unit tests for the `--mission` flag in the init CLI
- Test that each mission file exists and starts with `# Mission`
- Test that unknown mission names produce a helpful error
- Test backwards compatibility: `--purge` without `--mission` uses plot-code-lib

### 8. Documentation

- Update the README / docs to describe available missions
- Add a section to FEATURES.md about mission seeds as a benchmarking capability

## Files Changed

| File | Change |
|------|--------|
| `src/seeds/missions/fizz-buzz.md` | New — L0 smoke test |
| `src/seeds/missions/hamming-distance.md` | New — L0 kata |
| `src/seeds/missions/roman-numerals.md` | New — L0 kata |
| `src/seeds/missions/lunar-lander.md` | New — L1 physics sim + autopilot |
| `src/seeds/missions/string-utils.md` | New — L1 easy |
| `src/seeds/missions/dense-encoding.md` | New — L2 encoding density |
| `src/seeds/missions/plot-code-lib.md` | New — content from current `zero-MISSION.md` |
| `src/seeds/missions/cron-engine.md` | New — L3 hard |
| `src/seeds/missions/owl-ontology.md` | New — data-gathering |
| `src/seeds/missions/time-series-lab.md` | New — data-gathering |
| `src/seeds/missions/empty.md` | New — content from current `zero-MISSION-empty.md` |
| `bin/agentic-lib.js` | Add `--mission` flag, update `initPurge()` |
| `src/seeds/init.yml` | Add `mission` choice input, pass to CLI |
| `src/agents/agent-supervisor.md` | Add mission-accomplished detection + evidence check |
| `src/agents/agent-issue-resolution.md` | Add evidence-gathering guidance for transforms |
| `src/agents/agent-review-issue.md` | Add evidence verification in reviews |
| `src/seeds/zero-MISSION.md` | Remove (replaced by missions/plot-code-lib.md) |
| `src/seeds/zero-MISSION-empty.md` | Remove (replaced by missions/empty.md) |
| Tests | Add/update tests for mission flag |

## Out of Scope

- Multiple zero-main.js variants per mission (all share the same starter)
- Website/non-library mission types (future)
- Automated benchmark result collection (future — could be a separate workflow)
- Token/cost tracking infrastructure (future — would need workflow-level metrics collection)

## Risks

- Removing `zero-MISSION.md` could break consumers on older agentic-lib versions that expect it — mitigate by keeping it as a copy of plot-code-lib.md during a transition period
- The `mission` input name collision on init.yml (currently used for freeform text) — the rename to `mission-text` is a breaking change for anyone calling it programmatically. Alternative: use `mission-seed` as the new input name instead.
