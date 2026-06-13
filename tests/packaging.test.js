// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ROOT = join(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

describe("package.json", () => {
  it("is the @polycode-public/agentic-lib package", () => {
    expect(pkg.name).toBe("@polycode-public/agentic-lib");
  });

  it("is version 8.x", () => {
    expect(pkg.version).toMatch(/^8\./);
  });

  it("is dual-licensed AGPL-3.0-only OR MIT", () => {
    expect(pkg.license).toBe("(AGPL-3.0-only OR MIT)");
  });

  it("is an ESM package on Node >= 24", () => {
    expect(pkg.type).toBe("module");
    expect(pkg.engines.node).toMatch(/24/);
  });

  it("no longer depends on the GitHub Copilot SDK", () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps["@github/copilot-sdk"]).toBeUndefined();
  });

  it("runtime deps are slimmed to smol-toml", () => {
    expect(Object.keys(pkg.dependencies)).toEqual(["smol-toml"]);
  });

  it("ships the transform workflow + content via files[]", () => {
    expect(pkg.files).toContain(".github/workflows/transform.yml");
    expect(pkg.files).toContain("missions/");
    expect(pkg.files).toContain("seeds/");
    expect(pkg.files).toContain("components/");
  });

  it("exposes the agentic-lib bin", () => {
    expect(pkg.bin["agentic-lib"]).toBe("bin/agentic-lib.js");
  });
});

describe("npm pack --dry-run", () => {
  const packJson = JSON.parse(execSync("npm pack --dry-run --json", { cwd: ROOT, encoding: "utf8" }));
  const filePaths = packJson[0].files.map((f) => f.path);

  it("includes the bill of materials", () => {
    expect(filePaths).toContain("package.json");
    expect(filePaths).toContain("bin/agentic-lib.js");
    expect(filePaths).toContain(".github/workflows/transform.yml");
    expect(filePaths.some((p) => p.startsWith("missions/"))).toBe(true);
    expect(filePaths.some((p) => p.startsWith("seeds/"))).toBe(true);
    expect(filePaths.some((p) => p.startsWith("components/"))).toBe(true);
  });

  it("does not ship tests or the deleted engine", () => {
    expect(filePaths.filter((p) => p.startsWith("tests/"))).toEqual([]);
    expect(filePaths.filter((p) => p.startsWith("src/copilot/"))).toEqual([]);
  });
});
