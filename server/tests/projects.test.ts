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

  it("paginates with limit/offset against a stable total", async () => {
    const all = await app.inject({ method: "GET", url: "/api/projects?limit=200", headers: asActor() });
    expect(all.statusCode).toBe(200);
    const total = all.json().total as number;
    expect(total).toBeGreaterThanOrEqual(5);

    const page1 = await app.inject({ method: "GET", url: "/api/projects?limit=2&offset=0", headers: asActor() });
    const page2 = await app.inject({ method: "GET", url: "/api/projects?limit=2&offset=2", headers: asActor() });
    expect(page1.json().items).toHaveLength(Math.min(2, total));
    expect(page2.json().items.length).toBeGreaterThan(0);
    expect(page1.json().total).toBe(total);
    expect(page2.json().total).toBe(total);

    const ids1: string[] = page1.json().items.map((p: { id: string }) => p.id);
    const ids2: string[] = page2.json().items.map((p: { id: string }) => p.id);
    expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
  });

  it("filters server-side by ministry, search text and derived risk", async () => {
    const ministry = "Ministry of Jal Shakti";
    const byMinistry = await app.inject({
      method: "GET",
      url: `/api/projects?ministry=${encodeURIComponent(ministry)}`,
      headers: asActor(),
    });
    expect(byMinistry.statusCode).toBe(200);
    expect(byMinistry.json().items.length).toBeGreaterThanOrEqual(1);
    expect(byMinistry.json().items.every((p: { ministry: string }) => p.ministry === ministry)).toBe(true);

    const bySearch = await app.inject({
      method: "GET",
      url: `/api/projects?q=${encodeURIComponent("Ring Road")}`,
      headers: asActor(),
    });
    expect(bySearch.json().items.length).toBeGreaterThanOrEqual(1);
    expect(bySearch.json().items[0].projectCode).toBe("MH/PUNE/NHAI/2025-26/042");

    // The seeded overdue project must be derivable as critical by the API.
    const byRisk = await app.inject({ method: "GET", url: "/api/projects?risk=critical", headers: asActor() });
    expect(byRisk.json().items.length).toBeGreaterThanOrEqual(1);
    expect(byRisk.json().items.every((p: { risk: string }) => p.risk === "critical")).toBe(true);
    expect(byRisk.json().items.map((p: { projectCode: string }) => p.projectCode)).toContain(
      "MH/PUNE/WRD/2024-25/011",
    );
  });

  it("returns live workflow timing and risk fields on list and detail", async () => {
    const list = await app.inject({ method: "GET", url: "/api/projects?limit=200", headers: asActor() });
    const seeded = list
      .json()
      .items.find((p: { projectCode: string }) => p.projectCode === "MH/PUNE/WRD/2024-25/011");
    expect(seeded).toBeDefined();
    expect(seeded.risk).toBe("critical");
    expect(seeded.delayed).toBe(true);
    expect(seeded.daysInStage).toBeGreaterThan(seeded.stageSlaDays);

    const res = await app.inject({ method: "GET", url: `/api/projects/${seeded.id}`, headers: asActor() });
    expect(res.statusCode).toBe(200);
    const detail = res.json();
    expect(detail.risk).toBe("critical");
    expect(detail.delayed).toBe(true);
    expect(detail.stageSlaDays).toBeGreaterThan(0);
    expect(typeof detail.daysInStage).toBe("number");
    expect(Number.isNaN(new Date(detail.lastActivityAt).getTime())).toBe(false);
    expect(Number.isNaN(new Date(detail.stageEnteredAt).getTime())).toBe(false);

    const completed = list
      .json()
      .items.find((p: { projectCode: string }) => p.projectCode === "MH/NAG/MADC/2023-24/007");
    expect(completed.status).toBe("closed");
    expect(completed.risk).toBe("on_track");
    expect(completed.delayed).toBe(false);
  });
});
