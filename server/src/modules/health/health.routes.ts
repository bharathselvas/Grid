import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { checkDatabaseHealth, getPool } from "../../db/client.js";
import { getAppliedMigrations } from "../../db/migrate.js";

const startedAt = Date.now();

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    const database = await checkDatabaseHealth();

    let migrations: string[] = [];
    if (database.connected) {
      try {
        migrations = await getAppliedMigrations(getPool());
      } catch {
        migrations = [];
      }
    }

    const healthy = database.connected;
    reply.status(healthy ? 200 : 503);

    return {
      status: healthy ? "ok" : "unavailable",
      service: "terranex-api",
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      time: new Date().toISOString(),
      database: {
        connected: database.connected,
        name: database.database,
        latencyMs: database.latencyMs,
        postgisVersion: database.postgisVersion,
      },
      migrations: { applied: migrations.length, names: migrations },
      authMode: env.AUTH_MODE,
    };
  });
}
