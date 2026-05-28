// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const MISSIONS_DIR = join(import.meta.dirname, "../../src/seeds/missions");

const allFiles = readdirSync(MISSIONS_DIR)
  .filter((f) => f.endsWith(".md"))
  .sort();

const EXPECTED_MISSIONS = [
  "1-dan-create-c64-emulator",
  "1-dan-create-planning-engine",
  "1-kyu-create-ray-tracer",
  "2-dan-create-self-hosted",
  "2-kyu-create-markdown-compiler",
  "2-kyu-create-plot-code-lib",
  "3-kyu-analyze-lunar-lander",
  "3-kyu-evaluate-time-series-lab",
  "4-kyu-analyze-json-schema-diff",
  "4-kyu-apply-cron-engine",
  "4-kyu-apply-dense-encoding",
  "4-kyu-apply-owl-ontology",
  "5-kyu-apply-ascii-face",
  "5-kyu-apply-string-utils",
  "6-kyu-understand-hamming-distance",
  "6-kyu-understand-roman-numerals",
  "7-kyu-understand-fizz-buzz",
  "8-kyu-remember-empty",
  "8-kyu-remember-hello-world",
];

const BOUNDED_MISSIONS = [
  "1-dan-create-c64-emulator",
  "1-dan-create-planning-engine",
  "1-kyu-create-ray-tracer",
  "2-dan-create-self-hosted",
  "2-kyu-create-markdown-compiler",
  "2-kyu-create-plot-code-lib",
  "3-kyu-analyze-lunar-lander",
  "3-kyu-evaluate-time-series-lab",
  "4-kyu-analyze-json-schema-diff",
  "4-kyu-apply-cron-engine",
  "4-kyu-apply-dense-encoding",
  "4-kyu-apply-owl-ontology",
  "5-kyu-apply-ascii-face",
  "5-kyu-apply-string-utils",
  "6-kyu-understand-hamming-distance",
  "6-kyu-understand-roman-numerals",
  "7-kyu-understand-fizz-buzz",
];

describe("src/seeds/missions", () => {
  it("has 19 mission files", () => {
    expect(allFiles).toHaveLength(19);
  });

  it("contains all expected missions", () => {
    const names = allFiles.map((f) => f.replace(/\.md$/, ""));
    expect(names).toEqual(EXPECTED_MISSIONS);
  });

  describe.each(allFiles)("%s", (filename) => {
    it("starts with '# Mission'", () => {
      const content = readFileSync(join(MISSIONS_DIR, filename), "utf8");
      expect(content.trimStart().startsWith("# Mission")).toBe(true);
    });
  });

  describe.each(BOUNDED_MISSIONS)("%s has acceptance criteria", (name) => {
    it("contains '## Acceptance Criteria' section", () => {
      const content = readFileSync(join(MISSIONS_DIR, `${name}.md`), "utf8");
      expect(content).toContain("## Acceptance Criteria");
    });

    it("has at least 3 acceptance criteria checkboxes", () => {
      const content = readFileSync(join(MISSIONS_DIR, `${name}.md`), "utf8");
      const checkboxes = (content.match(/- \[ \]/g) || []).length;
      expect(checkboxes).toBeGreaterThanOrEqual(3);
    });
  });

  it("no bounded mission contains 'do not set schedule to off'", () => {
    for (const name of BOUNDED_MISSIONS) {
      const content = readFileSync(join(MISSIONS_DIR, `${name}.md`), "utf8");
      expect(content.toLowerCase()).not.toContain("do not set schedule to off");
    }
  });

  it("no mission above 7-kyu contains a 'Core Functions' section", () => {
    const above7kyu = allFiles.filter(
      (f) => !f.startsWith("7-kyu-") && !f.startsWith("8-kyu-"),
    );
    for (const filename of above7kyu) {
      const content = readFileSync(join(MISSIONS_DIR, filename), "utf8");
      expect(content).not.toContain("## Core Functions");
    }
  });

  it("8-kyu-remember-empty.md is a blank template", () => {
    const content = readFileSync(join(MISSIONS_DIR, "8-kyu-remember-empty.md"), "utf8");
    expect(content).toContain("Describe your project");
  });

  it("zero-MISSION.md matches 7-kyu-understand-fizz-buzz.md", () => {
    const zeroMission = readFileSync(join(MISSIONS_DIR, "../zero-MISSION.md"), "utf8");
    const fizzBuzz = readFileSync(join(MISSIONS_DIR, "7-kyu-understand-fizz-buzz.md"), "utf8");
    expect(zeroMission).toBe(fizzBuzz);
  });
});
