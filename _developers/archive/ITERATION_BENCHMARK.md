# Iteration Benchmark: Claude Freestyle vs MCP Server Iterations

## Hypothesis

The MCP server's iterative workflow (prepare_iteration → write → test → repeat) is a form of **LLM context memory tuned for a specific workflow**. By structuring what the LLM sees at each step — mission, features, current source, test results — it constrains the context window to exactly what matters for the next code change.

A "freestyle" Claude session (reading seed files, writing code, running tests) has access to the same information but in an unstructured way — the LLM decides what to read and when.

**Key question:** Is there a complexity threshold where the iterative/structured approach becomes more reliable than the freestyle/session approach?

## Benchmark Design

### Modes Under Test

| Mode | Description | LLM | Context Management |
|------|-------------|-----|-------------------|
| **Claude Freestyle** | Claude reads seeds, writes code, runs tests directly | Claude (session LLM) | Unstructured — full conversation history |
| **MCP Claude Mode** | MCP server mediates via `prepare_iteration` → `workspace_write_file` → `run_tests` | Claude (session LLM) | Structured — MCP curates context per iteration |
| **MCP Copilot Mode** | `iterate` tool runs autonomous cycles via Copilot SDK | Copilot (external) | Structured — maintain-features → transform → test → fix-code |

### Missions (ordered by expected complexity)

| Mission | Expected Iterations (Freestyle) | Notes |
|---------|-------------------------------|-------|
| hamming-distance | 1 | Simple algorithm, clear spec |
| fizz-buzz | 1 | Trivial |
| roman-numerals | 1-2 | Moderate — subtractive notation edge cases |
| string-utils | 1-2 | Breadth of functions |
| dense-encoding | 2-3 | Multiple encodings, round-trip correctness |
| cron-engine | 2-3 | Parsing, date math, DST, OR-logic for day fields |
| lunar-lander | 3+ | Simulation, physics, state management |
| owl-ontology | 3+ | Domain-specific parsing |
| plot-code-lib | 3+ | Visualization, complex output |
| time-series-lab | 3+ | Statistical analysis, multiple algorithms |

### Metrics Per Run

| Metric | Description |
|--------|-------------|
| **Iterations** | Number of write-test cycles before all tests pass |
| **Tests written** | Total test count in final suite |
| **Tests passing at iteration N** | Pass/fail count at each iteration |
| **Wall clock time** | Total time from workspace creation to all-pass |
| **Context tokens** | Approximate tokens consumed (freestyle: conversation; MCP: per-iteration context) |
| **Bugs found by tests** | Genuine implementation bugs caught and fixed |

## Results: Claude Freestyle (2026-03-06)

### hamming-distance

| Metric | Value |
|--------|-------|
| Iterations | 1 |
| Tests | 24 passed, 0 failed |
| Wall clock | ~15s (including npm install) |
| Bugs found | 0 (correct first time) |

### cron-engine

| Metric | Value |
|--------|-------|
| Iteration 1 | 30/30 tests passed (initial test suite) |
| Iteration 2 | 37/39 passed — added 9 edge-case tests, found 2 real bugs |
| Bug 1 | `matches()` used AND-logic for dayOfMonth/dayOfWeek — standard cron uses OR when both are restricted |
| Bug 2 | Negative step values (`*/-1`) not rejected by parser |
| Iteration 3 | (not yet run — fixes written, awaiting test) |

### Observations

1. **Claude freestyle gets simple missions right in 1 iteration.** When the LLM writes both tests and implementation, it tends to write code that passes its own tests. The real test is whether the *tests themselves* are comprehensive.

2. **Edge-case tests are where iterations matter.** The initial 30-test suite passed immediately. The 9 additional edge-case tests (OR-logic, negative steps, Feb 30, leap years) exposed 2 genuine bugs. This suggests the value of iteration is in **test discovery**, not just code fixing.

3. **Freestyle conflates test authoring and implementation.** In the MCP workflow, the mission/features define what to test, and the LLM generates code to pass them. In freestyle mode, the LLM writes both — creating a bias toward tests the code already handles.

## Analysis: When Does Iteration Win?

### Freestyle Advantages
- Full conversation context — can reason about design trade-offs
- Can read any file at any time
- No overhead from context preparation
- Faster for simple tasks (no round-trips through MCP)

### Iterative/MCP Advantages
- **Curated context** — each iteration sees exactly: mission, features, current source, test output. No conversation drift.
- **Consistent test suite** — features/tests are maintained separately from the implementation, reducing the bias of writing tests that match existing code
- **Resumable** — context is in the workspace, not in a conversation. Can resume after session end.
- **Comparable across LLMs** — same structured context goes to Claude, Copilot, or Ollama. Results are directly comparable.
- **Scales to larger codebases** — as the codebase grows, freestyle context fills with history while MCP context stays focused

### The Crossover Point

The iterative approach likely becomes more reliable when:
- The mission has **>5 interdependent functions** (context curation matters)
- The test suite is **externally defined** (not written by the same LLM)
- The codebase exceeds **~500 lines** (freestyle context starts to drift)
- Multiple iterations are needed, and each iteration's context must be **fresh** (no stale conversation history)

## Next Steps

- [ ] Debug MCP server tool loading and run the same missions through MCP Claude mode
- [ ] Run cron-engine through MCP Copilot mode for direct comparison
- [ ] Compare iteration counts, test coverage, and bug detection across modes
- [ ] Test with harder missions (lunar-lander, owl-ontology) where complexity should favour structured iteration
- [ ] Measure context token usage per mode to quantify the "memory tuning" effect

## Raw Data

Workspaces created during this benchmark session:
- `~/.agentic-lib/workspaces/hamming-distance-1772764061/`
- `~/.agentic-lib/workspaces/cron-engine-1772764340/`
