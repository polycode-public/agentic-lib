#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
// smoke-test-connectivity.js — Tier 2 connectivity smoke test
//
// Verifies that the GitHub API, GraphQL, and Copilot SDK are accessible.
// Requires GITHUB_TOKEN or COPILOT_GITHUB_TOKEN environment variable.
// Exit 0 on success, 1 on failure with diagnostic output.

const token = process.env.COPILOT_GITHUB_TOKEN;
if (!token) {
  console.error("ERROR: COPILOT_GITHUB_TOKEN is required for connectivity smoke test");
  process.exit(1);
}

function classifyToken(t) {
  if (t.startsWith("gho_")) return "OAuth";
  if (t.startsWith("ghp_")) return "Classic PAT";
  if (t.startsWith("ghs_")) return "Actions";
  if (t.startsWith("github_pat_")) return "Fine-grained PAT";
  return "Unknown";
}
const tokenType = classifyToken(token);

const REPO_OWNER = "xn-intenton-z2a";
const REPO_NAME = "agentic-lib";

let failures = 0;
let warnings = 0;

async function testGitHubApi() {
  console.log("--- GitHub REST API ---");
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`  OK: ${data.full_name} (${data.visibility})`);
  } catch (err) {
    console.error(`  FAIL: GitHub API: ${err.message}`);
    failures++;
  }
}

async function testGraphQL() {
  console.log("--- GitHub GraphQL API ---");
  try {
    const query = `query { repository(owner: "${REPO_OWNER}", name: "${REPO_NAME}") { discussion(number: 1775) { title } } }`;
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.errors) {
      throw new Error(data.errors.map((e) => e.message).join(", "));
    }
    console.log(`  OK: Discussion #1775 title: "${data.data.repository.discussion.title}"`);
  } catch (err) {
    console.error(`  FAIL: GraphQL: ${err.message}`);
    failures++;
  }
}

async function testCopilotSdk() {
  console.log("--- Copilot SDK ---");
  try {
    const { CopilotClient } = await import("@github/copilot-sdk");

    // Step 1: Instantiate client
    // If COPILOT_GITHUB_TOKEN is set, override subprocess env (same as copilot.js does)
    const copilotToken = process.env.COPILOT_GITHUB_TOKEN;
    const clientOptions = {};
    if (copilotToken) {
      clientOptions.env = { ...process.env, GITHUB_TOKEN: copilotToken, GH_TOKEN: copilotToken };
    }
    const client = new CopilotClient(clientOptions);
    console.log("  OK: CopilotClient instantiated");

    // Step 2: Start and check auth
    try {
      await client.start();
      console.log("  OK: Client started (CLI subprocess running)");

      const authStatus = await client.getAuthStatus();
      console.log(`  Auth: ${JSON.stringify(authStatus)}`);
      if (!authStatus.isAuthenticated) {
        console.error(`  WARN: Not authenticated — token type '${tokenType}' may not have Copilot API access`);
        console.error("  Note: Only OAuth tokens (gho_*) from gh CLI support the Copilot models API.");
        console.error("  Classic PATs with 'copilot' scope only manage seat assignments, not API access.");
        warnings++;
      }
    } catch (err) {
      console.error(`  WARN: Client start/auth: ${err.message}`);
      warnings++;
    }

    // Step 3: List models (this is where PATs fail with 400)
    try {
      const models = await client.listModels();
      console.log(`  OK: ${models.length} models available`);
      const modelNames = models.slice(0, 5).map((m) => m.name || m.id);
      console.log(`  Models: ${modelNames.join(", ")}${models.length > 5 ? "..." : ""}`);
    } catch (err) {
      console.error(`  WARN: listModels failed: ${err.message}`);
      if (err.message.includes("400")) {
        console.error("  This indicates the token cannot access the Copilot models API.");
        console.error("  In CI, you need an OAuth-compatible auth mechanism, not a PAT.");
      }
      warnings++;
    }

    await client.stop();
    console.log("  OK: Client stopped cleanly");
  } catch (err) {
    if (err.code === "ERR_MODULE_NOT_FOUND") {
      console.log("  SKIP: @github/copilot-sdk not installed (expected in dev)");
    } else {
      console.error(`  WARN: Copilot SDK: ${err.message}`);
      // Don't count as hard failure — SDK availability is Risk #12/#13
      warnings++;
    }
  }
}

async function main() {
  console.log(`Smoke test: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`Token type: ${tokenType} (${token.substring(0, 8)}...)\n`);

  await testGitHubApi();
  await testGraphQL();
  await testCopilotSdk();

  console.log();
  if (failures > 0) {
    console.log(`${failures} FAILURE(S), ${warnings} warning(s)`);
  } else if (warnings > 0) {
    console.log(`ALL PASSED (${warnings} warning(s) — Copilot SDK auth may need attention)`);
  } else {
    console.log("ALL PASSED");
  }
  process.exit(failures > 0 ? 1 : 0);
}

main();
