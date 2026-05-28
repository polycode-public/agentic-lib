#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2025-2026 Polycode Limited
# scripts/all-repositories-update.sh — Run the update workflow for all agentic-lib repos.
# Dispatches agentic-lib-update which runs: npm update → init (update mode) → tests → commit.
#
# agentic-lib-update workflow_dispatch inputs:
#   dry-run
#

# repository0
date
time gh workflow run agentic-lib-update \
  -R xn-intenton-z2a/repository0

# repository0-string-utils
date
time gh workflow run agentic-lib-update \
  -R xn-intenton-z2a/repository0-string-utils

# repository0-dense-encoder
date
time gh workflow run agentic-lib-update \
  -R xn-intenton-z2a/repository0-dense-encoder

# repository0-random
date
time gh workflow run agentic-lib-update \
  -R xn-intenton-z2a/repository0-random

# repository0-plot-code-lib
date
time gh workflow run agentic-lib-update \
  -R xn-intenton-z2a/repository0-plot-code-lib
