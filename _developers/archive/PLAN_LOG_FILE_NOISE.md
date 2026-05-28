# Plan: Move Noisy Files Off Working Branches

**Created**: 2026-03-11
**Status**: implemented — pushed to main (agentic-lib), branch `claude/logs-branch-urls` (xn--intenton-z2a.com). Bugs fixed 2026-03-12 (see Bug Fixes section).

---

## User Assertions

1. `SCREENSHOT_INDEX.png` and `intentïon.md` are too noisy on working branches and main
2. They should live elsewhere — GitHub Actions artifacts, a detached `.logs` branch, or similar
3. `init --purge` must still be able to clean them up (wherever they are)

---

## Problem

Both files are committed to the working tree on main:

- **`intentïon.md`** — activity log appended by every agentic-step run. Grows continuously. Log rotation keeps 30 entries but still generates frequent commits. `commit-if-changed` already unstages it on non-main branches, but on main it still creates `[skip ci]` commits.
- **`SCREENSHOT_INDEX.png`** — Playwright screenshot updated on every behaviour test run. Binary file causes merge conflicts. The test workflow has a 3-attempt rebase/push strategy specifically for this.

Both create noise: frequent commits on main, merge conflicts on branches, binary diffs in PRs.

---

## Current Write Points

| File | Written by | Committed by | Read by |
|------|-----------|-------------|---------|
| `intentïon.md` | `agentic-step/logging.js:logActivity()` | `commit-if-changed` (main only, unstaged on branches) | `agentic-lib-workflow.yml` supervisor (telemetry), `index.js` (cost sums) |
| `SCREENSHOT_INDEX.png` | `zero-behaviour.test.js` (Playwright) | `agentic-lib-test.yml` (conditional push on main) | GitHub Pages (if served), user review |

## External Consumer: xn--intenton-z2a.com Website

**CRITICAL CONSTRAINT**: The website at `xn--intenton-z2a.com` fetches both files via `raw.githubusercontent.com`:

```js
// intentïon.md — fetched from main, polled every 60 seconds for terminal display
const intentionUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/intentïon.md`;

// SCREENSHOT_INDEX.png — fetched from main for screenshot showcase with lightbox
const imgUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/SCREENSHOT_INDEX.png`;
```

Source: `xn--intenton-z2a.com/public/index.html` (lines 652-653, 747-760)

`raw.githubusercontent.com` can serve files from **any branch**, not just main. The URL format is:
`https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}`

So a `.logs` branch works — the website just needs its URLs updated from `/main/` to `/.logs/`.

---

## Options

### Option A: GitHub Actions Artifacts Only

**RULED OUT** — `raw.githubusercontent.com` can't serve artifacts. The website would break.

### Option B: Detached `.logs` Branch

Store both files on an orphan branch (e.g. `.logs`) that has no common history with main.

**How it works:**
- Create orphan branch `.logs` with only `intentïon.md` and `SCREENSHOT_INDEX.png`
- `commit-if-changed` commits these files to `.logs` instead of the working branch
- The supervisor step checks out `.logs` to read `intentïon.md` before running
- `init --purge` deletes and recreates the `.logs` branch

**Pros:**
- Files persist in git but don't pollute main's history
- No merge conflicts (separate branch, no merges)
- `init --purge` can force-push a clean `.logs` branch
- History is preserved (git log on `.logs` shows the activity log over time)
- No API dependency (pure git)

**Cons:**
- Extra checkout step in workflows to read/write `.logs`
- Concurrent workflow runs could race on `.logs` pushes (needs rebase logic, same as now)
- Branch shows up in `git branch -a` (minor clutter)
- Slightly more complex CI logic

### Option C: GitHub Actions Cache

**RULED OUT** — same problem as Option A. Not accessible via `raw.githubusercontent.com`.

### Option D: Repository Wiki or Gist

Push to the repo wiki (which is a separate git repo) or a gist.

**Pros:** Completely separate from main repo

**Cons:** Wiki requires enabling, separate auth, different git remote. Gist is external. Both are awkward for automated workflows. Over-engineered.

### Option E: `.gitignore` + Artifact Upload

**RULED OUT** — same problem as Option A. Not accessible via `raw.githubusercontent.com`.

### Option F: `.logs` Branch for Both Files

Both files move to the `.logs` orphan branch. The website URLs change from `/main/` to `/.logs/`.

**Pros:**
- Files persist in git, accessible via `raw.githubusercontent.com/.logs/...`
- Website keeps working (URL change only)
- No noise on main — zero commits for log/screenshot files
- No merge conflicts (separate branch with no common history)
- `init --purge` can delete and recreate `.logs`
- History preserved on `.logs` branch

