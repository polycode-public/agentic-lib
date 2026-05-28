// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect, afterEach } from "vitest";
import { buildClientOptions, extractNarrative, NARRATIVE_INSTRUCTION } from "../../../src/actions/agentic-step/copilot.js";

describe("buildClientOptions", () => {
  let originalToken;

  afterEach(() => {
    if (originalToken !== undefined) {
      process.env.COPILOT_GITHUB_TOKEN = originalToken;
    } else {
      delete process.env.COPILOT_GITHUB_TOKEN;
    }
    originalToken = undefined;
  });

  it("throws when no githubToken and no env var", () => {
    originalToken = process.env.COPILOT_GITHUB_TOKEN;
    delete process.env.COPILOT_GITHUB_TOKEN;
    expect(() => buildClientOptions()).toThrow("COPILOT_GITHUB_TOKEN is required");
  });

  it("uses githubToken parameter when provided", () => {
    originalToken = process.env.COPILOT_GITHUB_TOKEN;
    delete process.env.COPILOT_GITHUB_TOKEN;
    const opts = buildClientOptions("ghp_explicit_token");
    expect(opts.env.GITHUB_TOKEN).toBe("ghp_explicit_token");
    expect(opts.env.GH_TOKEN).toBe("ghp_explicit_token");
  });

  it("falls back to env var when githubToken is not provided", () => {
    originalToken = process.env.COPILOT_GITHUB_TOKEN;
    process.env.COPILOT_GITHUB_TOKEN = "ghp_env_var_token";
    const opts = buildClientOptions();
    expect(opts.env.GITHUB_TOKEN).toBe("ghp_env_var_token");
    expect(opts.env.GH_TOKEN).toBe("ghp_env_var_token");
  });

  it("prefers githubToken parameter over env var", () => {
    originalToken = process.env.COPILOT_GITHUB_TOKEN;
    process.env.COPILOT_GITHUB_TOKEN = "ghp_env_var_token";
    const opts = buildClientOptions("ghp_explicit_token");
    expect(opts.env.GITHUB_TOKEN).toBe("ghp_explicit_token");
    expect(opts.env.GH_TOKEN).toBe("ghp_explicit_token");
  });

  it("returns env object with token overrides", () => {
    originalToken = process.env.COPILOT_GITHUB_TOKEN;
    process.env.COPILOT_GITHUB_TOKEN = "ghp_test";
    const opts = buildClientOptions();
    expect(opts).toHaveProperty("env");
    expect(typeof opts.env).toBe("object");
    // The env should contain the original process.env keys plus overrides
    expect(opts.env.GITHUB_TOKEN).toBe("ghp_test");
    expect(opts.env.GH_TOKEN).toBe("ghp_test");
  });
});

describe("extractNarrative", () => {
  it("extracts [NARRATIVE] line from response", () => {
    const content = "I wrote some code.\n[NARRATIVE] Created a fizz-buzz implementation with 3 functions.";
    expect(extractNarrative(content)).toBe("Created a fizz-buzz implementation with 3 functions.");
  });

  it("returns fallback when no [NARRATIVE] tag present", () => {
    const content = "I wrote some code but no narrative tag.";
    expect(extractNarrative(content, "Fallback sentence.")).toBe("Fallback sentence.");
  });

  it("returns empty string when no content and no fallback", () => {
    expect(extractNarrative("")).toBe("");
    expect(extractNarrative(null)).toBe("");
    expect(extractNarrative(undefined)).toBe("");
  });

  it("handles [NARRATIVE] tag mid-content", () => {
    const content = "Line one.\nLine two.\n[NARRATIVE] Did the thing.\nLine four.";
    expect(extractNarrative(content)).toBe("Did the thing.");
  });
});

describe("NARRATIVE_INSTRUCTION", () => {
  it("is a non-empty string containing [NARRATIVE]", () => {
    expect(typeof NARRATIVE_INSTRUCTION).toBe("string");
    expect(NARRATIVE_INSTRUCTION).toContain("[NARRATIVE]");
  });
});
