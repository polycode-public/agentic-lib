#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
// bin/agentic-lib.js — CLI for @polycode-public/agentic-lib (8.x thin-engine port).
//
//   npx @polycode-public/agentic-lib init                       # lay down workflows + seeds
//   npx @polycode-public/agentic-lib init --purge --mission <n> # full reset to a mission
//   npx @polycode-public/agentic-lib init --list-missions       # list the mission library
//
// The engine loop is gone: delivery happens in CI via the reusable
// `.github/workflows/transform.yml@v8` (claude -p + Bedrock). This CLI is the
// distribution mechanism — it seeds a consumer repository and (with --purge)
// resets its GitHub side to a clean slate.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, "..");
const seedsDir = resolve(pkgRoot, "seeds");
const missionsDir = resolve(pkgRoot, "missions");

const args = process.argv.slice(2);
const command = args[0];
const flags = args.slice(1);

let changes = 0;

const HELP = `
@polycode-public/agentic-lib — the intentïon delivery engine (thin claude -p + Bedrock)

Usage:
  init                    Lay down consumer workflows, AGENTS.md, agentic-lib.toml, INTENT.md
  init --purge            Full reset: re-seed source/tests + clean the GitHub repo
  reset                   Alias for init --purge
  version                 Show version

Options:
  --target <path>         Target repository (default: current directory)
  --mission <name>        Use a built-in mission as INTENT.md (purge); 'random' picks one
  --list-missions         List the built-in mission library
  --dry-run               Show what would change without writing

Examples:
  npx @polycode-public/agentic-lib init
  npx @polycode-public/agentic-lib init --purge --mission 7-kyu-understand-fizz-buzz
  npx @polycode-public/agentic-lib init --list-missions
`.trim();

if (!command || ["--help", "-h", "help"].includes(command)) {
  console.log(HELP);
  process.exit(0);
}

if (["version", "--version", "-v"].includes(command)) {
  const pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf8"));
  console.log(pkg.version);
  process.exit(0);
}

if (!["init", "reset", "update"].includes(command)) {
  console.error(`Unknown command: ${command}\nRun with --help for usage.`);
  process.exit(1);
}

const dryRun = flags.includes("--dry-run");
const targetIdx = flags.indexOf("--target");
const target = resolve(targetIdx >= 0 ? flags[targetIdx + 1] : process.cwd());
const missionIdx = flags.indexOf("--mission");
const missionArg = missionIdx >= 0 ? flags[missionIdx + 1] : "";
const purge = command === "reset" || flags.includes("--purge");

if (flags.includes("--list-missions")) {
  listMissions();
  process.exit(0);
}

runInit();

// ─── helpers ──────────────────────────────────────────────────────────

