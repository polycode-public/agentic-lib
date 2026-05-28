// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @actions/core
vi.mock("@actions/core", () => ({
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  setOutput: vi.fn(),
  getInput: vi.fn(),
  setFailed: vi.fn(),
}));

// Mock the copilot module
vi.mock("../../../../src/actions/agentic-step/copilot.js", () => ({
  extractNarrative: vi.fn().mockImplementation((_content, fallback) => fallback || ""),
  NARRATIVE_INSTRUCTION: "\n\nAfter completing your task...",
}));

// Mock runCopilotSession
vi.mock("../../../../src/copilot/copilot-session.js", () => ({
  runCopilotSession: vi.fn().mockResolvedValue({
    tokensIn: 40,
    tokensOut: 20,
    toolCalls: 3,
    testRuns: 0,
    filesWritten: 0,
    sessionTime: 5,
    agentMessage: "OPEN: not yet implemented",
    narrative: "Reviewed issue.",
  }),
}));

// Mock github-tools
vi.mock("../../../../src/copilot/github-tools.js", () => ({
  createGitHubTools: vi.fn().mockReturnValue([]),
  createGitTools: vi.fn().mockReturnValue([]),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, existsSync: vi.fn().mockReturnValue(false), readdirSync: vi.fn().mockReturnValue([]), statSync: vi.fn().mockReturnValue({ size: 200 }) };
});

import { reviewIssue } from "../../../../src/actions/agentic-step/tasks/review-issue.js";
const { runCopilotSession } = await import("../../../../src/copilot/copilot-session.js");

// --- Helpers ---

function createMockOctokit() {
  return {
    rest: {
      issues: {
        get: vi.fn().mockResolvedValue({ data: { state: "open", title: "Test Issue", body: "Test body", labels: [] } }),
        listForRepo: vi.fn().mockResolvedValue({ data: [] }),
        listComments: vi.fn().mockResolvedValue({ data: [] }),
        update: vi.fn().mockResolvedValue({}),
        createComment: vi.fn().mockResolvedValue({}),
      },
      repos: {
        listCommits: vi.fn().mockResolvedValue({ data: [] }),
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
    task: "review-issue",
    config: createMockConfig(),
    instructions: "",
    issueNumber: "42",
    writablePaths: [],
    model: "claude-sonnet-4",
    octokit: createMockOctokit(),
    repo: { owner: "test-owner", repo: "test-repo" },
    ...overrides,
  };
}

// --- Tests ---

describe("tasks/review-issue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runCopilotSession.mockResolvedValue({
      tokensIn: 40,
      tokensOut: 20,
      toolCalls: 3,
      testRuns: 0,
      filesWritten: 0,
      sessionTime: 5,
      agentMessage: "OPEN: not yet implemented",
      narrative: "Reviewed issue.",
    });
  });

  it("fetches oldest open automated issue if no issueNumber provided", async () => {
    const octokit = createMockOctokit();
    octokit.rest.issues.listForRepo.mockResolvedValue({
      data: [{ number: 17, title: "Automated issue" }],
    });
    octokit.rest.issues.get.mockResolvedValue({
      data: { state: "open", title: "Automated issue", body: "auto body", labels: [] },
    });
    const ctx = createMockContext({ octokit, issueNumber: "" });

    await reviewIssue(ctx);

    expect(octokit.rest.issues.listForRepo).toHaveBeenCalledWith(
      expect.objectContaining({ state: "open", labels: "automated" }),
    );
    expect(runCopilotSession).toHaveBeenCalled();
  });

  it("returns nop if no automated issues and no issueNumber", async () => {
    const octokit = createMockOctokit();
    octokit.rest.issues.listForRepo.mockResolvedValue({ data: [] });
    const result = await reviewIssue(createMockContext({ octokit, issueNumber: "" }));
    expect(result.outcome).toBe("nop");
    expect(result.details).toContain("No open automated issues");
    expect(runCopilotSession).not.toHaveBeenCalled();
  });

  it("returns nop if issue is already closed", async () => {
    const octokit = createMockOctokit();
    octokit.rest.issues.get.mockResolvedValue({
      data: { state: "closed", title: "Closed Issue", body: "body", labels: [] },
    });
    const result = await reviewIssue(createMockContext({ octokit }));
    expect(result.outcome).toBe("nop");
    expect(result.details).toContain("already closed");
    expect(runCopilotSession).not.toHaveBeenCalled();
  });

  it("returns issue-still-open when verdict does not indicate resolved", async () => {
    // Default mock returns "OPEN: not yet implemented" in agentMessage
    const octokit = createMockOctokit();
    const result = await reviewIssue(createMockContext({ octokit }));
    expect(result.outcome).toBe("issue-still-open");
    expect(result.tokensUsed).toBe(60);
    expect(result.details).toContain("remains open");
    expect(octokit.rest.issues.update).not.toHaveBeenCalled();
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("uses batch mode when no issueNumber provided", async () => {
    const octokit = createMockOctokit();
    octokit.rest.issues.listForRepo.mockResolvedValue({
      data: [
        { number: 5, title: "Issue 5" },
        { number: 6, title: "Issue 6" },
        { number: 7, title: "Issue 7" },
      ],
    });
    octokit.rest.issues.listComments.mockResolvedValue({ data: [] });
    octokit.rest.issues.get.mockResolvedValue({
      data: { state: "open", title: "Test Issue", body: "body", labels: [] },
    });
    const result = await reviewIssue(createMockContext({ octokit, issueNumber: "" }));

    expect(runCopilotSession).toHaveBeenCalledTimes(3);
    expect(result.outcome).toBe("issues-reviewed");
    expect(result.details).toContain("Batch reviewed 3 issues");
  });

  it("calls runCopilotSession with read-only tools only", async () => {
    await reviewIssue(createMockContext());
    const args = runCopilotSession.mock.calls[0][0];
    expect(args.writablePaths).toEqual([]);
    expect(args.excludedTools).toContain("write_file");
    expect(args.excludedTools).toContain("run_tests");
  });
});
