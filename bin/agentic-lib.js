#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
// bin/agentic-lib.js — CLI for @xn-intenton-z2a/agentic-lib
//
// Infrastructure commands:
//   npx @xn-intenton-z2a/agentic-lib init           # set up agentic infrastructure
//   npx @xn-intenton-z2a/agentic-lib init --purge    # also reset source files to seeds
//   npx @xn-intenton-z2a/agentic-lib reset           # alias for init --purge
//
// Task commands (run Copilot SDK transformations locally):
//   npx @xn-intenton-z2a/agentic-lib transform
//   npx @xn-intenton-z2a/agentic-lib maintain-features
//   npx @xn-intenton-z2a/agentic-lib maintain-library
//   npx @xn-intenton-z2a/agentic-lib fix-code

import { copyFileSync, existsSync, mkdirSync, rmSync, rmdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { applyDistTransform } from "../src/dist-transform.js";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, "..");
const srcDir = resolve(pkgRoot, "src");

const args = process.argv.slice(2);
const command = args[0];
const flags = args.slice(1);

let initChanges = 0;
const TASK_COMMANDS = ["transform", "maintain-features", "maintain-library", "fix-code", "report"];
const TASK_AGENT_MAP = {
  "transform": "agent-issue-resolution",
  "fix-code": "agent-apply-fix",
  "maintain-features": "agent-maintain-features",
  "maintain-library": "agent-maintain-library",
  "report": "agent-report",
};
const INIT_COMMANDS = ["init", "update", "reset"];
const ALL_COMMANDS = [...INIT_COMMANDS, ...TASK_COMMANDS, "version", "iterate"];

const HELP = `
@xn-intenton-z2a/agentic-lib — Agentic Coding Systems SDK

Infrastructure:
  init                 Update workflows, actions, agents, seeds, scripts
  init --reseed        Also clear features + activity log (keep source code)
  init --purge         Full reset — reseed + replace source files with seeds
  update               Alias for init
  reset                Alias for init --purge
  version              Show version

Tasks (run Copilot SDK transformations):
  transform            Transform code toward the mission
  maintain-features    Generate feature files from mission
  maintain-library     Update library docs from SOURCES.md
  fix-code             Fix failing tests
  report               Generate benchmark report for a time period

Iterator:
  iterate              Single Copilot SDK session — reads, writes, tests, iterates autonomously
  iterate --here       Discover the project and generate a MISSION.md, then iterate
  iterate --list-missions  List available built-in mission seeds

Options:
  --purge              Full reset — clear features, activity log, source code
  --reseed             Clear features + activity log (keep source code)
  --dry-run            Show what would be done without making changes
  --target <path>      Target repository (default: current directory)
  --mission <name>     Mission seed name (default: 6-kyu-understand-hamming-distance) [purge only]
  --mission-file <path>  Use a custom mission file instead of a built-in seed
  --list-missions      List available built-in mission seeds
  --here               Discover the project and generate a MISSION.md, then iterate
  --agent <name>       Use a specific agent prompt (e.g. agent-iterate, agent-discovery)
  --model <name>       Copilot SDK model (default: claude-sonnet-4)
  --timeout <ms>       Session timeout in milliseconds (default: 600000)
  --issue <N>          GitHub issue number (fetched via gh CLI for context)
  --pr <N>             GitHub PR number (fetched via gh CLI for context)
  --discussion <url>   GitHub Discussion URL (fetched via gh CLI for context)

Examples:
  npx @xn-intenton-z2a/agentic-lib init
  npx @xn-intenton-z2a/agentic-lib transform
  npx @xn-intenton-z2a/agentic-lib maintain-features --model gpt-5-mini
  npx @xn-intenton-z2a/agentic-lib reset --dry-run
  npx @xn-intenton-z2a/agentic-lib iterate --mission 7-kyu-understand-fizz-buzz
  npx @xn-intenton-z2a/agentic-lib iterate --mission-file ~/my-mission.md
  npx @xn-intenton-z2a/agentic-lib iterate --here
  npx @xn-intenton-z2a/agentic-lib iterate --list-missions
  npx @xn-intenton-z2a/agentic-lib iterate --model gpt-5-mini --timeout 300000
  npx @xn-intenton-z2a/agentic-lib iterate --agent agent-issue-resolution --issue 42
  npx @xn-intenton-z2a/agentic-lib iterate --agent agent-apply-fix --pr 123
`.trim();

if (!command || command === "--help" || command === "-h" || command === "help") {
  console.log(HELP);
  process.exit(0);
}

if (command === "version" || command === "--version" || command === "-v") {
  const pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf8"));
  console.log(pkg.version);
  process.exit(0);
}

// Parse flags
const dryRun = flags.includes("--dry-run");
const targetIdx = flags.indexOf("--target");
const targetPath = targetIdx >= 0 ? flags[targetIdx + 1] : process.cwd();
const target = resolve(targetPath);
const modelIdx = flags.indexOf("--model");
const model = modelIdx >= 0 ? flags[modelIdx + 1] : "claude-sonnet-4";
const missionIdx = flags.indexOf("--mission");
const mission = missionIdx >= 0 ? flags[missionIdx + 1] : "7-kyu-understand-fizz-buzz";
const cyclesIdx = flags.indexOf("--cycles");
const cycles = cyclesIdx >= 0 ? parseInt(flags[cyclesIdx + 1], 10) : 0;
const stepsIdx = flags.indexOf("--steps");
const stepsFlag = stepsIdx >= 0 ? flags[stepsIdx + 1] : "";
const timeoutIdx = flags.indexOf("--timeout");
const timeoutMs = timeoutIdx >= 0 ? parseInt(flags[timeoutIdx + 1], 10) : 600000;
const listMissions = flags.includes("--list-missions");
const missionFileIdx = flags.indexOf("--mission-file");
const missionFile = missionFileIdx >= 0 ? resolve(flags[missionFileIdx + 1]) : "";
const hereMode = flags.includes("--here");
const agentIdx = flags.indexOf("--agent");
const agentFlag = agentIdx >= 0 ? flags[agentIdx + 1] : "";
const issueIdx = flags.indexOf("--issue");
const issueNumber = issueIdx >= 0 ? parseInt(flags[issueIdx + 1], 10) : 0;
const prIdx = flags.indexOf("--pr");
const prNumber = prIdx >= 0 ? parseInt(flags[prIdx + 1], 10) : 0;
const discussionIdx = flags.indexOf("--discussion");
const discussionUrl = discussionIdx >= 0 ? flags[discussionIdx + 1] : "";
const periodStartIdx = flags.indexOf("--period-start");
const periodStart = periodStartIdx >= 0 ? flags[periodStartIdx + 1] : "";
const periodEndIdx = flags.indexOf("--period-end");
const periodEnd = periodEndIdx >= 0 ? flags[periodEndIdx + 1] : "";

// ─── Task Commands ───────────────────────────────────────────────────

if (command === "iterate") {
  process.exit(await runIterate());
}

if (TASK_COMMANDS.includes(command)) {
  process.exit(await runTask(command));
}

// ─── Init Commands ───────────────────────────────────────────────────

let purge = flags.includes("--purge");
let reseed = flags.includes("--reseed") || purge;
if (command === "reset") {
  purge = true;
  reseed = true;
}

if (!ALL_COMMANDS.includes(command)) {
  console.error(`Unknown command: ${command}`);
  console.error("Run with --help for usage.");
  process.exit(1);
}

runInit();

// ─── Iterator ────────────────────────────────────────────────────────

