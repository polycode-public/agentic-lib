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
    tokensIn: 60,
    tokensOut: 30,
    toolCalls: 2,
    testRuns: 0,
    filesWritten: 1,
    sessionTime: 6,
    agentMessage: "library updated",
    narrative: "Maintained library.",
  }),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, existsSync: vi.fn().mockReturnValue(false), readdirSync: vi.fn().mockReturnValue([]), statSync: vi.fn().mockReturnValue({ size: 200 }) };
});

import { maintainLibrary } from "../../../../src/actions/agentic-step/tasks/maintain-library.js";
import { readOptionalFile } from "../../../../src/actions/agentic-step/copilot.js";
const { runCopilotSession } = await import("../../../../src/copilot/copilot-session.js");

// --- Helpers ---

function createMockConfig(overrides = {}) {
  return {
    paths: {
      mission: { path: "MISSION.md" },
      librarySources: { path: "SOURCES.md" },
      library: { path: "library/", limit: 32 },
    },
    readOnlyPaths: ["README.md"],
    tuning: {},
    ...overrides,
  };
}

function createMockContext(overrides = {}) {
  return {
    task: "maintain-library",
    config: createMockConfig(),
    instructions: "",
    writablePaths: ["library/"],
    model: "claude-sonnet-4",
    ...overrides,
  };
}

// --- Tests ---

describe("tasks/maintain-library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readOptionalFile.mockReturnValue("");
    runCopilotSession.mockResolvedValue({
      tokensIn: 60,
      tokensOut: 30,
      toolCalls: 2,
      testRuns: 0,
      filesWritten: 1,
      sessionTime: 6,
      agentMessage: "library updated",
      narrative: "Maintained library.",
    });
  });

  it("discovers sources when SOURCES.md is empty", async () => {
    readOptionalFile.mockImplementation((path) => {
      if (path === "MISSION.md") return "# Mission\nA JavaScript library for Hamming distance.";
      return "";
    });
    const result = await maintainLibrary(createMockContext());

    expect(result.outcome).toBe("library-maintained");
    expect(result.details).toContain("Maintained sources and library");
    expect(runCopilotSession).toHaveBeenCalledTimes(1);
    const args = runCopilotSession.mock.calls[0][0];
    expect(args.userPrompt).toContain("no URLs yet");
    expect(args.userPrompt).toContain("Hamming distance");
    expect(args.userPrompt).toContain("Step 1");
    expect(args.userPrompt).toContain("Step 2");
  });

  it("discovers sources when SOURCES.md has no URLs", async () => {
    readOptionalFile.mockImplementation((path) => {
      if (path === "MISSION.md") return "# Mission\nBuild something.";
      return "# Sources\n\n";
    });
    const result = await maintainLibrary(createMockContext());
    expect(result.outcome).toBe("library-maintained");
    expect(runCopilotSession).toHaveBeenCalledTimes(1);
  });

  it("includes sources in prompt when URLs exist", async () => {
    readOptionalFile.mockImplementation((path) => {
      if (path === "MISSION.md") return "# Mission\nTest mission";
      return "- https://example.com/docs\n- https://nodejs.org/api";
    });
    await maintainLibrary(createMockContext());

    const args = runCopilotSession.mock.calls[0][0];
    expect(args.userPrompt).toContain("https://example.com/docs");
    expect(args.userPrompt).toContain("https://nodejs.org/api");
    expect(args.agentPrompt).toContain("knowledge librarian");
  });

  it("returns library-maintained outcome on happy path", async () => {
    readOptionalFile.mockImplementation((path) => {
      if (path === "MISSION.md") return "# Mission\nTest";
      return "- https://example.com/docs";
    });
    const result = await maintainLibrary(createMockContext());

    expect(result.outcome).toBe("library-maintained");
    expect(result.tokensUsed).toBe(90);
    expect(result.model).toBe("claude-sonnet-4");
  });
});
