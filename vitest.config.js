import { defineConfig } from "vitest/config";
import { resolve } from "path";

// Alias @actions/core so vi.mock("@actions/core") intercepts the root node_modules
// resolution. Without this, the real @actions/core outputs ::warning:: annotations.
const actionsCorePath = resolve("node_modules/@actions/core/lib/core.js");

export default defineConfig({
  resolve: {
    alias: {
      "@actions/core": actionsCorePath,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    fileParallelism: true,
    isolate: true,
  },
});
