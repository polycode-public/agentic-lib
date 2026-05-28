#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
// validate-workflows.js — Validate GitHub Actions workflow files
//
// Loads all .yml files from .github/workflows/,
// parses them (stripping GHA expressions), and checks required fields.

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";

const ROOT = join(import.meta.dirname, "..");

const WORKFLOW_DIRS = [join(ROOT, ".github/workflows")];

function stripForYaml(content) {
  return content.replace(/\$\{\{[^}]*\}\}/g, "x").replace(/^(\s*run:\s*)(?!['"|>])([^\n]*:[^\n]*)$/gm, "$1'$2'"); // eslint-disable-line sonarjs/slow-regex
}

let errors = 0;
let checked = 0;

for (const dir of WORKFLOW_DIRS) {
  if (!existsSync(dir)) continue;

  const files = readdirSync(dir).filter((f) => f.endsWith(".yml"));
  for (const file of files) {
    const filepath = join(dir, file);
    const content = readFileSync(filepath, "utf8");
    checked++;

    try {
      const doc = yaml.load(stripForYaml(content));

      if (!doc.name) {
        console.error(`ERROR: ${filepath}: missing 'name' field`);
        errors++;
      }

      // js-yaml parses bare `on:` as `true:` (YAML spec)
      if (!doc.on && !doc.true) {
        console.error(`ERROR: ${filepath}: missing 'on' trigger`);
        errors++;
      }

      if (!doc.jobs) {
        console.error(`ERROR: ${filepath}: missing 'jobs' field`);
        errors++;
      }
    } catch (err) {
      console.error(`ERROR: ${filepath}: YAML parse error: ${err.message}`);
      errors++;
    }
  }
}

console.log(`Checked ${checked} workflow files, ${errors} error(s)`);
if (errors > 0) {
  process.exit(1);
}
