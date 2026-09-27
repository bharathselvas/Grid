import { Pool, type PoolClient } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

export type Db = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let db: Db | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: env.isTest ? 4 : 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (err) => {
      // Keep an idle-client crash from taking the process down.
      console.error("[db] unexpected pool error:", err.message);
    });
  }
  return pool;
}

export function getDb(): Db {
  if (!db) db = drizzle(getPool(), { schema });
  return db;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
    db = undefined;
  }
}

export async function withTransaction<T>(fn: (tx: Db, client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  const tx = drizzle(client, { schema });
  try {
    await client.query("BEGIN");
    const result = await fn(tx, client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type DatabaseHealth = {
  connected: boolean;
  latencyMs: number | null;
  database: string | null;
  postgisVersion: string | null;
  error?: string;
};

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const started = Date.now();
  try {
    const client = await getPool().connect();
    try {
      const version = await client.query<{ v: string | null }>(
        "SELECT PostGIS_Version() AS v",
      );
      const currentDb = await client.query<{ name: string }>("SELECT current_database() AS name");
      return {
        connected: true,
        latencyMs: Date.now() - started,
        database: currentDb.rows[0]?.name ?? null,
        postgisVersion: version.rows[0]?.v ?? null,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    return {
      connected: false,
      latencyMs: null,
      database: null,
      postgisVersion: null,
      error: error instanceof Error ? error.message : "connection failed",
    };
  }
}
