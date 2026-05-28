// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @actions/core
vi.mock("@actions/core", () => ({
  info: vi.fn(),
  debug: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  setOutput: vi.fn(),
  getInput: vi.fn(),
  setFailed: vi.fn(),
}));

// Mock the copilot module
vi.mock("../../../../src/actions/agentic-step/copilot.js", () => ({
  formatPathsSection: vi.fn().mockReturnValue("## File Paths\n- mock"),
  extractNarrative: vi.fn().mockImplementation((_content, fallback) => fallback || ""),
  NARRATIVE_INSTRUCTION: "\n\nAfter completing your task...",
}));

// Mock runCopilotSession
vi.mock("../../../../src/copilot/copilot-session.js", () => ({
  runCopilotSession: vi.fn().mockResolvedValue({
    tokensIn: 50,
    tokensOut: 30,
    toolCalls: 4,
    testRuns: 1,
    filesWritten: 1,
    sessionTime: 12,
    agentMessage: "mock fix applied",
    narrative: "Applied fix.",
  }),
}));

// Mock github-tools
vi.mock("../../../../src/copilot/github-tools.js", () => ({
  createGitHubTools: vi.fn().mockReturnValue([]),
  createGitTools: vi.fn().mockReturnValue([]),
}));

// Mock child_process
vi.mock("child_process", () => ({
  execSync: vi
    .fn()
    .mockReturnValue(
      "FAIL tests/unit/main.test.js\n  ✕ should return correct value\n    Error: expected 42 but got undefined",
    ),
}));

// Mock fs for conflict resolution tests
vi.mock("fs", () => ({
  readFileSync: vi.fn().mockReturnValue("mock file content"),
}));

import { fixCode } from "../../../../src/actions/agentic-step/tasks/fix-code.js";
const { runCopilotSession } = await import("../../../../src/copilot/copilot-session.js");
import { execSync } from "child_process";
import { readFileSync } from "fs";

// --- Helpers ---

function createMockOctokit() {
  return {
    rest: {
      issues: {
        get: vi.fn().mockResolvedValue({ data: { state: "open", title: "Test Issue", body: "body", labels: [] } }),
      },
      pulls: {
        get: vi.fn().mockResolvedValue({ data: { title: "Test PR", body: "PR description", head: { sha: "abc123" } } }),
      },
      checks: {
        listForRef: vi.fn().mockResolvedValue({ data: { check_runs: [] } }),
      },
    },
    graphql: vi.fn().mockResolvedValue({}),
  };
}

function createMockConfig(overrides = {}) {
  return {
    paths: {
      mission: { path: "MISSION.md" },
      source: { path: "src/" },
      tests: { path: "tests/" },
    },
    readOnlyPaths: ["README.md"],
    tuning: {},
    ...overrides,
  };
}

function createMockContext(overrides = {}) {
  return {
    task: "fix-code",
    config: createMockConfig(),
    instructions: "",
    prNumber: "99",
    writablePaths: ["src/", "tests/"],
    testCommand: "npm test",
    model: "claude-sonnet-4",
    octokit: createMockOctokit(),
    repo: { owner: "test-owner", repo: "test-repo" },
    ...overrides,
  };
}

// --- Tests ---