async function runIterate() {
  // --list-missions: show available seeds and exit
  if (listMissions) {
    const missionsDir = resolve(srcDir, "seeds/missions");
    const files = readdirSync(missionsDir).filter((f) => f.endsWith(".md")).sort();
    console.log("\nAvailable missions:\n");
    for (const f of files) {
      const name = f.replace(".md", "");
      const content = readFileSync(resolve(missionsDir, f), "utf8");
      const firstLine = content.split("\n").find((l) => l.trim() && !l.startsWith("#")) || "";
      console.log(`  ${name.padEnd(22)} ${firstLine.trim()}`);
    }
    console.log(`\nUsage: npx @xn-intenton-z2a/agentic-lib iterate --mission <name>`);
    console.log(`       npx @xn-intenton-z2a/agentic-lib iterate --mission-file <path>\n`);
    return 0;
  }

  const { loadAgentPrompt } = await import("../src/copilot/agents.js");

  // Resolve mission file path from config if available
  let config;
  try {
    const { loadConfig } = await import("../src/copilot/config.js");
    config = loadConfig(resolve(target, "agentic-lib.toml"));
  } catch {
    config = { tuning: {}, model: "gpt-5-mini", paths: {} };
  }

  // --here mode: run discovery agent to generate MISSION.md, then iterate
  if (hereMode) {
    // Determine mission output path: --mission-file > config paths.mission > default
    const missionOutPath = missionFile
      || (config.paths?.mission?.path ? resolve(target, config.paths.mission.path) : "")
      || resolve(target, "MISSION.md");

    const targetMission = resolve(target, "MISSION.md");
    if (existsSync(targetMission)) {
      console.log(`Using existing MISSION.md in ${target}`);
    } else {
      console.log("");
      console.log("=== Discovery Phase ===");
      console.log(`Target:  ${target}`);
      console.log(`Output:  ${missionOutPath}`);
      console.log("");

      const discoveryPrompt = loadAgentPrompt("agent-discovery");
      const { runCopilotSession } = await import("../src/copilot/copilot-session.js");
      const effectiveModel = model || config.model || "gpt-5-mini";

      const discoveryResult = await runCopilotSession({
        workspacePath: target,
        model: effectiveModel,
        tuning: config.tuning || {},
        timeoutMs,
        agentPrompt: discoveryPrompt,
        userPrompt: [
          "Explore this project directory and generate a MISSION.md file.",
          `Write the mission file to: ${missionOutPath}`,
          "",
          "Examine the project structure, source code, tests, and documentation.",
          "Then write a focused, achievable MISSION.md based on what you find.",
        ].join("\n"),
      });

      console.log("");
      console.log(`Discovery: ${discoveryResult.success ? "completed" : "finished"} (${discoveryResult.toolCalls} tool calls, ${discoveryResult.sessionTime}s)`);

      if (!existsSync(missionOutPath)) {
        console.error("Discovery did not produce a mission file. Cannot proceed.");
        return 1;
      }
      console.log("");

      // --here + --mission-file: stop after generating the mission file
      if (missionFile) {
        console.log(`Mission file written to: ${missionOutPath}`);
        return 0;
      }

      // Copy to MISSION.md in target if discovery wrote elsewhere
      if (missionOutPath !== targetMission && !existsSync(targetMission)) {
        copyFileSync(missionOutPath, targetMission);
      }
    }

    // Fall through to normal iterate with the generated mission
  }

  // Guard: require a mission source or existing MISSION.md in the target
  if (!hereMode && !missionFile && missionIdx < 0) {
    const targetMission = resolve(target, "MISSION.md");
    if (!existsSync(targetMission)) {
      console.error("No mission specified and no MISSION.md found in target directory.");
      console.error("");
      console.error("Usage:");
      console.error("  iterate --mission <name>          Use a built-in mission seed");
      console.error("  iterate --mission-file <path>     Use a custom mission file");
      console.error("  iterate --here                    Discover and generate a mission");
      console.error("  iterate --list-missions           List available built-in missions");
      console.error("");
      console.error("Or run from a directory that already has a MISSION.md.");
      return 1;
    }
    console.log(`Using existing MISSION.md in ${target}`);
  }

  // --mission-file: copy custom file as MISSION.md, run init --purge with empty mission
  if (!hereMode && missionFile) {
    if (!existsSync(missionFile)) {
      console.error(`Mission file not found: ${missionFile}`);
      return 1;
    }
    console.log(`\n=== Init with custom mission: ${missionFile} ===\n`);
    execSync(
      `node ${resolve(pkgRoot, "bin/agentic-lib.js")} init --purge --mission 8-kyu-remember-empty --target ${target}`,
      { encoding: "utf8", timeout: 60000, stdio: "inherit" },
    );
    // Overwrite MISSION.md with the custom file
    copyFileSync(missionFile, resolve(target, "MISSION.md"));
    console.log(`  COPY: ${missionFile} → MISSION.md\n`);
  } else if (!hereMode && missionIdx >= 0) {
    // --mission: use a built-in seed
    console.log(`\n=== Init with mission: ${mission} ===\n`);
    execSync(
      `node ${resolve(pkgRoot, "bin/agentic-lib.js")} init --purge --mission ${mission} --target ${target}`,
      { encoding: "utf8", timeout: 60000, stdio: "inherit" },
    );
  }

  const { runCopilotSession } = await import("../src/copilot/copilot-session.js");
  const { readOptionalFile } = await import("../src/copilot/session.js");

  // Load agent prompt: --agent flag > default agent-iterate
  const agentName = agentFlag || "agent-iterate";
  let agentPrompt;
  try {
    agentPrompt = loadAgentPrompt(agentName);
    console.log(`Agent:   ${agentName}`);
  } catch (err) {
    console.error(`Failed to load agent: ${err.message}`);
    return 1;
  }

  const effectiveModel = model || config.model || "gpt-5-mini";
  console.log("");
  console.log("=== agentic-lib iterate ===");
  console.log(`Target:  ${target}`);
  console.log(`Model:   ${effectiveModel}`);
  if (issueNumber) console.log(`Issue:   #${issueNumber}`);
  if (prNumber) console.log(`PR:      #${prNumber}`);
  if (discussionUrl) console.log(`Discussion: ${discussionUrl}`);
  console.log("");

  // Build lean prompt — the model explores via tools (read_file, list_files, run_command)
  const missionPath = resolve(target, config.paths?.mission?.path || "MISSION.md");
  const missionContent = readOptionalFile(missionPath, 2000) || "(no mission defined)";
  const userPrompt = [
    "## Mission",
    missionContent,
    "",
    "## Your Task",
    "Use list_files to explore the repository, read_file to examine source code and tests,",
    "and run_command to run the test suite. Write code to advance the mission.",
    ...(issueNumber ? [``, `Focus on issue #${issueNumber}.`] : []),
    ...(prNumber ? [``, `Focus on PR #${prNumber}.`] : []),
    ...(discussionUrl ? [``, `Discussion context: ${discussionUrl}`] : []),
  ].join("\n");

  // Derive maxToolCalls from transformation budget
  const budget = config.transformationBudget || 0;
  const effectiveMaxToolCalls = budget > 0 ? budget * 20 : undefined;

  const result = await runCopilotSession({
    workspacePath: target,
    model: effectiveModel,
    tuning: config.tuning || {},
    timeoutMs,
    agentPrompt,
    userPrompt,
    writablePaths: config.writablePaths?.length > 0 ? config.writablePaths : undefined,
    maxToolCalls: effectiveMaxToolCalls,
  });

  console.log("");
  console.log("=== Results ===");
  console.log(`Success:       ${result.success}`);
  console.log(`Tests passed:  ${result.testsPassed}`);
  console.log(`Session time:  ${result.sessionTime}s`);
  console.log(`Total time:    ${result.totalTime}s`);
  console.log(`Tool calls:    ${result.toolCalls}`);
  console.log(`Test runs:     ${result.testRuns}`);
  console.log(`Files written: ${result.filesWritten}`);
  console.log(`Tokens:        ${result.tokensIn + result.tokensOut} (in=${result.tokensIn} out=${result.tokensOut})`);
  console.log(`End reason:    ${result.endReason}`);
  if (result.narrative) console.log(`Narrative: ${result.narrative}`);
  if (result.agentMessage) console.log(`Agent: ${result.agentMessage}`);
  if (result.errors.length > 0) console.log(`Errors: ${result.errors.length}`);
  console.log("");

  return result.success ? 0 : 1;
}

