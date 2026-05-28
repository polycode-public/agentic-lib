# NONLIN — Hierarchical Non-Linear Planner

## Summary

NONLIN is the original hierarchical task network (HTN), partial-order planner. It introduced the idea that plan steps should only be ordered when there is a reason to order them — the **least commitment** principle that became foundational to all subsequent partial-order planning work.

## Origins

- **Author:** Austin Tate
- **Institution:** Department of Artificial Intelligence, University of Edinburgh
- **Year:** 1975–1976 (developed during the first year of the UK Science Research Council project "Planning: a Joint AI/OR Approach")
- **Implementation:** POP-11 (within the Poplog environment)

## Key Publications

1. Tate, A. (1976). "Project Planning Using a Hierarchic Non-linear Planner." D.A.I. Research Report No. 25, University of Edinburgh, August 1976.

2. Tate, A. (1977). "Generating Project Networks." _Proceedings of the Fifth International Joint Conference on Artificial Intelligence (IJCAI-77)_, pp. 888–893, Boston, Mass. Reprinted in _Readings in Planning_ (Morgan-Kaufmann, 1990).

## Key Innovations

- **Partial-order planning:** Actions are only ordered when a dependency exists between them. Otherwise they remain unordered, preserving flexibility.
- **Hierarchical task decomposition:** Complex tasks decompose into subtasks, which decompose further. The planner works at multiple levels of abstraction.
- **Goal structure:** Uses goal structure to guide search, tracking which goals are achieved by which actions and detecting when actions interfere with each other.
- **Causal links:** Explicitly represents _why_ each action is in the plan — what precondition it achieves for what later action. This makes plans intelligible and supports threat detection.
- **Threat detection:** When a new action is added that might undo a precondition needed by another action, NONLIN detects this "threat" and resolves it (by ordering the threatening action before or after the threatened link).

## Significance

NONLIN established the vocabulary and mechanisms that every subsequent partial-order planner built upon: causal links, threats, least commitment, hierarchical decomposition. It was the first system to show that you don't need a total ordering of plan steps — you only need to commit to orderings that are causally necessary.

## Availability

- Source code archived on GitHub: https://github.com/aiaustin/planners
- Also preserved in the GitHub Arctic Vault
- University of Maryland produced a Common Lisp version of NONLIN's core components

## Links

- Project page: https://www.aiai.ed.ac.uk/project/nonlin/
- Austin Tate's planning systems: https://www.aiai.ed.ac.uk/project/early-planners/
