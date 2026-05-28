// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
// src/dist-transform.js — #@dist marker transform for distribution

/**
 * Apply #@dist transforms to file content for distribution.
 *
 * Two patterns:
 *   1. Line starts with "#@dist " — uncomment by removing the "#@dist " prefix
 *      e.g. "#@dist schedule:" → "schedule:"
 *   2. Line contains " #@dist <value>" suffix — replace the preceding value
 *      e.g. 'default: true   #@dist false' → 'default: false'
 *      e.g. 'mission = "test/MISSION.md"  #@dist "MISSION.md"' → 'mission = "MISSION.md"'
 */
export function applyDistTransform(content) {
  return content
    .split("\n")
    .map((line) => {
      // Pattern 1: line starts with #@dist — uncomment
      const commentMatch = line.match(/^(\s*)#@dist (.*)$/);
      if (commentMatch) {
        return commentMatch[1] + commentMatch[2];
      }
      // Pattern 2: inline #@dist <replacement> — replace preceding value
      const inlineMatch = line.match(/^(.+?)\s+#@dist\s+(.+)$/); // eslint-disable-line sonarjs/slow-regex
      if (inlineMatch) {
        const before = inlineMatch[1];
        const replacement = inlineMatch[2];
        // Replace the last value token on the line before #@dist
        // Handles: 'key: value' (YAML) and 'key = "value"' (TOML)
        return before.replace(/(:\s*|=\s*)(\S+)\s*$/, `$1${replacement}`); // eslint-disable-line sonarjs/slow-regex
      }
      return line;
    })
    .join("\n");
}
