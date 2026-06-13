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

  it("ships the three thin consumer workflows pinning transform.yml@v8", () => {
    const wfDir = join(SEEDS, "workflows");
    const files = readdirSync(wfDir)
      .filter((f) => f.endsWith(".yml"))
      .sort();
    expect(files).toEqual(["on-intent.yml", "on-review.yml", "on-schedule.yml"]);
    for (const f of files) {
      const content = readFileSync(join(wfDir, f), "utf8");
      expect(content).toContain("agentic-lib/.github/workflows/transform.yml@v8");
    }
  });

  it("ships zero src + test seeds", () => {
    expect(existsSync(join(SEEDS, "src-tests/main.js"))).toBe(true);
    expect(existsSync(join(SEEDS, "src-tests/main.test.js"))).toBe(true);
  });
});
