#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2025-2026 Polycode Limited
# scripts/system-test.sh — Full journey system test
#
# Runs the complete agentic-lib flow in a temporary workspace:
#   1. init --purge a fresh workspace
#   2. Install dependencies and run unit tests
#   3. Optionally run behaviour tests (Playwright)
#   4. Write a mission statement
#   5. Run maintain-features and transform (SDK steps)
#   6. Re-run tests to verify SDK changes pass
#   7. Clean up the temporary workspace
#
# Usage:
#   bash scripts/system-test.sh                              # full run (needs COPILOT_GITHUB_TOKEN)
#   bash scripts/system-test.sh --dry-run                    # prompt construction only, no SDK calls
#   bash scripts/system-test.sh --init-only                  # test init/purge + tests only (no SDK)
#   bash scripts/system-test.sh --init-only --behaviour      # also run Playwright behaviour tests
#   bash scripts/system-test.sh --workspace /tmp/ws           # use a specific directory (no auto-cleanup)
#
# Environment:
#   COPILOT_GITHUB_TOKEN  — required for SDK calls (not needed with --dry-run or --init-only)
#   MODEL                 — Copilot model (default: claude-sonnet-4)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI="$PKG_ROOT/bin/agentic-lib.js"
WORKSPACE=""
WORKSPACE_ARG=""
DRY_RUN=""
INIT_ONLY=""
BEHAVIOUR=""
MODEL="${MODEL:-claude-sonnet-4}"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)    DRY_RUN="--dry-run" ;;
    --init-only)  INIT_ONLY="true" ;;
    --behaviour)  BEHAVIOUR="true" ;;
    --workspace)  WORKSPACE_ARG="$2"; shift ;;
    --)           ;; # ignore -- separator (npm run passes this)
    *)            echo "Unknown arg: $1"; exit 1 ;;
  esac
  shift
done

# ── Helpers ──────────────────────────────────────────────────────────

pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; FAILURES=$((FAILURES + 1)); }
FAILURES=0

cleanup() {
  if [[ -z "$WORKSPACE_ARG" && -n "$WORKSPACE" && -d "$WORKSPACE" ]]; then
    echo ""
    echo "--- Cleanup ---"
    rm -rf "$WORKSPACE"
    echo "  Removed: $WORKSPACE"
  fi
}
trap cleanup EXIT

# ── Setup ────────────────────────────────────────────────────────────

if [[ -n "$WORKSPACE_ARG" ]]; then
  mkdir -p "$WORKSPACE_ARG"
  WORKSPACE="$(cd "$WORKSPACE_ARG" && pwd)"
else
  WORKSPACE="$(mktemp -d)"
fi

VERSION="$(node "$CLI" version)"
echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          agentic-lib system test                     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Version:   $VERSION"
echo "Package:   $PKG_ROOT"
echo "Workspace: $WORKSPACE"
echo "Model:     $MODEL"
echo "Dry-run:   ${DRY_RUN:-no}"
echo "Init-only: ${INIT_ONLY:-no}"
echo "Behaviour: ${BEHAVIOUR:-no}"
echo ""

# ── Step 1: Init with purge ─────────────────────────────────────────

echo "=== Step 1: init --purge ==="
echo ""

# Create a minimal git repo (required context for some operations)
cd "$WORKSPACE"
if [[ ! -d "$WORKSPACE/.git" ]]; then
  git init --quiet
  git config user.email "test@test.com"
  git config user.name "Test"
fi

node "$CLI" init --purge --target "$WORKSPACE"
echo ""

# Verify init output
echo "--- Verifying init ---"
[[ -f "$WORKSPACE/.github/workflows/agentic-lib-test.yml" ]] && pass "Workflows installed" || fail "Workflows missing"
[[ -d "$WORKSPACE/.github/agentic-lib/actions/agentic-step" ]] && pass "Actions installed" || fail "Actions missing"
[[ -d "$WORKSPACE/.github/agents" ]] && pass "Agents installed" || fail "Agents missing"
[[ -d "$WORKSPACE/.github/agentic-lib/seeds" ]] && pass "Seeds installed" || fail "Seeds missing"
[[ -f "$WORKSPACE/agentic-lib.toml" ]] && pass "TOML config created" || fail "TOML config missing"
[[ -f "$WORKSPACE/src/lib/main.js" ]] && pass "Seed source file created" || fail "Seed source missing"
[[ -f "$WORKSPACE/tests/unit/main.test.js" ]] && pass "Seed test file created" || fail "Seed test missing"
[[ -f "$WORKSPACE/MISSION.md" ]] && pass "Seed MISSION.md created" || fail "Seed MISSION.md missing"
echo ""

# ── Step 2: Install workspace dependencies ──────────────────────────

echo "=== Step 2: Install workspace dependencies ==="
echo ""

# Strip SDK self-dependency — seed tests don't import it,
# and the package may not be published yet during CI
node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  delete (p.dependencies || {})['@xn-intenton-z2a/agentic-lib'];
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
"

if npm install; then
  pass "Workspace dependencies installed"
else
  fail "Workspace dependency install failed"
fi
echo ""

# ── Step 3: Run unit tests ──────────────────────────────────────────

echo "=== Step 3: Unit tests (seed verification) ==="
echo ""

if npm test; then
  pass "Unit tests passed"
else
  fail "Unit tests failed"
fi
echo ""

