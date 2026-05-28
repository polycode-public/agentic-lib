# PLAN: Playwright Behaviour Tests in Distribution

## User Assertions (non-negotiable)

1. `src/seeds/zero-behaviour.test.js` is a Playwright test distributed alongside `zero-main.test.js` and `zero-web.test.js`.
2. The seed behaviour test checks that the homepage renders and returns HTTP 200.
3. `.github/workflows/agentic-lib-test.yml` runs Playwright tests via `npm run test:behaviour` and, when on main, pushes a single screenshot to the project root.
4. The Playwright tests in the pipeline use the container matching the npm package to run browsers.
5. `.github/workflows/test.yml` runs web tests and behaviour tests alongside unit tests on the init'd seeded setup (the `test-seeded-npm-test` job or equivalent), using the Playwright container.
6. `src/web/` folder should be distributed (the user noticed `test/tests/unit/main.test.js` doesn't have a web folder — we need to ensure the web seed is distributed properly).

## Current State

### Seed Files Distributed

| Seed File | Target in Consumer | Notes |
|-----------|-------------------|-------|
| `zero-main.js` | `src/lib/main.js` | Library code |
| `zero-main.test.js` | `tests/unit/main.test.js` | Unit tests (vitest) |
| `zero-index.html` | `src/web/index.html` | Website HTML |
| `zero-web.test.js` | `tests/unit/web.test.js` | Web structure tests (vitest, checks HTML files exist) |
| `zero-package.json` | `package.json` | Includes `npm test` → `vitest --run tests/unit/*.test.js` |
| `zero-SOURCES.md` | `SOURCES.md` | Library sources |
| `zero-README.md` | `README.md` | Readme |
| `zero-.gitignore` | `.gitignore` | Gitignore |

### Missing

- No `zero-behaviour.test.js` — no Playwright test seed
- No `test:behaviour` script in `zero-package.json`
- `agentic-lib-test.yml` has no Playwright step
- `test.yml` `test-seeded-npm-test` runs on bare `ubuntu-latest`, not a Playwright container
- No Playwright dependency in seed `package.json`

### Web Folder Distribution

`zero-index.html` → `src/web/index.html` is already in the SEED_MAP (line 953 of `bin/agentic-lib.js`). The `src/web/` directory IS created during purge (line 946: `clearAndRecreateDir(webPath, webPath)`). The `docs/` directory is also populated from the web seed (lines 967-974). The web folder distribution appears correct — what the user noticed is that `tests/unit/main.test.js` doesn't reference web content, but `tests/unit/web.test.js` does. Both are distributed.

## Implementation Plan

### Step 1: Create `zero-behaviour.test.js` seed

Create `src/seeds/zero-behaviour.test.js` — a Playwright test that:
- Starts a local server serving `docs/` (or `src/web/`)
- Navigates to the homepage
- Asserts HTTP 200 response
- Asserts the page renders (contains expected elements like `lib-name`, `lib-version`)
- Takes a screenshot to `SCREENSHOT_INDEX.png`

Use `@playwright/test` with its built-in `webServer` config or a simple `npx serve` in the test setup.

**File**: `src/seeds/zero-behaviour.test.js`

### Step 2: Create Playwright config seed

Create `src/seeds/zero-playwright.config.js` — minimal Playwright config:
- `testDir`: `tests/behaviour/`
- `webServer`: serves `docs/` on a local port
- `use.screenshot`: `on` or manual in test
- Single browser (chromium) for speed

**File**: `src/seeds/zero-playwright.config.js`

### Step 3: Update `zero-package.json`

Add to `zero-package.json`:
- `devDependencies`: `@playwright/test: "^1.58.0"`
- `scripts.test:behaviour`: `npx playwright test --config playwright.config.js`
- Keep `scripts.test` as vitest-only (unit tests)

**File**: `src/seeds/zero-package.json`

### Step 4: Add seed map entries in `bin/agentic-lib.js`

Add to `SEED_MAP`:
- `"zero-behaviour.test.js": "tests/behaviour/homepage.test.js"`
- `"zero-playwright.config.js": "playwright.config.js"`

**File**: `bin/agentic-lib.js`

### Step 5: Update `agentic-lib-test.yml` — add Playwright step

Add to the distributed test workflow:
- A step that runs `npm run build:web` (needed for `docs/` to exist)
- A step that installs Playwright browsers: `npx playwright install --with-deps chromium`
- A step that runs `npm run test:behaviour`
- On main branch: a step that commits and pushes `SCREENSHOT_INDEX.png` to project root

The Playwright container approach: use `container: mcr.microsoft.com/playwright:v1.58.2-noble` on the job so browsers are pre-installed and no `playwright install` step is needed.

**File**: `.github/workflows/agentic-lib-test.yml`

### Step 6: Update `test.yml` — add behaviour tests to seeded workspace test

Add a new job `test-seeded-behaviour` that:
- Seeds a workspace via `init --purge`
- Installs deps
- Runs `npm test` (unit tests — validates they pass in the Playwright container too)
- Runs `npm run build:web`
- Runs `npm run test:behaviour` (Playwright behaviour tests)
- Uses `container: mcr.microsoft.com/playwright:v1.58.2-noble`

This job runs both unit AND behaviour tests, confirming the full seeded workspace works in the Playwright container.

**File**: `.github/workflows/test.yml`

### Step 7: Update agentic-lib unit tests

Add tests for the new seed files:
- Verify `zero-behaviour.test.js` exists and contains Playwright imports
- Verify `zero-playwright.config.js` exists
- Verify `zero-package.json` includes `test:behaviour` script and `@playwright/test` dependency

**File**: Update existing seed tests or add to `tests/seeds/seeds.test.js`

## Playwright Container

The official Playwright Docker image follows the format:
```
mcr.microsoft.com/playwright:v<version>-noble
```

For Playwright 1.58.2: `mcr.microsoft.com/playwright:v1.58.2-noble`

This container includes:
- Node.js
- All browser binaries (Chromium, Firefox, WebKit)
- System dependencies (fonts, libs)

Using this container means no `npx playwright install` step is needed.

## Screenshot Push Strategy

In `agentic-lib-test.yml`, on main branch only:
1. Run behaviour tests (which produce `SCREENSHOT_INDEX.png`)
2. Copy screenshot to project root
3. Commit and push with `[skip ci]` to avoid recursive triggers
4. Use the same retry-with-rebase pattern from the init/schedule workflows

This gives a visual record of the website state after each main push.

## Files Summary

| File | Action | Step |
|------|--------|------|
| `src/seeds/zero-behaviour.test.js` | Create | 1 |
| `src/seeds/zero-playwright.config.js` | Create | 2 |
| `src/seeds/zero-package.json` | Edit | 3 |
| `bin/agentic-lib.js` | Edit | 4 |
| `.github/workflows/agentic-lib-test.yml` | Edit | 5 |
| `.github/workflows/test.yml` | Edit | 6 |
| `tests/seeds/seeds.test.js` | Edit | 7 |

## Testing

- `npm test` passes in agentic-lib (existing 420+ tests + new seed tests)
- `npm run lint:workflows` passes (workflow YAML valid)
- Init a workspace with `--purge`, run `npm install`, verify:
  - `npm test` passes (unit + web tests via vitest)
  - `npm run test:behaviour` passes (Playwright homepage test)
  - `SCREENSHOT_INDEX.png` screenshot is created
- Push to agentic-lib, verify `test.yml` `test-seeded-behaviour` job passes
- Release, run `init --purge` on repository0, verify `agentic-lib-test.yml` runs behaviour tests
