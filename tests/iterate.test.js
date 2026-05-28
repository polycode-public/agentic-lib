// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import {
  snapshotDir,
  countChanges,
  readTransformationCost,
  readBudget,
  formatIterationResults,
} from "../src/iterate.js";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

function makeTmpDir() {
  const dir = join(tmpdir(), `iterate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("iterate", () => {
  describe("snapshotDir", () => {
    it("returns empty object for non-existent directory", () => {
      expect(snapshotDir("/tmp/does-not-exist-99999")).toEqual({});
    });

    it("captures file contents", () => {
      const dir = makeTmpDir();
      writeFileSync(join(dir, "a.js"), "const a = 1;");
      writeFileSync(join(dir, "b.js"), "const b = 2;");
      const snap = snapshotDir(dir);
      expect(snap["a.js"]).toBe("const a = 1;");
      expect(snap["b.js"]).toBe("const b = 2;");
      rmSync(dir, { recursive: true });
    });
  });

  describe("countChanges", () => {
    it("returns 0 for identical snapshots", () => {
      const snap = { "a.js": "x", "b.js": "y" };
      expect(countChanges(snap, snap)).toBe(0);
    });

    it("counts modified files", () => {
      expect(countChanges({ "a.js": "old" }, { "a.js": "new" })).toBe(1);
    });

    it("counts added files", () => {
      expect(countChanges({}, { "new.js": "content" })).toBe(1);
    });

    it("counts deleted files", () => {
      expect(countChanges({ "old.js": "content" }, {})).toBe(1);
    });

    it("counts all changes", () => {
      const before = { "keep.js": "same", "modify.js": "old", "delete.js": "gone" };
      const after = { "keep.js": "same", "modify.js": "new", "add.js": "new" };
      expect(countChanges(before, after)).toBe(3);
    });
  });

  describe("readTransformationCost", () => {
    it("returns 0 when no log file exists", () => {
      expect(readTransformationCost("/tmp/does-not-exist-99999")).toBe(0);
    });

    it("sums cost lines from intentïon.md", () => {
      const dir = makeTmpDir();
      writeFileSync(
        join(dir, "intentïon.md"),
        [
          "# intentïon Activity Log",
          "## transform at 2026-03-06T20:00:00Z",
          "**agentic-lib transformation cost:** 1",
          "---",
          "## fix-code at 2026-03-06T20:05:00Z",
          "**agentic-lib transformation cost:** 1",
          "---",
          "## maintain-features at 2026-03-06T20:10:00Z",
          "**agentic-lib transformation cost:** 0",
          "---",
        ].join("\n"),
      );
      expect(readTransformationCost(dir)).toBe(2);
      rmSync(dir, { recursive: true });
    });
  });

  describe("readBudget", () => {
    it("returns 8 when no config file exists", () => {
      expect(readBudget("/tmp/does-not-exist-99999")).toBe(8);
    });

    it("reads transformation-budget from TOML", () => {
      const dir = makeTmpDir();
      writeFileSync(join(dir, "agentic-lib.toml"), 'transformation-budget = 16\n[paths]\nsource = "src/"');
      expect(readBudget(dir)).toBe(16);
      rmSync(dir, { recursive: true });
    });

    it("returns 8 when transformation-budget is not set", () => {
      const dir = makeTmpDir();
      writeFileSync(join(dir, "agentic-lib.toml"), '[paths]\nsource = "src/"');
      expect(readBudget(dir)).toBe(8);
      rmSync(dir, { recursive: true });
    });
  });

  describe("formatIterationResults", () => {
    it("formats results with cycles and summary", () => {
      const results = [
        { cycle: 1, steps: [{ step: "transform", success: true, elapsed: "5.0" }], testsPassed: true, filesChanged: 2, cost: 1, totalCost: 1, budget: 4, elapsed: "10.0", model: "gpt-5-mini" },
        { stopped: true, reason: "tests passed 2 consecutive cycles" },
      ];
      const output = formatIterationResults(results, 1, 4);
      expect(output).toContain("Cycle 1");
      expect(output).toContain("Files changed: 2");
      expect(output).toContain("PASS");
      expect(output).toContain("Stopped:");
      expect(output).toContain("Cycles completed: 1");
    });

    it("shows budget exhaustion", () => {
      const results = [{ stopped: true, reason: "budget exhausted (4/4)" }];
      const output = formatIterationResults(results, 4, 4);
      expect(output).toContain("budget exhausted");
      expect(output).toContain("Total cost: 4/4");
    });
  });
});
