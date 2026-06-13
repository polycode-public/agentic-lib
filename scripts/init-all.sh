#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-only
# init-all.sh — initialise every fleet repository from the agentic-lib seeds.
# Usage: scripts/init-all.sh [--purge] repo-dir [repo-dir ...]
set -euo pipefail

PURGE=""
REPOS=()
for arg in "$@"; do
  case "$arg" in
    --purge) PURGE="--purge" ;;
    *) REPOS+=("$arg") ;;
  esac
done

if [ "${#REPOS[@]}" -eq 0 ]; then
  echo "usage: $0 [--purge] <repo-dir> [repo-dir ...]" >&2
  exit 1
fi

for repo in "${REPOS[@]}"; do
  echo "=== init ${repo} ${PURGE} ==="
  npx @polycode-public/agentic-lib init ${PURGE} --target "$repo"
done
