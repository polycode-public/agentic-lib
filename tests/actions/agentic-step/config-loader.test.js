// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig, getWritablePaths } from "../../../src/actions/agentic-step/config-loader.js";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Profile sections that tests append to their TOML fixtures.
// These mirror [profiles.*] in agentic-lib.toml — the source of truth.
const PROFILE_MIN = `
[profiles.min]
reasoning-effort = "low"
infinite-sessions = false
transformation-budget = 16
max-issues = 5
stale-days = 14
max-discussion-comments = 5
max-feature-issues = 1
max-maintenance-issues = 1
max-attempts-per-branch = 2
max-attempts-per-issue = 1
features-limit = 2
library-limit = 8
session-timeout-ms = 480000
max-tokens = 200000
max-read-chars = 20000
max-test-output = 4000
max-file-listing = 30
max-library-index = 2000
max-fix-test-output = 8000
`;

const PROFILE_RECOMMENDED = `
[profiles.med]
reasoning-effort = "medium"
infinite-sessions = true
transformation-budget = 32
max-issues = 20
stale-days = 30
max-discussion-comments = 10
max-feature-issues = 2
max-maintenance-issues = 1
max-attempts-per-branch = 3
max-attempts-per-issue = 2
features-limit = 4
library-limit = 32
session-timeout-ms = 480000
max-tokens = 200000
max-read-chars = 50000
max-test-output = 10000
max-file-listing = 100
max-library-index = 5000
max-fix-test-output = 15000
`;

const PROFILE_MAX = `
[profiles.max]
reasoning-effort = "high"
infinite-sessions = true
transformation-budget = 128
max-issues = 100
stale-days = 90
max-discussion-comments = 25
max-feature-issues = 4
max-maintenance-issues = 2
max-attempts-per-branch = 5
max-attempts-per-issue = 4
features-limit = 8
library-limit = 64
session-timeout-ms = 480000
max-tokens = 500000
max-read-chars = 100000
max-test-output = 20000
max-file-listing = 0
max-library-index = 10000
max-fix-test-output = 30000
`;

