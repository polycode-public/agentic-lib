// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @actions/core before importing safety
vi.mock("@actions/core", () => ({
  info: vi.fn(),
  warning: vi.fn(),
}));

const { isPathWritable, isIssueResolved, checkWipLimit, checkAttemptLimit } =
  await import("../../../src/actions/agentic-step/safety.js");

describe("safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isPathWritable", () => {
    it("allows exact path match", () => {
      expect(isPathWritable("src/main.js", ["src/main.js"])).toBe(true);
    });

    it("allows path within a directory (trailing slash)", () => {
      expect(isPathWritable("src/utils/helper.js", ["src/"])).toBe(true);
    });

    it("allows path within a directory (no trailing slash)", () => {
      expect(isPathWritable("src/utils/helper.js", ["src"])).toBe(true);
    });

    it("rejects path outside writable paths", () => {
      expect(isPathWritable("config/secret.yml", ["src/"])).toBe(false);
    });

    it("rejects empty writable paths", () => {
      expect(isPathWritable("anything.js", [])).toBe(false);
    });

    it("checks multiple writable paths", () => {
      expect(isPathWritable("tests/unit.test.js", ["src/", "tests/"])).toBe(true);
    });
  });

  describe("isIssueResolved", () => {
    it("returns true for closed issues", async () => {
      const octokit = {
        rest: {
          issues: {
            get: vi.fn().mockResolvedValue({ data: { state: "closed" } }),
          },
        },
      };
      const result = await isIssueResolved(octokit, { owner: "o", repo: "r" }, 42);
      expect(result).toBe(true);
      expect(octokit.rest.issues.get).toHaveBeenCalledWith({
        owner: "o",
        repo: "r",
        issue_number: 42,
      });
    });

    it("returns false for open issues", async () => {
      const octokit = {
        rest: {
          issues: {
            get: vi.fn().mockResolvedValue({ data: { state: "open" } }),
          },
        },
      };
      const result = await isIssueResolved(octokit, { owner: "o", repo: "r" }, 7);
      expect(result).toBe(false);
    });
  });

  describe("checkWipLimit", () => {
    it("allows when under limit", async () => {
      const octokit = {
        rest: {
          issues: {
            listForRepo: vi.fn().mockResolvedValue({ data: [{ id: 1 }] }),
          },
        },
      };
      const result = await checkWipLimit(octokit, { owner: "o", repo: "r" }, "in-progress", 3);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1);
    });

    it("blocks when at limit", async () => {
      const octokit = {
        rest: {
          issues: {
            listForRepo: vi.fn().mockResolvedValue({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] }),
          },
        },
      };
      const result = await checkWipLimit(octokit, { owner: "o", repo: "r" }, "in-progress", 3);
      expect(result.allowed).toBe(false);
      expect(result.count).toBe(3);
    });
  });

  describe("checkAttemptLimit", () => {
    it("allows when under limit", async () => {
      const octokit = {
        rest: {
          git: {
            listMatchingRefs: vi.fn().mockResolvedValue({ data: [{ ref: "r1" }] }),
          },
        },
      };
      const result = await checkAttemptLimit(octokit, { owner: "o", repo: "r" }, 5, "agentic-lib-issue-", 3);
      expect(result.allowed).toBe(true);
      expect(result.attempts).toBe(1);
    });

    it("blocks when at limit", async () => {
      const octokit = {
        rest: {
          git: {
            listMatchingRefs: vi.fn().mockResolvedValue({ data: [{ ref: "r1" }, { ref: "r2" }, { ref: "r3" }] }),
          },
        },
      };
      const result = await checkAttemptLimit(octokit, { owner: "o", repo: "r" }, 5, "agentic-lib-issue-", 3);
      expect(result.allowed).toBe(false);
      expect(result.attempts).toBe(3);
    });
  });
});
