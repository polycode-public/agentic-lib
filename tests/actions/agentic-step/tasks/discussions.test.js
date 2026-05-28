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
  readOptionalFile: vi.fn().mockReturnValue("mock content"),
  extractNarrative: vi.fn().mockImplementation((_content, fallback) => fallback || ""),
  NARRATIVE_INSTRUCTION: "\n\nAfter completing your task...",
}));

// Mock runCopilotSession
vi.mock("../../../../src/copilot/copilot-session.js", () => ({
  runCopilotSession: vi.fn().mockResolvedValue({
    tokensIn: 80,
    tokensOut: 30,
    toolCalls: 2,
    testRuns: 0,
    filesWritten: 0,
    sessionTime: 5,
    agentMessage: "Great question!",
    narrative: "Responded to discussion.",
  }),
}));

// Mock github-tools
vi.mock("../../../../src/copilot/github-tools.js", () => ({
  createDiscussionTools: vi.fn().mockReturnValue([]),
  createGitHubTools: vi.fn().mockReturnValue([]),
}));

// Mock fs
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, existsSync: vi.fn().mockReturnValue(true), writeFileSync: vi.fn() };
});

import { discussions } from "../../../../src/actions/agentic-step/tasks/discussions.js";
const { runCopilotSession } = await import("../../../../src/copilot/copilot-session.js");

// --- Helpers ---

function createMockOctokit() {
  return {
    rest: {
      issues: {
        listForRepo: vi.fn().mockResolvedValue({ data: [] }),
        create: vi.fn().mockResolvedValue({ data: { number: 99 } }),
      },
      actions: {
        listWorkflowRunsForRepo: vi.fn().mockResolvedValue({ data: { workflow_runs: [] } }),
        createWorkflowDispatch: vi.fn().mockResolvedValue({}),
      },
    },
    graphql: vi.fn().mockImplementation((query) => {
      if (typeof query === "string" && query.includes("addDiscussionComment")) {
        return Promise.resolve({
          addDiscussionComment: { comment: { url: "https://github.com/test/discussions/123#comment-1" } },
        });
      }
      return Promise.resolve({
        repository: {
          discussion: {
            id: "D_kwDOTest123",
            title: "Test Discussion",
            body: "Discussion body text",
            comments: {
              nodes: [{ id: "C_1", body: "First comment", author: { login: "user1" }, createdAt: "2026-01-01T00:00:00Z" }],
            },
          },
        },
      });
    }),
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
    readOnlyPaths: ["README.md"],
    tuning: {},
    intentionBot: { logPrefix: "agent-log-" },
    ...overrides,
  };
}

function createMockContext(overrides = {}) {
  return {
    task: "discussions",
    config: createMockConfig(),
    instructions: "",
    writablePaths: [],
    discussionUrl: "https://github.com/test-owner/test-repo/discussions/123",
    model: "claude-sonnet-4",
    octokit: createMockOctokit(),
    repo: { owner: "test-owner", repo: "test-repo" },
    ...overrides,
  };
}

// --- Tests ---

describe("tasks/discussions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runCopilotSession.mockResolvedValue({
      tokensIn: 80,
      tokensOut: 30,
      toolCalls: 2,
      testRuns: 0,
      filesWritten: 0,
      sessionTime: 5,
      agentMessage: "Great question!",
      narrative: "Responded to discussion.",
    });
  });

  it("throws if discussionUrl is missing", async () => {
    const ctx = createMockContext({ discussionUrl: "" });
    await expect(discussions(ctx)).rejects.toThrow("discussions task requires discussion-url input");
  });

  it("fetches discussion via GraphQL before calling runCopilotSession", async () => {
    const octokit = createMockOctokit();
    const ctx = createMockContext({ octokit });

    await discussions(ctx);

    // First graphql call should be the fetch query
    expect(octokit.graphql).toHaveBeenCalled();
    const firstCall = octokit.graphql.mock.calls[0][0];
    expect(firstCall).toContain("test-owner");
    expect(firstCall).toContain("test-repo");
    expect(firstCall).toContain("123");
    // Should call runCopilotSession
    expect(runCopilotSession).toHaveBeenCalledTimes(1);
  });

  it("includes discussion content in the prompt", async () => {
    const ctx = createMockContext();
    await discussions(ctx);

    const args = runCopilotSession.mock.calls[0][0];
    expect(args.userPrompt).toContain("Test Discussion");
    expect(args.userPrompt).toContain("Discussion body text");
    expect(args.userPrompt).toContain("First comment");
    expect(args.userPrompt).toContain("user1");
    expect(args.agentPrompt).toContain("this repository");
  });

  it("returns discussion-nop outcome by default (no action tool called)", async () => {
    const ctx = createMockContext();
    const result = await discussions(ctx);

    expect(result.outcome).toBe("discussion-nop");
    expect(result.action).toBe("nop");
    expect(result.tokensUsed).toBe(110);
    expect(result.model).toBe("claude-sonnet-4");
  });

  it("handles GraphQL failure gracefully and still calls runCopilotSession", async () => {
    const octokit = createMockOctokit();
    octokit.graphql.mockRejectedValue(new Error("GraphQL query failed"));
    const ctx = createMockContext({ octokit });

    const result = await discussions(ctx);

    expect(runCopilotSession).toHaveBeenCalled();
    expect(result.outcome).toContain("discussion-");
  });

  it("still proceeds when discussion URL cannot be parsed", async () => {
    const ctx = createMockContext({ discussionUrl: "https://not-github.com/invalid/url" });

    const result = await discussions(ctx);

    // GraphQL should not be called since URL did not match
    expect(ctx.octokit.graphql).not.toHaveBeenCalled();
    expect(runCopilotSession).toHaveBeenCalled();
    expect(result.outcome).toContain("discussion-");
  });

  it("passes excludedTools to prevent file writes and test runs", async () => {
    const ctx = createMockContext();
    await discussions(ctx);

    const args = runCopilotSession.mock.calls[0][0];
    expect(args.excludedTools).toContain("write_file");
    expect(args.excludedTools).toContain("run_tests");
  });

  it("passes createTools function to runCopilotSession", async () => {
    const ctx = createMockContext();
    await discussions(ctx);

    const args = runCopilotSession.mock.calls[0][0];
    expect(typeof args.createTools).toBe("function");
  });
});
