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
  readOptionalFile: vi.fn().mockReturnValue("mock contributing"),
  extractNarrative: vi.fn().mockImplementation((_content, fallback) => fallback || ""),
  NARRATIVE_INSTRUCTION: "\n\nAfter completing your task...",
}));

// Mock runCopilotSession
vi.mock("../../../../src/copilot/copilot-session.js", () => ({
  runCopilotSession: vi.fn().mockResolvedValue({
    tokensIn: 50,
    tokensOut: 25,
    toolCalls: 2,
    testRuns: 0,
    filesWritten: 0,
    sessionTime: 4,
    agentMessage: "Enhanced issue body with acceptance criteria",
    narrative: "Enhanced issue.",
  }),
}));

// Mock github-tools
vi.mock("../../../../src/copilot/github-tools.js", () => ({
  createGitHubTools: vi.fn().mockReturnValue([]),
}));

// Mock safety.js
vi.mock("../../../../src/actions/agentic-step/safety.js", () => ({
  isIssueResolved: vi.fn().mockResolvedValue(false),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, existsSync: vi.fn().mockReturnValue(false), readdirSync: vi.fn().mockReturnValue([]) };
});

import { enhanceIssue } from "../../../../src/actions/agentic-step/tasks/enhance-issue.js";
import { isIssueResolved } from "../../../../src/actions/agentic-step/safety.js";
const { runCopilotSession } = await import("../../../../src/copilot/copilot-session.js");

// --- Helpers ---

function createMockOctokit() {
  return {
    rest: {
      issues: {
        get: vi.fn().mockResolvedValue({ data: { state: "open", title: "Test Issue", body: "Test body", labels: [] } }),
        listForRepo: vi.fn().mockResolvedValue({ data: [] }),
        update: vi.fn().mockResolvedValue({}),
        addLabels: vi.fn().mockResolvedValue({}),
        createComment: vi.fn().mockResolvedValue({}),
      },
    },
    graphql: vi.fn().mockResolvedValue({}),
  };
}

function createMockConfig(overrides = {}) {
  return {
    paths: {
      mission: { path: "MISSION.md" },
      contributing: { path: "CONTRIBUTING.md" },
      features: { path: "features/", limit: 4 },
    },
    readOnlyPaths: ["README.md"],
    tuning: {},
    ...overrides,
  };
}

function createMockContext(overrides = {}) {
  return {
    task: "enhance-issue",
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

describe("tasks/enhance-issue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isIssueResolved.mockResolvedValue(false);
    runCopilotSession.mockResolvedValue({
      tokensIn: 50,
      tokensOut: 25,
      toolCalls: 2,
      testRuns: 0,
      filesWritten: 0,
      sessionTime: 4,
      agentMessage: "Enhanced issue body with acceptance criteria",
      narrative: "Enhanced issue.",
    });
  });

  it("uses batch mode when issueNumber is missing", async () => {
    const octokit = createMockOctokit();
    octokit.rest.issues.listForRepo.mockResolvedValue({
      data: [
        { number: 10, title: "Issue 10", labels: [{ name: "automated" }] },
        { number: 11, title: "Issue 11", labels: [{ name: "automated" }] },
        { number: 12, title: "Issue 12", labels: [{ name: "automated" }, { name: "ready" }] },
      ],
    });
    const result = await enhanceIssue(createMockContext({ octokit, issueNumber: "" }));

    // Should enhance 2 unready issues (10 and 11), skip 12 (already ready)
    expect(runCopilotSession).toHaveBeenCalledTimes(2);
    expect(result.outcome).toBe("issues-enhanced");
    expect(result.details).toContain("Batch enhanced 2/2 issues");
  });

  it("returns nop in batch mode when no unready issues exist", async () => {
    const octokit = createMockOctokit();
    octokit.rest.issues.listForRepo.mockResolvedValue({ data: [] });
    const result = await enhanceIssue(createMockContext({ octokit, issueNumber: "" }));
    expect(result.outcome).toBe("nop");
    expect(result.details).toContain("No unready automated issues");
  });

  it("returns nop if issue is already resolved", async () => {
    isIssueResolved.mockResolvedValue(true);
    const result = await enhanceIssue(createMockContext());
    expect(result.outcome).toBe("nop");
    expect(result.details).toBe("Issue #42 already resolved");
    expect(runCopilotSession).not.toHaveBeenCalled();
  });

  it("returns nop if issue already has ready label", async () => {
    const octokit = createMockOctokit();
    octokit.rest.issues.get.mockResolvedValue({
      data: { state: "open", title: "Test", body: "body", labels: [{ name: "ready" }] },
    });
    const result = await enhanceIssue(createMockContext({ octokit }));
    expect(result.outcome).toBe("nop");
    expect(result.details).toBe("Issue #42 already has ready label");
    expect(runCopilotSession).not.toHaveBeenCalled();
  });

  it("updates issue body, adds labels, and comments on happy path", async () => {
    const octokit = createMockOctokit();
    const result = await enhanceIssue(createMockContext({ octokit }));

    expect(result.outcome).toBe("issue-enhanced");
    expect(result.tokensUsed).toBe(75);
    expect(result.model).toBe("claude-sonnet-4");
    expect(result.details).toContain("Enhanced issue #42");

    expect(octokit.rest.issues.update).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 42,
        body: "Enhanced issue body with acceptance criteria",
      }),
    );
    expect(octokit.rest.issues.addLabels).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 42,
        labels: ["ready"],
      }),
    );
    expect(octokit.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: 42,
        body: expect.stringContaining("Automated Enhancement"),
      }),
    );
  });

  it("does not update issue if enhanced body is empty", async () => {
    runCopilotSession.mockResolvedValue({
      tokensIn: 30,
      tokensOut: 20,
      toolCalls: 1,
      testRuns: 0,
      filesWritten: 0,
      sessionTime: 3,
      agentMessage: "   ",
      narrative: "",
    });
    const octokit = createMockOctokit();
    const result = await enhanceIssue(createMockContext({ octokit }));

    expect(result.outcome).toBe("issue-enhanced");
    expect(octokit.rest.issues.update).not.toHaveBeenCalled();
    expect(octokit.rest.issues.addLabels).not.toHaveBeenCalled();
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
  });
});
