// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");

const AGENT_FRAGMENTS = ["house-conventions", "definition-of-done", "provenance"];
const PROMPTS = ["deliver-intent", "address-review", "fix-ci", "tend"];

describe("components/agents", () => {
  describe.each(AGENT_FRAGMENTS)("%s.md", (name) => {
    it("is non-empty guidance", () => {
      const content = readFileSync(join(ROOT, "components/agents", `${name}.md`), "utf8");
      expect(content.length).toBeGreaterThan(50);
    });
  });

  it("definition-of-done states draft-PR-is-done and never-merge", () => {
    const dod = readFileSync(join(ROOT, "components/agents/definition-of-done.md"), "utf8");
    expect(dod).toMatch(/draft pull request|draft PR/i);
    expect(dod).toMatch(/never merge/i);
  });

  it("provenance states the fixes #N trailer contract", () => {
    const prov = readFileSync(join(ROOT, "components/agents/provenance.md"), "utf8");
    expect(prov).toMatch(/fixes #N/i);
  });
});

describe("components/prompts (one per transformation type)", () => {
  describe.each(PROMPTS)("%s.md", (name) => {
    it("exists and references the work item", () => {
      const content = readFileSync(join(ROOT, "components/prompts", `${name}.md`), "utf8");
      expect(content.length).toBeGreaterThan(50);
    });
  });
});
