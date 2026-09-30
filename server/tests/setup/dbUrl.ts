import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

/**
 * Single source of truth for the integration-test database URL.
 * Used by vitest.config.ts (workers) and tests/setup/global.ts (setup).
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, "..", "..");

const envFile = path.join(serverRoot, ".env");
if (existsSync(envFile)) loadDotenv({ path: envFile, override: false });

function withDatabaseName(url: string, dbName: string): string {
  try {
    const parsed = new URL(url);
    parsed.pathname = `/${dbName}`;
    return parsed.toString();
  } catch {
    return url;
  }
}

const base =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://terranex:terranex2026@127.0.0.1:5432/terranex";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
  ? process.env.TEST_DATABASE_URL
  : withDatabaseName(base, "terranex_test");

export const TEST_DATABASE_NAME = new URL(TEST_DATABASE_URL).pathname.replace("/", "");
