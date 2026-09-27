import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { asActor, SEEDED_PROJECT_CODE, sql, startApp, stopApp } from "./helpers.js";
import { withTransaction } from "../src/db/client.js";
import { workflowInstances, workflowTransitions } from "../src/db/schema.js";
import { recordAuditEvent } from "../src/modules/audit/audit.writer.js";

const COLLECTOR_CALA_ID = "00000000-0000-4000-8000-000000000203";
const COMPLETED_INSTANCE_ID = "00000000-0000-4000-8000-000000000605";

async function seededProjectId(app: FastifyInstance): Promise<string> {
  const res = await app.inject({ method: "GET", url: "/api/projects?limit=200", headers: asActor() });
  const project = res
    .json()
    .items.find((p: { projectCode: string }) => p.projectCode === SEEDED_PROJECT_CODE);
  expect(project).toBeDefined();
  return project.id;
}

async function instanceIdForProject(app: FastifyInstance, projectId: string): Promise<string> {
  const res = await app.inject({
    method: "GET",
    url: `/api/workflow/instances?entityType=project&entityId=${projectId}`,
    headers: asActor(),
  });
  expect(res.statusCode).toBe(200);
  return res.json().id;
}

async function transitionCounts(instanceId: string, projectId: string) {
  const transitions = await sql<{ n: string }>(
    "SELECT count(*)::text AS n FROM workflow_transitions WHERE workflow_instance_id = $1",
    [instanceId],
  );
  const audits = await sql<{ n: string }>(
    "SELECT count(*)::text AS n FROM audit_events WHERE entity_id = $1 AND action = 'WORKFLOW_STAGE_CHANGED'",
    [projectId],
  );
  const stage = await sql<{ current_stage: string }>(
    "SELECT current_stage FROM workflow_instances WHERE id = $1",
    [instanceId],
  );
  return {
    transitions: Number(transitions[0].n),
    audits: Number(audits[0].n),
    stage: stage[0].current_stage,
  };
}

