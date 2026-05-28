#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
// scripts/spike-hybrid-iterate.js — Phase 3 validation for hybrid session
//
// Validates that the shared copilot module loads correctly and
// that the hybrid session can be constructed (without actually calling
// the Copilot API unless COPILOT_GITHUB_TOKEN is set).
//
// Usage:
//   node scripts/spike-hybrid-iterate.js [workspace-path]
//
// With token:
//   COPILOT_GITHUB_TOKEN=... node scripts/spike-hybrid-iterate.js /tmp/my-workspace

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, "..");

async function main() {
  const workspace = process.argv[2] || process.cwd();
  console.log("=== Hybrid Session Spike ===");
  console.log(`Workspace: ${workspace}`);
  console.log("");

  // ── 1. Validate shared module imports ──
  console.log("1. Testing shared module imports...");
  const { loadConfig } = await import("../src/copilot/config.js");
  console.log("   [OK] config.js");

  const { createLogger, defaultLogger } = await import("../src/copilot/logger.js");
  console.log("   [OK] logger.js");

  const { getSDK } = await import("../src/copilot/sdk.js");
  console.log("   [OK] sdk.js");

  const {
    cleanSource, generateOutline, readOptionalFile, scanDirectory,
    formatPathsSection, buildClientOptions,
  } = await import("../src/copilot/session.js");
  console.log("   [OK] session.js");

  const { isPathWritable, createAgentTools } = await import("../src/copilot/tools.js");
  console.log("   [OK] tools.js");

  const { runCopilotSession } = await import("../src/copilot/copilot-session.js");
  console.log("   [OK] copilot-session.js");

  // ── 2. Validate agent/context imports (Phase 4: replaces task imports) ──
  console.log("\n2. Testing agent/context imports...");
  const { loadAgentPrompt } = await import("../src/copilot/agents.js");
  console.log("   [OK] agents.js");

  // context.js removed — lean prompts used everywhere now

  // ── 3. Validate config loading ──
  console.log("\n3. Testing config loading...");
  const tomlPath = resolve(workspace, "agentic-lib.toml");
  if (existsSync(tomlPath)) {
    const config = loadConfig(tomlPath);
    console.log(`   [OK] Config loaded: supervisor=${config.supervisor}, model=${config.model}`);
    console.log(`   [OK] Paths: ${Object.keys(config.paths).join(", ")}`);
    console.log(`   [OK] Tuning: profile=${config.tuning?.profileName}, budget=${config.transformationBudget}`);
  } else {
    console.log(`   [SKIP] No agentic-lib.toml at ${tomlPath}`);
  }

  // ── 4. Validate SDK discovery ──
  console.log("\n4. Testing SDK discovery...");
  try {
    const sdk = await getSDK();
    const exports = Object.keys(sdk).slice(0, 10).join(", ");
    console.log(`   [OK] SDK found: ${exports}...`);
  } catch (err) {
    console.log(`   [SKIP] SDK not installed: ${err.message.split("\n")[0]}`);
  }

  // ── 5. Validate utility functions ──
  console.log("\n5. Testing utility functions...");
  console.log(`   cleanSource: ${typeof cleanSource === "function" ? "OK" : "FAIL"}`);
  console.log(`   generateOutline: ${typeof generateOutline === "function" ? "OK" : "FAIL"}`);
  console.log(`   isPathWritable("src/lib/main.js", ["src/lib/"]): ${isPathWritable("src/lib/main.js", ["src/lib/"])}`);
  console.log(`   readOptionalFile: ${typeof readOptionalFile === "function" ? "OK" : "FAIL"}`);
  console.log(`   scanDirectory: ${typeof scanDirectory === "function" ? "OK" : "FAIL"}`);
  console.log(`   loadAgentPrompt: ${typeof loadAgentPrompt === "function" ? "OK" : "FAIL"}`);

  // ── 6. Run hybrid session (if token available) ──
  const hasToken = !!process.env.COPILOT_GITHUB_TOKEN;
  console.log(`\n6. Hybrid session test (token=${hasToken ? "yes" : "no"})...`);
  if (hasToken && existsSync(tomlPath)) {
    console.log("   Running hybrid session...");
    try {
      const config = loadConfig(tomlPath);
      const result = await runCopilotSession({
        workspacePath: workspace,
        model: config.model || "gpt-5-mini",
        tuning: config.tuning || {},
        timeoutMs: 300000,
      });
      console.log(`   [RESULT] success=${result.success}, tests=${result.testsPassed}`);
      console.log(`   [RESULT] time=${result.totalTime}s, tools=${result.toolCalls}, tests=${result.testRuns}`);
      console.log(`   [RESULT] tokens in=${result.tokensIn} out=${result.tokensOut}`);
      console.log(`   [RESULT] end=${result.endReason}`);
    } catch (err) {
      console.log(`   [ERROR] ${err.message}`);
    }
  } else {
    console.log("   [SKIP] Set COPILOT_GITHUB_TOKEN and provide workspace with agentic-lib.toml to run");
  }

  console.log("\n=== Spike complete ===");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
