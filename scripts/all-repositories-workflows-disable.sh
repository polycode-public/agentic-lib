#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-only
# Copyright (C) 2025-2026 Polycode Limited
# scripts/all-repositories-workflows-disable.sh — Disable all agentic-lib-* workflows in the 5 repos.
#

REPOS="repository0 repository0-string-utils repository0-dense-encoder repository0-random repository0-plot-code-lib"

for REPO in $REPOS; do
  echo "=== $REPO ==="
  date
  WORKFLOWS=$(gh api "repos/xn-intenton-z2a/$REPO/actions/workflows" \
    --jq '.workflows[] | select(.name | startswith("agentic-lib-")) | "\(.id) \(.name) \(.state)"')
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    WF_ID=$(echo "$line" | awk '{print $1}')
    WF_NAME=$(echo "$line" | awk '{print $2}')
    WF_STATE=$(echo "$line" | awk '{print $3}')
    if [ "$WF_STATE" = "disabled_manually" ]; then
      echo "  $WF_NAME — already disabled"
    else
      echo "  $WF_NAME — disabling..."
      time gh api "repos/xn-intenton-z2a/$REPO/actions/workflows/$WF_ID/disable" -X PUT
    fi
  done <<< "$WORKFLOWS"
  echo ""
done
