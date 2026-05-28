// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import { applyDistTransform } from "../../src/dist-transform.js";

describe("applyDistTransform", () => {
  it("uncomments lines starting with #@dist", () => {
    const input = ["on:", "  #@dist schedule:", '  #@dist   - cron: "0 6 * * 1"', "  workflow_dispatch:"].join("\n");

    const result = applyDistTransform(input);
    expect(result).toBe(["on:", "  schedule:", '    - cron: "0 6 * * 1"', "  workflow_dispatch:"].join("\n"));
  });

  it("replaces inline values with #@dist suffix", () => {
    const input = "default: true                #@dist false";
    const result = applyDistTransform(input);
    expect(result).toBe("default: false");
  });

  it("replaces TOML quoted values with #@dist suffix", () => {
    const input = 'mission = "test/MISSION.md"                     #@dist "MISSION.md"';
    const result = applyDistTransform(input);
    expect(result).toBe('mission = "MISSION.md"');
  });

  it("preserves lines without #@dist markers", () => {
    const input = "name: my-workflow\nruns-on: ubuntu-latest";
    const result = applyDistTransform(input);
    expect(result).toBe(input);
  });

  it("handles mixed content correctly", () => {
    const input = [
      "# Comment",
      "on:",
      "  #@dist push:",
      "  #@dist   branches: [main]",
      "  workflow_call:",
      "  workflow_dispatch:",
      "    inputs:",
      "      dry-run:",
      "        default: true                #@dist false",
    ].join("\n");

    const result = applyDistTransform(input);
    expect(result).toContain("  push:");
    expect(result).toContain("    branches: [main]");
    expect(result).toContain("        default: false");
    expect(result).not.toContain("#@dist");
  });

  it("transforms a TOML config block", () => {
    const input = [
      "[paths]",
      'source = "test/src/lib/"                        #@dist "src/lib/"',
      'tests = "test/tests/unit/"                      #@dist "tests/unit/"',
      "",
      "[execution]",
      'build = "npm run build"',
    ].join("\n");

    const result = applyDistTransform(input);
    expect(result).toContain('source = "src/lib/"');
    expect(result).toContain('tests = "tests/unit/"');
    expect(result).toContain('build = "npm run build"');
  });
});
