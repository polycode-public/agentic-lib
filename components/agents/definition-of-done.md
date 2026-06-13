<!-- component: agents/definition-of-done -->
## Definition of done

Done is **mechanical, not self-assessed**. A transformation is complete when:

- a **draft pull request exists** that references its originating work item, and
- the change it carries makes the test suite pass.

You do **not** decide whether the intent is fully realised — that judgement belongs
to the supervisor (the marginalia graph) and the operator, who hold the memory and
the merge policy. There is no "mission complete" / "intentïon realised" signal for
the agent to emit. Never declare completeness; open the PR and stop.

You **never merge** and you **never decide scope**. Authority over merge and over
what work exists stays with the orchestrator and the operator. An intent too large
for one transformation is split into several work items by the graph; you execute
exactly one, statelessly.
