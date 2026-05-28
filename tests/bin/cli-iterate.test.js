// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, "../..");
const cliPath = resolve(pkgRoot, "bin/agentic-lib.js");

describe("CLI iterate", () => {
  describe("help and flag parsing", () => {
    it("--help shows help text", () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: "utf8", timeout: 10000 });
      expect(output).toContain("agentic-lib");
      expect(output).toContain("iterate");
    });

    it("help includes --issue flag", () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: "utf8", timeout: 10000 });
      expect(output).toContain("--issue");
    });

    it("help includes --pr flag", () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: "utf8", timeout: 10000 });
      expect(output).toContain("--pr");
    });

    it("help includes --discussion flag", () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: "utf8", timeout: 10000 });
      expect(output).toContain("--discussion");
    });

    it("help includes --agent flag", () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: "utf8", timeout: 10000 });
      expect(output).toContain("--agent");
    });

    it("help includes --model flag", () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: "utf8", timeout: 10000 });
      expect(output).toContain("--model");
    });

    it("help includes --timeout flag", () => {
      const output = execSync(`node ${cliPath} --help`, { encoding: "utf8", timeout: 10000 });
      expect(output).toContain("--timeout");
    });

    it("--list-missions lists available seeds and exits 0", () => {
      const output = execSync(`node ${cliPath} iterate --list-missions`, { encoding: "utf8", timeout: 10000 });
      expect(output).toContain("6-kyu-understand-hamming-distance");
      expect(output).toContain("Available missions");
    });

    it("version command shows version", () => {
      const output = execSync(`node ${cliPath} version`, { encoding: "utf8", timeout: 10000 });
      const pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf8"));
      expect(output.trim()).toBe(pkg.version);
    });
  });

  describe("error paths", () => {
    let tmpDir;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), "cli-test-"));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it("iterate with no mission and no MISSION.md exits with error", () => {
      try {
        execSync(`node ${cliPath} iterate --target ${tmpDir}`, {
          encoding: "utf8",
          timeout: 30000,
          env: { ...process.env, COPILOT_GITHUB_TOKEN: "" },
        });
        // Should not reach here
        expect.fail("Expected command to fail");
      } catch (err) {
        expect(err.stderr || err.stdout || "").toContain("No mission");
      }
    });

    it("unknown command exits with error", () => {
      try {
        execSync(`node ${cliPath} nonexistent-command`, {
          encoding: "utf8",
          timeout: 10000,
        });
        expect.fail("Expected command to fail");
      } catch (err) {
        expect(err.stderr || err.stdout || "").toContain("Unknown command");
      }
    });
  });
});
