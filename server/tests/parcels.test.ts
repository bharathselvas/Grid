import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { asActor, SEEDED_ULPIN, startApp, stopApp } from "./helpers.js";

describe("parcels API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await stopApp(app);
  });

  it("lists seeded parcels with classification and routing state", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/parcels?limit=50",
      headers: asActor(),
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.items.length).toBeGreaterThanOrEqual(6);
    const ulpins = body.items.map((p: { ulpin: string | null }) => p.ulpin);
    expect(ulpins).toContain(SEEDED_ULPIN);

    const parcel = body.items.find((p: { ulpin: string | null }) => p.ulpin === SEEDED_ULPIN);
    expect(parcel.hasGeometry).toBe(true);
    expect(parcel.geometry).toBeNull();
    expect(parcel.classificationStatus).toBe("classified");
    expect(parcel.state).toBe("Maharashtra");
  });

  it("returns a single parcel with its PostGIS geometry on request", async () => {
    const list = await app.inject({
      method: "GET",
      url: "/api/parcels?limit=50",
      headers: asActor(),
    });
    const target = list
      .json()
      .items.find((p: { ulpin: string | null; hasGeometry: boolean }) => p.ulpin === SEEDED_ULPIN && p.hasGeometry);
    expect(target).toBeTruthy();

    const res = await app.inject({
      method: "GET",
      url: `/api/parcels/${target.id}?includeGeometry=true`,
      headers: asActor(),
    });
    expect(res.statusCode).toBe(200);

    const parcel = res.json();
    expect(parcel.id).toBe(target.id);
    expect(parcel.projectCode).toBeTruthy();
    expect(parcel.geometry).toBeTruthy();
    expect(parcel.geometry.type).toBe("Polygon");
    expect(Array.isArray(parcel.geometry.coordinates)).toBe(true);
    expect(parcel.geometry.coordinates[0][0]).toHaveLength(2);
  });

  it("omits geometry by default on the list endpoint", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/parcels?limit=1",
      headers: asActor(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().items[0].geometry).toBeNull();
  });

  it("returns 404 for a parcel that does not exist", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/parcels/${randomUUID()}`,
      headers: asActor(),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("requires an actor on parcel reads", async () => {
    const res = await app.inject({ method: "GET", url: "/api/parcels" });
    expect(res.statusCode).toBe(401);
  });
});
