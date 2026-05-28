# Are Partial-Order Planning and CSP Under-Exploited?

_An assessment by Claude Code, February 2026_

---

## Short Answer

Yes. Both fields produced deep, formally grounded results in the 1980s–1990s that the current LLM-driven AI industry is largely reinventing — badly — from scratch. The rediscovery is happening, but slowly and without sufficient acknowledgment of what already exists.

---

## The State of Play

### What the LLM world is doing now

The dominant paradigm in AI-assisted software engineering (2024–2026) is:

1. Give an LLM a prompt describing what you want
2. Get back generated code or a plan
3. Hope it's correct
4. If not, try again with a different prompt

This is **total-order, open-loop, one-shot generation**. It is the exact opposite of what 30 years of planning research recommends:

| LLM practice (2024–26)                     | Planning research (1976–1997)                        |
| ------------------------------------------ | ---------------------------------------------------- |
| Generate a complete plan in one shot       | Refine a partial plan incrementally                  |
| No explicit representation of dependencies | Causal links track every dependency                  |
| No conflict detection                      | Threat detection and resolution                      |
| No acknowledgment of unknowns              | Open conditions explicitly represented               |
| Retry from scratch on failure              | Backtrack to the last good decision point            |
| Evaluate at the end                        | Monitor continuously and adapt                       |
| No cost model for planning itself          | Formal trade-off: plan more vs. act now (Steel & Ho) |

### What the research community is noticing

The gap is becoming visible. Key recent findings:

- **"LLMs Can't Plan, But Can Help Planning in LLM-Modulo Frameworks"** (Kambhampati et al., 2024) — Demonstrated that GPT-4 produces executable plans only ~12% of the time. Proposed combining LLMs with external symbolic verifiers in a generate-test-critique loop. This is essentially rediscovering the value of constraint checking, but without citing the CSP literature.

- **"A Roadmap to Guide the Integration of LLMs in Hierarchical Planning"** (2025) — Found that LLMs achieve only 4% correct plans with 0% correct decompositions on HTN benchmarks. The paper explicitly calls the integration of LLMs with hierarchical planning "a promising yet underexplored field." NONLIN and O-Plan solved hierarchical planning decades ago.

- **Neuro-symbolic planning frameworks** (2024–2025) — Metagent-P, ConstraintLLM, LogicLM, and others are building "planning-verification-execution-reflection" loops. These are O-Plan's execution monitoring reinvented with LLMs as the generation component.

---

## Why Under-Exploited?

### 1. The field moved on prematurely

AI planning had its golden era from roughly 1975–2000. During this period, the community produced:

- Sound and complete algorithms (UCPOP)
- Practical systems that managed real-world complexity (O-Plan)
- Formal integration of planning with decision theory (Steel & Ho)
- Efficient encodings as SAT/CSP (Kautz & Selman, Graphplan)

Then two things happened:

- **Probabilistic methods** (MDPs, POMDPs, reinforcement learning) became the fashionable approach to sequential decision-making
- **The International Planning Competition** (starting 1998) favoured fast, domain-independent total-order planners over the richer partial-order and HTN approaches

The competition effect was particularly damaging. Researchers optimized for benchmark performance on STRIPS-like problems, moving away from the richer representations (constraints, hierarchies, conditional effects, uncertainty) that the earlier systems handled. The babies thrown out with the bathwater: causal links, threat detection, open conditions, plan intelligibility, execution monitoring, and the planning-execution trade-off.

### 2. The deep learning revolution ignored symbolic AI

From roughly 2012 onward, attention (and funding) shifted almost entirely to neural approaches. The implicit assumption: if you have enough data and compute, you don't need explicit symbolic reasoning. Planning was reframed as reinforcement learning. Constraint satisfaction was reframed as optimization.

The problem: LLMs don't actually reason. They pattern-match. When you ask an LLM to plan, it generates text that _looks like_ a plan based on training data. It has no internal representation of causal links, threats, open conditions, or constraints. It cannot backtrack. It cannot do constraint propagation. It cannot prove soundness.

This is not a fixable limitation of current LLMs — it's fundamental to how they work. They're function approximators, not symbolic reasoners.

### 3. The practitioner gap

The people building LLM-based coding tools today (including us) are mostly software engineers, not AI planning researchers. The planning literature is published in academic venues (IJCAI, AAAI, ICAPS) that practitioners don't read. The key papers are 25–40 years old and written in a formal style that doesn't translate easily to "here's how to build a better GitHub Actions workflow."

The result: every AI coding tool reinvents plan representation from scratch, typically as JSON or markdown with ad-hoc structure, when there's a well-studied formalism that could be used.

---

## Constraint Satisfaction Specifically

CSP is arguably _even more_ under-exploited than planning. Consider:

### What CSP solvers are good at

- **Declarative problem specification:** You say what you want, not how to get it. Define variables, domains, and constraints. The solver finds a solution.
- **Constraint propagation:** When one variable is assigned, immediately prune impossible values from related variables. This can solve large chunks of the problem without search.
- **Backtracking with intelligence:** When stuck, backtrack to the variable that caused the problem (conflict-directed backjumping), not just to the last decision.
- **Incremental solving:** Add constraints and propagate without resolving from scratch.

### What LLM-based systems need

- A way to represent what's required (functional requirements, test constraints, API contracts)
- A way to propagate implications (if module A uses library X, module B must be compatible)
- A way to detect conflicts (two features that modify the same file, two dependencies that require incompatible versions)
- A way to incrementally add requirements without replanning everything