function listMissions() {
  const files = readdirSync(missionsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  console.log("\nAvailable missions:\n");
  for (const f of files) {
    const name = f.replace(/\.md$/, "");
    const content = readFileSync(resolve(missionsDir, f), "utf8");
    const summary = content.split("\n").find((l) => l.trim() && !l.startsWith("#")) || "";
    console.log(`  ${name.padEnd(34)} ${summary.trim().slice(0, 80)}`);
  }
  console.log("\nUsage: init --purge --mission <name>\n");
}

function copy(src, dst, label) {
  if (!existsSync(src)) {
    console.log(`  SKIP: ${label} (source missing)`);
    return;
  }
  if (!dryRun) {
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
  }
  console.log(`  COPY: ${label}`);
  changes++;
}

// On purge, the seed skeleton only overwrites the files it owns. Any example the
// engine previously delivered on top (e.g. the fizz-buzz smoke test) is removed so
// the reset is a clean, green template — never a mix of seed + stale delivery.
function removeDeliveredExtras() {
  const extras = ["tests/unit/fizzbuzz.test.js"];
  for (const rel of extras) {
    const p = resolve(target, rel);
    if (!existsSync(p)) continue;
    if (!dryRun) unlinkSync(p);
    console.log(`  REMOVE: ${rel}`);
    changes++;
  }
}

// Keep package.json's engine-managed surface current: the standard scripts (incl.
// the `init`/`reset`/`missions`/`engine:version` CLI shortcuts) + the tooling
// devDependencies + engines. The repo's identity and any product deps are preserved.
// On a fresh repo (or --purge) the seed is written wholesale.
function seedPackageJson() {
  const seedPath = resolve(seedsDir, "package.json");
  if (!existsSync(seedPath)) {
    console.log("  SKIP: package.json (seed missing)");
    return;
  }
  const seed = JSON.parse(readFileSync(seedPath, "utf8"));
  const dst = resolve(target, "package.json");

  if (!existsSync(dst) || purge) {
    if (!dryRun) writeFileSync(dst, JSON.stringify(seed, null, 2) + "\n");
    console.log(`  ${existsSync(dst) ? "RESET" : "WRITE"}: package.json (seed)`);
    changes++;
    return;
  }

  const cur = JSON.parse(readFileSync(dst, "utf8"));
  const merged = {
    ...cur,
    type: seed.type ?? cur.type,
    scripts: { ...cur.scripts, ...seed.scripts },
    devDependencies: { ...cur.devDependencies, ...seed.devDependencies },
    engines: seed.engines ?? cur.engines,
  };
  if (JSON.stringify(merged) === JSON.stringify(cur)) {
    console.log("  SKIP: package.json already current");
    return;
  }
  if (!dryRun) writeFileSync(dst, JSON.stringify(merged, null, 2) + "\n");
  console.log("  MERGE: package.json (scripts + devDependencies + engines)");
  changes++;
}

function resolveMission(name) {
  const available = readdirSync(missionsDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
  if (name === "random") {
    const pick = available[Math.floor(Math.random() * available.length)];
    console.log(`  RANDOM: selected mission "${pick}"`);
    return pick;
  }
  if (!available.includes(name)) {
    console.error(`\nERROR: unknown mission "${name}".`);
    console.error(`Available: ${available.join(", ")}`);
    process.exit(1);
  }
  return name;
}

function runInit() {
  if (!existsSync(target)) {
    console.error(`Target directory does not exist: ${target}`);
    process.exit(1);
  }
  console.log("\n=== @polycode-public/agentic-lib init ===");
  console.log(`Target:  ${target}`);
  console.log(`Purge:   ${purge}`);
  console.log(`Mode:    ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Consumer workflows (always refreshed — mastered here).
  console.log("--- Workflows ---");
  const wfDir = resolve(seedsDir, "workflows");
  if (existsSync(wfDir)) {
    for (const f of readdirSync(wfDir)) {
      copy(resolve(wfDir, f), resolve(target, ".github/workflows", f), `workflows/${f}`);
    }
  }

  // Guidance (always refreshed — assembled from components/).
  console.log("\n--- Guidance ---");
  copy(resolve(seedsDir, "AGENTS.md"), resolve(target, "AGENTS.md"), "AGENTS.md");

  // Config (only create if absent, unless purging).
  console.log("\n--- Config ---");
  const tomlTarget = resolve(target, "agentic-lib.toml");
  if (purge || !existsSync(tomlTarget)) {
    copy(resolve(seedsDir, "agentic-lib.toml"), tomlTarget, "agentic-lib.toml");
  } else {
    console.log("  SKIP: agentic-lib.toml already exists");
  }
  // MCP config (engine-managed — always refreshed so the marginalia-seon graph
  // tools stay wired for `claude -p` and future inits don't go backwards).
  copy(resolve(seedsDir, ".mcp.json"), resolve(target, ".mcp.json"), ".mcp.json");

  // package.json — keep the engine CLI scripts + the standard tooling deps current
  // (so a re-init never goes backwards) without clobbering the repo's identity/product.
  seedPackageJson();

  // Intent.
  console.log("\n--- Intent ---");
  const intentTarget = resolve(target, "INTENT.md");
  if (missionArg) {
    const mission = resolveMission(missionArg);
    copy(resolve(missionsDir, `${mission}.md`), intentTarget, `INTENT.md (mission: ${mission})`);
  } else if (purge || !existsSync(intentTarget)) {
    copy(resolve(seedsDir, "INTENT.md"), intentTarget, "INTENT.md (default)");
  } else {
    console.log("  SKIP: INTENT.md already exists");
  }

  // Purge: reset the product source/tests to the clean seed skeleton (library +
  // browser demo + behaviour test, all on the package identity — no delivered
  // example) and clean the GitHub repo.
  if (purge) {
    console.log("\n--- Purge: reset source + tests to seed ---");
    copy(resolve(seedsDir, "src-tests/main.js"), resolve(target, "src/lib/main.js"), "src/lib/main.js");
    copy(resolve(seedsDir, "src-tests/web-lib.js"), resolve(target, "src/web/lib.js"), "src/web/lib.js");
    copy(resolve(seedsDir, "src-tests/web-index.html"), resolve(target, "src/web/index.html"), "src/web/index.html");
    copy(
      resolve(seedsDir, "src-tests/main.test.js"),
      resolve(target, "tests/unit/main.test.js"),
      "tests/unit/main.test.js",
    );
    copy(
      resolve(seedsDir, "src-tests/web.test.js"),
      resolve(target, "tests/unit/web.test.js"),
      "tests/unit/web.test.js",
    );
    copy(
      resolve(seedsDir, "src-tests/homepage.test.js"),
      resolve(target, "tests/behaviour/homepage.test.js"),
      "tests/behaviour/homepage.test.js",
    );
    removeDeliveredExtras();
    initPurgeGitHub();
  }

  console.log(`\n${changes} change(s)${dryRun ? " (dry run)" : ""}`);
}

// ─── GitHub clean-slate (purge only) ──────────────────────────────────

function ghExec(cmd) {
  return execSync(cmd, { cwd: target, encoding: "utf8", timeout: 30000, stdio: ["pipe", "pipe", "pipe"] });
}

function detectRepoSlug() {
  try {
    const url = execSync("git remote get-url origin", { cwd: target, encoding: "utf8", timeout: 10000 }).trim();
    const m = url.match(/github\.com[:/]([^/]+\/[^/.]+)/);
    return m ? m[1].replace(/\.git$/, "") : "";
  } catch {
    return "";
  }
}

function tryGh(action, label) {
  if (dryRun) return true;
  try {
    action();
    return true;
  } catch (e) {
    console.log(`  WARN: ${label}: ${e.message}`);
    return false;
  }
}

function purgeIssues(slug) {
  try {
    const open = JSON.parse(ghExec(`gh api repos/${slug}/issues?state=open&per_page=100`) || "[]").filter(
      (i) => !i.pull_request,
    );
    for (const issue of open) {
      console.log(`  CLOSE: issue #${issue.number}`);
      const ok = tryGh(
        () =>
          ghExec(`gh api repos/${slug}/issues/${issue.number} -X PATCH -f state=closed -f state_reason=not_planned`),
        `issue #${issue.number}`,
      );
      if (ok && !dryRun) changes++;
    }
    if (open.length === 0) console.log("  No open issues");
  } catch (e) {
    console.log(`  WARN: issue cleanup: ${e.message}`);
  }
}

function purgePullRequests(slug) {
  try {
    const prs = JSON.parse(
      ghExec(`gh pr list --repo ${slug} --state open --json number,headRefName --limit 100`) || "[]",
    );
    for (const pr of prs) {
      console.log(`  CLOSE: PR #${pr.number} (${pr.headRefName})`);
      const ok = tryGh(() => ghExec(`gh pr close ${pr.number} --repo ${slug} --delete-branch`), `PR #${pr.number}`);
      if (ok && !dryRun) changes++;
    }
    if (prs.length === 0) console.log("  No open PRs");
  } catch (e) {
    console.log(`  WARN: PR cleanup: ${e.message}`);
  }
}

function purgeWorkflowRuns(slug) {
  try {
    const runs =
      JSON.parse(ghExec(`gh api repos/${slug}/actions/runs?per_page=100`) || '{"workflow_runs":[]}').workflow_runs ||
      [];
    let deleted = 0;
    for (const run of runs) {
      if (run.status === "in_progress" || run.status === "queued") continue;
      if (dryRun || tryGh(() => ghExec(`gh api repos/${slug}/actions/runs/${run.id} -X DELETE`), `run ${run.id}`)) {
        deleted++;
      }
    }
    console.log(deleted > 0 ? `  DELETE: ${deleted} workflow run(s)` : "  No workflow runs to delete");
    changes += deleted;
  } catch (e) {
    console.log(`  WARN: run cleanup: ${e.message}`);
  }
}

function purgeBranches(slug) {
  try {
    const branches = JSON.parse(ghExec(`gh api repos/${slug}/branches?per_page=100`) || "[]");
    const current = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: target,
      encoding: "utf8",
      timeout: 5000,
    }).trim();
    const keep = new Set(["main", "master", "template", "gh-pages", current]);
    let deleted = 0;
    for (const b of branches) {
      if (keep.has(b.name) || b.protected) continue;
      console.log(`  DELETE: branch ${b.name}`);
      if (
        dryRun ||
        tryGh(() => ghExec(`gh api repos/${slug}/git/refs/heads/${b.name} -X DELETE`), `branch ${b.name}`)
      ) {
        deleted++;
      }
    }
    if (deleted === 0) console.log("  No stale branches");
    changes += deleted;
  } catch (e) {
    console.log(`  WARN: branch cleanup: ${e.message}`);
  }
}

function initPurgeGitHub() {
  console.log("\n--- Purge: GitHub clean slate (issues, PRs, runs, branches) ---");
  const slug = detectRepoSlug();
  if (!slug) {
    console.log("  SKIP: no GitHub origin remote detected");
    return;
  }
  try {
    execSync("gh --version", { timeout: 5000, stdio: "pipe" });
  } catch {
    console.log("  SKIP: gh CLI not found");
    return;
  }
  purgeIssues(slug);
  purgePullRequests(slug);
  purgeWorkflowRuns(slug);
  purgeBranches(slug);
}