// ─── Task Runner ─────────────────────────────────────────────────────

async function runTask(taskName) {
  // Task commands are now aliases for iterate --agent <agent-name>
  const agentName = TASK_AGENT_MAP[taskName];
  if (!agentName) {
    console.error(`Unknown task: ${taskName}`);
    return 1;
  }

  console.log("");
  console.log(`=== agentic-lib ${taskName} (→ iterate --agent ${agentName}) ===`);
  console.log(`Target:  ${target}`);
  console.log(`Model:   ${model}`);
  console.log(`Dry-run: ${dryRun}`);
  console.log("");

  const { loadConfig } = await import("../src/copilot/config.js");
  let config;
  try {
    config = loadConfig(resolve(target, "agentic-lib.toml"));
  } catch {
    config = { tuning: {}, model: "gpt-5-mini", paths: {}, writablePaths: [], readOnlyPaths: [] };
  }
  const effectiveModel = model || config.model || "gpt-5-mini";

  console.log(`[config] writable=${(config.writablePaths || []).join(", ")}`);
  console.log("");

  // Short-circuit guards — skip LLM invocation when unnecessary
  const { checkGuards } = await import("../src/copilot/guards.js");
  const guardResult = checkGuards(taskName, config, target);
  if (guardResult.skip) {
    console.log(`=== ${taskName} skipped (nop) ===`);
    console.log(`Reason: ${guardResult.reason}`);
    console.log("");
    return 0;
  }

  if (dryRun) {
    console.log("=== DRY RUN — task would run but not sending to Copilot ===");
    return 0;
  }

  try {
    const { loadAgentPrompt } = await import("../src/copilot/agents.js");
    const { runCopilotSession } = await import("../src/copilot/copilot-session.js");
    const { readOptionalFile } = await import("../src/copilot/session.js");

    const agentPrompt = loadAgentPrompt(agentName);

    // Build lean prompt — the model explores via tools (read_file, list_files, run_command)
    const missionPath = resolve(target, config.paths?.mission?.path || config.paths?.mission || "MISSION.md");
    const missionContent = readOptionalFile(missionPath, 2000) || "(no mission defined)";
    const userPrompt = [
      "## Mission",
      missionContent,
      "",
      "## Your Task",
      "Use list_files to explore the repository, read_file to examine source code and tests,",
      "and run_command to run the test suite. Write code to advance the mission.",
      ...(issueNumber ? [``, `Focus on issue #${issueNumber}.`] : []),
      ...(prNumber ? [``, `Focus on PR #${prNumber}.`] : []),
      ...(discussionUrl ? [``, `Discussion context: ${discussionUrl}`] : []),
    ].join("\n");

    // Derive maxToolCalls from transformation budget (budget × 20, or unlimited)
    const budget = config.transformationBudget || 0;
    const effectiveMaxToolCalls = budget > 0 ? budget * 20 : undefined;

    const result = await runCopilotSession({
      workspacePath: target,
      model: effectiveModel,
      tuning: config.tuning || {},
      timeoutMs,
      agentPrompt,
      userPrompt,
      writablePaths: config.writablePaths?.length > 0 ? config.writablePaths : undefined,
      maxToolCalls: effectiveMaxToolCalls,
    });

    // Build enriched result (10e)
    const outcome = result.success ? "transformed" : "error";
    const tokensUsed = result.tokensIn + result.tokensOut;

    console.log("");
    console.log(`=== ${taskName} completed ===`);
    console.log(`Outcome:       ${outcome}`);
    console.log(`Session time:  ${result.sessionTime}s`);
    console.log(`Tool calls:    ${result.toolCalls}`);
    console.log(`Tokens:        ${tokensUsed} (in=${result.tokensIn} out=${result.tokensOut})`);
    if (result.narrative) console.log(`Narrative: ${result.narrative}`);
    console.log("");
    return result.success ? 0 : 1;
  } catch (err) {
    console.error("");
    console.error(`=== ${taskName} FAILED ===`);
    console.error(err.message);
    if (err.stack) console.error(err.stack);
    return 1;
  }
}

// ─── Init Runner ─────────────────────────────────────────────────────

function initTransformFile(src, dst, label) {
  const content = readFileSync(src, "utf8");
  const transformed = applyDistTransform(content);
  if (dryRun) {
    console.log(`  TRANSFORM: ${label}`);
  } else {
    mkdirSync(dirname(dst), { recursive: true });
    writeFileSync(dst, transformed);
    console.log(`  TRANSFORM: ${label}`);
  }
  initChanges++;
}

function initCopyFile(src, dst, label) {
  if (dryRun) {
    console.log(`  COPY: ${label}`);
  } else {
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    console.log(`  COPY: ${label}`);
  }
  initChanges++;
}

function initCopyDirRecursive(srcPath, dstPath, label, excludes = []) {
  if (!existsSync(srcPath)) {
    console.log(`  SKIP: ${label} (not found)`);
    return;
  }
  const entries = readdirSync(srcPath, { withFileTypes: true });
  for (const entry of entries) {
    const srcFull = join(srcPath, entry.name);
    const dstFull = join(dstPath, entry.name);
    const relLabel = `${label}/${entry.name}`;
    if (excludes.some((ex) => entry.name === ex)) continue;
    if (entry.isDirectory()) {
      initCopyDirRecursive(srcFull, dstFull, relLabel, excludes);
    } else {
      initCopyFile(srcFull, dstFull, relLabel);
    }
  }
}

function removeStaleWorkflows(templateWorkflows) {
  const targetWorkflowsDir = resolve(target, ".github/workflows");
  if (!existsSync(targetWorkflowsDir)) return;
  for (const f of readdirSync(targetWorkflowsDir)) {
    if (f.startsWith("agentic-lib-") && f.endsWith(".yml") && !templateWorkflows.has(f)) {
      if (!dryRun) rmSync(resolve(targetWorkflowsDir, f));
      console.log(`  REMOVE stale: workflows/${f}`);
      initChanges++;
    }
  }
}

function initWorkflows() {
  console.log("--- Workflows ---");
  // Distributable workflows live in .github/workflows/agentic-lib-*.yml
  // and are transformed via #@dist markers during init
  const ownWorkflowsDir = resolve(pkgRoot, ".github/workflows");
  if (!existsSync(ownWorkflowsDir)) return;
  const templateWorkflows = new Set();
  for (const f of readdirSync(ownWorkflowsDir)) {
    if (f.startsWith("agentic-lib-") && f.endsWith(".yml")) {
      templateWorkflows.add(f);
      initTransformFile(resolve(ownWorkflowsDir, f), resolve(target, ".github/workflows", f), `workflows/${f}`);
    }
  }
  removeStaleWorkflows(templateWorkflows);
}

