# Partial-Order Planning — Overview

## What It Is

Partial-order planning (POP) is an approach to AI planning where the planner does **not** commit to a total ordering of actions. Instead, it maintains a **partial order** — actions are only ordered relative to each other when there is a causal reason to do so. Actions that are independent remain unordered.

This is the **least commitment** principle: don't make decisions until you have to. It preserves flexibility and reduces the search space.

## Core Concepts

### Partial Plan

A partial plan consists of:

- A set of **actions** (not yet totally ordered)
- **Causal links**: A→p→B means "action A achieves precondition p needed by action B"
- **Ordering constraints**: A < B means "A must happen before B"
- **Open conditions**: preconditions not yet supported by any action

### Causal Links

A causal link records _why_ an action is in the plan. If action A achieves precondition p for action B, the link A→p→B records this dependency. Causal links make plans self-documenting — you can trace the rationale for every action.

### Threats

A threat exists when an action C might undo a condition p that is needed by a causal link A→p→B. If C has an effect ¬p and C could be ordered between A and B, then C threatens the link.

Threats are resolved by:

- **Promotion**: order C before A (so C's effect is undone before it matters)
- **Demotion**: order C after B (so C doesn't interfere)

### Open Conditions

An open condition is a precondition that no action in the current plan achieves. The planner must either find an existing action that achieves it or add a new action.

### Least Commitment

The planner avoids committing to orderings or variable bindings until forced by threats or causal requirements. This means:

- Fewer backtracking points
- Plans are more flexible — they can be adapted to changed circumstances
- Independent subgoals remain independent

## The Canonical Algorithm (UCPOP-style)

```
1. Start with initial state and goal
2. While there are open conditions:
   a. Select an open condition (a precondition not yet achieved)
   b. Find an action that achieves it (existing or new)
   c. Add a causal link from the achiever to the needer
   d. Check for new threats
   e. Resolve each threat (promote or demote)
   f. If no resolution exists, backtrack
3. Return the partial plan
```

## History

| Year    | System         | Authors                       | Contribution                                        |
| ------- | -------------- | ----------------------------- | --------------------------------------------------- |
| 1975    | Interplan      | Tate                          | Goal interaction management                         |
| 1975–76 | **NONLIN**     | Tate (Edinburgh)              | First HTN partial-order planner                     |
| 1983–99 | **O-Plan**     | Currie & Tate (Edinburgh)     | Open architecture, constraint management, execution |
| 1991    | SNLP           | McAllester & Rosenblitt       | Systematic search over partial plans                |
| 1992    | **UCPOP**      | Penberthy & Weld (Washington) | Sound, complete for ADL                             |
| 1992    | SATPLAN        | Kautz & Selman (AT&T/Cornell) | Planning as satisfiability                          |
| 1993    | **Steel & Ho** | Steel & Ho (Essex)            | Planning/execution trade-off under uncertainty      |
| 1995    | Graphplan      | Blum & Furst                  | Planning graph + backward search                    |
| 1997    | Blackbox       | Kautz & Selman                | Unified SAT + Graphplan                             |
| 2000–10 | I-X/I-Plan     | Tate et al. (Edinburgh)       | Multi-agent mixed-initiative planning               |

## Contrast with Total-Order Planning

| Aspect              | Total-order (STRIPS-like)          | Partial-order (POP)                       |
| ------------------- | ---------------------------------- | ----------------------------------------- |
| Plan format         | Sequence of actions                | Set of actions + ordering constraints     |
| Commitment          | Full — every action has a position | Minimal — only forced orderings           |
| Flexibility         | None — the plan is rigid           | High — unordered actions can be reordered |
| Subgoal interaction | Detected late (during execution)   | Detected early (threats during planning)  |
| Search space        | All permutations of actions        | Only causally relevant orderings          |
| Explainability      | "Step 5 does X"                    | "A achieves p because B needs it"         |

## Relevance to LLM-Based Systems

Partial-order planning is particularly relevant to LLM-based code generation systems like intentïon:

1. **Multiple independent features** can be developed in any order — the plan should not impose a false ordering
2. **Causal links** track why each task exists — "resolve issue #42 because it implements feature X needed by feature Y"
3. **Threat detection** identifies when two tasks might conflict — "both issues #3 and #5 modify the CLI entry point"
4. **Open conditions** explicitly represent what's not yet planned — gaps the system acknowledges rather than ignores
5. **Least commitment** means the plan stays flexible as requirements change

## Links

- Wikipedia: https://en.wikipedia.org/wiki/Partial-order_planning
- NONLIN: https://www.aiai.ed.ac.uk/project/nonlin/
- UCPOP paper: https://homes.cs.washington.edu/~weld/papers/ucpop-kr92.pdf
- O-Plan: https://www.aiai.ed.ac.uk/project/oplan/
