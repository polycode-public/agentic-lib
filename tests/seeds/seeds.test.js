// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parse as parseToml } from "smol-toml";

const SEEDS_DIR = join(import.meta.dirname, "../../src/seeds");
const ROOT_DIR = join(import.meta.dirname, "../..");

const allFiles = readdirSync(SEEDS_DIR).sort();

describe("src/seeds", () => {
  it("has 14 seed entries (13 files + missions directory)", () => {
    expect(allFiles).toHaveLength(14);
  });

  describe("zero-package.json", () => {
    let pkg;

    it("is valid JSON", () => {
      const content = readFileSync(join(SEEDS_DIR, "zero-package.json"), "utf8");
      pkg = JSON.parse(content);
      expect(pkg).toBeTruthy();
    });

    it("has required fields", () => {
      const content = readFileSync(join(SEEDS_DIR, "zero-package.json"), "utf8");
      pkg = JSON.parse(content);
      expect(pkg.name).toBeTruthy();
      expect(pkg.version).toBeTruthy();
      expect(pkg.type).toBe("module");
    });

    it("requires Node >= 24", () => {
      const content = readFileSync(join(SEEDS_DIR, "zero-package.json"), "utf8");
      pkg = JSON.parse(content);
      expect(pkg.engines?.node).toMatch(/>=24/);
    });

    it("has a test script", () => {
      const content = readFileSync(join(SEEDS_DIR, "zero-package.json"), "utf8");
      pkg = JSON.parse(content);
      expect(pkg.scripts?.test).toBeTruthy();
    });

    it("has a test:behaviour script for Playwright", () => {
      const content = readFileSync(join(SEEDS_DIR, "zero-package.json"), "utf8");
      pkg = JSON.parse(content);
      expect(pkg.scripts?.["test:behaviour"]).toContain("playwright");
    });

    it("has @playwright/test as a devDependency", () => {
      const content = readFileSync(join(SEEDS_DIR, "zero-package.json"), "utf8");
      pkg = JSON.parse(content);
      expect(pkg.devDependencies?.["@playwright/test"]).toBeTruthy();
    });
  });

  describe("zero-behaviour.test.js", () => {
    it("exists and imports @playwright/test", () => {
      const content = readFileSync(join(SEEDS_DIR, "zero-behaviour.test.js"), "utf8");
      expect(content).toContain("@playwright/test");
    });

    it("takes a screenshot to SCREENSHOT_INDEX.png", () => {
      const content = readFileSync(join(SEEDS_DIR, "zero-behaviour.test.js"), "utf8");
      expect(content).toContain("SCREENSHOT_INDEX.png");
    });
  });

  describe("zero-playwright.config.js", () => {
    it("exists and defines a test directory", () => {
      const content = readFileSync(join(SEEDS_DIR, "zero-playwright.config.js"), "utf8");
      expect(content).toContain("testDir");
      expect(content).toContain("tests/behaviour");
    });
  });

  describe("agentic-lib.toml (root config)", () => {
    it("is valid TOML (ignoring #@dist comments)", () => {
      const content = readFileSync(join(ROOT_DIR, "agentic-lib.toml"), "utf8");
      const doc = parseToml(content);
      expect(doc).toBeTruthy();
    });

    it("has required sections", () => {
      const content = readFileSync(join(ROOT_DIR, "agentic-lib.toml"), "utf8");
      const doc = parseToml(content);
      expect(doc.schedule).toBeTruthy();
      expect(doc.paths).toBeTruthy();
      expect(doc.execution).toBeTruthy();
      expect(doc.limits).toBeTruthy();
      expect(doc.bot).toBeTruthy();
    });

    it("has source and tests paths pointing to test/", () => {
      const content = readFileSync(join(ROOT_DIR, "agentic-lib.toml"), "utf8");
      const doc = parseToml(content);
      expect(doc.paths.source).toMatch(/^test\//);
      expect(doc.paths.tests).toMatch(/^test\//);
    });
  });
});