function initActions(agenticDir) {
  console.log("\n--- Actions ---");
  const actionsDir = resolve(srcDir, "actions");
  if (!existsSync(actionsDir)) return;
  for (const actionName of readdirSync(actionsDir, { withFileTypes: true })) {
    if (actionName.isDirectory()) {
      initCopyDirRecursive(
        resolve(actionsDir, actionName.name),
        resolve(agenticDir, "actions", actionName.name),
        `actions/${actionName.name}`,
        ["node_modules"],
      );
    }
  }
}

function initAgents(dstDir) {
  console.log("\n--- Agents ---");
  const agentsSrcDir = resolve(pkgRoot, ".github/agents");
  if (!existsSync(agentsSrcDir)) return;
  for (const entry of readdirSync(agentsSrcDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    initCopyFile(resolve(agentsSrcDir, entry.name), resolve(dstDir, entry.name), `agents/${entry.name}`);
  }
}

function initDirContents(srcSubdir, dstDir, label, excludeFiles = []) {
  console.log(`\n--- ${label} ---`);
  const dir = resolve(srcDir, srcSubdir);
  if (!existsSync(dir)) return;
  const excludeSet = new Set(excludeFiles);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (excludeSet.has(entry.name)) continue;
    if (entry.isDirectory()) {
      initCopyDirRecursive(resolve(dir, entry.name), resolve(dstDir, entry.name), `${srcSubdir}/${entry.name}`);
    } else {
      initCopyFile(resolve(dir, entry.name), resolve(dstDir, entry.name), `${srcSubdir}/${entry.name}`);
    }
  }
}

function initScripts(agenticDir) {
  console.log("\n--- Scripts ---");
  const scriptsDir = resolve(srcDir, "scripts");
  const DISTRIBUTED_SCRIPTS = [
    "accept-release.sh",
    "activate-schedule.sh",
    "build-web.cjs",
    "clean.sh",
    "initialise.sh",
    "md-to-html.js",
    "push-to-logs.sh",
    "schedule-utils.cjs",
    "update.sh",
  ];
  if (!existsSync(scriptsDir)) return;
  const distributedSet = new Set(DISTRIBUTED_SCRIPTS);
  for (const name of DISTRIBUTED_SCRIPTS) {
    const src = resolve(scriptsDir, name);
    if (existsSync(src)) {
      initCopyFile(src, resolve(agenticDir, "scripts", name), `scripts/${name}`);
    }
  }
  // Remove stale scripts not in the distributed set
  const targetScriptsDir = resolve(agenticDir, "scripts");
  if (existsSync(targetScriptsDir)) {
    for (const f of readdirSync(targetScriptsDir)) {
      if (!distributedSet.has(f)) {
        if (!dryRun) rmSync(resolve(targetScriptsDir, f));
        console.log(`  REMOVE stale: scripts/${f}`);
        initChanges++;
      }
    }
  }
}

function initConfig(seedsDir) {
  console.log("\n--- Config ---");
  // Config TOML lives at project root with #@dist markers — transform for distribution
  const tomlSource = resolve(pkgRoot, "agentic-lib.toml");
  const tomlTarget = resolve(target, "agentic-lib.toml");
  if (existsSync(tomlSource) && !existsSync(tomlTarget)) {
    initTransformFile(tomlSource, tomlTarget, "agentic-lib.toml (new)");
  } else if (existsSync(tomlTarget)) {
    console.log("  SKIP: agentic-lib.toml already exists");
  } else {
    console.log("  SKIP: source TOML not found");
  }

  const giSeed = resolve(seedsDir, "zero-.gitignore");
  const giTarget = resolve(target, ".gitignore");
  if (existsSync(giSeed) && !existsSync(giTarget)) {
    initCopyFile(giSeed, giTarget, ".gitignore (new)");
  } else if (existsSync(giTarget)) {
    console.log("  SKIP: .gitignore already exists");
  }
}

function removeFile(filePath, label) {
  if (existsSync(filePath)) {
    if (!dryRun) rmSync(filePath);
    console.log(`  REMOVE: ${label}`);
    initChanges++;
  }
}

function clearDirContents(dirPath, label) {
  if (!existsSync(dirPath)) return;
  for (const f of readdirSync(dirPath)) {
    if (!dryRun) rmSync(resolve(dirPath, f));
    console.log(`  REMOVE: ${label}/${f}`);
    initChanges++;
  }
}

function initReseed(initTimestamp) {
  console.log("\n--- Reseed: Clear Features + Activity Log ---");
  removeFile(resolve(target, "intentïon.md"), "intentïon.md");
  removeFile(resolve(target, "MISSION_COMPLETE.md"), "MISSION_COMPLETE.md");
  removeFile(resolve(target, "MISSION_FAILED.md"), "MISSION_FAILED.md");

  // Write init epoch header to the activity log
  const pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf8"));
  const mode = purge ? "purge" : "reseed";
  const initHeader = [
    `# intentïon activity log`,
    "",
    `**init ${mode}** at ${initTimestamp} (agentic-lib@${pkg.version})`,
    `**mission:** ${mission}`,
    "",
    "---",
    "",
  ].join("\n");
  if (!dryRun) {
    writeFileSync(resolve(target, "intentïon.md"), initHeader);
  }
  console.log("  WRITE: intentïon.md (init epoch header)");
  initChanges++;

  clearDirContents(resolve(target, "features"), "features");

  // Clear old features location if it exists
  const oldFeaturesDir = resolve(target, ".github/agentic-lib/features");
  clearDirContents(oldFeaturesDir, ".github/agentic-lib/features (old location)");
  if (existsSync(oldFeaturesDir)) {
    if (!dryRun) rmdirSync(oldFeaturesDir);
    console.log("  REMOVE: .github/agentic-lib/features/ (old location)");
  }

  clearDirContents(resolve(target, "library"), "library");
  clearDirContents(resolve(target, "examples"), "examples");

  // Remove old getting-started-guide if it exists
  const oldGuideDir = resolve(target, ".github/agentic-lib/getting-started-guide");
  if (existsSync(oldGuideDir)) {
    if (!dryRun) rmSync(oldGuideDir, { recursive: true });
    console.log("  REMOVE: .github/agentic-lib/getting-started-guide/ (obsolete)");
    initChanges++;
  }
}

function readTomlPaths() {
  let sourcePath = "src/lib/";
  let testsPath = "tests/unit/";
  let behaviourPath = "tests/behaviour/";
  let examplesPath = "examples/";
  let webPath = "src/web/";
  const tomlTarget = resolve(target, "agentic-lib.toml");
  if (existsSync(tomlTarget)) {
    try {
      const tomlContent = readFileSync(tomlTarget, "utf8");
      const sourceMatch = tomlContent.match(/^source\s*=\s*"([^"]+)"/m);
      const testsMatch = tomlContent.match(/^tests\s*=\s*"([^"]+)"/m);
      const behaviourMatch = tomlContent.match(/^behaviour\s*=\s*"([^"]+)"/m);
      const examplesMatch = tomlContent.match(/^examples\s*=\s*"([^"]+)"/m);
      const webMatch = tomlContent.match(/^web\s*=\s*"([^"]+)"/m);
      if (sourceMatch) sourcePath = sourceMatch[1];
      if (testsMatch) testsPath = testsMatch[1];
      if (behaviourMatch) behaviourPath = behaviourMatch[1];
      if (examplesMatch) examplesPath = examplesMatch[1];
      if (webMatch) webPath = webMatch[1];
    } catch (err) {
      console.log(`  WARN: Could not read TOML for paths, using defaults: ${err.message}`);
    }
  }
  return { sourcePath, testsPath, behaviourPath, examplesPath, webPath };
}

