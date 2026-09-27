import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { startApp, stopApp } from "./helpers.js";

describe("GET /health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await stopApp(app);
  });

  it("reports liveness, a real database connection, PostGIS and applied migrations", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("bhoomi-setu-api");
    expect(body.database.connected).toBe(true);
    expect(body.database.name).toBe("bhoomisetu_test");
    expect(body.database.postgisVersion).toMatch(/3\./);
    expect(body.migrations.applied).toBeGreaterThanOrEqual(2);
    expect(body.migrations.names).toContain("0001_init.sql");
    expect(body.migrations.names).toContain("0002_seed_roles.sql");
    expect(body.authMode).toBe("development-header");
  });

  it("stays public while /api routes require an actor", async () => {
    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);

    const api = await app.inject({ method: "GET", url: "/api/projects" });
    expect(api.statusCode).toBe(401);
    expect(api.json().error.code).toBe("UNAUTHENTICATED");
  });
});
