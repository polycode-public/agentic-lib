#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2025-2026 Polycode Limited
# scripts/all-repositories-benchmarks-simple.sh — Run ITERATION_BENCHMARKS_SIMPLE.md scenarios.
# Dispatches agentic-lib-flow which runs: update → init → (test + bot + N×workflow) × rounds → verify → report.
#
# Scenario matrix (from ITERATION_BENCHMARKS_SIMPLE.md):
#   S1: repository0-random        — 6-kyu-understand-roman-numerals   / max
#   S2: repository0-string-utils  — 5-kyu-apply-string-utils         / max
#   S3: repository0-dense-encoder — 6-kyu-understand-hamming-distance / max
#   S4: repository0-plot-code-lib — 6-kyu-understand-roman-numerals   / max
#
# agentic-lib-flow workflow_dispatch inputs:
#   mode, mission-seed, model, profile, workflow-runs, schedule,
#   dry-run, message, config-path, generate-report
#

# Common parameters
mode=purge
schedule=off
workflow_runs=4
skipMaintain=true
create_seed_issues=false
generate_report=true

# S1: repository0-random — roman-numerals / max (target: 1 run)
date
time gh workflow run agentic-lib-flow -R xn-intenton-z2a/repository0-random \
  -f mode=${mode?} -f schedule=${schedule?} -f workflow-runs=${workflow_runs?} \
  -f skipMaintain=${skipMaintain} -f create-seed-issues=${create_seed_issues?} -f generate-report=${generate_report?} \
  -f mission-seed=6-kyu-understand-roman-numerals -f model=gpt-5-mini -f profile=max

# S2: repository0-string-utils — string-utils / max (target: 3 runs)
date
time gh workflow run agentic-lib-flow -R xn-intenton-z2a/repository0-string-utils \
  -f mode=${mode?} -f schedule=${schedule?} -f workflow-runs=${workflow_runs?} \
  -f skipMaintain=${skipMaintain} -f create-seed-issues=${create_seed_issues?} -f generate-report=${generate_report?} \
  -f mission-seed=5-kyu-apply-string-utils -f model=gpt-5-mini -f profile=max

# S3: repository0-dense-encoder — hamming-distance / max (target: 1 run)
date
time gh workflow run agentic-lib-flow -R xn-intenton-z2a/repository0-dense-encoder \
  -f mode=${mode?} -f schedule=${schedule?} -f workflow-runs=${workflow_runs?} \
  -f skipMaintain=${skipMaintain} -f create-seed-issues=${create_seed_issues?} -f generate-report=${generate_report?} \
  -f mission-seed=6-kyu-understand-hamming-distance -f model=gpt-5-mini -f profile=max

# S4: repository0-plot-code-lib — roman-numerals / max (target: 1 run)
date
time gh workflow run agentic-lib-flow -R xn-intenton-z2a/repository0-plot-code-lib \
  -f mode=${mode?} -f schedule=${schedule?} -f workflow-runs=${workflow_runs?} \
  -f skipMaintain=${skipMaintain} -f create-seed-issues=${create_seed_issues?} -f generate-report=${generate_report?} \
  -f mission-seed=6-kyu-understand-roman-numerals -f model=gpt-5-mini -f profile=max
