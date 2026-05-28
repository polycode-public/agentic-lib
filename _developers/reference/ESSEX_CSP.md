# The Essex Constraint Satisfaction Tradition

## Summary

The University of Essex has been a significant centre for constraint satisfaction problem (CSP) research since the late 1980s. The connection between CSP and AI planning is deep — many planning problems are naturally expressed as constraint satisfaction problems, and the techniques developed at Essex for CSP have direct application to plan representation and search.

## Key Figures

### Edward Tsang

Professor of Computer Science at the University of Essex. Author of the foundational textbook on constraint satisfaction:

- Tsang, E. (1993). _Foundations of Constraint Satisfaction_. Academic Press. ISBN 0-12-701610-4.

This was the first attempt to define the scope of constraint satisfaction as a field. It remains the most cited work on the subject. The book was suggested by Sam Steel, connecting the planning and constraint satisfaction threads at Essex.

Now available as a free PDF: https://www.bracil.net/edward/FCS.html

### Sam Steel

Lecturer in the School of Computer Science and Electronic Engineering. Research spanning AI planning (see `STEEL_AND_HO.md`) and the intersection of planning with constraint satisfaction. Co-editor of the ECP'97 proceedings.

## The Planning-CSP Connection

### Planning as Constraint Satisfaction

A plan can be viewed as a constraint satisfaction problem:

- **Variables:** The actions to include, their parameters, their ordering
- **Domains:** The possible actions, parameter values, time slots
- **Constraints:** Preconditions must be met, resources must not be over-allocated, threats must be resolved, causal links must be preserved

This view was formalized by several researchers:

- Kautz, H. & Selman, B. (1992). "Planning as Satisfiability." _ECAI-92_. — Showed that planning problems can be encoded as SAT (Boolean satisfiability) problems and solved by SAT solvers. Led to the SATPLAN and Blackbox systems.

- Do, M.B. & Kambhampati, S. (2001). "Planning as Constraint Satisfaction: Solving the Planning Graph by Compiling it into CSP." _Artificial Intelligence_, 132(2), pp. 151–182.

### O-Plan's Constraint Model

Austin Tate's O-Plan (see `O-PLAN.md`) used an explicitly constraint-based plan representation — the \<I-N-C-A\> ontology. This is the direct bridge between Edinburgh's planning tradition and the constraint satisfaction formalism.

## Why This Matters for intentïon

intentïon's plan format (PLAN.md) is implicitly a constraint satisfaction problem:

| Plan section        | CSP analog                                         |
| ------------------- | -------------------------------------------------- |
| **Achieved**        | Assigned variables (solved)                        |
| **In Progress**     | Variables being explored                           |
| **Open Conditions** | Unassigned variables                               |
| **Threats**         | Constraint violations to resolve                   |
| **Unordered**       | Variables with no ordering constraint between them |
| **Observations**    | Learned constraints from failed attempts           |

The partial-order structure of the plan is exactly the kind of structure CSP solvers are designed to work with: maintain flexibility (don't assign values until forced), propagate constraints (when one decision is made, prune the options for related decisions), and backtrack when a dead end is reached.

## Key References

1. Tsang, E. (1993). _Foundations of Constraint Satisfaction_. Academic Press.
2. Kautz, H. & Selman, B. (1992). "Planning as Satisfiability." _ECAI-92_.
3. Do, M.B. & Kambhampati, S. (2001). "Planning as Constraint Satisfaction." _Artificial Intelligence_, 132(2).
4. Currie, K. & Tate, A. (1991). "O-Plan: The Open Planning Architecture." _Artificial Intelligence_, 52(1).

## Links

- Foundations of Constraint Satisfaction (free): https://www.bracil.net/edward/FCS.html
- Planning as Satisfiability: https://www.cs.cornell.edu/selman/papers/pdf/92.ecai.satplan.pdf
- Essex AI group: https://www.essex.ac.uk/departments/computer-science-and-electronic-engineering/research/artificial-intelligence
