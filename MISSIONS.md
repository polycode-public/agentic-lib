# Missions

The 19 mission files in `src/seeds/missions/` drive autonomous code evolution benchmarks. An AI agent reads a mission, generates code in `src/lib/main.js`, writes tests, and iterates until acceptance criteria pass or budget is exhausted. Missions are benchmarked via:

- **ITERATION_BENCHMARKS_SIMPLE.md** (S1-S6): 7-kyu and 6-kyu missions
- **ITERATION_BENCHMARKS_ADVANCED.md** (A1-A9): 3-kyu through 1-kyu missions
- **PLAN_1_HYBRID_SCENARIO_TESTS.md**: local CLI iteration with model/profile tuning matrix

## Naming Convention

Mission filenames encode two dimensions:

- **Codewars difficulty** ([kyu/dan scale](https://docs.codewars.com/concepts/kata/)): 8-kyu (easiest) through 1-kyu, then 1-dan upward (hardest)
- **Bloom's taxonomy verb** ([cognitive levels](https://en.wikipedia.org/wiki/Bloom%27s_taxonomy)): remember < understand < apply < analyze < evaluate < create

Format: `<difficulty>-<bloom-verb>-<kebab-title>.md`

## Mission Structure

Missions describe **what** the module must do, not **how** the exports should be shaped. The agent designs its own API.

- **8-kyu and 7-kyu** missions include a `## Core Functions` section with named function signatures — these are mechanistic tests of the pipeline, not tests of the agent's design capability.
- **6-kyu and above** missions use a `## Required Capabilities` section describing behavioral requirements without prescribing function names. The acceptance criteria carry the contract.

## Mission Inventory

### 8 kyu — Trivial (1-2 transforms expected)

| Mission | Bloom's | Description |
|---------|---------|-------------|
| `8-kyu-remember-empty` | Remember | Blank template — placeholder for user-written missions |
| `8-kyu-remember-hello-world` | Remember | Hello World with acceptance criteria |

### 7 kyu — Simple (1-2 transforms expected)

| Mission | Bloom's | Description |
|---------|---------|-------------|
| `7-kyu-understand-fizz-buzz` | Understand | Classic FizzBuzz with 8 acceptance criteria |

### 6 kyu — Simple (2-4 transforms expected)

| Mission | Bloom's | Description |
|---------|---------|-------------|
| `6-kyu-understand-hamming-distance` | Understand | Hamming distance for strings and integers, Unicode support |
| `6-kyu-understand-roman-numerals` | Understand | Roman numeral conversion with strict subtractive notation |

### 5 kyu — Medium (4-8 transforms expected)

| Mission | Bloom's | Description |
|---------|---------|-------------|
| `5-kyu-apply-ascii-face` | Apply | ASCII art faces for 6 emotions with CLI |
| `5-kyu-apply-string-utils` | Apply | 10 independent string utility functions |

### 4 kyu — Medium (4-8 transforms expected)

| Mission | Bloom's | Description |
|---------|---------|-------------|
| `4-kyu-apply-cron-engine` | Apply | Cron expression parser with UTC scheduling |
| `4-kyu-apply-dense-encoding` | Apply | Binary-to-text encoding (base62, base85, base91+) |
| `4-kyu-analyze-json-schema-diff` | Analyze | Structured diff of JSON Schema documents |
| `4-kyu-apply-owl-ontology` | Apply | OWL-like ontology with JSON-LD persistence |

### 3 kyu — Complex (8+ transforms expected)

| Mission | Bloom's | Description |
|---------|---------|-------------|
| `3-kyu-analyze-lunar-lander` | Analyze | Lunar lander physics simulation with autopilot |
| `3-kyu-evaluate-time-series-lab` | Evaluate | Time series generation, forecasting, and correlation |

### 2 kyu — Very Hard (12+ transforms expected)

| Mission | Bloom's | Description |
|---------|---------|-------------|
| `2-kyu-create-markdown-compiler` | Create | GFM-to-HTML compiler with XSS safety |
| `2-kyu-create-plot-code-lib` | Create | Mathematical expression plotting with SVG/PNG output |

### 1 kyu — Extreme (16+ transforms expected)

| Mission | Bloom's | Description |
|---------|---------|-------------|
| `1-kyu-create-ray-tracer` | Create | 3D ray tracer with reflection, refraction, and PPM output |

### Dan — Extreme

| Mission | Bloom's | Description |
|---------|---------|-------------|
| `1-dan-create-c64-emulator` | Create | Full Commodore 64 emulator in browser |
| `1-dan-create-planning-engine` | Create | Planning engine with POP, constraint satisfaction, and belief revision |
| `2-dan-create-self-hosted` | Create | Self-hosting bootstrap test framework |

## Mission Quality Standards

Every benchmarkable mission must have:

1. `# Mission` header with a one-line description
2. `## Required Capabilities` (6-kyu+) or `## Core Functions` (7-8 kyu) section
3. `## Requirements` section with edge cases and constraints
4. `## Acceptance Criteria` section with `- [ ]` checkboxes (minimum 3)

The `8-kyu-remember-empty` template is the only exception — it serves as the blank-slate init option for users writing their own missions.

## Archived Missions

| Mission | Reason |
|---------|--------|
| `2-dan-create-agi` | Vision document, not a code mission. No function signatures or acceptance criteria. Moved to `_archive/missions/`. |
