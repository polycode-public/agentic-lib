# Predicted Benchmark Results Analysis

**Date**: 2026-03-14
**Operator**: Claude Code (claude-opus-4-6)
**agentic-lib version**: 7.4.16 (post PR #1923 merge — PLAN_BENCHMARK_008_FIXES)
**Based on**: Code analysis only (no experiments executed yet)

---

## Context

After merging PR #1923 (PLAN_BENCHMARK_008_FIXES), the system now has:
- **Persistent state** (`agentic-lib-state.toml`) fixing the cumulative transform counter
- **Auto-disable schedule** on mission-failed (preventing 7+ hour nop loops)
- **Exponential backoff** on consecutive nop cycles
- **Split metrics** (per-task vs cumulative) in logs
- **Schedule reliability fixes** (never-fires cron, no skip-ci, verification)
- **Feature-to-issue pipeline** wiring in supervisor prompt
- **Library index** fed to transform context
- **Token cap** (200K) for maintain tasks

The question: what results are likely from ITERATION_BENCHMARKS_SIMPLE.md and ITERATION_BENCHMARKS_ADVANCED.md given the current code?

---

## SIMPLE Benchmarks — Predicted Results

### S1: fizz-buzz / gpt-5-mini / recommended / budget 32

**Prediction: MISSION-COMPLETE in 3-5 iterations, ~25-40 min**

- fizz-buzz is 7-kyu (trivial). Two functions: `fizzBuzz(n)` and `fizzBuzzSingle(n)`
- The first transform should produce working code in one step (precedent: Report 004/005)
- The counter fix means mission-complete will now fire correctly when cumulative transforms >= 1
- **Risk**: Behaviour test instability (Playwright) could add 1-2 extra iterations. The benchmark 007 data showed this affects ~50% of scenarios
- **New benefit**: If behaviour tests cause instability, the nop backoff prevents runaway cycling
- **Expected**: 1 transform, 1-2 maintain, 1 director cycle → mission-complete

### S2: fizz-buzz / gpt-5-mini / max / budget 128

**Prediction: MISSION-COMPLETE in 3-6 iterations, ~30-50 min**

- Same trivial mission but with max profile
- Max profile means: more feature specs created, more library docs, higher reasoning effort
- **The maintain-features token cap (C14)** will prevent the runaway 625K-token maintain sessions seen in benchmark 008
- More feature specs will be created but they'll be capped at ~200K tokens per invocation
- Code quality should be similar to S1 since fizz-buzz is trivially solved
- **Marginal difference**: Max might produce more test coverage and documentation but convergence speed similar

### S3: hamming-distance / gpt-5-mini / recommended / budget 32

**Prediction: MISSION-COMPLETE in 4-6 iterations, ~35-50 min**

- 6-kyu (simple). Two functions: `hammingDistance(a,b)` for strings, `hammingDistanceBits(x,y)` for integers
- Precedent (Report 006): completed in 4 iterations / 34 min with gpt-5-mini / recommended
- **The counter fix** should prevent false mission-failed
- Unicode handling + BigInt may require one fix cycle
- **New benefit**: Library index now fed to transform — if maintain-library has run and created relevant docs, the transform will have better context
- **Expected**: Similar to Report 006 result but more reliable convergence

### S4: hamming-distance / claude-sonnet-4 / recommended / budget 128

**Prediction: MISSION-COMPLETE in 3-4 iterations, ~30-45 min**

- Same mission but with claude-sonnet-4 (stronger reasoning)
- Claude-sonnet-4 is likely to produce more correct code on the first transform (fewer fix cycles)
- Unicode + BigInt handling should be more robust on first attempt
- **Higher budget (128) is overkill** for 6-kyu — won't be consumed
- **Expected**: Faster convergence than S3 (Claude tends to produce more robust code), similar total time due to API latency differences

### S5: roman-numerals / gpt-5-mini / recommended / budget 32

**Prediction: MISSION-COMPLETE in 4-7 iterations, ~35-55 min**

- 6-kyu (simple). Two functions: `toRoman(n)` and `fromRoman(s)` with subtractive notation
- Precedent (Report 007 scenario A1): completed in 6 iterations / 47 min (but 2 of 3 transforms were instability fixes)
- **New benefit**: Counter fix prevents false failures; backoff prevents nop cycling
- **Risk**: Behaviour test instability was the primary obstacle in Report 007 — this risk remains unchanged
- **Expected**: 1-2 transforms + possible instability fix iterations

### S6: roman-numerals / claude-sonnet-4 / max / budget 128

**Prediction: MISSION-COMPLETE in 3-5 iterations, ~30-50 min**

- Strongest config for a simple mission. Claude-sonnet-4 + max profile
- Should produce higher quality code on first transform (canonical regex, better validation)
- Max profile will generate feature specs and library docs, but these are unnecessary for 6-kyu
- **Expected**: Fastest convergence of all roman-numerals scenarios

### Simple Benchmark Summary

| ID | Mission | Predicted Outcome | Iterations | Time | Confidence |
|----|---------|-------------------|------------|------|------------|
| S1 | fizz-buzz / mini / rec | COMPLETE | 3-5 | 25-40m | HIGH |
| S2 | fizz-buzz / mini / max | COMPLETE | 3-6 | 30-50m | HIGH |
| S3 | hamming / mini / rec | COMPLETE | 4-6 | 35-50m | HIGH |
| S4 | hamming / sonnet / rec | COMPLETE | 3-4 | 30-45m | HIGH |
| S5 | roman / mini / rec | COMPLETE | 4-7 | 35-55m | MEDIUM |
| S6 | roman / sonnet / max | COMPLETE | 3-5 | 30-50m | HIGH |

**Key change from pre-fix predictions**: All S1-S6 should now correctly declare mission-complete. Before the counter fix, any scenario that took >1 iteration cycle (where the implementation-review ran in a separate workflow run) would have shown `Cumulative transforms: 0` and risked false mission-failed.

---

## ADVANCED Benchmarks — Predicted Results

### A1: lunar-lander / gpt-5-mini / recommended / budget 32

**Prediction: PARTIAL or MISSION-FAILED, 8-15 iterations, budget likely exhausted**

- 3-kyu (hard). Physics simulation + autopilot controller + scoring
- The physics model (gravity, thrust, fuel) is algorithmically intensive
- gpt-5-mini may struggle with the autopilot optimization — needs to handle 10+ parameter combinations
- **Budget 32 is likely insufficient** for a 3-kyu physics mission
- **New benefits**: Feature-to-issue pipeline means feature specs can drive targeted transforms; library index provides physics references if maintain-library has run
- **Risk**: Model may implement physics correctly but fail the autopilot across edge cases
- **Expected**: Physics engine implemented in 2-3 transforms, autopilot partially working, budget exhausted before all 10+ parameter combos pass

### A2: lunar-lander / gpt-5-mini / max / budget 128

**Prediction: MISSION-COMPLETE in 12-20 iterations, ~2-3 hours**

- Same mission with 4x budget and max context
- 128 budget should be sufficient for the iteration needed to nail autopilot edge cases
- Max profile's higher reasoning effort helps with physics reasoning
- **The maintain-features token cap** prevents runaway feature spec sessions
- **New benefit**: Exponential backoff prevents wasting budget if the model gets stuck
- **Expected**: Physics + basic autopilot in first 5 iterations, edge case refinement in iterations 6-15, convergence around iteration 15-20

### A3: time-series-lab / gpt-5-mini / recommended / budget 32

**Prediction: PARTIAL, 8-12 iterations, may exhaust budget**

- 3-kyu (hard). Data science: rolling average, exponential smoothing, anomaly detection, seasonal decomposition
- gpt-5-mini can handle the math but may struggle with seasonal decomposition (FFT or similar)
- Budget 32 gives ~8 transforms which should cover the simpler functions but may not reach seasonal decomposition
- **Expected**: Rolling average + exponential smoothing + anomaly detection in 3-5 transforms; seasonal decomposition partially or not reached before budget exhaustion

### A4: time-series-lab / gpt-5-mini / max / budget 128

**Prediction: MISSION-COMPLETE in 10-18 iterations, ~1.5-2.5 hours**

- Same mission with max budget
- 128 budget should be sufficient for all functions including seasonal decomposition
- **New benefit**: Library docs about time series analysis (if maintain-library creates them) will improve the transform's domain knowledge
- **Expected**: All core functions in 5-8 iterations, refinement + edge cases in iterations 8-15

### A5: owl-ontology / claude-sonnet-4 / recommended / budget 32

**Prediction: MISSION-COMPLETE in 5-8 iterations, ~45-70 min**

- 4-kyu (medium). This is the mission from benchmark 008, now downgraded from 3-kyu to 4-kyu
- **Critical change**: Claude-sonnet-4 instead of gpt-5-mini — should produce better structured code
- **Counter fix** means cumulative transforms will be correctly tracked
- Benchmark 008 produced correct code in 3 transforms but failed due to the counter bug — with the fix, this would have been mission-complete
- **New benefit**: Library docs (OWL, JSON-LD, RDF) now fed to transform context via library index (C13). This was a key gap in benchmark 008 — the library pipeline was "write-only"
- **Expected**: Faster and more W3C-compliant implementation than benchmark 008

### A6: markdown-compiler / gpt-5-mini / recommended / budget 32

**Prediction: PARTIAL, budget likely exhausted**

- 2-kyu (harder). Full markdown parser: headers, emphasis, links, images, code blocks, lists, blockquotes, tables, horizontal rules
- This is a **parser problem** requiring state machine logic — gpt-5-mini may struggle with the full spec
- Budget 32 gives ~8 transforms — enough for basic features (headers, emphasis, paragraphs) but likely not tables + nested lists
- **Expected**: Basic markdown (headers, bold/italic, links, code blocks) in 3-5 transforms. Tables, nested lists, blockquotes may not be reached before budget exhaustion

### A7: markdown-compiler / gpt-5-mini / max / budget 128

**Prediction: MISSION-COMPLETE in 15-25 iterations, ~2-4 hours**

- Same mission with max budget
- 128 budget gives the model enough iterations to build the parser incrementally
- **Feature-to-issue pipeline** (C12) should help: feature specs for each markdown element drive targeted transforms
- **Risk**: Parser correctness across edge cases is hard; the model may oscillate on complex nesting
- **Expected**: Complete parser in 10-15 transforms, edge case fixes in remaining budget

### A8: plot-code-lib / gpt-5-mini / recommended / budget 32

**Prediction: PARTIAL, 6-10 iterations, may exhaust budget**

- 2-kyu. Code visualization library — AST parsing, diagram generation, function call graphs
- This requires both parsing skills (AST) and rendering skills (SVG/text output)
- Budget 32 is tight for this complexity level
- **Expected**: Basic AST parsing + function listing in 3-5 transforms. Visualization may be partially implemented

### A9: ray-tracer / gpt-5-mini / max / budget 128

**Prediction: PARTIAL or MISSION-FAILED, 20-30+ iterations, may exhaust even max budget**

- 1-kyu (hardest practical mission). 3D geometry, ray-sphere/ray-plane intersection, Phong shading, reflections, shadows
- This is a **stress test** — the model needs to implement correct vector math, ray intersection algorithms, and a rendering loop
- gpt-5-mini can likely implement basic ray-sphere intersection but may struggle with reflections + shadows
- **128 budget** gives many iterations but each iteration's test feedback loop is slow
- **Risk**: Math precision issues, rendering bugs that are hard to debug via test output alone
- **Expected**: Basic shapes + ambient lighting in 5-10 transforms. Reflections + shadows may require 10+ more transforms. Full spec unlikely within budget

### Advanced Benchmark Summary

| ID | Mission | Predicted Outcome | Iterations | Time | Confidence |
|----|---------|-------------------|------------|------|------------|
| A1 | lunar-lander / mini / rec | PARTIAL/FAILED | 8-15 | 1-2h | MEDIUM |
| A2 | lunar-lander / mini / max | COMPLETE | 12-20 | 2-3h | MEDIUM |
| A3 | time-series / mini / rec | PARTIAL | 8-12 | 1-1.5h | MEDIUM |
| A4 | time-series / mini / max | COMPLETE | 10-18 | 1.5-2.5h | MEDIUM |
| A5 | owl-ontology / sonnet / rec | COMPLETE | 5-8 | 45-70m | HIGH |
| A6 | markdown / mini / rec | PARTIAL | 8-12 | 1-1.5h | MEDIUM |
| A7 | markdown / mini / max | COMPLETE | 15-25 | 2-4h | LOW |
| A8 | plot-code / mini / rec | PARTIAL | 6-10 | 1-1.5h | MEDIUM |
| A9 | ray-tracer / mini / max | PARTIAL/FAILED | 20-30 | 3-5h | LOW |

---

## Impact of Benchmark 008 Fixes on Results

### Fixes That Directly Improve Outcomes

1. **Counter fix (C1/C2)**: This is the single most impactful change. Every scenario that previously showed `Cumulative transforms: 0` will now correctly track transforms. The false mission-failed from benchmark 008 will not recur.

2. **Auto-disable schedule (C3)**: Prevents 7+ hour waste loops. If a mission does fail, the system stops cleanly instead of burning Actions minutes.

3. **Feature-to-issue pipeline (C12)**: Supervisor can now create issues from feature specs. This means the maintain-features → transform loop is connected. Previously, feature specs were created but never consumed — now they drive transforms.

4. **Library index in transforms (C13)**: Domain-specific missions (owl-ontology, time-series, markdown) will benefit from library docs being available as context. The model can read relevant reference docs during transforms.

### Fixes That Reduce Waste

5. **Maintain token cap (C14)**: Prevents 625K-token maintain sessions. Feature/library maintenance stays within 200K tokens per invocation.

6. **Exponential backoff (C15)**: If a mission gets stuck (nop loops), it burns budget at decreasing frequency instead of every 20 minutes.

7. **Schedule reliability (Problems 1/2/4)**: Cron schedules should now activate reliably. The never-fires cron for "off" prevents GitHub de-registering the schedule block.

### Fixes That Improve Observability

8. **Sequenced logs (C4)**: Log files numbered `001`, `002`, etc. — easier to trace iteration sequence.
9. **Split metrics (C5)**: Each log shows both per-task and cumulative values — counter issues are immediately visible.
10. **Verbose workflow summaries (C10)**: Each job writes a GitHub Actions summary — easier to debug failures.

---

## Key Risks and Unknowns

1. **Behaviour test instability**: The Playwright tests still fail intermittently. This was the primary obstacle in Report 007 and is **not addressed** by the benchmark 008 fixes. Expect 1-3 extra iterations per scenario due to instability.

2. **Copilot SDK rate limits**: Heavy scenarios (A7, A9) may hit Copilot API rate limits. The session has retry logic (max 2 retries) but sustained high-frequency transforms could trigger throttling.

3. **Model quality variance**: gpt-5-mini's output quality varies between invocations. A scenario that completes in 4 iterations on one run might take 8 on another.

4. **Feature spec quality**: The feature-to-issue pipeline (C12) depends on the supervisor correctly selecting which feature spec to convert to an issue. If the supervisor creates redundant or low-value issues, transforms may be wasted.

5. **Library doc relevance**: Library docs are only useful if maintain-library runs before the first transform. In workflow mode (schedule-driven), this happens naturally. In iterate mode (CLI), it depends on step ordering.

---

## Recommendation: Execution Order

**Start with Simple to validate the fixes work:**
1. **S1** (fizz-buzz baseline) — confirms counter fix works end-to-end
2. **S3** (hamming-distance) — confirms mid-tier mission still works
3. **S5** (roman-numerals) — tests behaviour test instability recovery

**Then run key Advanced scenarios:**
4. **A5** (owl-ontology / claude-sonnet-4) — directly comparable to benchmark 008; should now succeed
5. **A2** (lunar-lander / max) — tests if max budget enables hard missions
6. **A6** (markdown-compiler / rec) — tests 2-kyu baseline

**Save stress tests for last:**
7. **A9** (ray-tracer / max) — stress test, likely partial regardless of fixes
