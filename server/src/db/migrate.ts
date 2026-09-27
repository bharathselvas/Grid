import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(here, "migrations");

const CREATE_TRACKING_TABLE = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  name        text PRIMARY KEY,
  checksum    text NOT NULL,
  applied_at  timestamptz NOT NULL DEFAULT now()
);`;

export type MigrationFile = { name: string; sql: string; checksum: string };

export async function loadMigrationFiles(dir = MIGRATIONS_DIR): Promise<MigrationFile[]> {
  const entries = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const files: MigrationFile[] = [];
  for (const name of entries) {
    const sql = await readFile(path.join(dir, name), "utf8");
    files.push({ name, sql, checksum: createHash("sha256").update(sql).digest("hex") });
  }
  return files;
}

export type MigrationResult = { applied: string[]; skipped: string[] };

/** Apply pending migrations, each inside its own transaction. Idempotent. */
export async function runMigrations(pool: Pool, dir = MIGRATIONS_DIR): Promise<MigrationResult> {
  const files = await loadMigrationFiles(dir);
  const client = await pool.connect();
  const applied: string[] = [];
  const skipped: string[] = [];

  try {
    await client.query(CREATE_TRACKING_TABLE);

    for (const file of files) {
      const existing = await client.query<{ checksum: string }>(
        "SELECT checksum FROM schema_migrations WHERE name = $1",
        [file.name],
      );

      if (existing.rowCount) {
        if (existing.rows[0].checksum !== file.checksum) {
          throw new Error(
            `Migration ${file.name} changed after it was applied ` +
              `(expected checksum ${existing.rows[0].checksum}, got ${file.checksum}). ` +
              `Add a new migration instead of editing an applied one.`,
          );
        }
        skipped.push(file.name);
        continue;
      }

      try {
        await client.query("BEGIN");
        await client.query(file.sql);
        await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [
          file.name,
          file.checksum,
        ]);
        await client.query("COMMIT");
        applied.push(file.name);
      } catch (error) {
        await client.query("ROLLBACK");
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Migration ${file.name} failed: ${message}`);
      }
    }
  } finally {
    client.release();
  }

  return { applied, skipped };
}

export async function getAppliedMigrations(pool: Pool): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query(CREATE_TRACKING_TABLE);
    const result = await client.query<{ name: string }>(
      "SELECT name FROM schema_migrations ORDER BY name",
    );
    return result.rows.map((r) => r.name);
  } finally {
    client.release();
  }
}

const SYSTEM_TABLES = [
  "spatial_ref_sys",
  "geography_columns",
  "geometry_columns",
  "raster_columns",
  "raster_overviews",
];

/**
 * Dev-only hard reset: drop every table in `public` (including legacy
 * un-versioned tables and `schema_migrations`) so migrations can re-run from
 * scratch. PostGIS itself is an extension and survives.
 */
export async function resetDatabase(pool: Pool): Promise<string[]> {
  const client = await pool.connect();
  try {
    const existing = await client.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
    );
    const names = existing.rows.map((r) => r.tablename).filter((n) => !SYSTEM_TABLES.includes(n));
    if (names.length) {
      await client.query(`DROP TABLE IF EXISTS ${names.map((n) => `"${n}"`).join(", ")} CASCADE`);
    }
    return names;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const { getPool } = await import("./client.js");
  const pool = getPool();
  const statusOnly = process.argv.includes("--status");
  const reset = process.argv.includes("--reset");

  try {
    if (statusOnly) {
      const applied = await getAppliedMigrations(pool);
      const files = await loadMigrationFiles();
      const pending = files.filter((f) => !applied.includes(f.name)).map((f) => f.name);
      console.log(`applied (${applied.length}): ${applied.join(", ") || "—"}`);
      console.log(`pending (${pending.length}): ${pending.join(", ") || "—"}`);
    } else {
      if (reset) {
        const dropped = await resetDatabase(pool);
        console.log(`reset — dropped ${dropped.length} table(s): ${dropped.join(", ") || "—"}`);
      }
      const result = await runMigrations(pool);
      console.log(
        `migrations — applied: ${result.applied.length ? result.applied.join(", ") : "none"}, ` +
          `already applied: ${result.skipped.length}`,
      );
    }
  } finally {
    await pool.end();
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
