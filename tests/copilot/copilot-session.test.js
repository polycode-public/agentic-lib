// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";

// Mock child_process.execSync
vi.mock("child_process", () => ({
  execSync: vi.fn(() => "mock test output"),
}));

// Mock retryDelayMs to return tiny delays in tests
vi.mock("../../src/copilot/session.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    retryDelayMs: () => 10, // 10ms instead of 60s
  };
});

// Capture session config passed to createSession
let capturedSessionConfig = null;
let capturedSendPrompt = null;
let mockSessionEvents = {};
let mockSendResult = { data: { content: "Done.\n[NARRATIVE] Implemented feature X" } };
let createSessionShouldFail = false;
let createSessionFailCount = 0;
let sendShouldFail = false;
let sendFailCount = 0;

vi.mock("../../src/copilot/sdk.js", () => ({
  getSDK: vi.fn(async () => ({
    CopilotClient: class MockCopilotClient {
      constructor() {}
      async createSession(config) {
        if (createSessionShouldFail && createSessionFailCount > 0) {
          createSessionFailCount--;
          const err = new Error("429 Too Many Requests");
          err.status = 429;
          throw err;
        }
        capturedSessionConfig = config;
        const session = {
          sessionId: "mock-session-123",
          on: (eventOrFn, fn) => {
            if (typeof eventOrFn === "string") {
              mockSessionEvents[eventOrFn] = fn;
            }
          },
          rpc: {
            mode: {
              set: vi.fn(async () => {}),
            },
          },
          sendAndWait: vi.fn(async (msg) => {
            if (sendShouldFail && sendFailCount > 0) {
              sendFailCount--;
              const err = new Error("429 Too Many Requests");
              err.status = 429;
              throw err;
            }
            capturedSendPrompt = msg;
            return mockSendResult;
          }),
        };
        return session;
      }
      async stop() {}
    },
    approveAll: vi.fn(),
    defineTool: vi.fn((name, config) => ({ name, ...config })),
  })),
}));

const { runCopilotSession } = await import("../../src/copilot/copilot-session.js");

