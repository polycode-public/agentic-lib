// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Mock @actions/core before importing tools
vi.mock("@actions/core", () => ({
  info: vi.fn(),
  warning: vi.fn(),
}));

// Mock @github/copilot-sdk defineTool to just return the config as-is
vi.mock("@github/copilot-sdk", () => ({
  defineTool: (name, config) => ({ name, ...config }),
  approveAll: () => true,
}));

const { createAgentTools } = await import("../../../src/actions/agentic-step/tools.js");

describe("tools", () => {
  let testDir;

  beforeEach(() => {
    vi.clearAllMocks();
    testDir = join(tmpdir(), `agentic-tools-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  it("creates 4 tools", () => {
    const tools = createAgentTools([]);
    expect(tools).toHaveLength(4);
    expect(tools.map((t) => t.name)).toEqual(["read_file", "write_file", "list_files", "run_command"]);
  });

  describe("read_file", () => {
    it("reads an existing file", () => {
      const filePath = join(testDir, "test.txt");
      writeFileSync(filePath, "hello world");
      const tools = createAgentTools([]);
      const readFile = tools.find((t) => t.name === "read_file");
      const result = readFile.handler({ path: filePath });
      expect(result.content).toBe("hello world");
    });

    it("returns error for missing file", () => {
      const tools = createAgentTools([]);
      const readFile = tools.find((t) => t.name === "read_file");
      const result = readFile.handler({ path: "/nonexistent/file.txt" });
      expect(result.error).toContain("File not found");
    });
  });

  describe("write_file", () => {
    it("writes to a writable path", () => {
      const filePath = join(testDir, "output.txt");
      const tools = createAgentTools([testDir]);
      const writeFileTool = tools.find((t) => t.name === "write_file");
      const result = writeFileTool.handler({ path: filePath, content: "written" });
      expect(result.success).toBe(true);
      expect(readFileSync(filePath, "utf8")).toBe("written");
    });

    it("rejects writes to non-writable paths", () => {
      const tools = createAgentTools(["/some/other/path"]);
      const writeFileTool = tools.find((t) => t.name === "write_file");
      const result = writeFileTool.handler({ path: "/etc/passwd", content: "bad" });
      expect(result.error).toContain("not writable");
    });

    it("creates parent directories", () => {
      const filePath = join(testDir, "sub", "dir", "file.txt");
      const tools = createAgentTools([testDir]);
      const writeFileTool = tools.find((t) => t.name === "write_file");
      const result = writeFileTool.handler({ path: filePath, content: "nested" });
      expect(result.success).toBe(true);
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe("list_files", () => {
    it("lists files in a directory", () => {
      writeFileSync(join(testDir, "a.txt"), "");
      writeFileSync(join(testDir, "b.txt"), "");
      const tools = createAgentTools([]);
      const listFiles = tools.find((t) => t.name === "list_files");
      const result = listFiles.handler({ path: testDir });
      expect(result.files).toContain("a.txt");
      expect(result.files).toContain("b.txt");
    });

    it("returns error for missing directory", () => {
      const tools = createAgentTools([]);
      const listFiles = tools.find((t) => t.name === "list_files");
      const result = listFiles.handler({ path: "/nonexistent/dir" });
      expect(result.error).toContain("not found");
    });
  });

  describe("run_command", () => {
    it("runs a simple command", () => {
      const tools = createAgentTools([]);
      const runCommand = tools.find((t) => t.name === "run_command");
      const result = runCommand.handler({ command: "echo hello" });
      expect(result.stdout.trim()).toBe("hello");
      expect(result.exitCode).toBe(0);
    });

    it("captures non-zero exit codes", () => {
      const tools = createAgentTools([]);
      const runCommand = tools.find((t) => t.name === "run_command");
      const result = runCommand.handler({ command: "exit 42" });
      expect(result.exitCode).not.toBe(0);
    });
  });
});
