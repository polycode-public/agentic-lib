# O-Plan — Open Planning Architecture

## Summary

O-Plan extended NONLIN's partial-order planning into a full **open planning architecture** — a complete system for plan generation, execution monitoring, and dynamic repair. It introduced constraint-based representations and mixed-initiative human-AI collaboration in planning.

## Origins

- **Authors:** Ken Currie, Austin Tate, and team at AIAI
- **Institution:** Artificial Intelligence Applications Institute (AIAI), University of Edinburgh
- **Period:** 1983–1999
- **Funding:** UK Science Research Council; later DARPA/Air Force Research Laboratory Planning Initiative (ARPI)

## Key Publications

1. Currie, K. & Tate, A. (1991). "O-Plan: The Open Planning Architecture." _Artificial Intelligence_, 52(1), pp. 49–86.

2. Tate, A. (ed.) (1996). _Advanced Planning Technology_. AAAI Press. (Describes projects within the DARPA/Air Force Planning Initiative.)

## Key Innovations

- **Open architecture:** Unlike NONLIN's monolithic design, O-Plan separated planning knowledge from planning machinery. External systems could plug into the planning process.
- **Constraint management:** Plans represented as sets of constraints — temporal, resource, spatial — rather than just action sequences. The **\<I-N-C-A\> ontology** (Issues–Nodes–Constraints–Annotations) provided a shared model for synthesis tasks.
- **Execution monitoring and repair:** O-Plan didn't just generate plans — it monitored execution and repaired plans when actions failed or the world changed unexpectedly.
- **Mixed-initiative planning:** O-Plan supported human-AI collaboration. Humans could inspect the plan, override choices, add constraints. The system and the human shared a common plan representation.
- **Plan intelligibility:** Explicitly represented the causal structure and rationale of the plan, so humans could understand _why_ each action was included.

## The I-N-C-A Ontology

O-Plan's plan representation:

- **Issues:** Outstanding decisions the planner needs to make
- **Nodes:** Actions and events in the plan
- **Constraints:** Temporal, resource, spatial, and causal constraints between nodes
- **Annotations:** Metadata — rationale, status, provenance

This representation influenced all subsequent constraint-based planning work.

## Evolution: I-X / I-Plan (2000–2010)

O-Plan's successor, I-X/I-Plan, was a portable Java-based multi-agent framework. It introduced the **I-Room** (Virtual Space for Intelligent Interaction) for crisis response scenarios where multiple agents and humans collaborate on a shared plan.

## Significance

O-Plan demonstrated that planning is not just about finding a sequence of actions — it's about managing constraints, collaborating with humans, monitoring execution, and adapting when things go wrong. This is directly relevant to how intentïon uses plans: as living, constraint-rich artifacts refined by multiple perspectives.

## Links

- Project page: https://www.aiai.ed.ac.uk/project/oplan/
- Austin Tate's blog on planning: https://blog.inf.ed.ac.uk/atate/
