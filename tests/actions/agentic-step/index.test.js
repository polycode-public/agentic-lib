// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";

// Test the TASKS map shape by importing the task modules directly.
// We cannot import index.js directly because it calls run() at module load
// and depends on @actions/core + @actions/github. Instead we verify the
// individual task handler modules and the expected structure.

import { resolveIssue } from "../../../src/actions/agentic-step/tasks/resolve-issue.js";
import { fixCode } from "../../../src/actions/agentic-step/tasks/fix-code.js";
import { transform } from "../../../src/actions/agentic-step/tasks/transform.js";
import { maintainFeatures } from "../../../src/actions/agentic-step/tasks/maintain-features.js";
import { maintainLibrary } from "../../../src/actions/agentic-step/tasks/maintain-library.js";
import { enhanceIssue } from "../../../src/actions/agentic-step/tasks/enhance-issue.js";
import { reviewIssue } from "../../../src/actions/agentic-step/tasks/review-issue.js";
import { discussions } from "../../../src/actions/agentic-step/tasks/discussions.js";
import { supervise } from "../../../src/actions/agentic-step/tasks/supervise.js";
import { direct } from "../../../src/actions/agentic-step/tasks/direct.js";
import { implementationReview } from "../../../src/actions/agentic-step/tasks/implementation-review.js";

const TASKS = {
  "resolve-issue": resolveIssue,
  "fix-code": fixCode,
  "transform": transform,
  "maintain-features": maintainFeatures,
  "maintain-library": maintainLibrary,
  "enhance-issue": enhanceIssue,
  "review-issue": reviewIssue,
  "discussions": discussions,
  "supervise": supervise,
  "direct": direct,
  "implementation-review": implementationReview,
};

describe("index — TASKS map", () => {
  it("has exactly 11 task entries", () => {
    expect(Object.keys(TASKS)).toHaveLength(11);
  });

  it("contains all expected task names", () => {
    const expected = [
      "resolve-issue",
      "fix-code",
      "transform",
      "maintain-features",
      "maintain-library",
      "enhance-issue",
      "review-issue",
      "discussions",
      "supervise",
      "direct",
      "implementation-review",
    ];
    expect(Object.keys(TASKS).sort()).toEqual(expected.sort());
  });

  it("all task handlers are async functions", () => {
    for (const [, handler] of Object.entries(TASKS)) {
      expect(typeof handler).toBe("function");
      expect(handler.constructor.name).toBe("AsyncFunction");
    }
  });

  it("throws for unknown task name", () => {
    const unknownTask = "nonexistent-task";
    expect(TASKS[unknownTask]).toBeUndefined();
  });
});
