// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { hello } from "../../src/lib/main.js";

describe("seed", () => {
  it("exports a greeting", () => {
    expect(hello()).toContain("intentïon");
  });
});
