// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { mkdirSync, rmSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";

// logging.js imports @actions/core which resolves to the root node_modules.
// This path must be mocked at the exact resolution path.
// If this fails with "Cannot find module", run: npm install
vi.mock("../../../node_modules/@actions/core/lib/core.js", () => ({
  info: vi.fn(),
  warning: vi.fn(),
}));

const core = await import("../../../node_modules/@actions/core/lib/core.js");
const { logActivity, logSafetyCheck, generateClosingNotes } = await import("../../../src/actions/agentic-step/logging.js");

describe("logging", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `agentic-step-log-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("logActivity", () => {
    it("creates a new activity log file", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "resolve-issue",
        outcome: "code-generated",
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("# intent");
      expect(content).toContain("## resolve-issue at");
      expect(content).toContain("**Outcome:** code-generated");
    });

    it("appends to existing activity log", () => {
      const filepath = join(tmpDir, "intention.md");
      writeFileSync(filepath, "# existing log\n");

      logActivity({
        filepath,
        task: "transform",
        outcome: "transformed",
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("# existing log");
      expect(content).toContain("## transform at");
    });

    it("includes issue number", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "resolve-issue",
        outcome: "code-generated",
        issueNumber: "42",
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("**Issue:** #42");
    });

    it("includes PR number", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "fix-code",
        outcome: "fix-applied",
        prNumber: "99",
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("**PR:** #99");
    });

    it("includes commit URL", () => {
      const filepath = join(tmpDir, "intention.md");
      const commitUrl = "https://github.com/org/repo/commit/abc123";
      logActivity({
        filepath,
        task: "resolve-issue",
        outcome: "code-generated",
        commitUrl,
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain(`**Commit:** [${commitUrl}](${commitUrl})`);
    });

    it("includes model and tokens", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "transform",
        outcome: "transformed",
        model: "claude-sonnet-4-5",
        tokensUsed: 1500,
        inputTokens: 1200,
        outputTokens: 300,
        cost: 3,
        durationMs: 45000,
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("**Model:** claude-sonnet-4-5");
      expect(content).toContain("**Token Count:** 1500 (in: 1200, out: 300)");
      expect(content).toContain("**Model Invocations:** 3");
      expect(content).toContain("**Duration:** 45s (~0.8 GitHub Actions min)");
    });

    it("includes workflow URL", () => {
      const filepath = join(tmpDir, "intention.md");
      const workflowUrl = "https://github.com/org/repo/actions/runs/123";
      logActivity({
        filepath,
        task: "transform",
        outcome: "transformed",
        workflowUrl,
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain(`**Workflow:** [${workflowUrl}](${workflowUrl})`);
    });

    it("includes details", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "review-issue",
        outcome: "issue-closed",
        details: "The feature was already implemented",
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("The feature was already implemented");
    });

    it("rotates log to keep only last 30 entries", () => {
      const filepath = join(tmpDir, "intention.md");
      // Create a log with 35 entries
      let content = "# intentïon Activity Log\n";
      for (let i = 1; i <= 35; i++) {
        content += `\n## task-${i} at 2026-01-01T00:00:00Z\n\n**Outcome:** done\n\n---\n`;
      }
      writeFileSync(filepath, content);

      // Add one more entry (total would be 36, should trigger rotation)
      logActivity({
        filepath,
        task: "task-36",
        outcome: "done",
      });

      const result = readFileSync(filepath, "utf8");
      // Should contain the header
      expect(result).toContain("# intent");
      // Should NOT contain task-1 through task-6 (rotated out)
      expect(result).not.toContain("task-1 at");
      expect(result).not.toContain("task-5 at");
      // Should contain task-7 onwards and the new task-36
      expect(result).toContain("task-7 at");
      expect(result).toContain("task-36");
    });

    it("includes profile when provided", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "transform",
        outcome: "transformed",
        profile: "med",
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("**Profile:** med");
    });

    it("includes changes section when provided", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "maintain-features",
        outcome: "features-maintained",
        changes: [
          { action: "Created", file: "features/HTTP_SERVER.md", sizeInfo: "new, 1.2KB" },
          { action: "Deleted", file: "features/OLD.md" },
        ],
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("### What Changed");
      expect(content).toContain("Created: `features/HTTP_SERVER.md` (new, 1.2KB)");
      expect(content).toContain("Deleted: `features/OLD.md`");
    });

    it("includes limits status table when provided", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "transform",
        outcome: "transformed",
        limitsStatus: [
          { name: "max-feature-issues", value: "1/2", remaining: "1", status: "" },
          { name: "library", value: "?/32", remaining: "?", status: "n/a" },
        ],
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("### Limits Status");
      expect(content).toContain("| max-feature-issues | 1/2 | 1 remaining |");
    });

    it("includes prompt budget table when provided", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "transform",
        outcome: "transformed",
        promptBudget: [
          { section: "mission", size: 450, files: "1", notes: "full" },
          { section: "source", size: 8500, files: "6/10", notes: "4 full, 2 outlined" },
        ],
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("### Prompt Budget");
      expect(content).toContain("| mission | 450 chars | 1 | full |");
    });

    it("includes closing notes when provided", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "transform",
        outcome: "transformed",
        closingNotes: "All limits within normal range.",
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("### Closing Notes");
      expect(content).toContain("All limits within normal range.");
    });

    it("includes narrative section when provided", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "transform",
        outcome: "transformed",
        narrative: "I added a new HTTP server feature by implementing an Express-based route handler. The change introduces a GET /status endpoint that returns the current server health.",
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("### Narrative");
      expect(content).toContain("I added a new HTTP server feature");
      expect(content).toContain("GET /status endpoint");
    });

    it("omits narrative section when not provided", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "transform",
        outcome: "transformed",
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).not.toContain("### Narrative");
    });

    it("includes transformation cost when provided", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "transform",
        outcome: "transformed",
        transformationCost: 1,
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("**agentic-lib transformation cost:** 1");
    });

    it("includes transformation cost of 0", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "maintain-features",
        outcome: "features-maintained",
        transformationCost: 0,
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("**agentic-lib transformation cost:** 0");
    });

    it("omits transformation cost when not provided", () => {
      const filepath = join(tmpDir, "intention.md");
      logActivity({
        filepath,
        task: "review-issue",
        outcome: "issue-closed",
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).not.toContain("agentic-lib transformation cost");
    });

    it("creates parent directories if needed", () => {
      const filepath = join(tmpDir, "sub", "dir", "intention.md");
      logActivity({
        filepath,
        task: "transform",
        outcome: "transformed",
      });

      const content = readFileSync(filepath, "utf8");
      expect(content).toContain("## transform at");
    });
  });

  describe("logSafetyCheck", () => {
    it("logs passed checks via core.info", () => {
      logSafetyCheck("wip-limit", true, { count: 1, limit: 3 });
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining("Safety check [wip-limit]: PASSED"));
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining("count=1"));
    });

    it("logs blocked checks via core.warning", () => {
      logSafetyCheck("attempt-limit", false, { attempts: 3, maxAttempts: 3 });
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining("Safety check [attempt-limit]: BLOCKED"));
    });

    it("includes detail values", () => {
      logSafetyCheck("issue-resolved", false, { issueNumber: 42, state: "closed" });
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining("issueNumber=42"));
    });

    it("works with no details", () => {
      logSafetyCheck("path-writable", true);
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining("Safety check [path-writable]: PASSED"));
    });
  });

  describe("generateClosingNotes", () => {
    it("returns empty string for null input", () => {
      expect(generateClosingNotes(null)).toBe("");
    });

    it("returns empty string for empty array", () => {
      expect(generateClosingNotes([])).toBe("");
    });

    it("returns normal range message when all limits are fine", () => {
      const limitsStatus = [
        { name: "features", valueNum: 1, capacityNum: 4, status: "" },
        { name: "library", valueNum: 2, capacityNum: 32, status: "" },
      ];
      expect(generateClosingNotes(limitsStatus)).toBe("All limits within normal range.");
    });

    it("flags limits approaching capacity (>=80%)", () => {
      const limitsStatus = [
        { name: "features", valueNum: 4, capacityNum: 4, status: "" },
        { name: "library", valueNum: 2, capacityNum: 32, status: "" },
      ];
      const result = generateClosingNotes(limitsStatus);
      expect(result).toContain("features at capacity");
      expect(result).toContain("actions will be blocked");
    });

    it("skips n/a limits", () => {
      const limitsStatus = [
        { name: "features", valueNum: 4, capacityNum: 4, status: "n/a" },
      ];
      expect(generateClosingNotes(limitsStatus)).toBe("");
    });
  });
});