**Cons:**
- Requires URL update in `xn--intenton-z2a.com/public/index.html`
- Extra checkout step in workflows to read/write `.logs`
- Concurrent workflow runs could race on `.logs` pushes (needs rebase logic)

---

## Recommendation: Option F (`.logs` Branch for Both)

Options A, C, E are ruled out because the website fetches via `raw.githubusercontent.com` which only serves from git branches. Option D is over-engineered. Option B is the right approach — and both files should go there together since both need to be served via raw URLs.

### Both files → `.logs` orphan branch

1. Create orphan branch `.logs` during `init --purge`
2. `logActivity()` still writes to workspace `intentïon.md` (no change to logging.js)
3. After agentic-step runs, a new step checks out `.logs`, copies `intentïon.md`, commits, pushes
4. `agentic-lib-test.yml` pushes `SCREENSHOT_INDEX.png` to `.logs` instead of main
5. Supervisor telemetry step checks out `.logs` to read `intentïon.md` before building the prompt
6. `init --purge` deletes `.logs` branch and recreates it with the init header
7. `commit-if-changed` no longer needs to handle `intentïon.md` at all (remove unstage logic)
8. Add `intentïon.md`, `intention.md`, `SCREENSHOT_INDEX.png` to `.gitignore` seed
9. Update `xn--intenton-z2a.com/public/index.html` to fetch from `.logs` branch instead of `main`

---

## Work Items

| # | Item | Where (repo) | Priority |
|---|------|-------------|----------|
| W1 | Create `.logs` orphan branch management in `init --purge` | agentic-lib: `bin/agentic-lib.js` | HIGH |
| W2 | Move `intentïon.md` commit from `commit-if-changed` to `.logs` branch push | agentic-lib: `commit-if-changed/action.yml`, `agentic-lib-workflow.yml` | HIGH |
| W3 | Move `SCREENSHOT_INDEX.png` push from main to `.logs` branch | agentic-lib: `agentic-lib-test.yml` | HIGH |
| W4 | Update supervisor telemetry to read `intentïon.md` from `.logs` branch | agentic-lib: `agentic-lib-workflow.yml` | HIGH |
| W5 | Add `intentïon.md`, `intention.md`, `SCREENSHOT_INDEX.png` to `.gitignore` seed | agentic-lib: `src/seeds/zero-.gitignore` | MEDIUM |
| W6 | Handle concurrent `.logs` pushes (rebase/retry) | agentic-lib: shared script or action | MEDIUM |
| W7 | Update website to fetch from `.logs` branch | xn--intenton-z2a.com: `public/index.html` | MEDIUM |
| W8 | Update `logActivity()` and config-loader docs | agentic-lib: `logging.js`, `config-loader.js` | LOW |

---

## Bug Fixes (2026-03-12)

Three interconnected bugs found in the initial implementation:

### Bug 1: `commit-if-changed` — silent push failure

**Symptoms**: Director/supervisor jobs fail with `fatal: remote error: upload-pack: not our ref <SHA>`. The commit SHA captured by `get-sha` was never pushed to the remote.

**Root cause (two parts)**:
1. **Unstaged changes block rebase**: After `git add -A` + `git reset HEAD -- intentïon.md ...`, the log/screenshot files become unstaged changes. When `git pull --rebase` runs, it refuses: `error: cannot pull with rebase: You have unstaged changes.`
2. **Unreachable error exit**: The retry loop uses `continue` on rebase failure, which skips the `if [ "$attempt" -eq "$MAX_RETRIES" ]` check at the bottom of the loop. After 3 failed attempts, the loop exits normally (exit 0) without ever pushing the commit.

**Fix**: Added `git stash` after commit (before rebase) to hide unstaged changes. Replaced the unreachable `if` check with a `PUSH_SUCCESS` flag checked after the loop exits.

### Bug 2: `push-to-logs.sh` — fails in Playwright container

**Symptom**: `fatal: --local can only be used inside a git repository` in the `behaviour` job of `agentic-lib-test.yml`.

**Root cause**: The Playwright Docker container runs as a different user than `actions/checkout`. Git's `safe.directory` check rejects the workspace, making `git config --local` fail.

**Fix**: Added `git config --global --add safe.directory "$(pwd)"` before `git config --local`.

### Bug 3: `push-to-logs.sh` — branch switching leaves dirty state

**Root cause**: The script switches to `agentic-lib-logs` branch, commits, pushes, then tries to return with `git checkout -`. If there are uncommitted changes (from the unstaged log files), `git checkout` can fail or leave the repo in a bad state. Also removed `git checkout "origin/${BRANCH}" -- .` which polluted the working tree with files from the logs branch before switching.

**Fix**: Added `git stash --include-untracked` before branch switching and `git stash pop` after returning. Captured `ORIGINAL_REF` explicitly instead of relying on `git checkout -`.
