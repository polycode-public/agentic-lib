#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2025-2026 Polycode Limited
# scripts/all-repositories-flow.sh — Run the full flow pipeline for all agentic-lib repos.
# Dispatches agentic-lib-flow which runs: update → init → (test + bot + N×workflow) × rounds → verify → report.
#
# agentic-lib-flow workflow_dispatch inputs:
#   mode, mission-seed, model, profile, workflow-runs, schedule,
#   dry-run, message, config-path, generate-report
#

# Common parameters
mode=purge
schedule=hourly
model=gpt-5-mini
profile=max
workflow_runs=4
skipMaintain=false
create_seed_issues=true
generate_report=false

# repository0 — fizz-buzz
date
time gh workflow run agentic-lib-flow -R xn-intenton-z2a/repository0 \
  -f mode=${mode?} -f schedule=${schedule?} -f workflow-runs=${workflow_runs?} \
  -f skipMaintain=${skipMaintain} -f create-seed-issues=${create_seed_issues?} -f generate-report=${generate_report?} \
  -f mission-seed=7-kyu-understand-fizz-buzz -f model=${model?} -f profile=${profile?}

# repository0-string-utils — string-utils
date
time gh workflow run agentic-lib-flow -R xn-intenton-z2a/repository0-string-utils \
  -f mode=${mode?} -f schedule=${schedule?} -f workflow-runs=${workflow_runs?} \
  -f skipMaintain=${skipMaintain} -f create-seed-issues=${create_seed_issues?} -f generate-report=${generate_report?} \
  -f mission-seed=5-kyu-apply-string-utils -f model=${model?} -f profile=${profile?}

# repository0-dense-encoder — dense-encoding
date
time gh workflow run agentic-lib-flow -R xn-intenton-z2a/repository0-dense-encoder \
  -f mode=${mode?} -f schedule=${schedule?} -f workflow-runs=${workflow_runs?} \
  -f skipMaintain=${skipMaintain} -f create-seed-issues=${create_seed_issues?} -f generate-report=${generate_report?} \
  -f mission-seed=4-kyu-apply-dense-encoding -f model=${model?} -f profile=${profile?}

# repository0-random — random
date
time gh workflow run agentic-lib-flow -R xn-intenton-z2a/repository0-random \
  -f mode=${mode?} -f schedule=${schedule?} -f workflow-runs=${workflow_runs?} \
  -f skipMaintain=${skipMaintain} -f create-seed-issues=${create_seed_issues?} -f generate-report=${generate_report?} \
  -f mission-seed=random -f model=${model?} -f profile=${profile?}

# repository0-plot-code-lib — plot-code-lib
date
time gh workflow run agentic-lib-flow -R xn-intenton-z2a/repository0-plot-code-lib \
  -f mode=${mode?} -f schedule=${schedule?} -f workflow-runs=${workflow_runs?} \
  -f skipMaintain=${skipMaintain} -f create-seed-issues=${create_seed_issues?} -f generate-report=${generate_report?} \
  -f mission-seed=2-kyu-create-plot-code-lib -f model=${model?} -f profile=${profile?}
