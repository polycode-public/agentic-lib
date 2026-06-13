#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-only
# benchmark-all.sh — dispatch the kyu/INTENT benchmark across fleet repositories.
# Each repo is initialised with a mission, then on-intent is dispatched; results are
# tracked over time in benchmarks/reports/. Bedrock-metered economics — pace slowly.
# Usage: scripts/benchmark-all.sh <owner> <mission> repo [repo ...]
set -euo pipefail

OWNER="${1:?owner required}"; shift
MISSION="${1:?mission name required (see missions/index.toml)}"; shift

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <owner> <mission> <repo> [repo ...]" >&2
  exit 1
fi

for repo in "$@"; do
  echo "=== benchmark ${OWNER}/${repo} :: ${MISSION} ==="
  npx @polycode-public/agentic-lib init --purge --mission "$MISSION" --target "../$repo"
  gh workflow run on-schedule.yml -R "${OWNER}/${repo}" -f type=tend || true
done
