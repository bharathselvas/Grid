import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  asActor,
  NHAI_ORG_ID,
  PUNE_JURISDICTION_ID,
  SEEDED_PROJECT_CODE,
  sql,
  startApp,
  stopApp,
  uniqueProjectCode,
} from "./helpers.js";

describe("projects API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await stopApp(app);
  });

  it("lists seeded projects from the database", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/projects?limit=50",
      headers: asActor(),
    });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.items.length).toBeGreaterThanOrEqual(3);
    const codes = body.items.map((p: { projectCode: string }) => p.projectCode);
    expect(codes).toContain(SEEDED_PROJECT_CODE);

    const listed = body.items.find((p: { projectCode: string }) => p.projectCode === SEEDED_PROJECT_CODE);
    expect(listed.currentWorkflowStage).toBeTruthy();
    expect(listed.parcelCount).toBeGreaterThanOrEqual(0);
    expect(typeof listed.budgetCr).toBe("number");
  });

  it("creates a project and writes workflow + audit rows in the same database", async () => {
    const projectCode = uniqueProjectCode();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: asActor(),
      payload: {
        projectCode,
        projectName: "Integration Test Corridor",
        requiringOrganizationId: NHAI_ORG_ID,
        projectCategory: "infrastructure",
        state: "Maharashtra",
        district: "Pune",
        jurisdictionId: PUNE_JURISDICTION_ID,
        budgetCr: 987.5,
        requiredAreaHa: 12.25,
        targetDate: "2027-06-30",
        purpose: "verify real database persistence",
      },
    });
    expect(res.statusCode).toBe(201);

    const created = res.json();
    expect(created.projectCode).toBe(projectCode);
    expect(created.currentWorkflowStage).toBe("project_proposal");
    expect(created.status).toBe("active");
    expect(created.createdBy).toBe("00000000-0000-4000-8000-000000000201");

    const rows = await sql<{ id: string; current_workflow_stage: string }>(
      "SELECT id, current_workflow_stage FROM projects WHERE project_code = $1",
      [projectCode],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(created.id);
    expect(rows[0].current_workflow_stage).toBe("project_proposal");

    const workflows = await sql<{ id: string; current_stage: string }>(
      "SELECT id, current_stage FROM workflow_instances WHERE entity_type = 'project' AND entity_id = $1",
      [created.id],
    );
    expect(workflows).toHaveLength(1);
    expect(workflows[0].current_stage).toBe("project_proposal");

    const audit = await sql<{ id: string; action: string; actor_user_id: string }>(
      "SELECT id, action, actor_user_id FROM audit_events WHERE entity_id = $1 AND action = 'PROJECT_CREATED'",
      [created.id],
    );
    expect(audit).toHaveLength(1);
    expect(audit[0].actor_user_id).toBe("00000000-0000-4000-8000-000000000201");
  });

  it("rejects an invalid create request with 400 and field details", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: asActor(),
      payload: {
        projectCode: "x",
        projectName: "a",
        requiringOrganizationId: "not-a-uuid",
        projectCategory: "rocket",
        state: "",
        district: "",
      },
    });
    expect(res.statusCode).toBe(400);
    const error = res.json().error;
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(error.details)).toBe(true);
    expect(error.details.some((d: { path: string }) => d.path === "projectCategory")).toBe(true);
  });

  it("rejects an unknown requiring organization with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: asActor(),
      payload: {
        projectCode: uniqueProjectCode(),
        projectName: "Unknown org test",
        requiringOrganizationId: "00000000-0000-4000-8000-000000000999",
        projectCategory: "housing",
        state: "Maharashtra",
        district: "Pune",
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details[0].message).toMatch(/organization/i);
  });

  it("rejects a duplicate project code with 409", async () => {
    const projectCode = uniqueProjectCode();
    const payload = {
      projectCode,
      projectName: "Duplicate probe",
      requiringOrganizationId: NHAI_ORG_ID,
      projectCategory: "infrastructure",
      state: "Maharashtra",
      district: "Pune",
    };

    const first = await app.inject({ method: "POST", url: "/api/projects", headers: asActor(), payload });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({ method: "POST", url: "/api/projects", headers: asActor(), payload });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe("CONFLICT");

    const rows = await sql("SELECT id FROM projects WHERE project_code = $1", [projectCode]);
    expect(rows).toHaveLength(1);
  });

  it("returns 404 for a project that does not exist", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${randomUUID()}`,
      headers: asActor(),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for a malformed project id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/not-a-uuid",
      headers: asActor(),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });
});