function clearAndRecreateDir(dirPath, label) {
  const fullPath = resolve(target, dirPath);
  if (existsSync(fullPath)) {
    console.log(`  CLEAR: ${label}`);
    if (!dryRun) rmSync(fullPath, { recursive: true });
    initChanges++;
  }
  if (!dryRun) mkdirSync(fullPath, { recursive: true });
}

async function initPurge(seedsDir, missionName, initTimestamp) {
  console.log("\n--- Purge: Reset Source Files to Seed State ---");

  const { sourcePath, testsPath, behaviourPath, examplesPath, webPath } = readTomlPaths();
  clearAndRecreateDir(sourcePath, sourcePath);
  clearAndRecreateDir(testsPath, testsPath);
  clearAndRecreateDir(behaviourPath, behaviourPath);
  clearAndRecreateDir(examplesPath, examplesPath);
  clearAndRecreateDir(webPath, webPath);
  clearAndRecreateDir("docs", "docs");

  // Copy seed files (including config TOML) — MISSION.md handled separately via mission seed
  const SEED_MAP = {
    "zero-main.js": "src/lib/main.js",
    "zero-main.test.js": "tests/unit/main.test.js",
    "zero-index.html": "src/web/index.html",
    "zero-lib.js": "src/web/lib.js",
    "zero-web.test.js": "tests/unit/web.test.js",
    "zero-behaviour.test.js": "tests/behaviour/homepage.test.js",
    "zero-playwright.config.js": "playwright.config.js",
    "zero-SOURCES.md": "SOURCES.md",
    "zero-package.json": "package.json",
    "zero-README.md": "README.md",
    "zero-.gitignore": ".gitignore",
    "zero-SCREENSHOT_INDEX.png": "SCREENSHOT_INDEX.png",
  };
  for (const [seedFile, targetRel] of Object.entries(SEED_MAP)) {
    const src = resolve(seedsDir, seedFile);
    if (existsSync(src)) {
      initCopyFile(src, resolve(target, targetRel), `SEED: ${seedFile} → ${targetRel}`);
    }
  }

  // Bootstrap docs/ for GitHub Pages — copy web seed so the site is available immediately
  const webSeed = resolve(seedsDir, "zero-index.html");
  if (existsSync(webSeed)) {
    const docsDir = resolve(target, "docs");
    if (!dryRun) {
      mkdirSync(docsDir, { recursive: true });
      writeFileSync(resolve(docsDir, ".nojekyll"), "");
    }
    initCopyFile(webSeed, resolve(docsDir, "index.html"), "SEED: zero-index.html → docs/index.html");
    console.log("  CREATE: docs/.nojekyll");
  }

  // W10: Preserve TOML values through purge
  const tomlTarget = resolve(target, "agentic-lib.toml");
  let preservedTomlValues = {};
  if (existsSync(tomlTarget)) {
    const existingToml = readFileSync(tomlTarget, "utf8");
    const readTomlValue = (key) => {
      const m = existingToml.match(new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=\\s*"([^"]*)"`, "m"));
      return m ? m[1] : null;
    };
    const readTomlNum = (key) => {
      const m = existingToml.match(new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=\\s*(\\d+)`, "m"));
      return m ? parseInt(m[1], 10) : null;
    };
    preservedTomlValues = {
      supervisor: readTomlValue("supervisor"),
      focus: readTomlValue("focus"),
      model: readTomlValue("model"),
      profile: readTomlValue("profile"),
      "acceptance-criteria-threshold": readTomlNum("acceptance-criteria-threshold"),
      "min-resolved-issues": readTomlNum("min-resolved-issues"),
      "mission-type": readTomlValue("mission-type"),
    };
    console.log("  PRESERVE: saved TOML values for restoration after purge");
  }

  // Force-overwrite agentic-lib.toml during purge (transformed from root)
  const tomlSource = resolve(pkgRoot, "agentic-lib.toml");
  if (existsSync(tomlSource)) {
    initTransformFile(tomlSource, resolve(target, "agentic-lib.toml"), "SEED: agentic-lib.toml (transformed)");
  }

  // Restore preserved values into the new TOML
  if (existsSync(tomlTarget) && Object.values(preservedTomlValues).some(v => v !== null)) {
    let toml = readFileSync(tomlTarget, "utf8");
    for (const [key, value] of Object.entries(preservedTomlValues)) {
      if (value === null) continue;
      const isNum = typeof value === "number";
      const regex = new RegExp(`^(\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=\\s*)${isNum ? "\\d+" : '"[^"]*"'}`, "m");
      if (regex.test(toml)) {
        toml = toml.replace(regex, `$1${isNum ? value : `"${value}"`}`);
        console.log(`  RESTORE: ${key} = ${value}`);
      }
    }
    if (!dryRun) writeFileSync(tomlTarget, toml);
  }

  // Clear agent log files (written by implementation-review and other tasks)
  try {
    const agentLogs = readdirSync(target).filter((f) => f.startsWith("agent-log-") && f.endsWith(".md"));
    for (const f of agentLogs) {
      console.log(`  DELETE: ${f} (agent log)`);
      if (!dryRun) {
        unlinkSync(resolve(target, f));
      }
      initChanges++;
    }
    if (agentLogs.length > 0) console.log(`  Cleared ${agentLogs.length} agent log file(s)`);
  } catch { /* ignore — directory may not have agent logs */ }

  // Copy mission seed file as MISSION.md (with random/generate support)
  const missionsDir = resolve(seedsDir, "missions");
  let resolvedMission = missionName;
  let missionType = missionName; // "random" or the specific seed name

  if (missionName === "random") {
    // W11: Pick a random mission from available seeds
    const available = existsSync(missionsDir)
      ? readdirSync(missionsDir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
      : [];
    if (available.length === 0) {
      console.error("\nERROR: No missions available for random selection.");
      process.exit(1);
    }
    resolvedMission = available[Math.floor(Math.random() * available.length)];
    console.log(`  RANDOM: selected mission "${resolvedMission}" from ${available.length} available`);
  }

  const selectedMissionFile = resolve(missionsDir, `${resolvedMission}.md`);
  if (existsSync(selectedMissionFile)) {
    initCopyFile(selectedMissionFile, resolve(target, "MISSION.md"), `MISSION: missions/${resolvedMission}.md → MISSION.md`);
  } else {
    const available = existsSync(missionsDir)
      ? readdirSync(missionsDir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
      : [];
    console.error(`\nERROR: Unknown mission "${resolvedMission}".`);
    if (available.length > 0) {
      console.error(`Available missions: ${available.join(", ")}`);
    }
    process.exit(1);
  }

  // W17: Generate structured acceptance criteria in TOML
  const missionTargetPath = resolve(target, "MISSION.md");
  if (existsSync(missionTargetPath)) {
    const missionContent = readFileSync(missionTargetPath, "utf8");
    const checkboxes = missionContent.match(/- \[ \] (.+)/g) || [];
    if (checkboxes.length > 0) {
      const criteriaEntries = checkboxes.map((line, i) => {
        const text = line.replace(/^- \[ \] /, "").trim();
        return `${i + 1} = { text = ${JSON.stringify(text)}, met = false }`;
      });
      const criteriaSection = [
        "",
        "[acceptance-criteria]",
        `# Auto-generated from MISSION.md on init. Updated by implementation-review.`,
        `total = ${checkboxes.length}`,
        ...criteriaEntries,
      ].join("\n");
      const tomlFile = resolve(target, "agentic-lib.toml");
      if (existsSync(tomlFile)) {
        let toml = readFileSync(tomlFile, "utf8");
        if (/^\[acceptance-criteria\]/m.test(toml)) {
          toml = toml.replace(/\n?\[acceptance-criteria\][^\[]*/, criteriaSection);
        } else {
          toml = toml.trimEnd() + "\n" + criteriaSection + "\n";
        }
        if (!dryRun) writeFileSync(tomlFile, toml);
        console.log(`  WRITE: [acceptance-criteria] section (${checkboxes.length} criteria)`);
        initChanges++;
      }
    }
  }

  // Set acceptance criteria threshold based on mission difficulty
  const difficultyMatch = resolvedMission.match(/^(\d+)-(?:kyu|dan)/);
  if (difficultyMatch) {
    const level = parseInt(difficultyMatch[1], 10);
    const isDan = resolvedMission.includes("-dan-");
    const THRESHOLD_MAP = { 8: 100, 7: 75, 6: 60, 5: 50, 4: 50, 3: 40, 2: isDan ? 30 : 35, 1: 30 };
    const threshold = THRESHOLD_MAP[level] || 50;
    const tomlFile = resolve(target, "agentic-lib.toml");
    if (existsSync(tomlFile)) {
      let toml = readFileSync(tomlFile, "utf8");
      const regex = /^(\s*acceptance-criteria-threshold\s*=\s*)\d+/m;
      if (regex.test(toml)) {
        toml = toml.replace(regex, `$1${threshold}`);
        if (!dryRun) writeFileSync(tomlFile, toml);
        console.log(`  SET: acceptance-criteria-threshold = ${threshold} (${resolvedMission})`);
      }
    }
  }

  // Write init metadata to agentic-lib.toml
  if (existsSync(tomlTarget)) {
    let toml = readFileSync(tomlTarget, "utf8");
    const pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf8"));
    const initSection = [
      "",
      "[init]",
      `timestamp = "${initTimestamp}"`,
      `mode = "purge"`,
      `mission = "${resolvedMission}"`,
      `mission-type = "${missionType}"`,
      `version = "${pkg.version}"`,
    ].join("\n");
    // Replace existing [init] section or append
    if (/^\[init\]/m.test(toml)) {
      toml = toml.replace(/\n?\[init\][^\[]*/, initSection);
    } else {
      toml = toml.trimEnd() + "\n" + initSection + "\n";
    }
    if (!dryRun) {
      writeFileSync(tomlTarget, toml);
    }
    console.log("  WRITE: [init] section in agentic-lib.toml");
    initChanges++;
  }
}

function ghExec(cmd, input) {
  const opts = { cwd: target, encoding: "utf8", timeout: 30000, stdio: ["pipe", "pipe", "pipe"] };
  if (input) opts.input = input;
  return execSync(cmd, opts);
}

function ghGraphQL(query) {
  return JSON.parse(ghExec("gh api graphql --input -", JSON.stringify({ query })));
}

function initPurgeGitHub() {
  console.log("\n--- Purge: Clean Slate (Issues, PRs, Runs, Branches, Labels, Discussions) ---");

  // Detect the GitHub repo from git remote
  let repoSlug = "";
  try {
    const remoteUrl = execSync("git remote get-url origin", {
      cwd: target,
      encoding: "utf8",
      timeout: 10000,
    }).trim();
    const match = remoteUrl.match(/github\.com[:/]([^/]+\/[^/.]+)/);
    if (match) repoSlug = match[1].replace(/\.git$/, "");
  } catch {
    console.log("  SKIP: Not a git repo or no origin remote — skipping GitHub purge");
    return;
  }
  if (!repoSlug) {
    console.log("  SKIP: Could not detect GitHub repo from remote — skipping GitHub purge");
    return;
  }

  try {
    execSync("gh --version", { encoding: "utf8", timeout: 5000, stdio: "pipe" });
  } catch {
    console.log("  SKIP: gh CLI not found — skipping GitHub purge");
    return;
  }

  const [owner, repo] = repoSlug.split("/");

  // ── A1: Close + lock ALL issues (open and closed) ──────────────────
  console.log("\n  --- Issues: close open, lock all ---");
  try {
    // Close all open issues with not_planned reason
    const openIssuesJson = ghExec(`gh api repos/${repoSlug}/issues?state=open&per_page=100`);
    const openIssues = JSON.parse(openIssuesJson || "[]").filter((i) => !i.pull_request);
    for (const issue of openIssues) {
      console.log(`  CLOSE: issue #${issue.number} — ${issue.title}`);
      if (!dryRun) {
        try {
          ghExec(
            `gh api repos/${repoSlug}/issues/${issue.number} -X PATCH -f state=closed -f state_reason=not_planned`,
          );
          ghExec(
            `gh api repos/${repoSlug}/issues/${issue.number}/comments -X POST -f body="Closed by init --purge (mission reset)"`,
          );
          initChanges++;
        } catch (err) {
          console.log(`  WARN: Failed to close issue #${issue.number}: ${err.message}`);
        }
      } else {
        initChanges++;
      }
    }
    if (openIssues.length === 0) console.log("  No open issues to close");

    // Blank + lock ALL issues (open and closed) to prevent bleed from old missions
    const allIssuesJson = ghExec(`gh api repos/${repoSlug}/issues?state=all&per_page=100`);
    const allIssues = JSON.parse(allIssuesJson || "[]").filter((i) => !i.pull_request);
    let blanked = 0;
    for (const issue of allIssues) {
      const needsBlank = issue.title !== "unused github issue";
      const needsLock = !issue.locked;
      if (!needsBlank && !needsLock) continue;
      if (needsBlank) {
        console.log(`  BLANK: issue #${issue.number} — "${issue.title}" → "unused github issue"`);
        if (!dryRun) {
          try {
            ghExec(
              `gh api repos/${repoSlug}/issues/${issue.number} -X PATCH -f title="unused github issue" -f body="unused github issue"`,
            );
            // Remove all labels
            try {
              ghExec(`gh api repos/${repoSlug}/issues/${issue.number}/labels -X DELETE`);
            } catch { /* no labels to remove */ }
            blanked++;
            initChanges++;
          } catch (err) {
            console.log(`  WARN: Failed to blank issue #${issue.number}: ${err.message}`);
          }
        } else {
          blanked++;
          initChanges++;
        }
      }
      if (needsLock) {
        console.log(`  LOCK: issue #${issue.number}`);
        if (!dryRun) {
          try {
            ghExec(
              `gh api repos/${repoSlug}/issues/${issue.number}/lock -X PUT -f lock_reason=resolved`,
            );
            initChanges++;
          } catch (err) {
            console.log(`  WARN: Failed to lock issue #${issue.number}: ${err.message}`);
          }
        } else {
          initChanges++;
        }
      }
    }
    if (blanked > 0) console.log(`  Blanked ${blanked} issue(s)`);
    if (allIssues.length === 0) console.log("  No issues to process");
  } catch (err) {
    console.log(`  WARN: Issue cleanup failed: ${err.message}`);
  }

  // ── A2: Close all open PRs + delete branches ──────────────────────
  console.log("\n  --- PRs: close all open ---");
  try {
    const prsJson = ghExec(`gh pr list --repo ${repoSlug} --state open --json number,title,headRefName --limit 100`);
    const prs = JSON.parse(prsJson || "[]");
    for (const pr of prs) {
      console.log(`  CLOSE: PR #${pr.number} — ${pr.title} (${pr.headRefName})`);
      if (!dryRun) {
        try {
          ghExec(`gh pr close ${pr.number} --repo ${repoSlug} --delete-branch`);
          initChanges++;
        } catch (err) {
          console.log(`  WARN: Failed to close PR #${pr.number}: ${err.message}`);
        }
      } else {
        initChanges++;
      }
    }
    if (prs.length === 0) console.log("  No open PRs to close");
  } catch (err) {
    console.log(`  WARN: PR cleanup failed: ${err.message}`);
  }

  // ── A3: Delete old workflow runs ──────────────────────────────────
  console.log("\n  --- Workflow runs: delete old ---");
  try {
    const runsJson = ghExec(`gh api repos/${repoSlug}/actions/runs?per_page=100`);
    const runs = JSON.parse(runsJson || '{"workflow_runs":[]}').workflow_runs || [];
    let deleted = 0;
    for (const run of runs) {
      // Skip currently running workflows (in_progress or queued)
      if (run.status === "in_progress" || run.status === "queued") {
        console.log(`  SKIP: run ${run.id} (${run.name}) — ${run.status}`);
        continue;
      }
      if (!dryRun) {
        try {
          ghExec(`gh api repos/${repoSlug}/actions/runs/${run.id} -X DELETE`);
          deleted++;
        } catch (err) {
          console.log(`  WARN: Failed to delete run ${run.id}: ${err.message}`);
        }
      } else {
        deleted++;
      }
    }
    console.log(`  ${deleted > 0 ? `DELETE: ${deleted} workflow run(s)` : "No workflow runs to delete"}`);
    initChanges += deleted;
  } catch (err) {
    console.log(`  WARN: Workflow run cleanup failed: ${err.message}`);
  }

  // ── A4: Delete stale remote branches ──────────────────────────────
  console.log("\n  --- Branches: delete stale remotes ---");
  try {
    const branchesJson = ghExec(`gh api repos/${repoSlug}/branches?per_page=100`);
    const branches = JSON.parse(branchesJson || "[]");
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: target,
      encoding: "utf8",
      timeout: 5000,
    }).trim();
    const keepBranches = new Set(["main", "master", "template", "gh-pages", currentBranch]);
    let deletedBranches = 0;
    for (const branch of branches) {
      if (keepBranches.has(branch.name)) continue;
      if (branch.protected) continue;
      console.log(`  DELETE: branch ${branch.name}`);
      if (!dryRun) {
        try {
          ghExec(`gh api repos/${repoSlug}/git/refs/heads/${branch.name} -X DELETE`);
          deletedBranches++;
        } catch (err) {
          console.log(`  WARN: Failed to delete branch ${branch.name}: ${err.message}`);
        }
      } else {
        deletedBranches++;
      }
    }
    if (deletedBranches === 0) console.log("  No stale branches to delete");
    initChanges += deletedBranches;
  } catch (err) {
    console.log(`  WARN: Branch cleanup failed: ${err.message}`);
  }

  // ── A5: Reset labels ──────────────────────────────────────────────
  console.log("\n  --- Labels: reset to pipeline defaults ---");
  const GITHUB_DEFAULT_LABELS = new Set([
    "bug",
    "documentation",
    "duplicate",
    "enhancement",
    "good first issue",
    "help wanted",
    "invalid",
    "question",
    "wontfix",
  ]);
  const PIPELINE_LABELS = [
    { name: "automated", color: "0e8a16", description: "Created by the autonomous pipeline" },
    { name: "ready", color: "0075ca", description: "Issue is ready for transformation" },
    { name: "in-progress", color: "e4e669", description: "Work in progress" },
    { name: "merged", color: "6f42c1", description: "Associated PR has been merged" },
    { name: "automerge", color: "1d76db", description: "PR should be auto-merged when checks pass" },
  ];
  try {
    const labelsJson = ghExec(`gh api repos/${repoSlug}/labels?per_page=100`);
    const labels = JSON.parse(labelsJson || "[]");
    const pipelineNames = new Set(PIPELINE_LABELS.map((l) => l.name));
    // Delete non-default, non-pipeline labels
    for (const label of labels) {
      if (GITHUB_DEFAULT_LABELS.has(label.name)) continue;
      if (pipelineNames.has(label.name)) continue;
      console.log(`  DELETE: label "${label.name}"`);
      if (!dryRun) {
        try {
          ghExec(`gh api repos/${repoSlug}/labels/${encodeURIComponent(label.name)} -X DELETE`);
          initChanges++;
        } catch (err) {
          console.log(`  WARN: Failed to delete label "${label.name}": ${err.message}`);
        }
      } else {
        initChanges++;
      }
    }
    // Ensure pipeline labels exist with correct config
    const existingNames = new Set(labels.map((l) => l.name));
    for (const pl of PIPELINE_LABELS) {
      if (existingNames.has(pl.name)) {
        // Update to ensure correct color/description
        if (!dryRun) {
          try {
            ghExec(
              `gh api repos/${repoSlug}/labels/${encodeURIComponent(pl.name)} -X PATCH -f color=${pl.color} -f description="${pl.description}"`,
            );
          } catch { /* ignore */ }
        }
        console.log(`  UPDATE: label "${pl.name}"`);
      } else {
        console.log(`  CREATE: label "${pl.name}"`);
        if (!dryRun) {
          try {
            ghExec(
              `gh api repos/${repoSlug}/labels -X POST -f name="${pl.name}" -f color=${pl.color} -f description="${pl.description}"`,
            );
            initChanges++;
          } catch (err) {
            console.log(`  WARN: Failed to create label "${pl.name}": ${err.message}`);
          }
        } else {
          initChanges++;
        }
      }
    }
  } catch (err) {
    console.log(`  WARN: Label cleanup failed: ${err.message}`);
  }

  // ── Discussions: close all open, create fresh one ─────────────────
  console.log("\n  --- Discussions: close open, create fresh ---");
  try {
    const parsed = ghGraphQL(
      `{ repository(owner:"${owner}", name:"${repo}") { discussions(first:50, states:OPEN) { nodes { id number title } } } }`,
    );
    const discussions = parsed?.data?.repository?.discussions?.nodes || [];
    if (discussions.length === 0) {
      console.log("  No open discussions to close");
    } else {
      for (const disc of discussions) {
        console.log(`  CLOSE: discussion #${disc.number} — ${disc.title}`);
        if (!dryRun) {
          try {
            ghGraphQL(`mutation { closeDiscussion(input: { discussionId: "${disc.id}" }) { discussion { number } } }`);
            initChanges++;
          } catch {
            console.log(`  SKIP: Could not close discussion #${disc.number} (may need admin permissions)`);
          }
        } else {
          initChanges++;
        }
      }
    }
  } catch {
    console.log("  SKIP: Could not list discussions (feature may not be enabled)");
  }

  // Create a new "Talk to the repository" discussion
  try {
    const repoParsed = ghGraphQL(
      `{ repository(owner:"${owner}", name:"${repo}") { id discussionCategories(first:20) { nodes { id name } } } }`,
    );
    const repoId = repoParsed?.data?.repository?.id;
    const categories = repoParsed?.data?.repository?.discussionCategories?.nodes || [];
    const generalCat = categories.find((c) => c.name === "General");
    if (!repoId || !generalCat) {
      console.log('  SKIP: Could not find repository ID or "General" discussion category');
    } else {
      console.log('  CREATE: discussion "Talk to the repository" in General category');
      if (!dryRun) {
        const createParsed = ghGraphQL(
          `mutation { createDiscussion(input: { repositoryId: "${repoId}", categoryId: "${generalCat.id}", title: "Talk to the repository", body: "This discussion is the main channel for interacting with the repository's autonomous agents.\\n\\nUse this thread to:\\n- Submit feature requests or ideas\\n- Ask questions about the project\\n- Chat with the discussions bot\\n\\n---\\n*Created by init --purge*" }) { discussion { number url } } }`,
        );
        const newDisc = createParsed?.data?.createDiscussion?.discussion;
        if (newDisc) {
          console.log(`  CREATED: discussion #${newDisc.number} — ${newDisc.url}`);
          initChanges++;
        }
      } else {
        initChanges++;
      }
    }
  } catch (err) {
    console.log(`  SKIP: Could not create discussion (${err.message})`);
  }

  // ── Create/reset agentic-lib-logs orphan branch ─────────────────────────────
  console.log("\n--- agentic-lib-logs branch (activity log + screenshot) ---");
  try {
    if (!dryRun) {
      // Delete existing agentic-lib-logs branch if present
      try {
        ghExec(`gh api repos/${repoSlug}/git/refs/heads/agentic-lib-logs -X DELETE`);
        console.log("  DELETE: existing agentic-lib-logs branch");
      } catch { /* branch may not exist */ }
      // Create orphan agentic-lib-logs branch with initial state file
      // C1: Include agentic-lib-state.toml with default state
      const stateContent = [
        "# agentic-lib-state.toml — Persistent state across workflow runs",
        "# Written to the agentic-lib-logs branch by each agentic-step invocation",
        "",
        "[counters]",
        "log-sequence = 0",
        "cumulative-transforms = 0",
        "cumulative-maintain-features = 0",
        "cumulative-maintain-library = 0",
        "cumulative-nop-cycles = 0",
        "total-tokens = 0",
        "total-duration-ms = 0",
        "",
        "[budget]",
        "transformation-budget-used = 0",
        "transformation-budget-cap = 0",
        "",
        "[status]",
        'mission-complete = false',
        'mission-failed = false',
        'mission-failed-reason = ""',
        'last-transform-at = ""',
        'last-non-nop-at = ""',
        "",
        "[schedule]",
        'current = ""',
        "auto-disabled = false",
        'auto-disabled-reason = ""',
        "",
      ].join("\n");
      const stateBlob = JSON.parse(ghExec(`gh api repos/${repoSlug}/git/blobs -X POST -f "content=${stateContent.replace(/"/g, '\\"')}" -f "encoding=utf-8"`));
      const emptyTree = JSON.parse(ghExec(`gh api repos/${repoSlug}/git/trees -X POST -f "tree[0][path]=.gitkeep" -f "tree[0][mode]=100644" -f "tree[0][type]=blob" -f "tree[0][content]=" -f "tree[1][path]=agentic-lib-state.toml" -f "tree[1][mode]=100644" -f "tree[1][type]=blob" -f "tree[1][sha]=${stateBlob.sha}"`));
      const commitData = JSON.parse(ghExec(
        `gh api repos/${repoSlug}/git/commits -X POST -f "message=init agentic-lib-logs branch" -f "tree=${emptyTree.sha}"`,
      ));
      ghExec(`gh api repos/${repoSlug}/git/refs -X POST -f "ref=refs/heads/agentic-lib-logs" -f "sha=${commitData.sha}"`);
      console.log("  CREATE: agentic-lib-logs orphan branch (with agentic-lib-state.toml)");
      initChanges++;
    } else {
      console.log("  CREATE: agentic-lib-logs orphan branch (dry run)");
      initChanges++;
    }
  } catch (err) {
    console.log(`  SKIP: Could not create agentic-lib-logs branch (${err.message})`);
  }

  // ── Enable GitHub Pages ───────────────────────────────────────────
  console.log("\n--- Enable GitHub Pages ---");
  try {
    if (!dryRun) {
      execSync(
        `gh api repos/${repoSlug}/pages -X POST -f build_type=legacy -f "source[branch]=main" -f "source[path]=/docs"`,
        { cwd: target, encoding: "utf8", timeout: 15000, stdio: ["pipe", "pipe", "pipe"] },
      );
      console.log(`  ENABLED: GitHub Pages from docs/ on main`);
      console.log(`  URL: https://${owner}.github.io/${repo}/`);
      initChanges++;
    } else {
      console.log(`  ENABLE: GitHub Pages from docs/ on main (dry run)`);
      console.log(`  URL: https://${owner}.github.io/${repo}/`);
      initChanges++;
    }
  } catch (err) {
    if (err.message?.includes("409") || err.stderr?.includes("409")) {
      console.log("  SKIP: GitHub Pages already enabled");
    } else {
      console.log(`  SKIP: Could not enable GitHub Pages (${err.message})`);
      console.log(`  Manual: Settings → Pages → Source: Deploy from branch, Branch: main, Folder: /docs`);
    }
  }
}

