// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  defaultState, serializeState, parseState,
  readState, writeState, incrementCounter,
  resetConsecutiveNops, updateStateAfterTask,
} from "../../src/copilot/state.js";

describe("state.js", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "state-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("defaultState", () => {
    it("returns a state with all expected sections", () => {
      const s = defaultState();
      expect(s.counters).toBeDefined();
      expect(s.budget).toBeDefined();
      expect(s.status).toBeDefined();
      expect(s.schedule).toBeDefined();
    });

    it("has all counters at zero", () => {
      const s = defaultState();
      expect(s.counters["log-sequence"]).toBe(0);
      expect(s.counters["cumulative-transforms"]).toBe(0);
      expect(s.counters["cumulative-nop-cycles"]).toBe(0);
      expect(s.counters["total-tokens"]).toBe(0);
      expect(s.counters["total-duration-ms"]).toBe(0);
    });
  });

  describe("serializeState / parseState round-trip", () => {
    it("round-trips the default state", () => {
      const original = defaultState();
      const toml = serializeState(original);
      const parsed = parseState(toml);
      expect(parsed.counters["log-sequence"]).toBe(0);
      expect(parsed.counters["cumulative-transforms"]).toBe(0);
      expect(parsed.budget["transformation-budget-used"]).toBe(0);
      expect(parsed.status["mission-complete"]).toBe(false);
      expect(parsed.status["mission-failed"]).toBe(false);
      expect(parsed.schedule["auto-disabled"]).toBe(false);
    });

    it("round-trips a populated state", () => {
      const state = defaultState();
      state.counters["log-sequence"] = 47;
      state.counters["cumulative-transforms"] = 3;
      state.counters["total-tokens"] = 4200000;
      state.budget["transformation-budget-used"] = 3;
      state.budget["transformation-budget-cap"] = 128;
      state.status["mission-failed"] = true;
      state.status["mission-failed-reason"] = "Cumulative transforms: 0";
      state.status["last-transform-at"] = "2026-03-14T08:17:45Z";
      state.schedule.current = "continuous";
      state.schedule["auto-disabled"] = true;

      const toml = serializeState(state);
      const parsed = parseState(toml);

      expect(parsed.counters["log-sequence"]).toBe(47);
      expect(parsed.counters["cumulative-transforms"]).toBe(3);
      expect(parsed.counters["total-tokens"]).toBe(4200000);
      expect(parsed.budget["transformation-budget-used"]).toBe(3);
      expect(parsed.budget["transformation-budget-cap"]).toBe(128);
      expect(parsed.status["mission-failed"]).toBe(true);
      expect(parsed.status["mission-failed-reason"]).toBe("Cumulative transforms: 0");
      expect(parsed.status["last-transform-at"]).toBe("2026-03-14T08:17:45Z");
      expect(parsed.schedule.current).toBe("continuous");
      expect(parsed.schedule["auto-disabled"]).toBe(true);
    });

    it("handles strings with special characters", () => {
      const state = defaultState();
      state.status["mission-failed-reason"] = 'Contains "quotes" and \\backslash';
      const toml = serializeState(state);
      const parsed = parseState(toml);
      expect(parsed.status["mission-failed-reason"]).toBe('Contains "quotes" and \\backslash');
    });
  });

  describe("readState / writeState", () => {
    it("returns defaults when file does not exist", () => {
      const state = readState(tmpDir);
      expect(state.counters["log-sequence"]).toBe(0);
    });

    it("writes and reads back state correctly", () => {
      const state = defaultState();
      state.counters["log-sequence"] = 10;
      state.counters["cumulative-transforms"] = 5;
      writeState(tmpDir, state);

      const read = readState(tmpDir);
      expect(read.counters["log-sequence"]).toBe(10);
      expect(read.counters["cumulative-transforms"]).toBe(5);
    });

    it("writes to the correct filename", () => {
      writeState(tmpDir, defaultState());
      const content = readFileSync(join(tmpDir, "agentic-lib-state.toml"), "utf8");
      expect(content).toContain("[counters]");
      expect(content).toContain("[budget]");
    });
  });

  describe("incrementCounter", () => {
    it("increments an existing counter", () => {
      const state = defaultState();
      incrementCounter(state, "cumulative-transforms");
      expect(state.counters["cumulative-transforms"]).toBe(1);
      incrementCounter(state, "cumulative-transforms");
      expect(state.counters["cumulative-transforms"]).toBe(2);
    });

    it("does nothing for unknown counter keys", () => {
      const state = defaultState();
      incrementCounter(state, "nonexistent-key");
      expect(state.counters["nonexistent-key"]).toBeUndefined();
    });
  });

  describe("resetConsecutiveNops", () => {
    it("resets the nop counter to zero", () => {
      const state = defaultState();
      state.counters["cumulative-nop-cycles"] = 15;
      resetConsecutiveNops(state);
      expect(state.counters["cumulative-nop-cycles"]).toBe(0);
    });
  });

  describe("updateStateAfterTask", () => {
    it("increments log-sequence on every call", () => {
      const state = defaultState();
      updateStateAfterTask(state, { task: "transform", outcome: "transformed", transformationCost: 1, tokensUsed: 1000 });
      expect(state.counters["log-sequence"]).toBe(1);
      updateStateAfterTask(state, { task: "transform", outcome: "nop", transformationCost: 0, tokensUsed: 500 });
      expect(state.counters["log-sequence"]).toBe(2);
    });

    it("increments cumulative-transforms on cost > 0", () => {
      const state = defaultState();
      updateStateAfterTask(state, { task: "transform", outcome: "transformed", transformationCost: 1, tokensUsed: 1000 });
      expect(state.counters["cumulative-transforms"]).toBe(1);
      expect(state.budget["transformation-budget-used"]).toBe(1);
    });

    it("does not increment cumulative-transforms on cost = 0", () => {
      const state = defaultState();
      updateStateAfterTask(state, { task: "transform", outcome: "nop", transformationCost: 0, tokensUsed: 500 });
      expect(state.counters["cumulative-transforms"]).toBe(0);
      expect(state.budget["transformation-budget-used"]).toBe(0);
    });

    it("tracks consecutive nop cycles", () => {
      const state = defaultState();
      updateStateAfterTask(state, { task: "direct", outcome: "nop", transformationCost: 0, tokensUsed: 0 });
      expect(state.counters["cumulative-nop-cycles"]).toBe(1);
      updateStateAfterTask(state, { task: "direct", outcome: "nop", transformationCost: 0, tokensUsed: 0 });
      expect(state.counters["cumulative-nop-cycles"]).toBe(2);
    });

    it("resets consecutive nops on non-nop outcome", () => {
      const state = defaultState();
      state.counters["cumulative-nop-cycles"] = 5;
      updateStateAfterTask(state, { task: "transform", outcome: "transformed", transformationCost: 1, tokensUsed: 1000 });
      expect(state.counters["cumulative-nop-cycles"]).toBe(0);
    });

    it("accumulates total tokens", () => {
      const state = defaultState();
      updateStateAfterTask(state, { task: "transform", outcome: "transformed", transformationCost: 1, tokensUsed: 100000 });
      updateStateAfterTask(state, { task: "maintain-features", outcome: "features-maintained", transformationCost: 0, tokensUsed: 50000 });
      expect(state.counters["total-tokens"]).toBe(150000);
    });

    it("accumulates total duration", () => {
      const state = defaultState();
      updateStateAfterTask(state, { task: "transform", outcome: "transformed", transformationCost: 1, tokensUsed: 1000, durationMs: 38000 });
      updateStateAfterTask(state, { task: "supervise", outcome: "supervised", transformationCost: 0, tokensUsed: 500, durationMs: 12000 });
      expect(state.counters["total-duration-ms"]).toBe(50000);
    });

    it("handles missing durationMs gracefully", () => {
      const state = defaultState();
      updateStateAfterTask(state, { task: "transform", outcome: "transformed", transformationCost: 1, tokensUsed: 1000 });
      expect(state.counters["total-duration-ms"]).toBe(0);
    });

    it("tracks maintain-features counter", () => {
      const state = defaultState();
      updateStateAfterTask(state, { task: "maintain-features", outcome: "features-maintained", transformationCost: 0, tokensUsed: 1000 });
      expect(state.counters["cumulative-maintain-features"]).toBe(1);
    });

    it("tracks maintain-library counter", () => {
      const state = defaultState();
      updateStateAfterTask(state, { task: "maintain-library", outcome: "library-maintained", transformationCost: 0, tokensUsed: 1000 });
      expect(state.counters["cumulative-maintain-library"]).toBe(1);
    });

    it("does not count maintain tasks with nop outcome", () => {
      const state = defaultState();
      updateStateAfterTask(state, { task: "maintain-features", outcome: "nop", transformationCost: 0, tokensUsed: 0 });
      expect(state.counters["cumulative-maintain-features"]).toBe(0);
    });

    it("sets last-transform-at on transforms", () => {
      const state = defaultState();
      expect(state.status["last-transform-at"]).toBe("");
      updateStateAfterTask(state, { task: "transform", outcome: "transformed", transformationCost: 1, tokensUsed: 1000 });
      expect(state.status["last-transform-at"]).not.toBe("");
    });

    it("handles 3 sequential transforms correctly (R1 verification)", () => {
      const state = defaultState();
      state.budget["transformation-budget-cap"] = 128;
      updateStateAfterTask(state, { task: "transform", outcome: "transformed", transformationCost: 1, tokensUsed: 486269 });
      updateStateAfterTask(state, { task: "transform", outcome: "transformed", transformationCost: 1, tokensUsed: 277859 });
      updateStateAfterTask(state, { task: "transform", outcome: "transformed", transformationCost: 1, tokensUsed: 1345198 });
      expect(state.counters["cumulative-transforms"]).toBe(3);
      expect(state.budget["transformation-budget-used"]).toBe(3);
      expect(state.counters["total-tokens"]).toBe(486269 + 277859 + 1345198);
    });
  });
});
