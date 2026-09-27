import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { asActor, SEEDED_PROJECT_CODE, startApp, stopApp } from "./helpers.js";

describe("document metadata API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await stopApp(app);
  });

  it("returns the document metadata rows that actually exist for a project", async () => {
    const projects = await app.inject({ method: "GET", url: "/api/projects?limit=200", headers: asActor() });
    const project = projects
      .json()
      .items.find((p: { projectCode: string }) => p.projectCode === SEEDED_PROJECT_CODE);
    expect(project).toBeDefined();

    const res = await app.inject({
      method: "GET",
      url: `/api/documents?entityType=project&entityId=${project.id}`,
      headers: asActor(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Nothing is seeded, and nothing is fabricated: the list is honest.
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it("returns 400 for an invalid query", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/documents?entityType=banana&entityId=${randomUUID()}`,
      headers: asActor(),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("requires an actor", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/documents?entityType=project&entityId=${randomUUID()}`,
    });
    expect(res.statusCode).toBe(401);
  });
});
