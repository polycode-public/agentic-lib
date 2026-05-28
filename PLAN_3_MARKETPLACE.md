# Plan: Publish agentic-step to GitHub Marketplace

## Goal

Publish the `agentic-step` GitHub Action to the GitHub Marketplace so it appears in search, has its own listing page, and can be referenced as `xn-intenton-z2a/agentic-step@v1`.

## Constraint

GitHub Marketplace requires:

- A **dedicated public repository** with `action.yml` at the root
- **No workflow files** in the repository
- **Single action** per repository
- The action `name` must be unique across the Marketplace
- Two-factor authentication enabled on the publishing account

Source: https://docs.github.com/en/actions/sharing-automations/creating-actions/publishing-actions-in-github-marketplace

The action currently lives at `agentic-lib/src/actions/agentic-step/`. It cannot be published from there. A separate repository is needed.

## Steps

### 1. Create repository `xn-intenton-z2a/agentic-step`

- Public repository
- MIT license (matches the distributed action)
- Description: "Run autonomous agentic tasks using the GitHub Copilot SDK"

### 2. Populate from source

Copy from `agentic-lib/src/actions/agentic-step/`:

```
agentic-step/
├── action.yml          # Must be at root
├── index.js
├── copilot.js
├── config-loader.js
├── safety.js
├── logging.js
├── tools.js
├── tasks/
│   ├── transform.js
│   ├── resolve-issue.js
│   ├── fix-code.js
│   ├── maintain-features.js
│   ├── maintain-library.js
│   ├── enhance-issue.js
│   ├── review-issue.js
│   └── discussions.js
├── package.json
├── package-lock.json
├── README.md           # Marketplace listing content
└── LICENSE             # MIT
```

No `.github/workflows/` directory. No test files (those stay in agentic-lib).

### 3. Update action.yml for Marketplace

Add branding metadata:

```yaml
branding:
  icon: "zap"
  color: "gray-dark"
```

### 4. Tag and release

```bash
git tag -a v1.0.0 -m "Initial Marketplace release"
git push origin v1.0.0
```

### 5. Publish to Marketplace

On GitHub, navigate to the action.yml → "Draft a release" banner → select categories → publish.

Categories: "Code quality" (primary), "Utilities" (secondary).

### 6. Update agentic-lib workflows

After Marketplace publication, consumer workflows can optionally reference the action as:

```yaml
uses: xn-intenton-z2a/agentic-step@v1
```

instead of:

```yaml
uses: ./.github/agentic-lib/actions/agentic-step
```

The local copy (distributed via `init`) continues to work. The Marketplace listing adds discoverability and versioning.

### 7. Sync strategy

The source of truth remains `agentic-lib/src/actions/agentic-step/`. The Marketplace repo should be synced on each agentic-lib release. Options:

- **Manual**: Copy files and tag on each release
- **Automated**: Add a step to `release.yml` that pushes to the agentic-step repo and creates a matching tag

## Not in scope

- Changing how `init` distributes the action (local copy remains the default)
- Verified creator badge (requires contacting partnerships@github.com)
- Paid listing (action is free)
