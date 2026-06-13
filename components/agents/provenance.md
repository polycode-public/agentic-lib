<!-- component: agents/provenance -->
## Provenance contract

Every change proposal must carry a **machine-parseable closure reference** so loop
closure is a mechanical fact, not prose, in the supervisor graph.

- The pull request body, or a commit trailer, **must** contain a closure trailer
  for the work item it resolves: `fixes #N` (or `Fixes #N`). GitHub's native
  closure grammar is what the connector mappers parse into typed `mg:fixes`
  provenance.
- Use conventional-commit prefixes (`feat:`, `fix:`, `test:`, `docs:`, `chore:`)
  on commit subjects.
- All work runs under **one stable bot identity** so the connector's bot-actor
  filter can drop the agent's own event echoes.

The shared `transform.yml` workflow **gates** on the presence of a `fixes #N` /
`Fixes #N` trailer before it will open or update a PR. A run that produces a change
without the trailer is rejected — add the trailer.
