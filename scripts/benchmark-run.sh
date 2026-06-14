#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-only
# benchmark-run.sh — the hands-free kyu-benchmark executor.
#
# The DELIVERY ENGINE is fixed: Haiku 4.5 via Bedrock (the system under test).
# The ORCHESTRATOR brain (which decomposes INTENT into one-shot-sized issues and
# judges PRs) is Claude Code Opus 4.8 — i.e. the human/agent driving this script.
# This script provides the mechanical primitives; the decomposition + PR judgement
# are supplied by the orchestrator between calls. See
# benchmarks/ITERATION_BENCHMARKS_{SIMPLE,ADVANCED}.md.
#
# Operational constraints honoured here:
#   * NEVER push .github/workflows (the local gh token lacks the `workflow` scope);
#     repo reset is done CI-side via the deployed on-init.yml.
#   * NEVER change ANTHROPIC_MODEL (the engine stays Haiku — asserted by `check`).
#   * One transformation in flight at a time; poll every 30s; no throttle.
#
# Usage:
#   benchmark-run.sh check        <repo>                 # assert config (Haiku, vars)
#   benchmark-run.sh clean        <repo>                 # close open issues+PRs, del stale branches
#   benchmark-run.sh reset        <repo> [mission]       # CI-side on-init reset → returns the init PR#
#   benchmark-run.sh dispatch     <repo> [work_item]     # on-intent (work_item=issue# or INTENT.md)
#   benchmark-run.sh wait-idle    <repo> [timeout_s]     # poll 30s until no run in progress; print state
#   benchmark-run.sh pr-state     <repo> [pr#]           # latest/<pr> PR: draft, +/-, checks, mergeable
#   benchmark-run.sh issue        <repo> <title> <body>  # raise a decomposed-chunk issue; prints #
#   benchmark-run.sh merge        <repo> <pr#>           # merge a PR (squash) — delivery
#   benchmark-run.sh ledger       <file> <line...>       # append a line to the run ledger
set -uo pipefail

OWNER="${OWNER:-polycode-public}"
POLL_INTERVAL="${POLL_INTERVAL:-30}"        # seconds between polls
HAIKU="eu.anthropic.claude-haiku-4-5-20251001-v1:0"

die(){ echo "ERROR: $*" >&2; exit 1; }
R(){ echo "${OWNER}/$1"; }                  # owner/repo

cmd="${1:?subcommand required}"; shift || true

case "$cmd" in

check)  # assert the engine is the frozen Haiku config — refuse to run otherwise
  repo="${1:?repo}"; slug="$(R "$repo")"
  model="$(gh variable get ANTHROPIC_MODEL -R "$slug" 2>/dev/null || echo '')"
  bed="$(gh variable get CLAUDE_CODE_USE_BEDROCK -R "$slug" 2>/dev/null || echo '')"
  echo "  $repo: ANTHROPIC_MODEL=${model:-UNSET} CLAUDE_CODE_USE_BEDROCK=${bed:-UNSET}"
  [ "$model" = "$HAIKU" ] || die "$repo ANTHROPIC_MODEL is not the frozen Haiku profile — refusing (do NOT change the model; investigate)."
  [ "$bed" = "1" ] || die "$repo is not on the Bedrock lane."
  echo "  OK — frozen Haiku engine confirmed."
  ;;

clean)  # close leftover open issues + PRs, delete their branches, to a baseline
  repo="${1:?repo}"; slug="$(R "$repo")"
  for n in $(gh pr list -R "$slug" --state open -L 50 --json number -q '.[].number'); do
    br="$(gh pr view "$n" -R "$slug" --json headRefName -q .headRefName 2>/dev/null)"
    echo "  closing PR #$n (branch $br)"; gh pr close "$n" -R "$slug" --delete-branch 2>/dev/null \
      || gh pr close "$n" -R "$slug" 2>/dev/null || true
  done
  for n in $(gh issue list -R "$slug" --state open -L 50 --json number -q '.[].number'); do
    echo "  closing issue #$n"; gh issue close "$n" -R "$slug" 2>/dev/null || true
  done
  echo "  baseline reached."
  ;;