async function runInit() {
  if (!existsSync(target)) {
    console.error(`Target directory does not exist: ${target}`);
    process.exit(1);
  }
  if (!existsSync(srcDir)) {
    console.error(`Source directory not found: ${srcDir}`);
    process.exit(1);
  }

  const agenticDir = resolve(target, ".github/agentic-lib");
  const seedsDir = resolve(srcDir, "seeds");
  initChanges = 0;

  console.log("");
  console.log("=== @xn-intenton-z2a/agentic-lib init ===");
  console.log(`Source:  ${srcDir}`);
  console.log(`Target:  ${target}`);
  console.log(`Reseed:  ${reseed}`);
  console.log(`Purge:   ${purge}`);
  if (purge) console.log(`Mission: ${mission}`);
  console.log(`Mode:    ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("");

  // Capture existing init timestamp before any destructive operations (for idempotency).
  // The TOML [init] section is the authoritative record. If it matches the current
  // mode/mission/version, reuse its timestamp so that re-running init is a no-op.
  const pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf8"));
  let initTimestamp = null;
  const tomlPath = resolve(target, "agentic-lib.toml");
  if (existsSync(tomlPath)) {
    const tomlContent = readFileSync(tomlPath, "utf8");
    const tm = tomlContent.match(/^\[init\]\s*\ntimestamp\s*=\s*"([^"]+)"\s*\nmode\s*=\s*"([^"]+)"\s*\nmission\s*=\s*"([^"]+)"\s*\nversion\s*=\s*"([^"]+)"/m);
    const mode = purge ? "purge" : reseed ? "reseed" : null;
    if (tm && mode && tm[2] === mode && tm[3] === mission && tm[4] === pkg.version) {
      initTimestamp = tm[1];
    }
  }
  // Use a single timestamp for the entire init run (for consistency across files)
  if (!initTimestamp) initTimestamp = new Date().toISOString();

  initWorkflows();
  initActions(agenticDir);
  initDirContents("copilot", resolve(agenticDir, "copilot"), "Copilot (shared modules)");
  initAgents(resolve(target, ".github/agents"));
  // Remove stale legacy agents directory
  const legacyAgentsDir = resolve(agenticDir, "agents");
  if (existsSync(legacyAgentsDir)) {
    if (!dryRun) rmSync(legacyAgentsDir, { recursive: true });
    console.log("  REMOVE stale: .github/agentic-lib/agents/ (migrated to .github/agents/)");
    initChanges++;
  }
  initDirContents("seeds", resolve(agenticDir, "seeds"), "Seeds");
  initScripts(agenticDir);
  initConfig(seedsDir);
  if (reseed) initReseed(initTimestamp);
  if (purge) await initPurge(seedsDir, mission, initTimestamp);
  if (purge) initPurgeGitHub();

  console.log(`\n${initChanges} change(s)${dryRun ? " (dry run)" : ""}`);

  if (!dryRun && initChanges > 0) {
    console.log("\nNext steps:");
    if (purge) console.log(`  cd ${target} && npm install`);
    console.log(`  cd ${resolve(agenticDir, "actions/agentic-step")} && npm ci`);
    console.log("  npm test");
  }
}