describe("workflow instance API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await stopApp(app);
  });

  it("returns the live workflow instance and stage history for a project", async () => {
    const projectId = await seededProjectId(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/workflow/instances?entityType=project&entityId=${projectId}`,
      headers: asActor(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.entityType).toBe("project");
    expect(body.entityId).toBe(projectId);
    expect(body.currentStage).toBe("compensation");
    expect(body.status).toBe("active");
    expect(body.ownerRoleLabel).toBeTruthy();
    expect(Number.isNaN(new Date(body.startedAt).getTime())).toBe(false);

    expect(body.transitions.length).toBeGreaterThanOrEqual(1);
    const first = body.transitions[0];
    expect(first.fromStage).toBeNull();
    expect(first.toStage).toBe("compensation");
    expect(first.action).toBe("create");
    expect(first.actorName).toBeTruthy();
  });

  it("returns 404 when no workflow instance exists for the entity", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/workflow/instances?entityType=project&entityId=${randomUUID()}`,
      headers: asActor(),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for an invalid instance query", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/workflow/instances?entityType=banana&entityId=${randomUUID()}`,
      headers: asActor(),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("requires an actor", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/workflow/instances?entityType=project&entityId=${randomUUID()}`,
    });
    expect(res.statusCode).toBe(401);
  });

  it("keeps the stage history consistent with the seeded rows", async () => {
    const projectId = await seededProjectId(app);
    const rows = await sql<{ n: string }>(
      `SELECT count(*)::text AS n FROM workflow_transitions wt
       JOIN workflow_instances wi ON wi.id = wt.workflow_instance_id
       WHERE wi.entity_type = 'project' AND wi.entity_id = $1`,
      [projectId],
    );

    const res = await app.inject({
      method: "GET",
      url: `/api/workflow/instances?entityType=project&entityId=${projectId}`,
      headers: asActor(),
    });
    expect(String(res.json().transitions.length)).toBe(rows[0].n);
  });

  // ── Stage transitions (write path) ─────────────────────────────────────────

  it("rejects a transition without an actor", async () => {
    const projectId = await seededProjectId(app);
    const instanceId = await instanceIdForProject(app, projectId);

    const res = await app.inject({
      method: "POST",
      url: `/api/workflow/instances/${instanceId}/transitions`,
      payload: { toStage: "award" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 400 for an unknown target stage", async () => {
    const projectId = await seededProjectId(app);
    const instanceId = await instanceIdForProject(app, projectId);

    const res = await app.inject({
      method: "POST",
      url: `/api/workflow/instances/${instanceId}/transitions`,
      headers: asActor(COLLECTOR_CALA_ID),
      payload: { toStage: "banana_stage" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when transitioning a missing instance", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/workflow/instances/${randomUUID()}/transitions`,
      headers: asActor(COLLECTOR_CALA_ID),
      payload: { toStage: "award" },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("forbids a role that does not own the current stage (403, no side effects)", async () => {
    const projectId = await seededProjectId(app);
    const instanceId = await instanceIdForProject(app, projectId);
    const before = await transitionCounts(instanceId, projectId);
    expect(before.stage).toBe("compensation");

    // national_admin does not own "compensation" (ownerRoles: collector_cala, finance_officer)
    const res = await app.inject({
      method: "POST",
      url: `/api/workflow/instances/${instanceId}/transitions`,
      headers: asActor(),
      payload: { toStage: "award" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("FORBIDDEN");

    const after = await transitionCounts(instanceId, projectId);
    expect(after).toEqual(before);
  });

  it("rejects skipping stages and same-stage moves (409, no side effects)", async () => {
    const projectId = await seededProjectId(app);
    const instanceId = await instanceIdForProject(app, projectId);
    const before = await transitionCounts(instanceId, projectId);

    const skipped = await app.inject({
      method: "POST",
      url: `/api/workflow/instances/${instanceId}/transitions`,
      headers: asActor(COLLECTOR_CALA_ID),
      payload: { toStage: "possession" },
    });
    expect(skipped.statusCode).toBe(409);
    expect(skipped.json().error.code).toBe("CONFLICT");
    expect(skipped.json().error.details.expectedStage).toBe("award");

    const sameStage = await app.inject({
      method: "POST",
      url: `/api/workflow/instances/${instanceId}/transitions`,
      headers: asActor(COLLECTOR_CALA_ID),
      payload: { toStage: "compensation" },
    });
    expect(sameStage.statusCode).toBe(409);
    expect(sameStage.json().error.code).toBe("CONFLICT");

    const after = await transitionCounts(instanceId, projectId);
    expect(after).toEqual(before);
  });

  it("rejects transitions on a completed workflow (409)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/api/workflow/instances/${COMPLETED_INSTANCE_ID}/transitions`,
      headers: asActor(COLLECTOR_CALA_ID),
      payload: { toStage: "award" },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("CONFLICT");
    expect(res.json().error.message).toMatch(/completed/);
  });

  it("rolls back every write when the transition transaction fails", async () => {
    const projectId = await seededProjectId(app);
    const instanceId = await instanceIdForProject(app, projectId);
    const before = await transitionCounts(instanceId, projectId);

    await expect(
      withTransaction(async (tx) => {
        await tx
          .update(workflowInstances)
          .set({ currentStage: "award" })
          .where(eq(workflowInstances.id, instanceId));
        await tx.insert(workflowTransitions).values({
          workflowInstanceId: instanceId,
          fromStage: "compensation",
          toStage: "award",
          action: "advance",
          isAllowed: true,
          afterState: { stage: "award" },
        });
        await recordAuditEvent(tx, {
          actorUserId: COLLECTOR_CALA_ID,
          actorRole: "collector_cala",
          action: "WORKFLOW_STAGE_CHANGED",
          entityType: "project",
          entityId: projectId,
          afterState: { stage: "award" },
          reason: "Forced failure to prove transactional rollback.",
        });
        throw new Error("forced failure after writes");
      }),
    ).rejects.toThrow("forced failure after writes");

    const after = await transitionCounts(instanceId, projectId);
    expect(after).toEqual(before);
  });

  it("advances exactly one stage, syncs the entity and audits the change", async () => {
    const projectId = await seededProjectId(app);
    const instanceId = await instanceIdForProject(app, projectId);
    const before = await transitionCounts(instanceId, projectId);
    expect(before.stage).toBe("compensation");
    const startedAtBefore = (await sql<{ started_at: string }>(
      "SELECT started_at::text AS started_at FROM workflow_instances WHERE id = $1",
      [instanceId],
    ))[0].started_at;

    const res = await app.inject({
      method: "POST",
      url: `/api/workflow/instances/${instanceId}/transitions`,
      headers: asActor(COLLECTOR_CALA_ID),
      payload: { toStage: "award", reason: "Award enquiry initiated." },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.currentStage).toBe("award");
    expect(body.status).toBe("active");
    expect(body.ownerRoleId).toBe("collector_cala");
    expect(new Date(body.startedAt).getTime()).toBeGreaterThan(Date.now() - 60_000);
    expect(new Date(body.startedAt).getTime()).not.toBe(new Date(startedAtBefore).getTime());

    const last = body.transitions[body.transitions.length - 1];
    expect(last.fromStage).toBe("compensation");
    expect(last.toStage).toBe("award");
    expect(last.action).toBe("advance");
    expect(last.actorName).toBe("Dr. Suhas Diwase, IAS");
    expect(last.isAllowed).toBe(true);
    expect(last.reason).toBe("Award enquiry initiated.");

    // Entity mirror + audit event landed in the same transaction…
    const projectRows = await sql<{ current_workflow_stage: string }>(
      "SELECT current_workflow_stage FROM projects WHERE id = $1",
      [projectId],
    );
    expect(projectRows[0].current_workflow_stage).toBe("award");

    const audits = await sql<{ actor_user_id: string; before_state: unknown; after_state: unknown }>(
      "SELECT actor_user_id, before_state, after_state FROM audit_events WHERE entity_id = $1 AND action = 'WORKFLOW_STAGE_CHANGED'",
      [projectId],
    );
    expect(audits).toHaveLength(1);
    expect(audits[0].actor_user_id).toBe(COLLECTOR_CALA_ID);

    // …and the read API immediately reflects all of it (DB change → API change).
    const after = await transitionCounts(instanceId, projectId);
    expect(after.stage).toBe("award");
    expect(after.transitions).toBe(before.transitions + 1);
    expect(after.audits).toBe(before.audits + 1);

    const project = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}`,
      headers: asActor(),
    });
    expect(project.statusCode).toBe(200);
    expect(project.json().currentWorkflowStage).toBe("award");
    expect(project.json().daysInStage).toBeLessThan(1);
    expect(new Date(project.json().stageEnteredAt).getTime()).toBe(new Date(body.startedAt).getTime());
  });
});
