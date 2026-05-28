// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const FIXTURES_DIR = join(import.meta.dirname, "copilot-responses");

describe("copilot response fixtures", () => {
  const fixtureFiles = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json"));

  it("has fixture files", () => {
    expect(fixtureFiles.length).toBeGreaterThan(0);
  });

  describe.each(fixtureFiles)("%s", (filename) => {
    const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, filename), "utf8"));

    it("has data.content field", () => {
      expect(fixture.data).toBeDefined();
      expect(typeof fixture.data.content).toBe("string");
    });

    it("has data.usage.totalTokens field", () => {
      expect(fixture.data.usage).toBeDefined();
      expect(typeof fixture.data.usage.totalTokens).toBe("number");
      expect(fixture.data.usage.totalTokens).toBeGreaterThanOrEqual(0);
    });
  });

  describe("response parsing patterns", () => {
    it("parses RESOLVED verdict", () => {
      const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, "review-issue-resolved.json"), "utf8"));
      expect(fixture.data.content.toUpperCase().startsWith("RESOLVED")).toBe(true);
    });

    it("parses OPEN verdict", () => {
      const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, "review-issue-open.json"), "utf8"));
      expect(fixture.data.content.toUpperCase().startsWith("OPEN")).toBe(true);
    });

    it("parses ACTION:nop from discussion response", () => {
      const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, "discussions-action-nop.json"), "utf8"));
      const actionMatch = fixture.data.content.match(/\[ACTION:(\S+?)\](.+)?/);
      expect(actionMatch).toBeTruthy();
      expect(actionMatch[1]).toBe("nop");
    });

    it("parses ACTION:create-feature with argument", () => {
      const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, "discussions-action-create-feature.json"), "utf8"));
      const actionMatch = fixture.data.content.match(/\[ACTION:(\S+?)\](.+)?/);
      expect(actionMatch).toBeTruthy();
      expect(actionMatch[1]).toBe("create-feature");
      expect(actionMatch[2].trim()).toBe("HTTP_SERVER");
    });

    it("handles empty response content", () => {
      const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, "empty-response.json"), "utf8"));
      expect(fixture.data.content).toBe("");
    });

    it("extracts code blocks from response", () => {
      const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, "resolve-issue-success.json"), "utf8"));
      const codeBlockMatch = fixture.data.content.match(/```(\w+)\n([\s\S]*?)```/);
      expect(codeBlockMatch).toBeTruthy();
      expect(codeBlockMatch[1]).toBe("javascript");
    });
  });
});