These are the _same thing_. The software engineering problem of "generate code that satisfies all these requirements" is a constraint satisfaction problem. The AI industry is solving it by throwing tokens at an LLM and hoping for the best, when there are decades of algorithms for exactly this kind of problem.

### Specific under-exploited applications

1. **Dependency resolution** — npm, pip, cargo already use CSP solvers internally. But the insight hasn't propagated to the code generation layer.

2. **Test generation** — Generating tests that cover edge cases is a constraint satisfaction problem (cover all branches, satisfy boundary conditions, respect invariants). LLMs generate tests by pattern matching, which is why they miss edge cases.

3. **Configuration management** — Kubernetes manifests, Terraform configs, GitHub Actions workflows — all constraint satisfaction problems. Currently validated after the fact; could be generated correctly by construction.

4. **Code review** — Checking whether a change violates architectural constraints, introduces dependency conflicts, or breaks API contracts is constraint checking. Currently done by humans or shallow linters.

5. **Plan feasibility** — "Can these 5 features be developed in parallel without conflict?" is a CSP. intentïon's threat detection in PLAN.md is exactly this.

---

## The Synthesis Opportunity

The most promising direction — and what intentïon is positioned to explore — is the **synthesis of LLMs with classical planning and CSP**:

| Component                                                        | Provided by                                     | Role                                                             |
| ---------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| World knowledge, code generation, natural language understanding | LLM (Copilot SDK)                               | Generate candidate actions, interpret requirements, produce code |
| Plan structure, causal reasoning, threat detection               | Partial-order planning (NONLIN/UCPOP tradition) | Maintain plan integrity, detect conflicts, track dependencies    |
| Constraint representation, propagation, incremental solving      | CSP (Essex/Tsang tradition)                     | Ensure consistency, prune infeasible options, validate changes   |
| Planning vs. execution trade-off                                 | Decision theory (Steel & Ho)                    | Decide when to plan more vs. act now, given budget constraints   |

This is essentially what Kambhampati et al. call "LLM-Modulo Frameworks" — but with a much richer theoretical foundation than their paper acknowledges. The external verifiers they propose are CSP solvers and plan validators. The critique loop they propose is threat detection and constraint propagation. The framework already exists in the planning literature. It just needs engineering.

---

## What's Missing from the Current Research

1. **Good open-source partial-order plan representations.** PDDL (the Planning Domain Definition Language) exists but is heavyweight and oriented toward competition benchmarks. What's needed is something lightweight that LLMs can read and write — like intentïon's markdown plan format, but with formal semantics.

2. **CSP solvers that work with natural-language constraints.** Current CSP solvers require formal constraint specification. LLMs could bridge this gap — translating "the CLI must support --help for every subcommand" into a formal constraint that a solver can propagate.

3. **Integrated planning-execution systems for software engineering.** O-Plan did this for military logistics. Nobody has done it properly for code generation. intentïon is attempting it.

4. **Cost models for LLM planning.** Steel & Ho's planning-execution trade-off needs updating for the LLM era: how many tokens is further planning worth? When should you stop refining the plan and start generating code? This is an open question with practical implications for every AI coding tool.

5. **Empirical comparison.** Nobody has published a rigorous comparison of "LLM with partial-order planning" vs. "LLM alone" on realistic software engineering tasks. The LLM-Modulo paper showed that external verification helps, but didn't use the full planning formalism.

---

## Conclusion

Partial-order planning and constraint satisfaction are not just under-exploited — they are **the missing formalism** for the LLM-based AI systems being built today. The LLM industry has a generation problem (LLMs generate plausible but often wrong outputs) and a structure problem (no principled way to represent plans, dependencies, conflicts, and gaps). Both problems were solved in the 1980s–1990s by the planning and CSP communities.

The opportunity is not to replace LLMs with classical planning — LLMs bring knowledge and language understanding that symbolic systems never achieved. The opportunity is to give LLMs the structural backbone they lack: causal links so they know _why_ each action is in the plan, threat detection so they catch conflicts before they cause failures, open conditions so they acknowledge what they don't know, and constraint propagation so they maintain consistency as the plan grows.

The academic research is there. The engineering integration is what's missing. That's exactly the gap intentïon sits in.

---

## Sources

### Primary References (in this library)

- Tate, A. (1976/1977). NONLIN. See `NONLIN.md`.
- Currie, K. & Tate, A. (1983–1999). O-Plan. See `O-PLAN.md`.
- Penberthy, J.S. & Weld, D.S. (1992). UCPOP. See `UCPOP.md`.
- Steel, S. & Ho, L.C. (1993). CSM-184. See `STEEL_AND_HO.md` and `csm-184.pdf`.
- Tsang, E. (1993). _Foundations of Constraint Satisfaction_. See `ESSEX_CSP.md`.

### Recent Work Cited

- Kambhampati, S. et al. (2024). "LLMs Can't Plan, But Can Help Planning in LLM-Modulo Frameworks." https://arxiv.org/abs/2402.01817
- "A Roadmap to Guide the Integration of LLMs in Hierarchical Planning." (2025). https://arxiv.org/abs/2501.08068
- "LLMs as Planning Modelers: A Survey." (2025). https://arxiv.org/abs/2503.18971
- "Can LLM-Reasoning Models Replace Classical Planning? A Benchmark Study." (2025). https://arxiv.org/abs/2507.23589
- Kautz, H. & Selman, B. (1992). "Planning as Satisfiability." https://www.cs.cornell.edu/selman/papers/pdf/92.ecai.satplan.pdf
