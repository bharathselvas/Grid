import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { asActor, INDIA_JURISDICTION_ID, startApp, stopApp } from "./helpers.js";

describe("jurisdictions API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await stopApp(app);
  });

  it("lists the seeded national → state → district → tehsil → village hierarchy", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/jurisdictions?limit=100",
      headers: asActor(),
    });
    expect(res.statusCode).toBe(200);

    const items = res.json().items as Array<{ level: string; name: string }>;
    expect(items.length).toBe(16);

    const levels = new Set(items.map((j) => j.level));
    expect(levels).toContain("national");
    expect(levels).toContain("state");
    expect(levels).toContain("district");
    expect(levels).toContain("tehsil");
    expect(levels).toContain("village");
    expect(items.some((j) => j.name === "Pune District")).toBe(true);
    expect(items.some((j) => j.name === "Pargaon")).toBe(true);
  });

  it("returns a nested tree when tree=true", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/jurisdictions?tree=true",
      headers: asActor(),
    });
    expect(res.statusCode).toBe(200);

    const roots = res.json().items as Array<{ id: string; level: string; children: Array<{ level: string; children: unknown[] }> }>;
    expect(roots).toHaveLength(1);
    expect(roots[0].id).toBe(INDIA_JURISDICTION_ID);
    expect(roots[0].level).toBe("national");

    const maharashtra = roots[0].children.find((c) => c.level === "state");
    expect(maharashtra).toBeTruthy();

    const pune = (maharashtra as unknown as { children: Array<{ level: string; name: string; children: Array<{ name: string }> }> }).children.find(
      (c) => c.name === "Pune District",
    );
    expect(pune).toBeTruthy();
    expect(pune.children.length).toBeGreaterThan(0);
  });

  it("returns a single jurisdiction by id", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/jurisdictions/${INDIA_JURISDICTION_ID}`,
      headers: asActor(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("India");
    expect(body.level).toBe("national");
    expect(body.code).toBe("IN");
  });

  it("returns 404 for an unknown jurisdiction", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/jurisdictions/${randomUUID()}`,
      headers: asActor(),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });
});
