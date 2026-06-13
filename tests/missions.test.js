// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parse as parseToml } from "smol-toml";

const MISSIONS_DIR = join(import.meta.dirname, "../missions");
const files = readdirSync(MISSIONS_DIR)
  .filter((f) => f.endsWith(".md"))
  .sort();

describe("missions library", () => {
  it("keeps all 19 kyu/dan missions", () => {
    expect(files).toHaveLength(19);
  });

  it("has an index.toml listing every mission", () => {
    const idx = parseToml(readFileSync(join(MISSIONS_DIR, "index.toml"), "utf8"));
    const names = Object.keys(idx.missions).sort();
    expect(names).toEqual(files.map((f) => f.replace(/\.md$/, "")));
    for (const name of names) {
      expect(idx.missions[name].file).toBe(`${name}.md`);
      expect(idx.missions[name].grade).toMatch(/^\d+-(kyu|dan)$/);
    }
  });

  describe.each(files)("%s", (filename) => {
    it("starts with '# Mission' or '# Intent'", () => {
      const content = readFileSync(join(MISSIONS_DIR, filename), "utf8").trimStart();
      expect(content.startsWith("# Mission") || content.startsWith("# Intent")).toBe(true);
    });
  });
});
