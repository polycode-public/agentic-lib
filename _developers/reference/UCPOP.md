# UCPOP — A Sound, Complete, Partial-Order Planner for ADL

## Summary

UCPOP formalized partial-order planning with mathematical rigour. It proved that partial-order planning could be both **sound** (every plan it produces is valid) and **complete** (if a valid plan exists, it will find one) for a rich action language including conditional effects, universal quantification, and disjunctive goals.

## Origins

- **Authors:** J. Scott Penberthy and Daniel S. Weld
- **Institution:** University of Washington
- **Year:** 1992
- **Venue:** Third International Conference on Knowledge Representation and Reasoning (KR-92), Cambridge, MA

## Key Publication

Penberthy, J.S. & Weld, D.S. (1992). "UCPOP: A Sound, Complete, Partial Order Planner for ADL." _Proceedings of KR-92_, pp. 103–114.

Paper: https://homes.cs.washington.edu/~weld/papers/ucpop-kr92.pdf

## Key Contributions

- **Soundness and completeness proofs** for partial-order planning over ADL (Action Description Language) — Pednault's extension of STRIPS with conditional effects, universally quantified preconditions/effects, disjunction, negation, and existential quantification.
- **Conservative search strategy** that systematically explores the space of partial plans.
- **Efficient implementation** in Common Lisp — 5–50ms per plan refinement step. As fast as or faster than SNLP (Systematic Nonlinear Planner) in comparable domains.
- **Solved the Yale Shooting Problem** — a benchmark that had troubled earlier planners.

## How It Works

UCPOP maintains a **partial plan** — a set of actions with causal links and ordering constraints but no commitment to a total order. At each step it:

1. Selects an **open condition** (a precondition not yet supported by any action)
2. Finds an action that **achieves** that condition (either an existing action or a new one)
3. Adds a **causal link** from the achieving action to the needing action
4. Checks for **threats** — other actions that might undo the achieved condition
5. Resolves threats by adding ordering constraints (promotion or demotion)

This is the canonical partial-order planning algorithm. NONLIN pioneered the concepts; UCPOP formalized and proved them correct.

## Relationship to Other Systems

| System                               | Contribution                                              |
| ------------------------------------ | --------------------------------------------------------- |
| NONLIN (Tate, 1976)                  | Introduced partial-order planning, causal links, threats  |
| SNLP (McAllester & Rosenblitt, 1991) | Systematic search over partial plans                      |
| UCPOP (Penberthy & Weld, 1992)       | Soundness/completeness for ADL, the rich action language  |
| O-Plan (Currie & Tate, 1983–99)      | Practical system with constraint management and execution |

## Significance

UCPOP is the theoretical foundation. If you want to understand _why_ partial-order planning works — why least commitment is sound, why causal links preserve correctness, why threat resolution is complete — UCPOP is the reference. Every subsequent formal treatment of partial-order planning builds on Penberthy and Weld's proofs.

## Links

- Paper (PDF): https://homes.cs.washington.edu/~weld/papers/ucpop-kr92.pdf
- Semantic Scholar: https://www.semanticscholar.org/paper/UCPOP:-A-Sound,-Complete,-Partial-Order-Planner-for-Penberthy-Weld/6e1bd5758be5495141d56de31c28d57f55c56f3e
- CMU AI Repository (source code): https://www.cs.cmu.edu/afs/cs/project/ai-repository/ai/areas/planning/systems/ucpop/0.html
