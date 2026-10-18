import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://forma:forma@localhost:5433/forma_test", DIRECT_URL: process.env.TEST_DATABASE_URL ?? "postgresql://forma:forma@localhost:5433/forma_test", APP_SECRET: "test-secret", ANTHROPIC_API_KEY: "" },
    fileParallelism: false,
    testTimeout: 30000,
  },
});
