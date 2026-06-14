#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-only
# benchmark-all.sh — RETIRED. Use scripts/benchmark-run.sh.
#
# This fire-and-forget script dispatched on-schedule.yml `type=tend` (which is now
# DISABLED in the fleet repos — a literal 422) and never polled, decomposed, or
# iterated. The kyu benchmark is now the two-brain decompose→deliver→merge loop with
# a hands-free 30s-poll executor. See:
#   scripts/benchmark-run.sh
#   benchmarks/ITERATION_BENCHMARKS_SIMPLE.md  /  _ADVANCED.md
set -euo pipefail
echo "benchmark-all.sh is RETIRED — use scripts/benchmark-run.sh (see benchmarks/ITERATION_BENCHMARKS_*.md)." >&2
exit 2
