import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./tests/setup/dbUrl.js";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      AUTH_MODE: "development-header",
      CORS_ORIGIN: "http://localhost:3000",
    },
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
