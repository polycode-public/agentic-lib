#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2025-2026 Polycode Limited
// scripts/validate-dist-transform.js
//
// Validates that #@dist transforms produce valid YAML for all distributable
// workflows and that agentic-lib.toml has no residual markers after transform.
// Also optionally compares a distributed toml against the expected transform.

import { readdirSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";
import jsYaml from "js-yaml";
import { applyDistTransform } from "../src/dist-transform.js";

const mode = process.argv[2] || "validate";

let errors = 0;

if (mode === "validate" || mode === "all") {
  const dir = resolve(".github/workflows");
  for (const f of readdirSync(dir)) {
    if (!f.startsWith("agentic-lib-") || !f.endsWith(".yml")) continue;
    const raw = readFileSync(resolve(dir, f), "utf8");
    const transformed = applyDistTransform(raw);
    try {
      jsYaml.load(transformed);
      console.log(`VALID: ${f}`);
    } catch (e) {
      console.error(`INVALID: ${f} — ${e.message}`);
      errors++;
    }
  }

  const toml = readFileSync("agentic-lib.toml", "utf8");
  const transformedToml = applyDistTransform(toml);
  if (transformedToml.includes("#@dist")) {
    console.error("INVALID: agentic-lib.toml still contains #@dist markers after transform");
    errors++;
  } else {
    console.log("VALID: agentic-lib.toml (no residual #@dist markers)");
  }
}

if (mode === "compare" || mode === "all") {
  const targetToml = process.argv[3];
  if (!targetToml) {
    console.error("Usage: validate-dist-transform.js compare <path-to-distributed-toml>");
    process.exit(1);
  }
  if (!existsSync(targetToml)) {
    console.error(`File not found: ${targetToml}`);
    process.exit(1);
  }
  const source = readFileSync("agentic-lib.toml", "utf8");
  const expected = applyDistTransform(source);
  // Strip runtime sections and purge-modified values before comparing
  const stripRuntime = (s) => s
    // [acceptance-criteria] values contain [] in text — match to next section header or EOF
    .replace(/\n*\[acceptance-criteria\]\n(?:(?!\n\[)[^\n]*\n?)*/g, "")
    .replace(/\n*\[init\]\n(?:(?!\n\[)[^\n]*\n?)*/g, "\n")
    // Purge sets acceptance-criteria-threshold based on mission difficulty — normalise both sides
    .replace(/^acceptance-criteria-threshold\s*=\s*\d+.*$/gm, "acceptance-criteria-threshold = NORMALIZED");
  const actual = stripRuntime(readFileSync(targetToml, "utf8"));
  const normalizedExpected = stripRuntime(expected);
  if (normalizedExpected !== actual) {
    console.error("ERROR: distributed agentic-lib.toml does not match source defaults");
    console.error("--- Expected (transformed source, normalised) ---");
    console.error(normalizedExpected);
    console.error("--- Actual (in workspace, normalised) ---");
    console.error(actual);
    errors++;
  } else {
    console.log("Distributed agentic-lib.toml matches source defaults");
  }
}

if (errors > 0) process.exit(1);
