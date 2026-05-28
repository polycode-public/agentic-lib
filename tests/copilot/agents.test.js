// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
import { describe, it, expect } from "vitest";
import { loadAgentPrompt, listAgents } from "../../src/copilot/agents.js";

const EXPECTED_AGENTS = [
  "agent-apply-fix",
  "agent-director",
  "agent-discovery",
  "agent-discussion-bot",
  "agent-implementation-review",
  "agent-issue-resolution",
  "agent-iterate",
  "agent-maintain-features",
  "agent-maintain-library",
  "agent-ready-issue",
  "agent-report",
  "agent-review-issue",
  "agent-supervisor",
];

describe("copilot/agents.js", () => {
  describe("listAgents", () => {
    it("returns all 13 agent names", () => {
      const agents = listAgents();
      expect(agents).toHaveLength(13);
    });

    it("returns sorted agent names", () => {
      const agents = listAgents();
      expect(agents).toEqual(EXPECTED_AGENTS);
    });

    it("does not include config file", () => {
      const agents = listAgents();
      expect(agents).not.toContain("agentic-lib");
    });
  });

  describe("loadAgentPrompt", () => {
    it.each(EXPECTED_AGENTS)("loads %s", (agentName) => {
      const prompt = loadAgentPrompt(agentName);
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("loads agent with .md extension appended", () => {
      const prompt = loadAgentPrompt("agent-iterate");
      expect(prompt).toContain("iterate");
    });

    it("loads agent when .md extension is already provided", () => {
      const prompt = loadAgentPrompt("agent-iterate.md");
      expect(prompt).toBeTruthy();
    });

    it("throws for non-existent agent", () => {
      expect(() => loadAgentPrompt("agent-nonexistent")).toThrow("Agent prompt not found");
    });

    it("returns markdown content for each agent", () => {
      for (const agentName of EXPECTED_AGENTS) {
        const prompt = loadAgentPrompt(agentName);
        // All agent prompts should contain some instruction text
        expect(prompt.trim().length).toBeGreaterThan(10);
      }
    });
  });
});
