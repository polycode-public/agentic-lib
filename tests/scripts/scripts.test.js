// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const SCRIPTS_DIR = join(import.meta.dirname, "../../src/scripts");

const allFiles = readdirSync(SCRIPTS_DIR).sort();
const jsFiles = allFiles.filter((f) => f.endsWith(".js") || f.endsWith(".cjs"));
const shFiles = allFiles.filter((f) => f.endsWith(".sh"));

describe("src/scripts", () => {
  it("has 10 script files", () => {
    expect(allFiles).toHaveLength(10);
  });

  it("has 4 JS scripts", () => {
    expect(jsFiles).toEqual(["build-web.cjs", "generate-library-index.js", "md-to-html.js", "schedule-utils.cjs"]);
  });

  it("has 6 shell scripts", () => {
    expect(shFiles).toHaveLength(6);
  });

  describe.each(jsFiles)("%s parses without syntax errors", (filename) => {
    it("is valid JavaScript", () => {
      const filePath = join(SCRIPTS_DIR, filename);
      // Use node --check to validate syntax (supports ESM import/export)
      expect(() => execSync(`node --check "${filePath}"`, { stdio: "pipe" })).not.toThrow();
    });
  });

  describe.each(shFiles)("%s exists", (filename) => {
    it("file is present on disk", () => {
      expect(existsSync(join(SCRIPTS_DIR, filename))).toBe(true);
    });
  });
});
