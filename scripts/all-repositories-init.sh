#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2025-2026 Polycode Limited
# scripts/all-repositories-init.sh — Initialize all agentic-lib repos with purge mode and create-seed-issues.
# Dispatches agentic-lib-init which runs: update → init → dispatch-workflow.
#
# agentic-lib-init workflow_dispatch inputs:
#   mode, dry-run, mission-seed, mission-text, schedule, model, profile,
#   create-seed-issues, run-workflow
#

# Common parameters
mode=purge
schedule=hourly
model=gpt-5-mini
profile=max
create_seed_issues=true
run_workflow=true

# repository0 — fizz-buzz
date
time gh workflow run agentic-lib-init -R xn-intenton-z2a/repository0 \
  -f mission-seed=7-kyu-understand-fizz-buzz \
  -f mode=${mode?} -f schedule=${schedule?} -f model=${model?} -f profile=${profile?} \
  -f create-seed-issues=${create_seed_issues?} -f run-workflow=${run_workflow?}

# repository0-string-utils — string-utils
date
time gh workflow run agentic-lib-init -R xn-intenton-z2a/repository0-string-utils \
  -f mission-seed=5-kyu-apply-string-utils \
  -f mode=${mode?} -f schedule=${schedule?} -f model=${model?} -f profile=${profile?} \
  -f create-seed-issues=${create_seed_issues?} -f run-workflow=${run_workflow?}

# repository0-dense-encoder — dense-encoding
date
time gh workflow run agentic-lib-init -R xn-intenton-z2a/repository0-dense-encoder \
  -f mission-seed=4-kyu-apply-dense-encoding \
  -f mode=${mode?} -f schedule=${schedule?} -f model=${model?} -f profile=${profile?} \
  -f create-seed-issues=${create_seed_issues?} -f run-workflow=${run_workflow?}

# repository0-random — random
date
time gh workflow run agentic-lib-init -R xn-intenton-z2a/repository0-random \
  -f mission-seed=random \
  -f mode=${mode?} -f schedule=${schedule?} -f model=${model?} -f profile=${profile?} \
  -f create-seed-issues=${create_seed_issues?} -f run-workflow=${run_workflow?}

# repository0-plot-code-lib — plot-code-lib
date
time gh workflow run agentic-lib-init -R xn-intenton-z2a/repository0-plot-code-lib \
  -f mission-seed=2-kyu-create-plot-code-lib \
  -f mode=${mode?} -f schedule=${schedule?} -f model=${model?} -f profile=${profile?} \
  -f create-seed-issues=${create_seed_issues?} -f run-workflow=${run_workflow?}
