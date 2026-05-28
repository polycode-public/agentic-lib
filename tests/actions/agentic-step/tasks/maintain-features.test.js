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
  readOptionalFile: vi.fn().mockReturnValue("mock mission"),
  formatPathsSection: vi.fn().mockReturnValue("## File Paths\n- mock"),
  extractNarrative: vi.fn().mockImplementation((_content, fallback) => fallback || ""),
  NARRATIVE_INSTRUCTION: "\n\nAfter completing your task...",
}));

// Mock runCopilotSession
vi.mock("../../../../src/copilot/copilot-session.js", () => ({
  runCopilotSession: vi.fn().mockResolvedValue({
    tokensIn: 80,
    tokensOut: 40,
    toolCalls: 3,
    testRuns: 0,
    filesWritten: 2,
    sessionTime: 8,
    agentMessage: "features updated",
    narrative: "Maintained features.",
  }),
}));

// Mock github-tools
vi.mock("../../../../src/copilot/github-tools.js", () => ({
  createGitHubTools: vi.fn().mockReturnValue([]),
}));

vi.mock("../../../../src/actions/agentic-step/safety.js", () => ({
  checkWipLimit: vi.fn().mockResolvedValue({ allowed: true, count: 0 }),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, existsSync: vi.fn().mockReturnValue(false), readdirSync: vi.fn().mockReturnValue([]), statSync: vi.fn().mockReturnValue({ size: 400 }) };
});

import { maintainFeatures } from "../../../../src/actions/agentic-step/tasks/maintain-features.js";
import { readOptionalFile } from "../../../../src/actions/agentic-step/copilot.js";
const { runCopilotSession } = await import("../../../../src/copilot/copilot-session.js");

// --- Helpers ---

function createMockOctokit() {
  return {
    rest: {
      issues: {
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
      features: { path: "features/", limit: 4 },
      library: { path: "library/" },
    },
    maintenanceIssuesWipLimit: 1,
    readOnlyPaths: ["README.md"],
    tuning: {},
    ...overrides,
  };
}

function createMockContext(overrides = {}) {
  return {
    task: "maintain-features",
    config: createMockConfig(),
    instructions: "",
    writablePaths: ["features/"],
    model: "claude-sonnet-4",
    octokit: createMockOctokit(),
    repo: { owner: "test-owner", repo: "test-repo" },
    ...overrides,
  };
}

// --- Tests ---

describe("tasks/maintain-features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readOptionalFile.mockReturnValue("mock mission content");
    runCopilotSession.mockResolvedValue({
      tokensIn: 80,
      tokensOut: 40,
      toolCalls: 3,
      testRuns: 0,
      filesWritten: 2,
      sessionTime: 8,
      agentMessage: "features updated",
      narrative: "Maintained features.",
    });
  });

  it("reads mission via readOptionalFile", async () => {
    await maintainFeatures(createMockContext());
    expect(readOptionalFile).toHaveBeenCalledWith("MISSION.md");
  });

  it("calls runCopilotSession with correct parameters", async () => {
    await maintainFeatures(createMockContext());
    expect(runCopilotSession).toHaveBeenCalledTimes(1);
    const args = runCopilotSession.mock.calls[0][0];
    expect(args.model).toBe("claude-sonnet-4");
    expect(args.writablePaths).toEqual(["features/"]);
    expect(args.agentPrompt).toContain("feature lifecycle manager");
    expect(args.userPrompt).toContain("Maximum 4 feature files");
  });

  it("returns features-maintained outcome with correct details", async () => {
    const result = await maintainFeatures(createMockContext());
    expect(result.outcome).toBe("features-maintained");
    expect(result.tokensUsed).toBe(120);
    expect(result.model).toBe("claude-sonnet-4");
    expect(result.details).toContain("existing");
    expect(result.details).toContain("limit 4");
  });

  it("passes excludedTools to prevent tests and orchestration", async () => {
    await maintainFeatures(createMockContext());
    const args = runCopilotSession.mock.calls[0][0];
    expect(args.excludedTools).toContain("run_tests");
    expect(args.excludedTools).toContain("dispatch_workflow");
  });
});
