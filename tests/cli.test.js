// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const ROOT = join(import.meta.dirname, "..");
const CLI = join(ROOT, "bin/agentic-lib.js");
const run = (args) => execFileSync("node", [CLI, ...args], { encoding: "utf8" });

describe("bin/agentic-lib.js", () => {
  it("prints version 8.x", () => {
    expect(run(["version"]).trim()).toMatch(/^8\./);
  });

  it("help mentions init and the mission library", () => {
    const help = run(["--help"]);
    expect(help).toMatch(/init/);
    expect(help).toMatch(/--mission/);
  });

  it("lists the built-in missions", () => {
    const out = run(["init", "--list-missions"]);
    expect(out).toMatch(/7-kyu-understand-fizz-buzz/);
  });

  it("rejects unknown commands", () => {
    expect(() => run(["frobnicate"])).toThrow();
  });

  describe("init --purge --mission into a temp repo", () => {
    let dir;
    beforeAll(() => {
      dir = mkdtempSync(join(tmpdir(), "agentic-lib-init-"));
      // no git remote → GitHub purge is skipped gracefully
      run(["init", "--purge", "--mission", "8-kyu-remember-hello-world", "--target", dir]);
    });
    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    it("lays down the consumer workflows", () => {
      expect(existsSync(join(dir, ".github/workflows/on-intent.yml"))).toBe(true);
      expect(existsSync(join(dir, ".github/workflows/on-review.yml"))).toBe(true);
      expect(existsSync(join(dir, ".github/workflows/on-schedule.yml"))).toBe(true);
    });

    it("writes AGENTS.md, agentic-lib.toml and the mission as INTENT.md", () => {
      expect(existsSync(join(dir, "AGENTS.md"))).toBe(true);
      expect(existsSync(join(dir, "agentic-lib.toml"))).toBe(true);
      expect(readFileSync(join(dir, "INTENT.md"), "utf8")).toMatch(/hello/i);
    });

    it("resets the product source + test to seed", () => {
      expect(existsSync(join(dir, "src/lib/main.js"))).toBe(true);
      expect(existsSync(join(dir, "tests/unit/main.test.js"))).toBe(true);
    });
  });
});
