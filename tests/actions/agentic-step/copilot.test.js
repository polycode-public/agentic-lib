// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readOptionalFile, scanDirectory, formatPathsSection, supportsReasoningEffort, logTuningParam, cleanSource, generateOutline, filterIssues, summariseIssue, extractFeatureSummary, isRateLimitError, retryDelayMs } from "../../../src/actions/agentic-step/copilot.js";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("readOptionalFile", () => {
  it("returns file content when file exists", () => {
    const dir = join(tmpdir(), `copilot-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "test.txt");
    writeFileSync(file, "hello world");
    try {
      expect(readOptionalFile(file)).toBe("hello world");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("returns empty string when file does not exist", () => {
    expect(readOptionalFile("/nonexistent/path/file.txt")).toBe("");
  });

  it("respects content limit", () => {
    const dir = join(tmpdir(), `copilot-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "test.txt");
    writeFileSync(file, "abcdefghij");
    try {
      expect(readOptionalFile(file, 5)).toBe("abcde");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe("scanDirectory", () => {
  let dir;

  beforeEach(() => {
    dir = join(tmpdir(), `copilot-scan-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "a.md"), "# Alpha");
    writeFileSync(join(dir, "b.md"), "# Beta");
    writeFileSync(join(dir, "c.txt"), "not markdown");
    writeFileSync(join(dir, "d.md"), "# Delta");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true });
  });

  it("returns files matching extension", () => {
    const result = scanDirectory(dir + "/", ".md");
    expect(result).toHaveLength(3);
    expect(result.map((f) => f.name).sort()).toEqual(["a.md", "b.md", "d.md"]);
  });

  it("respects fileLimit", () => {
    const result = scanDirectory(dir + "/", ".md", { fileLimit: 2 });
    expect(result).toHaveLength(2);
  });

  it("respects contentLimit", () => {
    const result = scanDirectory(dir + "/", ".md", { contentLimit: 3 });
    expect(result[0].content).toBe("# A");
  });

  it("supports array of extensions", () => {
    const result = scanDirectory(dir + "/", [".md", ".txt"]);
    expect(result).toHaveLength(4);
  });

  it("works when directory path does not have trailing slash", () => {
    const result = scanDirectory(dir, ".md");
    expect(result).toHaveLength(3);
    expect(result.map((f) => f.name).sort()).toEqual(["a.md", "b.md", "d.md"]);
    // Verify content was read correctly (not corrupted by missing separator)
    expect(result.find((f) => f.name === "a.md").content).toBe("# Alpha");
  });

  it("returns empty array for nonexistent directory", () => {
    expect(scanDirectory("/nonexistent/", ".md")).toEqual([]);
  });
});

describe("formatPathsSection", () => {
  it("formats writable and read-only paths", () => {
    const result = formatPathsSection(["src/", "tests/"], ["README.md"]);
    expect(result).toContain("- src/");
    expect(result).toContain("- tests/");
    expect(result).toContain("- README.md");
    expect(result).toContain("Writable");
    expect(result).toContain("Read-Only");
  });

  it("shows (none) for empty paths", () => {
    const result = formatPathsSection([], []);
    expect(result).toContain("- (none)");
  });

  it("defaults readOnlyPaths to empty", () => {
    const result = formatPathsSection(["src/"]);
    expect(result).toContain("- src/");
    expect(result).toContain("- (none)");
  });

  it("includes TOML config when provided", () => {
    const toml = '[schedule]\nsupervisor = "daily"\n';
    const result = formatPathsSection(["src/"], ["README.md"], { configToml: toml });
    expect(result).toContain("### Configuration (agentic-lib.toml)");
    expect(result).toContain("```toml");
    expect(result).toContain("[schedule]");
    expect(result).toContain("supervisor");
    expect(result).toContain("daily");
  });

  it("includes package.json when provided", () => {
    const pkg = '{"name": "my-pkg", "version": "2.0.0"}';
    const result = formatPathsSection(["src/"], ["README.md"], { packageJson: pkg });
    expect(result).toContain("### Dependencies (package.json)");
    expect(result).toContain("```json");
    expect(result).toContain("my-pkg");
    expect(result).toContain("2.0.0");
  });

  it("omits context file sections when not provided", () => {
    const result = formatPathsSection(["src/"], ["README.md"]);
    expect(result).not.toContain("### Configuration");
    expect(result).not.toContain("### Dependencies");
  });
});

describe("supportsReasoningEffort", () => {
  it("returns true for gpt-5-mini", () => {
    expect(supportsReasoningEffort("gpt-5-mini")).toBe(true);
  });

  it("returns true for o4-mini", () => {
    expect(supportsReasoningEffort("o4-mini")).toBe(true);
  });

  it("returns false for claude-sonnet-4", () => {
    expect(supportsReasoningEffort("claude-sonnet-4")).toBe(false);
  });

  it("returns false for gpt-4.1", () => {
    expect(supportsReasoningEffort("gpt-4.1")).toBe(false);
  });

  it("returns false for unknown models", () => {
    expect(supportsReasoningEffort("some-future-model")).toBe(false);
  });
});

describe("logTuningParam", () => {
  it("is a function that does not throw", () => {
    expect(() => logTuningParam("reasoningEffort", "medium", "med", "gpt-5-mini")).not.toThrow();
  });

  it("accepts optional clip info", () => {
    expect(() => logTuningParam("featuresScan", 10, "med", "gpt-5-mini", { requested: 50, available: 10 })).not.toThrow();
  });
});

describe("cleanSource", () => {
  it("strips SPDX and Copyright lines", () => {
    const raw = "// SPDX-License-Identifier: MIT\n// Copyright (C) 2025 Acme\nconst x = 1;\n";
    const result = cleanSource(raw);
    expect(result).not.toContain("SPDX");
    expect(result).not.toContain("Copyright");
    expect(result).toContain("const x = 1;");
  });

  it("collapses multiple blank lines", () => {
    const raw = "a\n\n\n\n\nb\n";
    expect(cleanSource(raw)).toBe("a\n\nb\n");
  });

  it("strips eslint-disable comments", () => {
    const raw = "// eslint-disable-next-line no-unused-vars\nconst x = 1;\n";
    const result = cleanSource(raw);
    expect(result).not.toContain("eslint-disable");
    expect(result).toContain("const x = 1;");
  });

  it("trims leading whitespace from result", () => {
    const raw = "\n\n\nconst x = 1;\n";
    expect(cleanSource(raw)).toBe("const x = 1;\n");
  });

  it("returns empty string for empty input", () => {
    expect(cleanSource("")).toBe("");
  });
});

describe("generateOutline", () => {
  it("extracts imports", () => {
    const raw = 'import { foo } from "bar";\nimport baz from "qux";\n\nconst x = 1;\n';
    const outline = generateOutline(raw, "test.js");
    expect(outline).toContain("// imports: bar, qux");
  });

  it("extracts exported functions", () => {
    const raw = "export function myFunc(a, b) {\n  return a + b;\n}\n";
    const outline = generateOutline(raw, "test.js");
    expect(outline).toContain("// exports: myFunc");
    expect(outline).toContain("// function myFunc()");
  });

  it("extracts classes", () => {
    const raw = "export class MyClass {\n  constructor() {}\n}\n";
    const outline = generateOutline(raw, "test.js");
    expect(outline).toContain("// exports: MyClass");
    expect(outline).toContain("// class MyClass");
  });

  it("includes file size info in header", () => {
    const raw = "const x = 1;\n";
    const outline = generateOutline(raw, "test.js");
    expect(outline).toContain("// file: test.js");
    expect(outline).toContain("lines");
    expect(outline).toContain("KB)");
  });
});

describe("filterIssues", () => {
  it("filters out stale issues", () => {
    const now = new Date();
    const old = new Date(now.getTime() - 60 * 86400000); // 60 days ago
    const issues = [
      { number: 1, updated_at: now.toISOString(), created_at: now.toISOString(), labels: [] },
      { number: 2, updated_at: old.toISOString(), created_at: old.toISOString(), labels: [] },
    ];
    const result = filterIssues(issues, { staleDays: 30 });
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
  });

  it("filters out bot-only labeled issues", () => {
    const now = new Date().toISOString();
    const issues = [
      { number: 1, updated_at: now, created_at: now, labels: [{ name: "automated" }] },
      { number: 2, updated_at: now, created_at: now, labels: [{ name: "bug" }] },
      { number: 3, updated_at: now, created_at: now, labels: [{ name: "automated" }, { name: "stale" }] },
    ];
    const result = filterIssues(issues);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(2);
  });

  it("keeps issues with mixed labels", () => {
    const now = new Date().toISOString();
    const issues = [
      { number: 1, updated_at: now, created_at: now, labels: [{ name: "automated" }, { name: "bug" }] },
    ];
    expect(filterIssues(issues)).toHaveLength(1);
  });

  it("returns all issues when no filters apply", () => {
    const now = new Date().toISOString();
    const issues = [
      { number: 1, updated_at: now, created_at: now, labels: [{ name: "bug" }] },
    ];
    expect(filterIssues(issues)).toHaveLength(1);
  });
});

describe("summariseIssue", () => {
  it("creates a compact summary", () => {
    const issue = {
      number: 42,
      title: "Fix the thing",
      created_at: new Date().toISOString(),
      labels: [{ name: "bug" }],
      body: "Description here",
    };
    const result = summariseIssue(issue);
    expect(result).toContain("#42: Fix the thing");
    expect(result).toContain("[bug]");
    expect(result).toContain("Description here");
  });

  it("respects body limit", () => {
    const issue = {
      number: 1,
      title: "Test",
      created_at: new Date().toISOString(),
      labels: [],
      body: "x".repeat(1000),
    };
    const result = summariseIssue(issue, 50);
    expect(result.length).toBeLessThan(200);
  });

  it("handles missing body", () => {
    const issue = {
      number: 1,
      title: "Test",
      created_at: new Date().toISOString(),
      labels: [],
    };
    const result = summariseIssue(issue);
    expect(result).toContain("#1: Test");
  });
});

describe("extractFeatureSummary", () => {
  it("extracts title from heading", () => {
    const content = "# My Feature\n\nSome description\n";
    const result = extractFeatureSummary(content, "feature.md");
    expect(result).toContain("Feature: My Feature");
  });

  it("counts checked and unchecked items", () => {
    const content = "# Feature\n- [x] Done\n- [x] Also done\n- [ ] Not done\n";
    const result = extractFeatureSummary(content, "f.md");
    expect(result).toContain("Status: 2/3 items complete");
    expect(result).toContain("Remaining:");
    expect(result).toContain("Not done");
  });

  it("uses filename as fallback title", () => {
    const content = "No heading here\n";
    const result = extractFeatureSummary(content, "my-feature.md");
    expect(result).toContain("Feature: my-feature.md");
  });

  it("handles file with no checkboxes", () => {
    const content = "# Feature\nJust a description\n";
    const result = extractFeatureSummary(content, "f.md");
    expect(result).toContain("Feature: Feature");
    expect(result).not.toContain("Status:");
  });
});

describe("scanDirectory with sortByMtime", () => {
  let dir;

  beforeEach(() => {
    dir = join(tmpdir(), `copilot-mtime-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true });
  });

  it("sorts files by modification time when sortByMtime is true", async () => {
    // Create files with different mtimes
    writeFileSync(join(dir, "old.md"), "old content");
    // Wait a tiny bit to ensure different mtimes
    await new Promise((r) => setTimeout(r, 50));
    writeFileSync(join(dir, "new.md"), "new content");

    const result = scanDirectory(dir, ".md", { sortByMtime: true });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("new.md");
    expect(result[1].name).toBe("old.md");
  });
});

describe("scanDirectory with clean option", () => {
  let dir;

  beforeEach(() => {
    dir = join(tmpdir(), `copilot-clean-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true });
  });

  it("strips license headers when clean is true", () => {
    writeFileSync(join(dir, "a.js"), "// SPDX-License-Identifier: MIT\n// Copyright 2025\nconst x = 1;\n");
    const result = scanDirectory(dir, ".js", { clean: true });
    expect(result[0].content).not.toContain("SPDX");
    expect(result[0].content).toContain("const x = 1;");
  });

  it("does not strip headers when clean is false", () => {
    writeFileSync(join(dir, "a.js"), "// SPDX-License-Identifier: MIT\nconst x = 1;\n");
    const result = scanDirectory(dir, ".js", { clean: false });
    expect(result[0].content).toContain("SPDX");
  });
});

describe("scanDirectory with outline option", () => {
  let dir;

  beforeEach(() => {
    dir = join(tmpdir(), `copilot-outline-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true });
  });

  it("generates outline when content exceeds limit", () => {
    const bigContent = 'import { foo } from "bar";\nexport function myFunc() {\n' + "  // lots of code\n".repeat(200) + "}\n";
    writeFileSync(join(dir, "big.js"), bigContent);
    const result = scanDirectory(dir, ".js", { outline: true, contentLimit: 100 });
    expect(result[0].content).toContain("// file: big.js");
    expect(result[0].content).toContain("// imports: bar");
    expect(result[0].content).toContain("// function myFunc()");
  });

  it("returns full content when under limit", () => {
    writeFileSync(join(dir, "small.js"), "const x = 1;\n");
    const result = scanDirectory(dir, ".js", { outline: true, contentLimit: 1000 });
    expect(result[0].content).toBe("const x = 1;\n");
  });
});

describe("scanDirectory clipping", () => {
  let dir;

  beforeEach(() => {
    dir = join(tmpdir(), `copilot-clip-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    for (let i = 0; i < 5; i++) {
      writeFileSync(join(dir, `file${i}.md`), "x".repeat(100));
    }
  });

  afterEach(() => {
    rmSync(dir, { recursive: true });
  });

  it("clips files when fileLimit is exceeded", () => {
    const result = scanDirectory(dir, ".md", { fileLimit: 2 });
    expect(result).toHaveLength(2);
  });

  it("clips content when contentLimit is exceeded", () => {
    const result = scanDirectory(dir, ".md", { contentLimit: 10 });
    expect(result[0].content).toHaveLength(10);
  });
});

describe("isRateLimitError", () => {
  it("returns true for error with status 429", () => {
    expect(isRateLimitError({ status: 429, message: "Too Many Requests" })).toBe(true);
  });

  it("returns true for error with statusCode 429", () => {
    expect(isRateLimitError({ statusCode: 429, message: "rate limit" })).toBe(true);
  });

  it("returns true for error with string status '429'", () => {
    expect(isRateLimitError({ status: "429", message: "error" })).toBe(true);
  });

  it("returns true for error with message containing '429'", () => {
    expect(isRateLimitError({ message: "Request failed with status 429" })).toBe(true);
  });

  it("returns true for error with message 'too many requests'", () => {
    expect(isRateLimitError({ message: "Too Many Requests" })).toBe(true);
  });

  it("returns true for error with message containing 'rate limit'", () => {
    expect(isRateLimitError({ message: "API rate limit exceeded" })).toBe(true);
  });

  it("returns false for non-rate-limit HTTP errors", () => {
    expect(isRateLimitError({ status: 500, message: "Internal Server Error" })).toBe(false);
  });

  it("returns false for non-rate-limit errors without status", () => {
    expect(isRateLimitError({ message: "Network error" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isRateLimitError(null)).toBe(false);
  });

  it("returns false for non-object values", () => {
    expect(isRateLimitError("429")).toBe(false);
    expect(isRateLimitError(429)).toBe(false);
  });
});

describe("retryDelayMs", () => {
  it("parses Retry-After header in seconds", () => {
    const err = { headers: { "retry-after": "30" } };
    expect(retryDelayMs(err, 0)).toBe(30000);
  });

  it("parses retryAfter property in seconds", () => {
    const err = { retryAfter: "45" };
    expect(retryDelayMs(err, 0)).toBe(45000);
  });

  it("parses Retry-After from response headers", () => {
    const err = { response: { headers: { "retry-after": "60" } } };
    expect(retryDelayMs(err, 0)).toBe(60000);
  });

  it("uses exponential backoff when no Retry-After header", () => {
    const err = { status: 429 };
    expect(retryDelayMs(err, 0)).toBe(60000);
    expect(retryDelayMs(err, 1)).toBe(120000);
    expect(retryDelayMs(err, 2)).toBe(240000);
  });

  it("uses custom base delay for backoff", () => {
    const err = { status: 429 };
    expect(retryDelayMs(err, 0, 10000)).toBe(10000);
    expect(retryDelayMs(err, 1, 10000)).toBe(20000);
  });

  it("ignores invalid Retry-After values", () => {
    const err = { headers: { "retry-after": "abc" } };
    expect(retryDelayMs(err, 0)).toBe(60000);
  });

  it("ignores zero Retry-After values", () => {
    const err = { headers: { "retry-after": "0" } };
    expect(retryDelayMs(err, 0)).toBe(60000);
  });
});
