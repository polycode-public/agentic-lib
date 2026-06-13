<!-- component: agents/house-conventions -->
## House conventions

- **Runtime**: Node.js 24+, ES modules (`"type": "module"`). No TypeScript build step.
- **Tests**: Vitest for unit/behaviour; Playwright for browser behaviour where a web
  surface exists. Tests live under `tests/`.
- **Dependencies**: minimal. Prefer the standard library and the engine's built-in
  tools (file I/O, command execution, web fetch, `gh`, MCP) over adding packages.
  Justify every new runtime dependency.
- **CI is thin**: workflows are a trigger plus a `uses:` of the shared
  `agentic-lib/.github/workflows/transform.yml@v8`. Keep bespoke bash to a minimum.
- **One transformation per run**: a single linear session whose only state is the
  checkout. No multi-step plan, no in-run budget ladder — iteration is a *new*
  trigger (a review comment, a re-assignment), never a loop counter.
- **Small, reviewable changes**: each PR addresses one work item. Do not mix
  unrelated concerns. Do not reformat lines you are not changing.
- **Leave the tree green**: run the test suite before opening or revising a PR.
