# intentïon — The Conceptual Model

## The fixed point

**intentïon** is the only fixed point. It's what you want to exist. You express it
in `INTENT.md`, and the system navigates toward making it real. The word, the
brand, the domain, the diaeresis — it's all one thing.

## The host is the interface

GitHub is where it happens — not a metaphor. Repositories, issues, PRs,
discussions, Actions. The system works with the host's grain: branches for parallel
work, PRs as quality gates (tests pass or fail), merges for landing, Actions for
compute. The orchestrator and the coding agent **never share process state** — the
host's artifacts (work item, PR, review threads, checks) are the entire interface,
so an orchestrator that holds no memory between ticks can resume the cycle cold.

## The product

**Product** is the code that IS the thing you want — `src/`, the deployable
artifact. `INTENT.md` is the fixed point it navigates toward. Everything else exists
to build and maintain the product.

## The division of labour (8.x)

Two years of pulling ahead of retail AI without reaching product robustness before
the market shipped the same thing taught one lesson: **the moat was never the
loop.** GitHub Agentic Workflows, the Copilot coding agent, and
`anthropics/claude-code-action` are all the autonomous-SDLC category now. So
agentic-lib stopped owning the loop.

What remains is a clean split:

- **The engine executes statelessly.** One trigger → one headless `claude -p` run →
  one draft PR (or nothing). No transform ladder, no in-run state machine. The
  engine's only state is the checkout; iteration is a *new* trigger.
- **The marginalia supervisor graph remembers and decomposes.** It holds the
  intentïon, splits intents too large for one transformation into work items,
  prioritises them, and carries provenanced memory (`mg:fixes` closure) across
  retirements. The committed partial-order-plan engine of the old agentic-lib was a
  *prosthetic memory* — built because nothing in the loop persisted between runs.
  The graph is the actual memory, so the plan engine was **deleted, not ported**.

This division is not how the architecture copes with scale; it **is** the
architecture.

## What stays uniquely intentïon

The commodity blocks own the loop. The estate keeps the parts above and below it:

- **The intent library + kyu benchmark harness** — regression-tracked delivery
  benchmarking, affordable again on metered Bedrock (`missions/`, `benchmarks/`).
- **The marginalia supervision** — provenanced memory across retirements, G5
  prioritisation, `mg:fixes` closure.

Those are the differentiators no platform ships.

## Provenance is mechanical

Loop closure is a fact, not prose: every PR carries a `fixes #N` trailer that the
connector mappers parse into typed `mg:fixes` provenance. The shared `transform.yml`
gates on the trailer. All work runs under one stable bot identity so the connector's
bot-actor filter can drop the agent's own event echoes.
