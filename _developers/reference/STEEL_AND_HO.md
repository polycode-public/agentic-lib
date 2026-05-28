# Steel & Ho — Planning and Execution using Partial Decision Trees

## Summary

This paper bridges **AI planning** and **decision theory**. Where classical planners ask "what sequence of actions achieves the goal?", Steel and Ho ask the harder question: "given uncertainty about outcomes and the cost of further planning, should we plan more or act now?" The plan representation is simultaneously a conditional plan tree and a decision tree, with built-in monitoring of action outcomes.

## Origins

- **Authors:** Sam Steel and L.C. Ho
- **Institution:** Department of Computer Science, University of Essex, Colchester
- **Year:** 1993
- **Report:** CSM-184 (Computer Science Memorandum)
- **Repository:** https://repository.essex.ac.uk/8658/

## The PDF

The original technical report (`csm-184.pdf`) is included in this reference directory. It is a scanned document — the text is in the page images, not extractable as digital text.

## Key Ideas

### Planning vs. Execution Trade-off

The central innovation: the system can **reason about whether further planning or immediate execution is more valuable**. This is not a heuristic — it's a formal decision-theoretic calculation based on:

- The **cost of planning** (time, compute)
- The **expected utility of the resulting plan** vs. acting immediately
- The **uncertainty** about action outcomes

This directly addresses a problem that most planners ignore: planning itself has a cost, and at some point it's better to start executing an imperfect plan than to keep planning.

### Partial Decision Trees

The plan representation serves dual purpose:

- As a **conditional plan** — branches represent different possible outcomes of actions, with different continuations for each
- As a **decision tree** — branches represent choices, with utility calculations at the leaves

This unification allows the system to interleave planning and execution naturally. You plan until the decision tree tells you it's better to act, then act, observe the outcome, and plan again from the new state.

### Monitoring

Actions have expected outcomes. When an action is executed, the system monitors whether the actual outcome matches. If it doesn't, the system re-plans from the observed state rather than continuing with a plan based on false assumptions.

## Significance for intentïon

This paper is the most directly relevant to intentïon's design:

1. **Planning vs. execution trade-off** — Each intentïon transformation cycle must decide: refine the plan further, or execute what we have? Steel & Ho provide the theoretical framework for this decision.

2. **Partial plans are normal** — The system doesn't need a complete plan before acting. Open conditions (gaps in the plan) are expected. This matches intentïon's plan format with its explicit "Open Conditions" section.

3. **Monitoring and adaptation** — After each Copilot SDK call, intentïon checks the results (the witness step). If things didn't go as planned, the next cycle adapts. This is directly analogous to Steel & Ho's outcome monitoring.

4. **Budget reasoning** — intentïon's "budget of compute" per workflow run maps to Steel & Ho's cost-of-planning model. At some point, further planning within the current run isn't worth the tokens — better to land what you have and plan again next cycle.

## Sam Steel at Essex

Sam Steel is in the School of Computer Science and Electronic Engineering at the University of Essex. He also co-edited:

- Steel, S. & Alami, R. (eds.) (1997). _Recent Advances in AI Planning: 4th European Conference on Planning (ECP'97)_. Lecture Notes in Computer Science, vol. 1348. Springer. (35 papers from 90 submissions.)

Steel's work at Essex connects the AI planning tradition (Edinburgh: Tate, NONLIN, O-Plan) with the constraint satisfaction tradition (Essex: Tsang) — both of which inform intentïon's approach.

## Links

- Essex repository: https://repository.essex.ac.uk/8658/
- ECP'97 proceedings: https://link.springer.com/book/10.1007/3-540-63912-8
