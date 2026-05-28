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
  readOptionalFile: vi.fn().mockReturnValue("mock contributing content"),
  formatPathsSection: vi.fn().mockReturnValue("## File Paths\n- mock"),
  extractNarrative: vi.fn().mockImplementation((_content, fallback) => fallback || ""),
  NARRATIVE_INSTRUCTION: "\n\nAfter completing your task...",
}));

// Mock runCopilotSession
vi.mock("../../../../src/copilot/copilot-session.js", () => ({
  runCopilotSession: vi.fn().mockResolvedValue({
    tokensIn: 70,
    tokensOut: 30,
    toolCalls: 5,
    testRuns: 1,
    filesWritten: 2,
    sessionTime: 15,
    agentMessage: "mock generated code",
    narrative: "Generated code for issue.",
  }),
}));

// Mock github-tools
vi.mock("../../../../src/copilot/github-tools.js", () => ({
  createGitHubTools: vi.fn().mockReturnValue([]),
  createGitTools: vi.fn().mockReturnValue([]),
}));

// Mock safety.js
vi.mock("../../../../src/actions/agentic-step/safety.js", () => ({
  isIssueResolved: vi.fn().mockResolvedValue(false),
  checkAttemptLimit: vi.fn().mockResolvedValue({ allowed: true, attempts: 0 }),
  checkWipLimit: vi.fn().mockResolvedValue({ allowed: true, count: 0 }),
}));

import { resolveIssue } from "../../../../src/actions/agentic-step/tasks/resolve-issue.js";
import { isIssueResolved, checkAttemptLimit, checkWipLimit } from "../../../../src/actions/agentic-step/safety.js";
const { runCopilotSession } = await import("../../../../src/copilot/copilot-session.js");

// --- Helpers ---

function createMockOctokit() {
  return {
    rest: {
      issues: {
        get: vi.fn().mockResolvedValue({ data: { state: "open", title: "Test Issue", body: "Test body", labels: [] } }),
        listComments: vi.fn().mockResolvedValue({ data: [] }),
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
      source: { path: "src/" },
      tests: { path: "tests/" },
    },
    attemptsPerIssue: 2,
    featureDevelopmentIssuesWipLimit: 2,
    readOnlyPaths: ["README.md"],
    tuning: {},
    ...overrides,
  };
}

function createMockContext(overrides = {}) {
  return {
    task: "resolve-issue",
    config: createMockConfig(),
    instructions: "",
    issueNumber: "42",
    writablePaths: ["src/", "tests/"],
    testCommand: "npm test",
    model: "claude-sonnet-4",
    octokit: createMockOctokit(),
    repo: { owner: "test-owner", repo: "test-repo" },
    ...overrides,
  };
}

// --- Tests ---

describe("tasks/resolve-issue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isIssueResolved.mockResolvedValue(false);
    checkAttemptLimit.mockResolvedValue({ allowed: true, attempts: 0 });
    checkWipLimit.mockResolvedValue({ allowed: true, count: 0 });
    runCopilotSession.mockResolvedValue({
      tokensIn: 70,
      tokensOut: 30,
      toolCalls: 5,
      testRuns: 1,
      filesWritten: 2,
      sessionTime: 15,
      agentMessage: "mock generated code",
      narrative: "Generated code for issue.",
    });
  });

  it("throws if issueNumber is missing", async () => {
    const ctx = createMockContext({ issueNumber: "" });
    await expect(resolveIssue(ctx)).rejects.toThrow("resolve-issue task requires issue-number input");
  });

  it("throws if issueNumber is undefined", async () => {
    const ctx = createMockContext({ issueNumber: undefined });
    await expect(resolveIssue(ctx)).rejects.toThrow("resolve-issue task requires issue-number input");
  });

  it("returns nop if issue is already closed", async () => {
    isIssueResolved.mockResolvedValue(true);
    const result = await resolveIssue(createMockContext());
    expect(result.outcome).toBe("nop");
    expect(result.details).toBe("Issue already resolved");
    expect(runCopilotSession).not.toHaveBeenCalled();
  });

  it("returns attempt-limit-exceeded if attempts exhausted", async () => {
    checkAttemptLimit.mockResolvedValue({ allowed: false, attempts: 3 });
    const result = await resolveIssue(createMockContext());
    expect(result.outcome).toBe("attempt-limit-exceeded");
    expect(result.details).toContain("3 attempts exhausted");
    expect(runCopilotSession).not.toHaveBeenCalled();
  });

  it("returns wip-limit-reached if WIP limit hit", async () => {
    checkWipLimit.mockResolvedValue({ allowed: false, count: 2 });
    const result = await resolveIssue(createMockContext());
    expect(result.outcome).toBe("wip-limit-reached");
    expect(result.details).toContain("2 issues in progress");
    expect(runCopilotSession).not.toHaveBeenCalled();
  });

  it("calls runCopilotSession on happy path and returns code-generated", async () => {
    const result = await resolveIssue(createMockContext());
    expect(result.outcome).toBe("code-generated");
    expect(result.tokensUsed).toBe(100);
    expect(result.model).toBe("claude-sonnet-4");
    expect(result.prNumber).toBeNull();
    expect(result.commitUrl).toBeNull();
    expect(result.details).toContain("Generated code for issue #42");
    expect(runCopilotSession).toHaveBeenCalledTimes(1);
  });

  it("includes issue body and title in the prompt", async () => {
    const octokit = createMockOctokit();
    octokit.rest.issues.get.mockResolvedValue({
      data: { state: "open", title: "Fix the widget", body: "The widget is broken", labels: [] },
    });
    octokit.rest.issues.listComments.mockResolvedValue({
      data: [{ user: { login: "testuser" }, body: "I can reproduce this" }],
    });
    await resolveIssue(createMockContext({ octokit }));

    const args = runCopilotSession.mock.calls[0][0];
    expect(args.userPrompt).toContain("Fix the widget");
    expect(args.userPrompt).toContain("The widget is broken");
    expect(args.userPrompt).toContain("testuser");
    expect(args.userPrompt).toContain("I can reproduce this");
    expect(args.agentPrompt).toContain("#42");
  });

  it("passes correct writable paths and model to runCopilotSession", async () => {
    await resolveIssue(createMockContext({ writablePaths: ["lib/", "tests/"], model: "gpt-4o" }));
    const args = runCopilotSession.mock.calls[0][0];
    expect(args.writablePaths).toEqual(["lib/", "tests/"]);
    expect(args.model).toBe("gpt-4o");
  });

  it("calls safety checks in correct order", async () => {
    const ctx = createMockContext();
    await resolveIssue(ctx);
    expect(isIssueResolved).toHaveBeenCalledWith(ctx.octokit, ctx.repo, "42");
    expect(checkAttemptLimit).toHaveBeenCalledWith(ctx.octokit, ctx.repo, "42", "agentic-lib-issue-", 2);
    expect(checkWipLimit).toHaveBeenCalledWith(ctx.octokit, ctx.repo, "in-progress", 2);
  });
});
