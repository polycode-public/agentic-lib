#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
// test-transform-local.js — Local CLI test for the transform task
//
// Runs the transform flow locally: reads MISSION.md, features, source files,
// constructs the prompt, and sends it to the Copilot SDK.
//
// Usage:
//   node scripts/test-transform-local.js [repo-path] [model]
//   node scripts/test-transform-local.js ../repository0
//   node scripts/test-transform-local.js ../repository0 claude-sonnet-4
//
// Auth: Uses local gh auth (OAuth token). Requires gh CLI to be logged in.
// NOTE: Does NOT write files — this is a dry-run to verify the SDK works.

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Find the SDK
const sdkLocations = [
  resolve(root, "src/actions/agentic-step/node_modules/@github/copilot-sdk/dist/index.js"),
  resolve(
    root,
    "../repository0/.github/agentic-lib/actions/agentic-step/node_modules/@github/copilot-sdk/dist/index.js",
  ),
];
const sdkPath = sdkLocations.find((p) => existsSync(p));
if (!sdkPath) {
  console.error("ERROR: @github/copilot-sdk not found. Run npm ci in agentic-step action dir.");
  process.exit(1);
}
const { CopilotClient, approveAll, defineTool } = await import(sdkPath);

const repoPath = resolve(process.argv[2] || "../repository0");
const model = process.argv[3] || "claude-sonnet-4";

console.log(`\n=== Transform Local Test (DRY RUN) ===`);
console.log(`Repository: ${repoPath}`);
console.log(`Model: ${model}`);
console.log();

function readOptionalFile(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function scanDirectory(dirPath, extensions, options = {}) {
  const { fileLimit = 10, contentLimit, recursive = false } = options;
  const exts = Array.isArray(extensions) ? extensions : [extensions];
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath, recursive ? { recursive: true } : undefined)
    .filter((f) => exts.some((ext) => f.endsWith(ext)))
    .slice(0, fileLimit)
    .map((f) => {
      try {
        const content = readFileSync(`${dirPath}/${f}`, "utf8");
        return { name: f, content: contentLimit ? content.substring(0, contentLimit) : content };
      } catch {
        return { name: f, content: "" };
      }
    });
}

async function main() {
  // Step 1: Read mission
  console.log("[1/4] Reading mission...");
  const mission = readOptionalFile(`${repoPath}/MISSION.md`);
  if (!mission) {
    console.error(`  No MISSION.md found at ${repoPath}/MISSION.md`);
    return 1;
  }
  console.log(`  Mission: ${mission.substring(0, 100)}...`);

  // Step 2: Read context
  console.log("[2/4] Reading features and source files...");
  const features = scanDirectory(`${repoPath}/features`, ".md");
  const sourceFiles = scanDirectory(`${repoPath}/src/lib`, [".js", ".ts"], {
    contentLimit: 2000,
    recursive: true,
  });
  console.log(`  Features: ${features.length}`);
  console.log(`  Source files: ${sourceFiles.length}`);

  // Step 3: Build prompt
  console.log("[3/4] Building prompt...");
  const prompt = [
    "## Instructions",
    "Transform the repository toward its mission by identifying the next best action.",
    "",
    "## Mission",
    mission,
    "",
    `## Current Features (${features.length})`,
    ...features.map((f) => `### ${f.name}\n${f.content.substring(0, 500)}`),
    "",
    `## Current Source Files (${sourceFiles.length})`,
    ...sourceFiles.map((f) => `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``),
    "",
    "## Your Task",
    "Analyze the mission, features, and source code.",
    "Determine the single most impactful next step to transform this repository.",
    "Describe what you would do (but do NOT make any file changes in this dry-run).",
    "",
    "## Constraints",
    "- This is a DRY RUN — describe what you would do but do not call write_file",
    "- Keep your response under 500 words",
  ].join("\n");
  console.log(`  Prompt length: ${prompt.length} chars`);

  // Step 4: Run Copilot session
  console.log("[4/4] Running Copilot SDK session...");
  const client = new CopilotClient(); // Uses local gh auth

  try {
    // Read-only tool (no write tool in dry-run mode)
    const readFile = defineTool("read_file", {
      description: "Read a file's contents",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "File path to read" } },
        required: ["path"],
      },
      handler: ({ path }) => {
        const resolved = resolve(repoPath, path);
        console.log(`  [tool:read_file] ${resolved}`);
        try {
          return { content: readFileSync(resolved, "utf8") };
        } catch (err) {
          return { error: err.message };
        }
      },
    });

    const session = await client.createSession({
      model,
      systemMessage: {
        content:
          "You are an autonomous code transformation agent. This is a DRY RUN — describe what you would do but do not make changes. Keep your response under 500 words.",
      },
      tools: [readFile],
      onPermissionRequest: approveAll,
      workingDirectory: repoPath,
    });
    console.log(`  Session: ${session.sessionId}`);

    session.on((event) => {
      const type = event?.type || "unknown";
      if (type === "assistant.message") {
        console.log(`  [event] ${type}: ${event?.data?.content?.substring(0, 80) || ""}...`);
      } else if (type === "session.idle") {
        console.log(`  [event] ${type}`);
      } else if (type === "session.error") {
        console.error(`  [event] ${type}: ${JSON.stringify(event?.data || event)}`);
      }
    });

    const startTime = Date.now();
    const response = await session.sendAndWait({ prompt }, 120000);
    const elapsed = Date.now() - startTime;

    const content = response?.data?.content || "(no content)";
    const tokens = response?.data?.usage?.totalTokens || 0;

    console.log(`\n  Response received in ${elapsed}ms (${tokens} tokens):`);
    console.log("  ---");
    console.log(`  ${content.substring(0, 1000)}`);
    console.log("  ---");

    console.log("\n=== TEST PASSED ===\n");
    return 0;
  } catch (err) {
    console.error(`\n=== FAILED ===`);
    console.error(`Error: ${err.message}`);
    if (err.stack) console.error(err.stack);
    return 1;
  } finally {
    await client.stop();
  }
}

process.exit(await main());
