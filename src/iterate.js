// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
// src/iterate.js — Shared iteration loop for CLI
//
// Runs N cycles of maintain → transform → fix, tracking transformation cost
// against a budget. Stops early on consecutive test passes, no-progress, or
// budget exhaustion.

import { existsSync, readFileSync, readdirSync } from "fs";
import { resolve, join, dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const binPath = resolve(__dirname, "../bin/agentic-lib.js");

/**
 * Take a snapshot of all file contents in a directory (recursive).
 * Returns an object mapping relative paths to file content strings.
 */
export function snapshotDir(dirPath) {
  const snapshot = {};
  if (!existsSync(dirPath)) return snapshot;
  try {
    const files = readdirSync(dirPath, { recursive: true });
    for (const f of files) {
      const fp = join(dirPath, String(f));
      try {
        snapshot[String(f)] = readFileSync(fp, "utf8");
      } catch {
        // skip non-readable files
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return snapshot;
}

/**
 * Count the number of files that differ between two snapshots.
 */
export function countChanges(before, after) {
  let changes = 0;
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (before[key] !== after[key]) changes++;
  }
  return changes;
}

/**
 * Run an agentic-lib CLI command (e.g. "transform --target /tmp/ws --model gpt-5-mini").
 */
export function runCli(args, cwd, timeoutMs = 300000) {
  const cmd = `node ${binPath} ${args}`;
  try {
    const stdout = execSync(cmd, {
      cwd: cwd || resolve(__dirname, ".."),
      encoding: "utf8",
      timeout: timeoutMs,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, output: stdout };
  } catch (err) {
    return {
      success: false,
      output: `STDOUT:\n${err.stdout || ""}\nSTDERR:\n${err.stderr || ""}`,
      exitCode: err.status || 1,
    };
  }
}

/**
 * Run tests in a workspace directory.
 */
export function runTests(wsPath, timeoutMs = 120000) {
  try {
    const stdout = execSync("npm test 2>&1", {
      cwd: wsPath,
      encoding: "utf8",
      timeout: timeoutMs,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { success: true, output: stdout, exitCode: 0 };
  } catch (err) {
    return {
      success: false,
      output: `STDOUT:\n${err.stdout || ""}\nSTDERR:\n${err.stderr || ""}`,
      exitCode: err.status || 1,
    };
  }
}

/**
 * Read cumulative transformation cost from intentïon.md.
 * Each cost line: `**agentic-lib transformation cost:** N`
 */
export function readTransformationCost(targetPath) {
  const logPath = resolve(targetPath, "intentïon.md");
  if (!existsSync(logPath)) return 0;
  const content = readFileSync(logPath, "utf8");
  const matches = content.matchAll(/\*\*agentic-lib transformation cost:\*\* (\d+)/g);
  return [...matches].reduce((sum, m) => sum + parseInt(m[1], 10), 0);
}

/**
 * Read transformation budget from agentic-lib.toml.
 * Falls back to 8 (the "med" profile default).
 */
export function readBudget(targetPath) {
  const tomlPath = resolve(targetPath, "agentic-lib.toml");
  if (!existsSync(tomlPath)) return 8;
  try {
    const content = readFileSync(tomlPath, "utf8");
    const match = content.match(/transformation-budget\s*=\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 8;
  } catch {
    return 8;
  }
}

/**
 * Detect the source path from agentic-lib.toml, defaulting to "src/lib".
 */
function detectSourcePath(targetPath) {
  const tomlPath = resolve(targetPath, "agentic-lib.toml");
  if (!existsSync(tomlPath)) return "src/lib";
  try {
    const content = readFileSync(tomlPath, "utf8");
    const match = content.match(/^source\s*=\s*"([^"]+)"/m);
    return match ? match[1] : "src/lib";
  } catch {
    return "src/lib";
  }
}

/**
 * Run an iteration loop: N cycles of steps, with stop conditions and budget tracking.
 *
 * @param {Object} options
 * @param {string} options.targetPath - Workspace root directory
 * @param {string} [options.model] - Copilot SDK model name
 * @param {number} [options.maxCycles] - Max iterations (0 = use budget)
 * @param {string[]} [options.steps] - Steps per cycle
 * @param {boolean} [options.dryRun] - Skip actual Copilot calls
 * @param {Function} [options.onCycleComplete] - Callback after each cycle
 * @returns {Promise<{results: Array, totalCost: number, budget: number}>}
 */
export async function runIterationLoop({
  targetPath,
  model = "gpt-5-mini",
  maxCycles = 0,
  steps = ["maintain-features", "transform", "fix-code"],
  dryRun = false,
  onCycleComplete,
}) {
  const budget = readBudget(targetPath);
  let totalCost = readTransformationCost(targetPath);
  const remaining = Math.max(0, budget - totalCost);
  const effectiveMax = maxCycles > 0 ? Math.min(maxCycles, remaining) : remaining;

  if (effectiveMax <= 0) {
    return {
      results: [{ stopped: true, reason: `budget already exhausted (${totalCost}/${budget})` }],
      totalCost,
      budget,
    };
  }

  const sourcePath = detectSourcePath(targetPath);
  const results = [];
  let consecutivePasses = 0;
  let consecutiveNoChanges = 0;

  for (let i = 0; i < effectiveMax; i++) {
    const cycleStart = Date.now();
    const cycleSteps = [];

    // Snapshot source files before
    const srcBefore = snapshotDir(resolve(targetPath, sourcePath));

    // Run steps
    for (const step of steps) {
      if (dryRun) {
        cycleSteps.push({ step, success: true, elapsed: "0.0", output: "[dry-run]" });
        continue;
      }
      const stepStart = Date.now();
      const result = runCli(`${step} --target ${targetPath} --model ${model}`, targetPath);
      const stepElapsed = ((Date.now() - stepStart) / 1000).toFixed(1);
      cycleSteps.push({
        step,
        success: result.success,
        elapsed: stepElapsed,
        output: result.output.substring(0, 500),
      });
    }

    // Run tests
    const testResult = dryRun ? { success: true, output: "[dry-run]" } : runTests(targetPath);
    const testsPassed = testResult.success;

    // Snapshot source files after
    const srcAfter = dryRun ? srcBefore : snapshotDir(resolve(targetPath, sourcePath));
    const filesChanged = countChanges(srcBefore, srcAfter);
    const cost = filesChanged > 0 ? 1 : 0;
    totalCost += cost;

    const cycleElapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);

    const record = {
      cycle: i + 1,
      steps: cycleSteps,
      testsPassed,
      filesChanged,
      cost,
      totalCost,
      budget,
      elapsed: cycleElapsed,
      model,
    };
    results.push(record);
    if (onCycleComplete) onCycleComplete(record);

    // Stop conditions
    if (testsPassed) {
      consecutivePasses++;
      if (consecutivePasses >= 2) {
        results.push({ stopped: true, reason: "tests passed 2 consecutive cycles" });
        break;
      }
    } else {
      consecutivePasses = 0;
    }

    if (filesChanged === 0) {
      consecutiveNoChanges++;
      if (consecutiveNoChanges >= 2) {
        results.push({ stopped: true, reason: "no progress — 2 cycles with no file changes" });
        break;
      }
    } else {
      consecutiveNoChanges = 0;
    }

    if (totalCost >= budget) {
      results.push({ stopped: true, reason: `budget exhausted (${totalCost}/${budget})` });
      break;
    }
  }

  return { results, totalCost, budget };
}

/**
 * Format iteration results into a human-readable markdown string.
 */
export function formatIterationResults(results, totalCost, budget, label = "Iterate") {
  const lines = [`# ${label} Results`, `Budget: ${totalCost}/${budget}`, ""];
  for (const r of results) {
    if (r.stopped) {
      lines.push(`**Stopped:** ${r.reason}`);
      continue;
    }
    lines.push(`## Cycle ${r.cycle} (${r.model})`);
    lines.push(`- Elapsed: ${r.elapsed}s`);
    lines.push(`- Files changed: ${r.filesChanged}`);
    lines.push(`- Tests: ${r.testsPassed ? "PASS" : "FAIL"}`);
    lines.push(`- Cost: ${r.cost} (total: ${r.totalCost}/${r.budget})`);
    for (const s of r.steps) {
      lines.push(`  - ${s.step}: ${s.success ? "OK" : "FAIL"} (${s.elapsed}s)`);
    }
    lines.push("");
  }
  const completed = results.filter((r) => !r.stopped).length;
  const lastPassed = results.filter((r) => !r.stopped).slice(-1)[0]?.testsPassed;
  lines.push("## Summary");
  lines.push(`- Cycles completed: ${completed}`);
  lines.push(`- Final test status: ${lastPassed ? "PASS" : "FAIL"}`);
  lines.push(`- Total cost: ${totalCost}/${budget}`);
  return lines.join("\n");
}
