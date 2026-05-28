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
  readOptionalFile: vi.fn().mockReturnValue(""),
  formatPathsSection: vi.fn().mockReturnValue("## File Paths\n- mock"),
  extractNarrative: vi.fn().mockImplementation((_content, fallback) => fallback || ""),
  NARRATIVE_INSTRUCTION: "\n\nAfter completing your task...",
}));

// Mock runCopilotSession
vi.mock("../../../../src/copilot/copilot-session.js", () => ({
  runCopilotSession: vi.fn().mockResolvedValue({
    testsPassed: true,
    tokensIn: 100,
    tokensOut: 50,
    toolCalls: 3,
    testRuns: 1,
    filesWritten: 1,
    sessionTime: 10,
    agentMessage: "transformed code",
    narrative: "Transformation complete.",
  }),
}));

// Mock github-tools
vi.mock("../../../../src/copilot/github-tools.js", () => ({
  createGitHubTools: vi.fn().mockReturnValue([]),
  createGitTools: vi.fn().mockReturnValue([]),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, existsSync: vi.fn().mockReturnValue(false), writeFileSync: vi.fn() };
});

const { transform } = await import("../../../../src/actions/agentic-step/tasks/transform.js");
const { readOptionalFile } = await import("../../../../src/actions/agentic-step/copilot.js");
const { runCopilotSession } = await import("../../../../src/copilot/copilot-session.js");

function createMockOctokit() {
  return {
    rest: {
      issues: {
        get: vi.fn().mockResolvedValue({ data: { number: 1, title: "Test", body: "body", labels: [] } }),
        listForRepo: vi.fn().mockResolvedValue({ data: [] }),
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
    readOnlyPaths: ["README.md"],
    tuning: {},
    ...overrides,
  };
}

function createMockContext(overrides = {}) {
  return {
    task: "transform",
    config: createMockConfig(),
    instructions: "",
    issueNumber: "",
    writablePaths: ["src/", "tests/"],
    testCommand: "npm test",
    model: "claude-sonnet-4",
    octokit: createMockOctokit(),
    repo: { owner: "test-owner", repo: "test-repo" },
    ...overrides,
  };
}

describe("tasks/transform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readOptionalFile.mockReturnValue("");
    runCopilotSession.mockResolvedValue({
      testsPassed: true,
      tokensIn: 100,
      tokensOut: 50,
      toolCalls: 3,
      testRuns: 1,
      filesWritten: 1,
      sessionTime: 10,
      agentMessage: "transformed code",
      narrative: "Transformation complete.",
    });
  });

  it("returns nop if no mission file found", async () => {
    readOptionalFile.mockReturnValue("");
    const result = await transform(createMockContext());
    expect(result.outcome).toBe("nop");
    expect(result.details).toBe("No mission file found");
  });

  it("returns transformed outcome with token count on happy path", async () => {
    readOptionalFile.mockReturnValue("Build a tool");
    const result = await transform(createMockContext());
    expect(result.outcome).toBe("transformed");
    expect(result.tokensUsed).toBe(150);
    expect(result.model).toBe("claude-sonnet-4");
  });

  it("calls runCopilotSession with correct model and writablePaths", async () => {
    readOptionalFile.mockReturnValue("Build a tool");
    await transform(createMockContext());
    expect(runCopilotSession).toHaveBeenCalledTimes(1);
    const args = runCopilotSession.mock.calls[0][0];
    expect(args.model).toBe("claude-sonnet-4");
    expect(args.writablePaths).toEqual(["src/", "tests/"]);
    expect(args.agentPrompt).toContain("autonomous code transformation agent");
  });

  it("includes target issue in prompt when issueNumber is set", async () => {
    readOptionalFile.mockReturnValue("Build a tool");
    const octokit = createMockOctokit();
    octokit.rest.issues.get.mockResolvedValue({
      data: { number: 7, title: "Add hamming distance", body: "Implement it", labels: [{ name: "ready" }] },
    });
    await transform(createMockContext({ octokit, issueNumber: "7" }));
    const args = runCopilotSession.mock.calls[0][0];
    expect(args.userPrompt).toContain("Issue #7");
    expect(args.userPrompt).toContain("Add hamming distance");
  });

  it("passes excludedTools to runCopilotSession", async () => {
    readOptionalFile.mockReturnValue("Build a tool");
    await transform(createMockContext());
    const args = runCopilotSession.mock.calls[0][0];
    expect(args.excludedTools).toContain("dispatch_workflow");
    expect(args.excludedTools).toContain("close_issue");
  });

  it("passes createTools function to runCopilotSession", async () => {
    readOptionalFile.mockReturnValue("Build a tool");
    await transform(createMockContext());
    const args = runCopilotSession.mock.calls[0][0];
    expect(typeof args.createTools).toBe("function");
  });

  it("skips when MISSION_COMPLETE.md exists and not maintenance mode", async () => {
    readOptionalFile.mockReturnValue("Build a tool");
    const { existsSync } = await import("fs");
    existsSync.mockReturnValue(true);
    const result = await transform(createMockContext());
    expect(result.outcome).toBe("nop");
    expect(result.details).toContain("Mission already complete");
    existsSync.mockReturnValue(false);
  });
});