describe("config-loader", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `agentic-step-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("loadConfig", () => {
    it("throws when no TOML file exists", () => {
      const configPath = join(tmpDir, "config.toml");
      expect(() => loadConfig(configPath)).toThrow(/Config file not found/);
    });

    it("loads a minimal TOML config with defaults", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[schedule]\nsupervisor = "weekly"\n');

      const config = loadConfig(configPath);
      expect(config.supervisor).toBe("weekly");
      expect(config.model).toBe("gpt-5-mini");
      expect(config.testScript).toBe("npm ci && npm test");
      expect(config.featureDevelopmentIssuesWipLimit).toBe(2);
      expect(config.maintenanceIssuesWipLimit).toBe(1);
      expect(config.attemptsPerBranch).toBe(3);
      expect(config.attemptsPerIssue).toBe(2);
      expect(config.tdd).toBe(false);
      expect(config.writablePaths).toEqual([
        "src/lib/",
        "tests/unit/",
        "tests/behaviour/",
        "features/",
        "docs/",
        "examples/",
        "README.md",
        "package.json",
        "src/web/",
      ]);
      expect(config.readOnlyPaths).toEqual(["MISSION.md", "library/", "SOURCES.md", "CONTRIBUTING.md"]);
    });

    it("parses model from schedule section", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[schedule]\nmodel = "claude-sonnet-4"\n');

      const config = loadConfig(configPath);
      expect(config.model).toBe("claude-sonnet-4");
    });

    it("parses custom paths and marks writable keys correctly", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(
        configPath,
        [
          "[paths]",
          'mission = "MISSION.md"',
          'source = "src/lib/"',
          'tests = "tests/unit/"',
          'features = "features/"',
        ].join("\n"),
      );

      const config = loadConfig(configPath);
      expect(config.writablePaths).toContain("src/lib/");
      expect(config.writablePaths).toContain("tests/unit/");
      expect(config.writablePaths).toContain("features/");
      expect(config.readOnlyPaths).toContain("MISSION.md");
    });

    it("parses execution test script", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[execution]\ntest = "make ci-test"\n');

      const config = loadConfig(configPath);
      expect(config.testScript).toBe("make ci-test");
    });

    it("parses limits", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(
        configPath,
        [
          "[limits]",
          "max-feature-issues = 3",
          "max-maintenance-issues = 2",
          "max-attempts-per-branch = 5",
          "max-attempts-per-issue = 4",
          "features-limit = 8",
          "library-limit = 64",
        ].join("\n"),
      );

      const config = loadConfig(configPath);
      expect(config.featureDevelopmentIssuesWipLimit).toBe(3);
      expect(config.maintenanceIssuesWipLimit).toBe(2);
      expect(config.attemptsPerBranch).toBe(5);
      expect(config.attemptsPerIssue).toBe(4);
      expect(config.paths.features.limit).toBe(8);
      expect(config.paths.library.limit).toBe(64);
    });

    it("parses bot config", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[bot]\nlog-prefix = "my-log-"\n');

      const config = loadConfig(configPath);
      expect(config.intentionBot.logPrefix).toBe("my-log-");
    });

    it("reads tdd flag", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, "tdd = true\n");

      const config = loadConfig(configPath);
      expect(config.tdd).toBe(true);
    });

    it("normalises library-sources key", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[paths]\nlibrary-sources = "LINKS.md"\n');

      const config = loadConfig(configPath);
      expect(config.paths.librarySources.path).toBe("LINKS.md");
    });

    it("returns raw configToml text", () => {
      const configPath = join(tmpDir, "config.toml");
      const tomlContent = '[schedule]\nsupervisor = "daily"\n';
      writeFileSync(configPath, tomlContent);

      const config = loadConfig(configPath);
      expect(config.configToml).toContain("[schedule]");
      expect(config.configToml).toContain('supervisor = "daily"');
    });

    it("returns packageJson when package.json exists alongside TOML", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[paths]\ndependencies = "package.json"\n');
      writeFileSync(join(tmpDir, "package.json"), '{"name": "test-pkg", "version": "1.0.0"}');

      const config = loadConfig(configPath);
      expect(config.packageJson).toContain("test-pkg");
      expect(config.packageJson).toContain("1.0.0");
    });

    it("returns empty packageJson when package.json does not exist", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, "");

      const config = loadConfig(configPath);
      expect(config.packageJson).toBe("");
    });

    it("uses med tuning profile by default", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, "");

      const config = loadConfig(configPath);
      expect(config.tuning).toBeDefined();
      expect(config.tuning.reasoningEffort).toBe("medium");
      expect(config.tuning.infiniteSessions).toBe(true);
      expect(config.tuning.issuesScan).toBe(20);
    });

    it("uses min tuning profile when specified", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[tuning]\nprofile = "min"\n' + PROFILE_MIN);

      const config = loadConfig(configPath);
      expect(config.tuning.reasoningEffort).toBe("low");
      expect(config.tuning.infiniteSessions).toBe(false);
      expect(config.tuning.issuesScan).toBe(5);
    });

    it("uses max tuning profile when specified", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[tuning]\nprofile = "max"\n' + PROFILE_MAX);

      const config = loadConfig(configPath);
      expect(config.tuning.reasoningEffort).toBe("high");
      expect(config.tuning.issuesScan).toBe(100);
      // W22: context limits from max profile
      expect(config.tuning.maxReadChars).toBe(100000);
      expect(config.tuning.maxTestOutput).toBe(20000);
      expect(config.tuning.maxFileListing).toBe(0);
      expect(config.tuning.maxLibraryIndex).toBe(10000);
      expect(config.tuning.maxFixTestOutput).toBe(30000);
    });

    it("parses coverage goals from [goals] section", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[goals]\nmin-line-coverage = 80\nmin-branch-coverage = 60\n');

      const config = loadConfig(configPath);
      expect(config.coverageGoals.minLineCoverage).toBe(80);
      expect(config.coverageGoals.minBranchCoverage).toBe(60);
    });

    it("overrides individual tuning knobs", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(
        configPath,
        [
          "[tuning]",
          'profile = "min"',
          'reasoning-effort = "high"',
          "infinite-sessions = true",
        ].join("\n") + PROFILE_MIN,
      );

      const config = loadConfig(configPath);
      expect(config.tuning.reasoningEffort).toBe("high");
      expect(config.tuning.infiniteSessions).toBe(true);
      // issuesScan not overridden, uses min profile default
      expect(config.tuning.issuesScan).toBe(5);
    });

    it("includes profileName in tuning config", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[tuning]\nprofile = "min"\n');

      const config = loadConfig(configPath);
      expect(config.tuning.profileName).toBe("min");
    });

    it("defaults profileName to med", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, "");

      const config = loadConfig(configPath);
      expect(config.tuning.profileName).toBe("med");
    });

    it("resolves transformation-budget from profile", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[tuning]\nprofile = "min"\n' + PROFILE_MIN);

      const config = loadConfig(configPath);
      expect(config.tuning.transformationBudget).toBe(16);
      expect(config.transformationBudget).toBe(16);
    });

    it("allows transformation-budget override", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[tuning]\nprofile = "min"\ntransformation-budget = 10\n' + PROFILE_MIN);

      const config = loadConfig(configPath);
      expect(config.tuning.transformationBudget).toBe(10);
    });

    it("resolves staleDays from profile", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[tuning]\nprofile = "min"\n' + PROFILE_MIN);

      const config = loadConfig(configPath);
      expect(config.tuning.staleDays).toBe(14);
    });

    it("scales limits with tuning profile (min)", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[tuning]\nprofile = "min"\n' + PROFILE_MIN);

      const config = loadConfig(configPath);
      expect(config.featureDevelopmentIssuesWipLimit).toBe(1);
      expect(config.maintenanceIssuesWipLimit).toBe(1);
      expect(config.attemptsPerBranch).toBe(2);
      expect(config.attemptsPerIssue).toBe(1);
      expect(config.paths.features.limit).toBe(2);
      expect(config.paths.library.limit).toBe(8);
    });

    it("scales limits with tuning profile (max)", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[tuning]\nprofile = "max"\n' + PROFILE_MAX);

      const config = loadConfig(configPath);
      expect(config.featureDevelopmentIssuesWipLimit).toBe(4);
      expect(config.maintenanceIssuesWipLimit).toBe(2);
      expect(config.attemptsPerBranch).toBe(5);
      expect(config.attemptsPerIssue).toBe(4);
      expect(config.paths.features.limit).toBe(8);
      expect(config.paths.library.limit).toBe(64);
    });

    it("overrides profile limits with explicit values", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[tuning]\nprofile = "min"\n\n[limits]\nmax-feature-issues = 10\nlibrary-limit = 100\n' + PROFILE_MIN);

      const config = loadConfig(configPath);
      expect(config.featureDevelopmentIssuesWipLimit).toBe(10);
      expect(config.paths.library.limit).toBe(100);
      // Non-overridden values use min profile defaults
      expect(config.attemptsPerBranch).toBe(2);
    });

    it('treats reasoning-effort = "none" as empty string', () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[tuning]\nreasoning-effort = "none"\n');

      const config = loadConfig(configPath);
      expect(config.tuning.reasoningEffort).toBe("");
    });

    it("reads model from tuning section", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[tuning]\nmodel = "claude-sonnet-4"\n');

      const config = loadConfig(configPath);
      expect(config.model).toBe("claude-sonnet-4");
    });

    it("falls back to schedule.model for backwards compatibility", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[schedule]\nmodel = "gpt-4.1"\n');

      const config = loadConfig(configPath);
      expect(config.model).toBe("gpt-4.1");
    });

    it("prefers tuning.model over schedule.model", () => {
      const configPath = join(tmpDir, "config.toml");
      writeFileSync(configPath, '[schedule]\nmodel = "gpt-4.1"\n\n[tuning]\nmodel = "claude-sonnet-4"\n');

      const config = loadConfig(configPath);
      expect(config.model).toBe("claude-sonnet-4");
    });

    it("derives TOML path from YAML-style path (3 levels up)", () => {
      // Simulate legacy .github/agentic-lib/agents/agentic-lib.yml → project root agentic-lib.toml
      const agentsDir = join(tmpDir, ".github", "agentic-lib", "agents");
      mkdirSync(agentsDir, { recursive: true });
      const yamlPath = join(agentsDir, "agentic-lib.yml");
      writeFileSync(yamlPath, ""); // dummy, not read
      writeFileSync(join(tmpDir, "agentic-lib.toml"), '[schedule]\nsupervisor = "hourly"\n');

      const config = loadConfig(yamlPath);
      expect(config.supervisor).toBe("hourly");
    });
  });

  describe("getWritablePaths", () => {
    it("returns config writable paths by default", () => {
      const config = { writablePaths: ["src/", "tests/"] };
      expect(getWritablePaths(config)).toEqual(["src/", "tests/"]);
    });

    it("returns override paths when provided", () => {
      const config = { writablePaths: ["src/"] };
      const result = getWritablePaths(config, "lib/;dist/");
      expect(result).toEqual(["lib/", "dist/"]);
    });

    it("trims whitespace from override paths", () => {
      const config = { writablePaths: [] };
      const result = getWritablePaths(config, " src/ ; tests/ ");
      expect(result).toEqual(["src/", "tests/"]);
    });

    it("filters empty strings from override paths", () => {
      const config = { writablePaths: [] };
      const result = getWritablePaths(config, "src/;;tests/;");
      expect(result).toEqual(["src/", "tests/"]);
    });
  });
});
