import { Pool } from "pg";
import { TEST_DATABASE_NAME, TEST_DATABASE_URL } from "./dbUrl.js";

/**
 * Test database bootstrap:
 *   1. create `terranex_test` if missing
 *   2. apply migrations (idempotent, same SQL as production)
 *   3. truncate domain tables + re-seed (deterministic starting state)
 *
 * These are REAL database integration tests — nothing about the database is
 * mocked.
 */
export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.AUTH_MODE = "development-header";

  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = "/postgres";
  const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1 });
  try {
    const client = await adminPool.connect();
    try {
      const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [TEST_DATABASE_NAME]);
      if (!exists.rowCount) {
        await client.query(`CREATE DATABASE "${TEST_DATABASE_NAME}"`);
        console.log(`[test] created database ${TEST_DATABASE_NAME}`);
      }
    } finally {
      client.release();
    }
  } finally {
    await adminPool.end();
  }

  const { runMigrations } = await import("../../src/db/migrate.js");
  const { getPool } = await import("../../src/db/client.js");
  const { seed } = await import("../../src/db/seed.js");

  const pool = getPool();
  const result = await runMigrations(pool);
  if (result.applied.length) console.log(`[test] applied migrations: ${result.applied.join(", ")}`);

  const domainTables = [
    "notifications",
    "audit_events",
    "assignments",
    "documents",
    "parcel_assignments",
    "workflow_transitions",
    "workflow_instances",
    "parcels",
    "projects",
    "dataset_records",
    "datasets",
    "users",
    "jurisdictions",
    "organizations",
  ];

  const client = await pool.connect();
  try {
    await client.query(`TRUNCATE TABLE ${domainTables.map((t) => `"${t}"`).join(", ")} CASCADE`);
  } finally {
    client.release();
  }

  await seed();
  console.log("[test] migrated + seeded test database");

  const { closePool } = await import("../../src/db/client.js");
  await closePool();
}