reset)  # reset a repo to a clean mission-seed baseline on main, WITHOUT touching
        # .github/workflows (neither the local HTTPS token nor the CI App token may
        # push workflow files; the deployed workflows are kept as-is). Clones, runs
        # the local agentic-lib CLI init --purge, pushes non-workflow files over SSH.
  repo="${1:?repo}"; mission="${2:-}"; slug="$(R "$repo")"
  ALIB="$(cd "$(dirname "$0")/.." && pwd)"
  work="$(mktemp -d)/$repo"
  echo "  cloning $slug ..."
  git clone --depth 1 "git@github.com:${slug}.git" "$work" >/dev/null 2>&1 || die "clone failed (SSH)"
  echo "  init --purge ${mission:+--mission $mission} (local CLI) ..."
  node "$ALIB/bin/agentic-lib.js" init --purge ${mission:+--mission "$mission"} --target "$work" \
    || die "init failed"
  git -C "$work" add -A -- . ':!.github/workflows' ':!.github'
  if git -C "$work" diff --cached --quiet; then
    echo "  no non-workflow changes to push (already at baseline)."
  else
    git -C "$work" -c user.email="benchmark@polycode.co.uk" -c user.name="intention-benchmark" \
      commit -q -m "benchmark reset: clean baseline${mission:+ ($mission)}"
    # Disable on-intent around the push: pushing INTENT.md otherwise auto-fires a
    # whole-intent deliver-intent run, contaminating the per-issue decomposition budget.
    gh workflow disable on-intent.yml -R "$slug" >/dev/null 2>&1 || true
    git -C "$work" push origin HEAD:main >/dev/null 2>&1 \
      || { gh workflow enable on-intent.yml -R "$slug" >/dev/null 2>&1 || true; die "push to main failed (SSH/non-workflow)"; }
    sleep 3
    gh workflow enable on-intent.yml -R "$slug" >/dev/null 2>&1 || true
    echo "  pushed clean baseline to ${slug}@main (on-intent disabled during push)."
  fi
  rm -rf "$(dirname "$work")"
  ;;

dispatch)  # one transformation: deliver-intent for a work item (issue# or INTENT.md)
  repo="${1:?repo}"; wi="${2:-INTENT.md}"; slug="$(R "$repo")"
  echo "  dispatching on-intent on $repo (work_item=$wi) ..."
  gh workflow run on-intent.yml -R "$slug" -f work_item="$wi" || die "on-intent dispatch failed"
  echo "  dispatched at $(date -u +%H:%M:%SZ)."
  ;;

wait-idle)  # poll every POLL_INTERVAL until no run is in_progress/queued; print final state
  repo="${1:?repo}"; timeout="${2:-3600}"; slug="$(R "$repo")"; waited=0
  # brief grace so a just-dispatched run registers
  sleep 8
  while :; do
    inflight="$(gh run list -R "$slug" -L 10 --json status \
      -q '[.[]|select(.status=="in_progress" or .status=="queued")]|length' 2>/dev/null || echo 0)"
    [ "${inflight:-0}" -eq 0 ] && break
    [ "$waited" -ge "$timeout" ] && { echo "  TIMEOUT after ${waited}s with $inflight in flight"; break; }
    sleep "$POLL_INTERVAL"; waited=$((waited+POLL_INTERVAL))
  done
  echo "  idle after ${waited}s. Latest runs:"
  gh run list -R "$slug" -L 3 --json workflowName,status,conclusion,createdAt \
    -q '.[]|"    \(.createdAt) \(.workflowName) \(.status)/\(.conclusion)"'
  echo "  open PRs:"
  gh pr list -R "$slug" --state open -L 10 --json number,title,isDraft,additions,deletions \
    -q '.[]|"    #\(.number) \(.title) +\(.additions)/-\(.deletions) draft=\(.isDraft)"'
  ;;

pr-state)  # report a PR's deliverability: draft, diff size, check rollup, mergeable
  repo="${1:?repo}"; slug="$(R "$repo")"; pr="${2:-}"
  [ -z "$pr" ] && pr="$(gh pr list -R "$slug" --state open -L 1 --json number -q '.[0].number' 2>/dev/null)"
  [ -z "$pr" ] && { echo "  no open PR"; exit 0; }
  gh pr view "$pr" -R "$slug" --json number,title,isDraft,additions,deletions,mergeable,statusCheckRollup \
    -q '"  PR #\(.number) \(.title)\n   draft=\(.isDraft) +\(.additions)/-\(.deletions) mergeable=\(.mergeable)\n   checks: "+([.statusCheckRollup[]?|"\(.name):\(.conclusion // .status)"]|join(", "))'
  ;;

issue)  # raise a decomposed-chunk issue; prints the new number
  repo="${1:?repo}"; title="${2:?title}"; body="${3:?body}"; slug="$(R "$repo")"
  url="$(gh issue create -R "$slug" --title "$title" --body "$body")"
  echo "$url"; echo "$url" | grep -oE '[0-9]+$'
  ;;

merge)  # deliver: squash-merge a green+acceptable PR (orchestrator's judgement)
  repo="${1:?repo}"; pr="${2:?pr#}"; slug="$(R "$repo")"
  gh pr ready "$pr" -R "$slug" 2>/dev/null || true       # un-draft so it can merge
  gh pr merge "$pr" -R "$slug" --squash --delete-branch || die "merge failed for #$pr"
  echo "  merged #$pr (delivery)."
  ;;

ledger)
  file="${1:?ledger file}"; shift; printf '%s\n' "$*" >> "$file"; echo "  + $*"
  ;;

*) die "unknown subcommand: $cmd" ;;
esac
