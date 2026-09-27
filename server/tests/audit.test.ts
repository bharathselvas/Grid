import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  asActor,
  NHAI_ORG_ID,
  PUNE_JURISDICTION_ID,
  sql,
  startApp,
  stopApp,
  uniqueProjectCode,
} from "./helpers.js";

describe("audit events", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await stopApp(app);
  });

  it("records a real audit event for a project creation and exposes it via GET /api/audit", async () => {
    const projectCode = uniqueProjectCode();
    const create = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: asActor(),
      payload: {
        projectCode,
        projectName: "Audit Trail Probe",
        requiringOrganizationId: NHAI_ORG_ID,
        projectCategory: "infrastructure",
        state: "Maharashtra",
        district: "Pune",
        jurisdictionId: PUNE_JURISDICTION_ID,
        budgetCr: 42,
        requiredAreaHa: 3.5,
        purpose: "audit coverage probe",
      },
    });
    expect(create.statusCode).toBe(201);
    const projectId = create.json().id;

    const rows = await sql<{
      id: string;
      action: string;
      entity_type: string;
      entity_id: string;
      actor_user_id: string;
      actor_role: string;
      after_state: Record<string, unknown>;
      reason: string | null;
      created_at: string;
    }>("SELECT * FROM audit_events WHERE entity_id = $1 AND action = 'PROJECT_CREATED'", [projectId]);

    expect(rows).toHaveLength(1);
    expect(rows[0].entity_type).toBe("project");
    expect(rows[0].actor_user_id).toBe("00000000-0000-4000-8000-000000000201");
    expect(rows[0].actor_role).toBe("national_admin");
    expect(rows[0].after_state).toBeTruthy();
    expect(rows[0].created_at).toBeTruthy();

    const res = await app.inject({
      method: "GET",
      url: "/api/audit?limit=100",
      headers: asActor(),
    });
    expect(res.statusCode).toBe(200);

    const items = res.json().items as Array<{
      entityId: string;
      action: string;
      actor: string;
      role: string;
      organization: string;
      project: string | null;
    }>;
    const entry = items.find((e) => e.entityId === projectId);
    expect(entry).toBeTruthy();
    expect(entry.action).toBe("PROJECT_CREATED");
    expect(entry.actor).toBe("Smt. Meera Joshi, IAS");
    expect(entry.role).toBe("National Admin / DoLR");
    expect(entry.organization).toBe("Department of Land Resources");
    expect(entry.project).toBe("Audit Trail Probe");
  });

  it("enforces append-only at the database level", async () => {
    await expect(sql("UPDATE audit_events SET action = 'TAMPERED' WHERE false")).resolves.toBeInstanceOf(Array);

    const sample = await sql<{ id: string }>("SELECT id FROM audit_events ORDER BY created_at DESC LIMIT 1");
    expect(sample.length).toBe(1);

    await expect(sql("UPDATE audit_events SET action = 'TAMPERED' WHERE id = $1", [sample[0].id])).rejects.toThrow(
      /append-only/i,
    );
    await expect(sql("DELETE FROM audit_events WHERE id = $1", [sample[0].id])).rejects.toThrow(/append-only/i);

    const stillThere = await sql("SELECT id FROM audit_events WHERE id = $1", [sample[0].id]);
    expect(stillThere).toHaveLength(1);
  });

  it("filters the trail by entity for the project detail page", async () => {
    const projectCode = uniqueProjectCode();
    const create = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: asActor(),
      payload: {
        projectCode,
        projectName: "Entity Filter Probe",
        requiringOrganizationId: NHAI_ORG_ID,
        projectCategory: "infrastructure",
        state: "Maharashtra",
        district: "Pune",
      },
    });
    expect(create.statusCode).toBe(201);
    const projectId = create.json().id as string;

    const res = await app.inject({
      method: "GET",
      url: `/api/audit?entityType=project&entityId=${projectId}&limit=50`,
      headers: asActor(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    expect(body.items.every((e: { entityId: string }) => e.entityId === projectId)).toBe(true);
    expect(body.items.map((e: { action: string }) => e.action)).toContain("PROJECT_CREATED");
  });
});
