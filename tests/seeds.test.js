// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { parse as parseToml } from "smol-toml";

const SEEDS = join(import.meta.dirname, "../seeds");

describe("seeds (what init lays into a consumer repo)", () => {
  it("has INTENT.md and the assembled AGENTS.md", () => {
    expect(existsSync(join(SEEDS, "INTENT.md"))).toBe(true);
    const agents = readFileSync(join(SEEDS, "AGENTS.md"), "utf8");
    expect(agents).toMatch(/AGENTS\.md/);
    expect(agents).toMatch(/fixes #N/i);
  });

  it("has a slim agentic-lib.toml with [engine] [caps] [paths]", () => {
    const doc = parseToml(readFileSync(join(SEEDS, "agentic-lib.toml"), "utf8"));
    expect(doc.engine).toBeTruthy();
    expect(doc.engine.engine).toBe("claude");
    expect(doc.engine.hosted).toBeTruthy();
    expect(doc.caps.max_turns).toBeGreaterThan(0);
    expect(doc.paths.intent).toBe("INTENT.md");
  });

  it("ships the thin consumer workflows pinning agentic-lib reusables @v8", () => {
    const wfDir = join(SEEDS, "workflows");
    const files = readdirSync(wfDir)
      .filter((f) => f.endsWith(".yml"))
      .sort();
    expect(files).toEqual(["on-init.yml", "on-intent.yml", "on-review.yml", "on-schedule.yml", "test.yml"]);
    // The reusable-consuming workflows pin agentic-lib @v8; test.yml is a plain CI gate.
    const reusableConsumers = ["on-init.yml", "on-intent.yml", "on-review.yml", "on-schedule.yml"];
    for (const f of reusableConsumers) {
      const content = readFileSync(join(wfDir, f), "utf8");
      expect(content).toMatch(/polycode-public\/agentic-lib\/\.github\/workflows\/[\w-]+\.yml@v8/);
    }
    // on-init pins the init reusable; the delivery trio pin transform.
    expect(readFileSync(join(wfDir, "on-init.yml"), "utf8")).toContain("init.yml@v8");
    for (const f of ["on-intent.yml", "on-review.yml", "on-schedule.yml"]) {
      expect(readFileSync(join(wfDir, f), "utf8")).toContain("transform.yml@v8");
    }
    // test.yml is the mechanical green/red gate: runs the unit suite, no reusable.
    const testWf = readFileSync(join(wfDir, "test.yml"), "utf8");
    expect(testWf).toContain("npm test");
    expect(testWf).not.toContain("transform.yml@v8");
  });

  it("ships the clean product skeleton seeds (library + browser demo + behaviour)", () => {
    for (const f of [
      "src-tests/main.js",
      "src-tests/main.test.js",
      "src-tests/web-lib.js",
      "src-tests/web-index.html",
      "src-tests/web.test.js",
      "src-tests/homepage.test.js",
    ]) {
      expect(existsSync(join(SEEDS, f))).toBe(true);
    }
    // The skeleton carries no delivered example (e.g. fizz-buzz) — purge stays clean.
    expect(readFileSync(join(SEEDS, "src-tests/main.js"), "utf8")).not.toMatch(/fizzBuzz/i);
  });
});
