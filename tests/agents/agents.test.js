// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const AGENTS_DIR = join(import.meta.dirname, "../../.github/agents");

const allFiles = readdirSync(AGENTS_DIR).sort();
const mdFiles = allFiles.filter((f) => f.endsWith(".md"));

describe(".github/agents", () => {
  it("has 13 agent prompt files", () => {
    expect(mdFiles).toHaveLength(13);
  });

  it("contains only .md files", () => {
    expect(allFiles).toEqual(mdFiles);
  });

  describe.each(mdFiles)("%s", (filename) => {
    it("is non-empty", () => {
      const stat = statSync(join(AGENTS_DIR, filename));
      expect(stat.size).toBeGreaterThan(0);
    });

    it("contains text content", () => {
      const content = readFileSync(join(AGENTS_DIR, filename), "utf8");
      expect(content.trim().length).toBeGreaterThan(0);
    });
  });
});
