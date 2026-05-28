#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
// test-copilot-local.js — Local CLI test for Copilot SDK
//
// Runs a full Copilot SDK session locally to verify auth, session creation,
// model access, and prompt/response flow. Uses local gh auth (OAuth token).
//
// Usage:
//   node scripts/test-copilot-local.js [model]
//   node scripts/test-copilot-local.js claude-sonnet-4
//   COPILOT_GITHUB_TOKEN=ghp_... node scripts/test-copilot-local.js
//
// Auth: Uses useLoggedInUser (gh CLI auth) by default.
//       Set COPILOT_GITHUB_TOKEN to test PAT-based auth.
//
// Prerequisites: npm ci in src/actions/agentic-step/ OR ../repository0/.github/agentic-lib/actions/agentic-step/

import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Find the SDK — check local action dir first, then repository0's copy
const sdkLocations = [
  resolve(root, "src/actions/agentic-step/node_modules/@github/copilot-sdk/dist/index.js"),
  resolve(
    root,
    "../repository0/.github/agentic-lib/actions/agentic-step/node_modules/@github/copilot-sdk/dist/index.js",
  ),
];
const sdkPath = sdkLocations.find((p) => existsSync(p));
if (!sdkPath) {
  console.error("ERROR: @github/copilot-sdk not found. Run npm ci in one of:");
  console.error("  src/actions/agentic-step/");
  console.error("  ../repository0/.github/agentic-lib/actions/agentic-step/");
  process.exit(1);
}
console.log(`SDK: ${sdkPath.replace(root, ".")}`);

const { CopilotClient, approveAll, defineTool } = await import(sdkPath);

const model = process.argv[2] || "claude-sonnet-4";
const token = process.env.COPILOT_GITHUB_TOKEN;
if (!token) {
  console.error("ERROR: COPILOT_GITHUB_TOKEN is required.");
  process.exit(1);
}

console.log(`\n=== Copilot SDK Local Test ===`);
console.log(`Model: ${model}`);
console.log(`Auth: COPILOT_GITHUB_TOKEN (PAT)`);
console.log();

// Build client options matching what copilot.js does
const clientOptions = {};
clientOptions.env = { ...process.env, GITHUB_TOKEN: token, GH_TOKEN: token };
console.log("[auth] Using env override with COPILOT_GITHUB_TOKEN");

const client = new CopilotClient(clientOptions);

// Simple tool for testing
const echoTool = defineTool("echo", {
  description: "Echo back a message for testing",
  parameters: {
    type: "object",
    properties: { message: { type: "string", description: "Message to echo" } },
    required: ["message"],
  },
  handler: ({ message }) => {
    console.log(`[tool:echo] ${message}`);
    return { echoed: message };
  },
});

async function runTest() {
  let step = "init";
  try {
    // Step 1: Check auth
    step = "auth-check";
    console.log("[1/5] Checking auth status...");
    try {
      const authStatus = await client.getAuthStatus();
      console.log(`  Auth: ${JSON.stringify(authStatus)}`);
    } catch (err) {
      console.log(`  Auth check before start: ${err.message}`);
    }

    // Step 2: Start client
    step = "start";
    console.log("[2/5] Starting client...");
    await client.start();
    console.log("  Client started");

    try {
      const authStatus = await client.getAuthStatus();
      console.log(`  Auth after start: ${JSON.stringify(authStatus)}`);
      if (!authStatus.isAuthenticated) {
        console.error("  WARNING: Not authenticated! Models API will fail.");
        console.error("  PATs (ghp_*) don't work — you need an OAuth token (gho_*) from gh auth.");
      }
    } catch (err) {
      console.log(`  Auth check after start: ${err.message}`);
    }

    // Step 3: List models
    step = "list-models";
    console.log("[3/5] Listing available models...");
    try {
      const models = await client.listModels();
      console.log(`  Found ${models.length} models:`);
      for (const m of models.slice(0, 10)) {
        const marker = m.name === model || m.id === model ? " <<<" : "";
        console.log(`    - ${m.name || m.id} (${m.provider || "unknown"})${marker}`);
      }
      if (models.length > 10) console.log(`    ... and ${models.length - 10} more`);
    } catch (err) {
      console.error(`  FAILED to list models: ${err.message}`);
      throw err;
    }

    // Step 4: Create session
    step = "create-session";
    console.log("[4/5] Creating session...");
    const session = await client.createSession({
      model,
      systemMessage: { content: "You are a helpful test assistant. Keep responses very short (1-2 sentences)." },
      tools: [echoTool],
      onPermissionRequest: approveAll,
      workingDirectory: process.cwd(),
    });
    console.log(`  Session created: ${session.sessionId}`);

    session.on((event) => {
      const type = event?.type || "unknown";
      if (type === "assistant.message") {
        console.log(`  [event] ${type}: ${event?.data?.content?.substring(0, 100) || "(no content)"}...`);
      } else if (type === "session.idle") {
        console.log(`  [event] ${type}`);
      } else if (type === "session.error") {
        console.error(`  [event] ${type}: ${JSON.stringify(event?.data || event)}`);
      } else {
        const data = JSON.stringify(event?.data || event).substring(0, 150);
        console.log(`  [event] ${type}: ${data}`);
      }
    });

    // Step 5: Send prompt and wait
    step = "send-prompt";
    console.log("[5/5] Sending test prompt...");
    const startTime = Date.now();
    const response = await session.sendAndWait(
      { prompt: "Say 'Hello from Copilot SDK!' and call the echo tool with 'test-message'. Keep it brief." },
      60000,
    );
    const elapsed = Date.now() - startTime;
    console.log(`  Response received in ${elapsed}ms`);

    const content = response?.data?.content || "(no content)";
    const tokens = response?.data?.usage?.totalTokens || 0;
    console.log(`  Content: ${content.substring(0, 200)}`);
    console.log(`  Tokens used: ${tokens}`);

    console.log("\n=== ALL TESTS PASSED ===\n");
    return 0;
  } catch (err) {
    console.error(`\n=== FAILED at step: ${step} ===`);
    console.error(`Error: ${err.message}`);
    if (err.stack) console.error(err.stack);
    return 1;
  } finally {
    await client.stop();
  }
}

process.exit(await runTest());