describe("tasks/fix-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runCopilotSession.mockResolvedValue({
      tokensIn: 50,
      tokensOut: 30,
      toolCalls: 4,
      testRuns: 1,
      filesWritten: 1,
      sessionTime: 12,
      agentMessage: "mock fix applied",
      narrative: "Applied fix.",
    });
  });

  it("throws if prNumber is missing", async () => {
    const ctx = createMockContext({ prNumber: "" });
    await expect(fixCode(ctx)).rejects.toThrow("fix-code task requires pr-number input");
  });

  it("returns nop if no failing checks", async () => {
    const octokit = createMockOctokit();
    octokit.rest.checks.listForRef.mockResolvedValue({
      data: {
        check_runs: [
          { name: "build", conclusion: "success", output: {} },
          { name: "lint", conclusion: "success", output: {} },
        ],
      },
    });
    const result = await fixCode(createMockContext({ octokit }));
    expect(result.outcome).toBe("nop");
    expect(result.details).toBe("No failing checks found");
    expect(runCopilotSession).not.toHaveBeenCalled();
  });

  it("includes failure details in prompt when checks fail", async () => {
    const octokit = createMockOctokit();
    octokit.rest.checks.listForRef.mockResolvedValue({
      data: {
        check_runs: [
          {
            name: "unit-tests",
            conclusion: "failure",
            details_url: "https://github.com/owner/repo/actions/runs/12345",
            output: { summary: "TypeError: cannot read property" },
          },
          { name: "lint", conclusion: "success", output: {} },
        ],
      },
    });
    await fixCode(createMockContext({ octokit }));

    const args = runCopilotSession.mock.calls[0][0];
    expect(args.userPrompt).toContain("unit-tests");
    expect(args.userPrompt).toContain("FAIL tests/unit/main.test.js");
    expect(args.userPrompt).toContain("Test PR");
    expect(args.agentPrompt).toContain("#99");
    expect(execSync).toHaveBeenCalledTimes(1);
  });

  it("falls back to summary when log fetch fails", async () => {
    execSync.mockImplementation(() => {
      throw new Error("gh not found");
    });
    const octokit = createMockOctokit();
    octokit.rest.checks.listForRef.mockResolvedValue({
      data: {
        check_runs: [
          {
            name: "unit-tests",
            conclusion: "failure",
            details_url: "https://github.com/owner/repo/actions/runs/12345",
            output: { summary: "TypeError: cannot read property" },
          },
        ],
      },
    });
    await fixCode(createMockContext({ octokit }));

    const args = runCopilotSession.mock.calls[0][0];
    expect(args.userPrompt).toContain("TypeError: cannot read property");
  });

  it("returns fix-applied outcome on happy path", async () => {
    const octokit = createMockOctokit();
    octokit.rest.checks.listForRef.mockResolvedValue({
      data: {
        check_runs: [{ name: "unit-tests", conclusion: "failure", output: { summary: "Assertion failed" } }],
      },
    });
    const result = await fixCode(createMockContext({ octokit }));
    expect(result.outcome).toBe("fix-applied");
    expect(result.tokensUsed).toBe(80);
    expect(result.model).toBe("claude-sonnet-4");
    expect(result.details).toContain("1 failing check(s)");
    expect(result.details).toContain("PR #99");
  });

  it("uses default failure message when output summary is missing", async () => {
    execSync.mockImplementation(() => {
      throw new Error("gh not found");
    });
    const octokit = createMockOctokit();
    octokit.rest.checks.listForRef.mockResolvedValue({
      data: {
        check_runs: [{ name: "build", conclusion: "failure", output: {} }],
      },
    });
    await fixCode(createMockContext({ octokit }));

    const args = runCopilotSession.mock.calls[0][0];
    expect(args.userPrompt).toContain("**build:**");
    expect(args.userPrompt).toContain("Failed");
  });

  describe("conflict resolution (Tier 2)", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.NON_TRIVIAL_FILES;
      readFileSync.mockReturnValue("<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> main");
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("routes to resolveConflicts when NON_TRIVIAL_FILES is set", async () => {
      process.env.NON_TRIVIAL_FILES = "src/main.js";
      const result = await fixCode(createMockContext());
      expect(result.outcome).toBe("conflicts-resolved");
      expect(result.tokensUsed).toBe(80);
      expect(result.model).toBe("claude-sonnet-4");
      expect(result.details).toContain("1 conflicted file(s)");
      expect(result.details).toContain("PR #99");
    });

    it("sends conflict markers in prompt to LLM", async () => {
      process.env.NON_TRIVIAL_FILES = "src/main.js";
      await fixCode(createMockContext());

      const args = runCopilotSession.mock.calls[0][0];
      expect(args.userPrompt).toContain("Resolve Merge Conflicts");
      expect(args.userPrompt).toContain("src/main.js");
      expect(args.userPrompt).toContain("<<<<<<< HEAD");
      expect(args.agentPrompt).toContain("merge conflicts");
      expect(args.agentPrompt).toContain("#99");
    });

    it("handles multiple conflicted files", async () => {
      process.env.NON_TRIVIAL_FILES = "src/a.js\nsrc/b.js\nsrc/c.js";
      const result = await fixCode(createMockContext());
      expect(result.details).toContain("3 conflicted file(s)");
      expect(readFileSync).toHaveBeenCalledTimes(3);
      const args = runCopilotSession.mock.calls[0][0];
      expect(args.userPrompt).toContain("src/a.js");
      expect(args.userPrompt).toContain("src/b.js");
      expect(args.userPrompt).toContain("src/c.js");
    });

    it("returns nop when NON_TRIVIAL_FILES is set but empty", async () => {
      process.env.NON_TRIVIAL_FILES = "  \n  \n  ";
      const result = await fixCode(createMockContext());
      expect(result.outcome).toBe("nop");
      expect(result.details).toContain("No non-trivial conflict files");
      expect(runCopilotSession).not.toHaveBeenCalled();
    });

    it("handles unreadable conflicted files gracefully", async () => {
      process.env.NON_TRIVIAL_FILES = "src/missing.js";
      readFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      const result = await fixCode(createMockContext());
      expect(result.outcome).toBe("conflicts-resolved");
      const args = runCopilotSession.mock.calls[0][0];
      expect(args.userPrompt).toContain("(could not read)");
    });

    it("skips conflict resolution when NON_TRIVIAL_FILES is not set", async () => {
      const octokit = createMockOctokit();
      octokit.rest.checks.listForRef.mockResolvedValue({
        data: { check_runs: [] },
      });
      const result = await fixCode(createMockContext({ octokit }));
      expect(result.outcome).toBe("nop");
      expect(result.details).toBe("No failing checks found");
    });

    it("uses custom instructions for conflict resolution", async () => {
      process.env.NON_TRIVIAL_FILES = "src/main.js";
      await fixCode(createMockContext({ instructions: "Always prefer the PR version." }));
      const args = runCopilotSession.mock.calls[0][0];
      expect(args.userPrompt).toContain("Always prefer the PR version.");
    });
  });
});
