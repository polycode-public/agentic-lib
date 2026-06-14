// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";

const WF = join(import.meta.dirname, "../.github/workflows");

function stripForYaml(content) {
  return content.replace(/\$\{\{[^}]*\}\}/g, "x").replace(/^(\s*run:\s*)(?!['"|>])([^\n]*:[^\n]*)$/gm, "$1'$2'"); // eslint-disable-line sonarjs/slow-regex
}

function load(name) {
  return yaml.load(stripForYaml(readFileSync(join(WF, name), "utf8")));
}

const files = readdirSync(WF)
  .filter((f) => f.endsWith(".yml"))
  .sort();

describe(".github/workflows", () => {
  it("contains exactly transform, summary-export, screenshot-publish, test, release", () => {
    expect(files).toEqual(["release.yml", "screenshot-publish.yml", "summary-export.yml", "test.yml", "transform.yml"]);
  });

  describe.each(files)("%s", (name) => {
    it("is valid YAML with name + jobs", () => {
      const doc = load(name);
      expect(doc.name).toBeTruthy();
      expect(doc.jobs).toBeTruthy();
    });
  });
});

describe("transform.yml — THE reusable dispatch", () => {
  const raw = readFileSync(join(WF, "transform.yml"), "utf8");
  const doc = load("transform.yml");
  // js-yaml maps bare `on:` to `true`
  const on = doc.on || doc.true;

  it("is a workflow_call with inputs type/work_item/max_turns/model", () => {
    expect(on.workflow_call).toBeTruthy();
    const inputs = Object.keys(on.workflow_call.inputs).sort();
    expect(inputs).toEqual(["max_turns", "model", "type", "work_item"]);
  });

  it("has concurrency keyed on the work item (C8)", () => {
    expect(raw).toMatch(/concurrency:/);
    expect(raw).toMatch(/work_item/);
  });

  it("runs claude -p and gates on a fixes #N trailer (C3)", () => {
    expect(raw).toMatch(/claude -p/);
    expect(raw).toMatch(/--max-turns/);
    expect(raw).toMatch(/fixes #\$\{WI\}/i);
  });

  it("selects the Bedrock lane by env var", () => {
    expect(raw).toMatch(/CLAUDE_CODE_USE_BEDROCK/);
    expect(raw).toMatch(/ANTHROPIC_API_KEY/);
  });
});