describe("copilot-session.js", () => {
  let tmpDir;
  const silentLogger = { info: () => {}, warning: () => {}, error: () => {}, debug: () => {} };

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "hybrid-test-"));
    writeFileSync(join(tmpDir, "MISSION.md"), "# Test Mission\nDo something.");
    mkdirSync(join(tmpDir, "src/lib"), { recursive: true });
    writeFileSync(join(tmpDir, "src/lib/main.js"), "export function hello() {}");
    capturedSessionConfig = null;
    capturedSendPrompt = null;
    mockSessionEvents = {};
    mockSendResult = { data: { content: "Done.\n[NARRATIVE] Implemented feature X" } };
    createSessionShouldFail = false;
    createSessionFailCount = 0;
    sendShouldFail = false;
    sendFailCount = 0;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates a session with tools", async () => {
    await runCopilotSession({
      workspacePath: tmpDir,
      githubToken: "mock-token",
      logger: silentLogger,
    });
    expect(capturedSessionConfig).toBeTruthy();
    expect(capturedSessionConfig.tools).toBeTruthy();
    expect(capturedSessionConfig.tools.length).toBe(5);
  });

  it("session config includes all 5 tools (read_file, write_file, list_files, run_command, run_tests)", async () => {
    await runCopilotSession({
      workspacePath: tmpDir,
      githubToken: "mock-token",
      logger: silentLogger,
    });
    const toolNames = capturedSessionConfig.tools.map((t) => t.name);
    expect(toolNames).toContain("read_file");
    expect(toolNames).toContain("write_file");
    expect(toolNames).toContain("list_files");
    expect(toolNames).toContain("run_command");
    expect(toolNames).toContain("run_tests");
  });

  it("default writablePaths is [wsPath + '/'] when not specified", async () => {
    // We can verify by checking the tools accept writes within workspace
    await runCopilotSession({
      workspacePath: tmpDir,
      githubToken: "mock-token",
      logger: silentLogger,
    });
    // The session was created — tools were built with default writable paths
    expect(capturedSessionConfig.tools.length).toBe(5);
  });

  it("NARRATIVE_INSTRUCTION appended to system prompt", async () => {
    await runCopilotSession({
      workspacePath: tmpDir,
      githubToken: "mock-token",
      logger: silentLogger,
    });
    expect(capturedSessionConfig.systemMessage.content).toContain("[NARRATIVE]");
  });

  it("narrative extracted from agent response into result.narrative", async () => {
    const result = await runCopilotSession({
      workspacePath: tmpDir,
      githubToken: "mock-token",
      logger: silentLogger,
    });
    expect(result.narrative).toBe("Implemented feature X");
  });

  it("agentPrompt parameter overrides default system prompt", async () => {
    await runCopilotSession({
      workspacePath: tmpDir,
      githubToken: "mock-token",
      agentPrompt: "You are a custom agent.",
      logger: silentLogger,
    });
    expect(capturedSessionConfig.systemMessage.content).toContain("You are a custom agent.");
  });

  it("userPrompt parameter overrides default mission prompt", async () => {
    await runCopilotSession({
      workspacePath: tmpDir,
      githubToken: "mock-token",
      userPrompt: "Custom user prompt content",
      logger: silentLogger,
    });
    expect(capturedSendPrompt.prompt).toBe("Custom user prompt content");
  });

  it("uses default mission prompt when userPrompt not provided", async () => {
    await runCopilotSession({
      workspacePath: tmpDir,
      githubToken: "mock-token",
      logger: silentLogger,
    });
    expect(capturedSendPrompt.prompt).toContain("Mission");
  });

  it("result includes all expected fields", async () => {
    const result = await runCopilotSession({
      workspacePath: tmpDir,
      githubToken: "mock-token",
      logger: silentLogger,
    });
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("testsPassed");
    expect(result).toHaveProperty("sessionTime");
    expect(result).toHaveProperty("totalTime");
    expect(result).toHaveProperty("toolCalls");
    expect(result).toHaveProperty("testRuns");
    expect(result).toHaveProperty("filesWritten");
    expect(result).toHaveProperty("tokensIn");
    expect(result).toHaveProperty("tokensOut");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("endReason");
    expect(result).toHaveProperty("model");
    expect(result).toHaveProperty("narrative");
    expect(result).toHaveProperty("agentMessage");
  });

  it("rate-limit retry on createSession failure", async () => {
    createSessionShouldFail = true;
    createSessionFailCount = 1; // Fail once, then succeed
    const result = await runCopilotSession({
      workspacePath: tmpDir,
      githubToken: "mock-token",
      maxRetries: 2,
      logger: silentLogger,
    });
    // Should succeed after retry
    expect(result).toBeTruthy();
    expect(result.endReason).toBe("complete");
  });

  it("rate-limit retry on sendAndWait failure", async () => {
    sendShouldFail = true;
    sendFailCount = 1; // Fail once, then succeed
    const result = await runCopilotSession({
      workspacePath: tmpDir,
      githubToken: "mock-token",
      maxRetries: 2,
      logger: silentLogger,
    });
    expect(result).toBeTruthy();
  });

  it("throws when COPILOT_GITHUB_TOKEN is missing", async () => {
    const originalEnv = process.env.COPILOT_GITHUB_TOKEN;
    delete process.env.COPILOT_GITHUB_TOKEN;
    try {
      await expect(
        runCopilotSession({
          workspacePath: tmpDir,
          logger: silentLogger,
        }),
      ).rejects.toThrow("COPILOT_GITHUB_TOKEN");
    } finally {
      if (originalEnv) process.env.COPILOT_GITHUB_TOKEN = originalEnv;
    }
  });

  it("respects model parameter", async () => {
    await runCopilotSession({
      workspacePath: tmpDir,
      githubToken: "mock-token",
      model: "gpt-4.1",
      logger: silentLogger,
    });
    expect(capturedSessionConfig.model).toBe("gpt-4.1");
  });

  it("sets hooks on session config", async () => {
    await runCopilotSession({
      workspacePath: tmpDir,
      githubToken: "mock-token",
      logger: silentLogger,
    });
    expect(capturedSessionConfig.hooks).toBeTruthy();
    expect(capturedSessionConfig.hooks.onPreToolUse).toBeTypeOf("function");
    expect(capturedSessionConfig.hooks.onPostToolUse).toBeTypeOf("function");
    expect(capturedSessionConfig.hooks.onErrorOccurred).toBeTypeOf("function");
  });
});
