// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { isPathWritable, createAgentTools } from "../../src/copilot/tools.js";

describe("tools.js", () => {
  describe("isPathWritable", () => {
    it("allows exact file match", () => {
      expect(isPathWritable("/workspace/src/main.js", ["/workspace/src/main.js"])).toBe(true);
    });

    it("allows path inside directory with trailing slash", () => {
      expect(isPathWritable("/workspace/src/lib/main.js", ["/workspace/src/"])).toBe(true);
    });

    it("allows path inside directory without trailing slash", () => {
      expect(isPathWritable("/workspace/src/lib/main.js", ["/workspace/src"])).toBe(true);
    });

    it("blocks path outside writable paths", () => {
      expect(isPathWritable("/etc/passwd", ["/workspace/src/"])).toBe(false);
    });

    it("blocks partial prefix match that is not a directory boundary", () => {
      // /workspace/src-other/file.js should NOT match /workspace/src
      expect(isPathWritable("/workspace/src-other/file.js", ["/workspace/src"])).toBe(false);
    });

    it("allows when multiple writable paths provided and one matches", () => {
      expect(isPathWritable("/workspace/tests/main.test.js", ["/workspace/src/", "/workspace/tests/"])).toBe(true);
    });

    it("blocks when no writable paths provided", () => {
      expect(isPathWritable("/workspace/src/main.js", [])).toBe(false);
    });
  });

  describe("createAgentTools", () => {
    let tmpDir;
    const silentLogger = { info: () => {}, warning: () => {}, error: () => {}, debug: () => {} };
    const mockDefineTool = (name, config) => ({ name, ...config });

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), "tools-test-"));
      writeFileSync(join(tmpDir, "hello.txt"), "Hello, world!");
      mkdirSync(join(tmpDir, "subdir"));
      writeFileSync(join(tmpDir, "subdir", "nested.txt"), "Nested content");
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it("returns 4 tools", () => {
      const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
      expect(tools).toHaveLength(4);
    });

    it("returns tools with expected names", () => {
      const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
      const names = tools.map((t) => t.name);
      expect(names).toEqual(["read_file", "write_file", "list_files", "run_command"]);
    });

    it("throws when no defineToolFn provided", () => {
      expect(() => createAgentTools([tmpDir + "/"], silentLogger)).toThrow("requires defineToolFn");
    });

    describe("read_file tool", () => {
      it("reads an existing file", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const readFile = tools[0];
        const result = readFile.handler({ path: join(tmpDir, "hello.txt") });
        expect(result.content).toBe("Hello, world!");
      });

      it("returns error for non-existent file", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const readFile = tools[0];
        const result = readFile.handler({ path: join(tmpDir, "nonexistent.txt") });
        expect(result.error).toContain("not found");
      });
    });

    describe("write_file tool", () => {
      it("writes to a writable path", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const writeFile = tools[1];
        const outPath = join(tmpDir, "output.txt");
        const result = writeFile.handler({ path: outPath, content: "New content" });
        expect(result.success).toBe(true);
        expect(readFileSync(outPath, "utf8")).toBe("New content");
      });

      it("rejects writes outside writable paths", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const writeFile = tools[1];
        const result = writeFile.handler({ path: "/tmp/outside-writable.txt", content: "bad" });
        expect(result.error).toContain("not writable");
      });

      it("creates parent directories automatically", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const writeFile = tools[1];
        const outPath = join(tmpDir, "new-dir", "deep", "file.txt");
        const result = writeFile.handler({ path: outPath, content: "Deep content" });
        expect(result.success).toBe(true);
        expect(readFileSync(outPath, "utf8")).toBe("Deep content");
      });
    });

    describe("list_files tool", () => {
      it("lists directory contents", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const listFiles = tools[2];
        const result = listFiles.handler({ path: tmpDir });
        expect(result.files).toContain("hello.txt");
        expect(result.files).toContain("subdir/");
      });

      it("returns error for non-existent directory", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const listFiles = tools[2];
        const result = listFiles.handler({ path: join(tmpDir, "nonexistent") });
        expect(result.error).toContain("not found");
      });
    });

    describe("run_command tool", () => {
      it("runs a shell command and returns stdout", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const runCommand = tools[3];
        const result = runCommand.handler({ command: "echo hello" });
        expect(result.stdout.trim()).toBe("hello");
        expect(result.exitCode).toBe(0);
      });

      it("blocks git commit command", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const runCommand = tools[3];
        const result = runCommand.handler({ command: "git commit -m test" });
        expect(result.error).toContain("not allowed");
      });

      it("blocks git push command", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const runCommand = tools[3];
        const result = runCommand.handler({ command: "git push origin main" });
        expect(result.error).toContain("not allowed");
      });

      it("blocks git add command", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const runCommand = tools[3];
        const result = runCommand.handler({ command: "git add ." });
        expect(result.error).toContain("not allowed");
      });

      it("blocks git reset command", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const runCommand = tools[3];
        const result = runCommand.handler({ command: "git reset --hard HEAD" });
        expect(result.error).toContain("not allowed");
      });

      it("blocks git checkout command", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const runCommand = tools[3];
        const result = runCommand.handler({ command: "git checkout main" });
        expect(result.error).toContain("not allowed");
      });

      it("blocks git rebase command", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const runCommand = tools[3];
        const result = runCommand.handler({ command: "git rebase main" });
        expect(result.error).toContain("not allowed");
      });

      it("blocks git merge command", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const runCommand = tools[3];
        const result = runCommand.handler({ command: "git merge feature" });
        expect(result.error).toContain("not allowed");
      });

      it("blocks git stash command", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const runCommand = tools[3];
        const result = runCommand.handler({ command: "git stash" });
        expect(result.error).toContain("not allowed");
      });

      it("allows git status (read-only)", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const runCommand = tools[3];
        const result = runCommand.handler({ command: "git status", cwd: tmpDir });
        // May or may not be a git repo but should not be blocked
        expect(result.error || "").not.toContain("not allowed");
      });

      it("allows git log (read-only)", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const runCommand = tools[3];
        const result = runCommand.handler({ command: "git log --oneline -1", cwd: tmpDir });
        expect(result.error || "").not.toContain("not allowed");
      });

      it("allows git diff (read-only)", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const runCommand = tools[3];
        const result = runCommand.handler({ command: "git diff", cwd: tmpDir });
        expect(result.error || "").not.toContain("not allowed");
      });

      it("returns exit code and stderr on failure", () => {
        const tools = createAgentTools([tmpDir + "/"], silentLogger, mockDefineTool);
        const runCommand = tools[3];
        const result = runCommand.handler({ command: "false" });
        expect(result.exitCode).not.toBe(0);
      });
    });
  });
});
