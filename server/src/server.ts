import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { checkDatabaseHealth, closePool, getPool } from "./db/client.js";
import { getAppliedMigrations } from "./db/migrate.js";

async function main(): Promise<void> {
  const app = await buildApp();

  const health = await checkDatabaseHealth();
  if (!health.connected) {
    app.log.warn(
      { error: health.error },
      "database unreachable — API will start but /health reports 503 until DATABASE_URL works",
    );
  } else {
    let applied: string[] = [];
    try {
      applied = await getAppliedMigrations(getPool());
    } catch {
      applied = [];
    }
    app.log.info(
      {
        database: health.database,
        postgis: health.postgisVersion,
        latencyMs: health.latencyMs,
        migrations: applied.length,
        authMode: env.AUTH_MODE,
      },
      "database connected",
    );
  }

  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Terranex API listening on http://${env.HOST}:${env.PORT} (health: /health)`);

  const shutdown = async (signal: string) => {
    app.log.info(`received ${signal}, shutting down`);
    await app.close();
    await closePool();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("failed to start server:", error instanceof Error ? error.message : error);
  process.exit(1);
});
