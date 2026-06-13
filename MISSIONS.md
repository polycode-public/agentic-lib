# Missions — the INTENT / benchmark library

The 19 graded INTENT seeds in [`missions/`](missions/) (indexed by
[`missions/index.toml`](missions/index.toml)) are the benchmark library that comes
with the engine. Each is a plain-content `INTENT.md`: the delivery loop reads it,
writes code in `src/lib/main.js`, writes tests, and (in 8.x) opens a PR per
work item the supervisor carves from it.

`npx @polycode-public/agentic-lib init --purge --mission <name>` lays one down as a
repository's `INTENT.md`.

## Naming convention

Filenames encode two dimensions:

- **Codewars difficulty** ([kyu/dan scale](https://docs.codewars.com/concepts/kata/)):
  8-kyu (easiest) through 1-kyu, then 1-dan upward (hardest).
- **Bloom's taxonomy verb** ([cognitive levels](https://en.wikipedia.org/wiki/Bloom%27s_taxonomy)):
  remember < understand < apply < analyze < evaluate < create.

Format: `<difficulty>-<bloom-verb>-<kebab-title>.md`. `index.toml` records each
mission's `file`, `grade`, and a one-line `summary`.

## Structure

Missions describe **what** the module must do, not **how** the exports should be
shaped — the agent designs its own API. The `## Acceptance Criteria` checkboxes
carry the contract. 8-kyu/7-kyu missions include named function signatures
(`## Core Functions`) as mechanistic pipeline tests; 6-kyu and above describe
behaviour without prescribing function names.

## Benchmarking on the new stack

These were proven on the Copilot SDK (see `benchmarks/reports/` — 020, v7.4.58:
hands-free mission-complete on 2-kyu in 3 transforms / ~18 min / 1.2M tokens). The
cost that stopped benchmarking inverts on metered Bedrock; the same missions re-run
on the `claude -p` stack row alongside the historical reports. One difference in
8.x: there is no agent "mission complete" signal — completeness is judged by the
supervisor graph and the operator (a PR exists), not by the agent. Oversized
intents (1-dan) are decomposed into work items by the graph; execution stays
one-shot per issue.

## Inventory

| Grade | Mission |
|---|---|
| 8-kyu | `8-kyu-remember-empty`, `8-kyu-remember-hello-world` |
| 7-kyu | `7-kyu-understand-fizz-buzz` |
| 6-kyu | `6-kyu-understand-hamming-distance`, `6-kyu-understand-roman-numerals` |
| 5-kyu | `5-kyu-apply-ascii-face`, `5-kyu-apply-string-utils` |
| 4-kyu | `4-kyu-analyze-json-schema-diff`, `4-kyu-apply-cron-engine`, `4-kyu-apply-dense-encoding`, `4-kyu-apply-owl-ontology` |
| 3-kyu | `3-kyu-analyze-lunar-lander`, `3-kyu-evaluate-time-series-lab` |
| 2-kyu | `2-kyu-create-markdown-compiler`, `2-kyu-create-plot-code-lib` |
| 1-kyu | `1-kyu-create-ray-tracer` |
| 1-dan | `1-dan-create-c64-emulator`, `1-dan-create-planning-engine` |
| 2-dan | `2-dan-create-self-hosted` |
