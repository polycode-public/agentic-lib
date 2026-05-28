#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2025-2026 Polycode Limited
# scripts/self-init.sh — Copy src/ content into .github/agentic-lib/ for testing.
#
# This is the same operation that `npx @xn-intenton-z2a/agentic-lib init` performs
# for consumers, but done locally within the repo for self-testing.
#
# NOTE: Template workflows (src/workflows/*.yml) are NOT copied to .github/workflows/
# — that would activate their schedule triggers. Only actions, agents, and seeds are copied.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="${REPO_ROOT}/src"
AGENTIC_DIR="${REPO_ROOT}/.github/agentic-lib"

echo "=== Self-init: copying src/ → .github/agentic-lib/ ==="
echo "Source:  ${SRC_DIR}"
echo "Target:  ${AGENTIC_DIR}"
echo ""

# 1. Actions → .github/agentic-lib/actions/ (skip node_modules)
echo "--- Actions ---"
for action_dir in "${SRC_DIR}/actions"/*/; do
  action_name=$(basename "$action_dir")
  dst="${AGENTIC_DIR}/actions/${action_name}"
  mkdir -p "$dst"
  # Copy all files except node_modules
  rsync -a --exclude='node_modules' "${action_dir}" "${dst}/"
  echo "  COPY: actions/${action_name}"
done

# 2. Agents — already in .github/agents/ (no copy needed)
echo ""
echo "--- Agents ---"
echo "  OK: agents already at .github/agents/"
# Remove legacy agents directory if it exists
if [ -d "${AGENTIC_DIR}/agents" ]; then
  rm -rf "${AGENTIC_DIR}/agents"
  echo "  REMOVE stale: .github/agentic-lib/agents/ (migrated to .github/agents/)"
fi

# 3. Seeds → .github/agentic-lib/seeds/
echo ""
echo "--- Seeds ---"
mkdir -p "${AGENTIC_DIR}/seeds"
for f in "${SRC_DIR}/seeds"/*; do
  name=$(basename "$f")
  if [ -d "$f" ]; then
    cp -r "$f" "${AGENTIC_DIR}/seeds/${name}"
    echo "  COPY: seeds/${name}/ (directory)"
  else
    cp "$f" "${AGENTIC_DIR}/seeds/${name}"
    echo "  COPY: seeds/${name}"
  fi
done

# 4. Copilot shared modules → .github/agentic-lib/copilot/
echo ""
echo "--- Copilot (shared modules) ---"
if [ -d "${SRC_DIR}/copilot" ]; then
  mkdir -p "${AGENTIC_DIR}/copilot"
  rsync -a "${SRC_DIR}/copilot/" "${AGENTIC_DIR}/copilot/"
  echo "  COPY: copilot/"
else
  echo "  SKIP: src/copilot/ not found"
fi

# 5. Scripts → .github/agentic-lib/scripts/ (selected only)
echo ""
echo "--- Scripts ---"
mkdir -p "${AGENTIC_DIR}/scripts"
DISTRIBUTED_SCRIPTS="accept-release.sh activate-schedule.sh clean.sh initialise.sh md-to-html.js update.sh"
for name in $DISTRIBUTED_SCRIPTS; do
  src="${SRC_DIR}/scripts/${name}"
  if [ -f "$src" ]; then
    cp "$src" "${AGENTIC_DIR}/scripts/${name}"
    echo "  COPY: scripts/${name}"
  fi
done

# 6. Install action dependencies
echo ""
echo "--- Install action dependencies ---"
cd "${AGENTIC_DIR}/actions/agentic-step"
npm ci
echo "  DONE: agentic-step dependencies installed"

# 7. Link copilot node_modules to agentic-step's (shared packages like smol-toml)
if [ -d "${AGENTIC_DIR}/copilot" ] && [ -d "${AGENTIC_DIR}/actions/agentic-step/node_modules" ]; then
  ln -sf "${AGENTIC_DIR}/actions/agentic-step/node_modules" "${AGENTIC_DIR}/copilot/node_modules"
  echo "  LINK: copilot/node_modules → actions/agentic-step/node_modules"
fi

echo ""
echo "=== Self-init complete ==="
