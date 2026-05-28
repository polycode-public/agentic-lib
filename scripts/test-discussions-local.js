#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
// test-discussions-local.js — Local CLI test for the discussions bot
//
// Tests the discussions bot flow by fetching a real discussion from GitHub,
// constructing the prompt (same as tasks/discussions.js), and sending it
// to the Copilot SDK.
//
// Usage:
//   node scripts/test-discussions-local.js [discussion-url]
//   node scripts/test-discussions-local.js https://github.com/xn-intenton-z2a/repository0/discussions/2401
//
// Auth: Uses local gh auth (OAuth token). Requires gh CLI to be logged in.

import { readFileSync, existsSync, readdirSync } from "fs";
import { execSync } from "child_process";
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
const { CopilotClient, approveAll } = await import(sdkPath);

const DEFAULT_DISCUSSION = "https://github.com/xn-intenton-z2a/repository0/discussions/2401";
const discussionUrl = process.argv[2] || DEFAULT_DISCUSSION;
const model = process.argv[3] || "claude-sonnet-4";

console.log(`\n=== Discussions Bot Local Test ===`);
console.log(`Discussion: ${discussionUrl}`);
console.log(`Model: ${model}`);
console.log();

// Parse discussion URL
const urlMatch = discussionUrl.match(/github\.com\/([^/]+)\/([^/]+)\/discussions\/(\d+)/);
if (!urlMatch) {
  console.error(`Cannot parse discussion URL: ${discussionUrl}`);
  process.exit(1);
}
const [, owner, repo, discussionNumber] = urlMatch;

async function fetchDiscussion() {
  console.log("[1/4] Fetching discussion via gh CLI...");
  const query = `query {
    repository(owner: "${owner}", name: "${repo}") {
      discussion(number: ${discussionNumber}) {
        title
        body
        comments(last: 10) {
          nodes {
            body
            author { login }
            createdAt
          }
        }
      }
    }
  }`;

  try {
    const result = JSON.parse(
      execSync(`gh api graphql -f query='${query.replace(/'/g, "'\\''")}'`, {
        encoding: "utf8",
        timeout: 15000,
      }),
    );

    const discussion = result.data.repository.discussion;
    console.log(`  Title: "${discussion.title}"`);
    console.log(`  Body: ${discussion.body?.substring(0, 100) || "(empty)"}...`);
    console.log(`  Comments: ${discussion.comments.nodes.length}`);

    for (const c of discussion.comments.nodes.slice(-3)) {
      console.log(`    ${c.author?.login} (${c.createdAt}): ${c.body.substring(0, 80)}...`);
    }

    return discussion;
  } catch (err) {
    console.error(`  FAILED to fetch discussion: ${err.message}`);
    throw err;
  }
}

function readOptionalFile(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function buildPrompt(discussion) {
  console.log("[2/4] Building prompt...");

  // Read context files (try repository0 paths first, fall back to agentic-lib)
  const repoRoot = `${process.cwd()}/../repository0`;
  const mission = readOptionalFile(`${repoRoot}/MISSION.md`) || readOptionalFile("MISSION.md") || "(no mission file)";
  const contributing = readOptionalFile(`${repoRoot}/CONTRIBUTING.md`);

  const featuresPath = `${repoRoot}/features/`;
  let featureNames = [];
  if (existsSync(featuresPath)) {
    featureNames = readdirSync(featuresPath)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", ""));
  }

  const prompt = [
    "## Instructions",
    "Respond to the GitHub Discussion as the repository bot.",
    "",
    "## Discussion",
    `URL: ${discussionUrl}`,
    `### ${discussion.title || "(untitled)"}`,
    discussion.body || "(no body)",
    discussion.comments.nodes.length > 0 ? `### Comments (${discussion.comments.nodes.length})` : "",
    ...discussion.comments.nodes.map((c) => `**${c.author?.login || "unknown"}** (${c.createdAt}):\n${c.body}`),
    "",
    "## Context",
    `### Mission\n${mission}`,
    contributing ? `### Contributing\n${contributing}` : "",
    `### Current Features\n${featureNames.join(", ") || "none"}`,
    "",
    "## Available Actions",
    "Respond with one of these action tags in your response:",
    "- `[ACTION:nop]` — No action needed, just respond conversationally",
    "- `[ACTION:create-feature] <name>` — Create a new feature",
    "- `[ACTION:seed-repository]` — Reset the sandbox to initial state",
    "",
    "Include exactly one action tag. The rest of your response is the discussion reply.",
  ].join("\n");

  console.log(`  Prompt length: ${prompt.length} chars`);
  return prompt;
}

async function runCopilotSession(prompt) {
  console.log("[3/4] Creating Copilot SDK session...");
  const client = new CopilotClient(); // Uses local gh auth (useLoggedInUser: true)

  try {
    const session = await client.createSession({
      model,
      systemMessage: {
        content:
          "You are a repository bot that responds to GitHub Discussions. Be helpful and concise. Include exactly one [ACTION:...] tag in your response.",
      },
      tools: [],
      onPermissionRequest: approveAll,
      workingDirectory: process.cwd(),
    });
    console.log(`  Session: ${session.sessionId}`);

    // Log events
    session.on((event) => {
      const type = event?.type || "unknown";
      if (type === "assistant.message") {
        console.log(`  [event] ${type}: ${event?.data?.content?.substring(0, 80) || ""}...`);
      } else if (type === "session.idle" || type === "session.error") {
        console.log(`  [event] ${type}`);
      }
    });

    console.log("[4/4] Sending prompt and waiting for response...");
    const startTime = Date.now();
    const response = await session.sendAndWait({ prompt }, 120000);
    const elapsed = Date.now() - startTime;

    const content = response?.data?.content || "(no content)";
    const tokens = response?.data?.usage?.totalTokens || 0;

    console.log(`\n  Response received in ${elapsed}ms (${tokens} tokens):`);
    console.log("  ---");
    console.log(`  ${content}`);
    console.log("  ---");

    // Parse action
    const actionMatch = content.match(/\[ACTION:(\S+?)\](.+)?/);
    const action = actionMatch ? actionMatch[1] : "none found";
    const actionArg = actionMatch && actionMatch[2] ? actionMatch[2].trim() : "";
    const actionSuffix = actionArg ? " (" + actionArg + ")" : "";
    console.log("\n  Action: " + action + actionSuffix);

    return { content, tokens, action, actionArg };
  } finally {
    await client.stop();
  }
}

async function main() {
  try {
    const discussion = await fetchDiscussion();
    const prompt = buildPrompt(discussion);
    await runCopilotSession(prompt);
    console.log("\n=== TEST PASSED ===\n");
    return 0;
  } catch (err) {
    console.error(`\n=== FAILED ===`);
    console.error(`Error: ${err.message}`);
    return 1;
  }
}

process.exit(await main());
