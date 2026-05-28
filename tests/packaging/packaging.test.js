// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ROOT = join(import.meta.dirname, "../..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

describe("package.json structure", () => {
  it("has a name field", () => {
    expect(pkg.name).toBe("@xn-intenton-z2a/agentic-lib");
  });

  it("has a version field", () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("has type: module", () => {
    expect(pkg.type).toBe("module");
  });

  it("has engines.node >= 24", () => {
    expect(pkg.engines).toBeDefined();
    expect(pkg.engines.node).toMatch(/24/);
  });

  it("has files field restricting what ships", () => {
    expect(Array.isArray(pkg.files)).toBe(true);
    expect(pkg.files.length).toBeGreaterThan(0);
  });

  it("has publishConfig pointing to npmjs registry", () => {
    expect(pkg.publishConfig).toBeDefined();
    expect(pkg.publishConfig.registry).toContain("registry.npmjs.org");
  });

  it("has required scripts", () => {
    const required = ["test", "linting", "formatting", "security"];
    for (const script of required) {
      expect(pkg.scripts[script]).toBeDefined();
    }
  });

  it("has exports field", () => {
    expect(pkg.exports).toBeDefined();
    expect(pkg.exports["."]).toBeDefined();
    expect(pkg.exports["./copilot"]).toBeDefined();
    expect(pkg.exports["./config"]).toBeDefined();
  });
});

describe("npm pack --dry-run", () => {
  // Use --json for deterministic output across npm versions
  const packJson = JSON.parse(
    execSync("npm pack --dry-run --json", { cwd: ROOT, encoding: "utf8" }), // eslint-disable-line sonarjs/no-os-command-from-path
  );
  const filePaths = packJson[0].files.map((f) => f.path);

  it("lists expected files", () => {
    expect(filePaths).toContain("package.json");
  });

  it("does not include root test files", () => {
    const testFiles = filePaths.filter((p) => p.startsWith("tests/"));
    expect(testFiles).toEqual([]);
  });

  it("includes distributable content", () => {
    expect(filePaths.some((p) => p.startsWith(".github/workflows/agentic-lib-"))).toBe(true);
    expect(filePaths).toContain("agentic-lib.toml");
    expect(filePaths).toContain("src/dist-transform.js");
    expect(filePaths.some((p) => p.startsWith("src/actions/"))).toBe(true);
    expect(filePaths.some((p) => p.startsWith(".github/agents/"))).toBe(true);
    expect(filePaths.some((p) => p.startsWith("src/seeds/"))).toBe(true);
  });

  it("includes bin/ CLI", () => {
    expect(filePaths).toContain("bin/agentic-lib.js");
  });

  it("does not include dev files (except distributable workflows)", () => {
    const devFiles = filePaths.filter(
      (p) =>
        (p.startsWith(".github/") && !p.startsWith(".github/workflows/agentic-lib-") && !p.startsWith(".github/agents/")) ||
        p.startsWith("node_modules/") ||
        p.startsWith("coverage/"),
    );
    expect(devFiles).toEqual([]);
  });

  it("does not include secrets", () => {
    const secretFiles = filePaths.filter((p) => p.includes(".env") || p.includes("secrets") || p.includes(".kdbx"));
    expect(secretFiles).toEqual([]);
  });
});

describe("package metadata", () => {
  it("has a description", () => {
    expect(typeof pkg.description).toBe("string");
    expect(pkg.description.length).toBeGreaterThan(10);
  });

  it("has an author", () => {
    expect(pkg.author).toBeDefined();
  });

  it("has a license", () => {
    expect(pkg.license).toBeDefined();
    expect(pkg.license).toContain("GPL");
  });
});