# ── Step 4: Run behaviour tests (optional) ──────────────────────────

if [[ -n "$BEHAVIOUR" ]]; then
  echo "=== Step 4: Behaviour tests (seed verification) ==="
  echo ""

  echo "  Installing Playwright browsers..."
  npx playwright install --with-deps chromium 2>&1 | tail -5
  echo ""

  if npm run test:behaviour; then
    pass "Behaviour tests passed"
  else
    fail "Behaviour tests failed"
  fi
  echo ""
fi

# ── Early exit for init-only mode ───────────────────────────────────

if [[ -n "$INIT_ONLY" ]]; then
  echo "--- Init-only mode: skipping SDK steps ---"
  echo ""
  if [[ $FAILURES -gt 0 ]]; then
    echo "RESULT: $FAILURES failure(s)"
    exit 1
  fi
  echo "RESULT: All checks passed"
  exit 0
fi

# ── Step 5: Write a mission ─────────────────────────────────────────

echo "=== Step 5: Write mission ==="
echo ""

cat > "$WORKSPACE/MISSION.md" <<'MISSION'
# Mission: CSV to JSON Converter

Build a Node.js CLI tool that reads a CSV file from stdin and outputs JSON to stdout.

## Requirements
- Parse CSV with headers (first row is column names)
- Handle quoted fields containing commas
- Output a JSON array of objects
- Exit with code 0 on success, 1 on error
- Include a --pretty flag for formatted output
MISSION

echo "  Mission written ($(wc -c < "$WORKSPACE/MISSION.md") bytes)"
echo ""

# ── Step 6: Install agentic-step dependencies ───────────────────────

echo "=== Step 6: Install agentic-step dependencies ==="
echo ""

STEP_DIR="$WORKSPACE/.github/agentic-lib/actions/agentic-step"
if [[ -f "$STEP_DIR/package.json" ]]; then
  cd "$STEP_DIR"
  npm ci --silent
  cd "$WORKSPACE"
  pass "agentic-step dependencies installed"
else
  fail "agentic-step package.json not found"
fi
echo ""

# ── Step 7: Run maintain-features ────────────────────────────────────

echo "=== Step 7: maintain-features ==="
echo ""

mkdir -p "$WORKSPACE/features"
FEATURES_BEFORE=$(find "$WORKSPACE/features" -name "*.md" | wc -l | tr -d ' ')
echo "  Features before: $FEATURES_BEFORE"

node "$CLI" maintain-features --target "$WORKSPACE" --model "$MODEL" $DRY_RUN
echo ""

FEATURES_AFTER=$(find "$WORKSPACE/features" -name "*.md" | wc -l | tr -d ' ')
echo "  Features after: $FEATURES_AFTER"

if [[ -n "$DRY_RUN" ]]; then
  pass "maintain-features dry-run completed"
elif [[ "$FEATURES_AFTER" -gt "$FEATURES_BEFORE" ]]; then
  pass "maintain-features created $((FEATURES_AFTER - FEATURES_BEFORE)) feature(s)"
  echo "  Feature files:"
  find "$WORKSPACE/features" -name "*.md" -exec echo "    - {}" \;
else
  echo "  (no new features created — SDK may not have been available)"
fi
echo ""

# ── Step 8: Run transform ───────────────────────────────────────────

echo "=== Step 8: transform ==="
echo ""

SOURCE_BEFORE=$(wc -c < "$WORKSPACE/src/lib/main.js" | tr -d ' ')
echo "  Source size before: $SOURCE_BEFORE bytes"

node "$CLI" transform --target "$WORKSPACE" --model "$MODEL" $DRY_RUN
echo ""

SOURCE_AFTER=$(wc -c < "$WORKSPACE/src/lib/main.js" | tr -d ' ')
echo "  Source size after: $SOURCE_AFTER bytes"

if [[ -n "$DRY_RUN" ]]; then
  pass "transform dry-run completed"
elif [[ "$SOURCE_AFTER" -ne "$SOURCE_BEFORE" ]]; then
  pass "transform modified source ($SOURCE_BEFORE → $SOURCE_AFTER bytes)"
else
  echo "  (source unchanged — SDK may not have been available)"
fi
echo ""

# ── Step 9: Re-run unit tests ───────────────────────────────────────

echo "=== Step 9: Unit tests (post-transform) ==="
echo ""

if npm test; then
  pass "Unit tests passed after transform"
else
  fail "Unit tests failed after transform"
fi
echo ""

# ── Step 10: Re-run behaviour tests (optional) ─────────────────────

if [[ -n "$BEHAVIOUR" ]]; then
  echo "=== Step 10: Behaviour tests (post-transform) ==="
  echo ""

  if npm run test:behaviour; then
    pass "Behaviour tests passed after transform"
  else
    fail "Behaviour tests failed after transform"
  fi
  echo ""
fi

# ── Summary ─────────────────────────────────────────────────────────

echo "=== Summary ==="
echo ""
echo "  Workspace: $WORKSPACE"
echo "  Files:"
find "$WORKSPACE" -type f \
  ! -path "*/node_modules/*" \
  ! -path "*/.git/*" \
  | sort \
  | head -30 \
  | sed 's|'"$WORKSPACE"'/|    |'
echo ""

if [[ $FAILURES -gt 0 ]]; then
  echo "RESULT: $FAILURES failure(s)"
  exit 1
fi
echo "RESULT: All checks passed"
