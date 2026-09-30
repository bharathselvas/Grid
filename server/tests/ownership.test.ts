import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { asActor, NATIONAL_ADMIN_ID, sql, startApp, stopApp } from "./helpers.js";

const STATE_NODAL_ID = "00000000-0000-4000-8000-000000000202";
const COLLECTOR_ID = "00000000-0000-4000-8000-000000000203";
const REQUIRING_ORG_ID = "00000000-0000-4000-8000-000000000204";
const FIELD_OFFICER_ID = "00000000-0000-4000-8000-000000000206";

const RING_ROAD_ID = "00000000-0000-4000-8000-000000000301";
const JATNI_ID = "00000000-0000-4000-8000-000000000302";
const MIHAN_ID = "00000000-0000-4000-8000-000000000303";
const PUNE_WATER_ID = "00000000-0000-4000-8000-000000000304";

const JATNI_INSTANCE_ID = "00000000-0000-4000-8000-000000000602";
const MIHAN_INSTANCE_ID = "00000000-0000-4000-8000-000000000603";

const ORG_MADC_ID = "00000000-0000-4000-8000-000000000104";
const ORG_COL_PUNE_ID = "00000000-0000-4000-8000-000000000105";
const BARAMATI_JURIS_ID = "00000000-0000-4000-8000-000000000010";

async function countRows(text: string, params: unknown[]): Promise<number> {
  const rows = await sql<{ n: string }>(text, params);
  return Number(rows[0].n);
}

async function instanceIdFor(projectId: string): Promise<string> {
  const res = await app.inject({
    method: "GET",
    url: `/api/workflow/instances?entityType=project&entityId=${projectId}`,
    headers: asActor(),
  });
  expect(res.statusCode).toBe(200);
  return res.json().id;
}

async function transitionSnapshot(instanceId: string) {
  const rows = await sql<{ current_stage: string; transitions: string; audits: string }>(
    `SELECT i.current_stage,
            (SELECT count(*)::text FROM workflow_transitions t WHERE t.workflow_instance_id = i.id) AS transitions,
            (SELECT count(*)::text FROM audit_events a
              WHERE a.entity_id = i.entity_id::text AND a.action = 'WORKFLOW_STAGE_CHANGED') AS audits
       FROM workflow_instances i WHERE i.id = $1`,
    [instanceId],
  );
  return rows[0];
}

let app: FastifyInstance;

beforeAll(async () => {
  app = await startApp();
});

afterAll(async () => {
  await stopApp(app);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Actor context — who the actor IS, resolved from the database
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/actor/context", () => {
  it("resolves the national admin with oversight scope over India", async () => {
    const res = await app.inject({ method: "GET", url: "/api/actor/context", headers: asActor() });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.id).toBe(NATIONAL_ADMIN_ID);
    expect(body.role.id).toBe("national_admin");
    expect(body.isOversight).toBe(true);
    expect(body.jurisdiction.name).toBe("India");
    expect(body.jurisdiction.scopeChain).toEqual(["India"]);
    expect(body.organization.name).toBe("Department of Land Resources");
  });

  it("resolves the collector with a Pune scope chain and the seeded Ring Road assignment", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/actor/context",
      headers: asActor(COLLECTOR_ID),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.role.id).toBe("collector_cala");
    expect(body.isOversight).toBe(false);
    expect(body.jurisdiction.name).toBe("Pune District");
    expect(body.jurisdiction.scopeChain).toEqual(["Pune District", "Maharashtra", "India"]);
    expect(body.organization.name).toBe("Collectorate, Pune");
    const ringRoad = body.assignments.find(
      (a: { entityType: string; entityId: string; status: string }) =>
        a.entityType === "project" && a.entityId === RING_ROAD_ID && a.status === "active",
    );
    expect(ringRoad).toBeDefined();
  });

  it("resolves the field officer at village scope", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/actor/context",
      headers: asActor(FIELD_OFFICER_ID),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.role.id).toBe("field_officer");
    expect(body.jurisdiction.name).toBe("Pargaon");
    expect(body.jurisdiction.scopeChain).toEqual([
      "Pargaon",
      "Haveli Tehsil",
      "Pune District",
      "Maharashtra",
      "India",
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. View scope — GET /api/projects/:id honors jurisdiction + assignment
// ─────────────────────────────────────────────────────────────────────────────

describe("project view scope (GET /api/projects/:id)", () => {
  it("allows oversight to read any project", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${JATNI_ID}`,
      headers: asActor(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(JATNI_ID);
  });

  it("allows a jurisdiction-covered actor and exposes the operational owner", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${RING_ROAD_ID}`,
      headers: asActor(COLLECTOR_ID),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.operationalOwner).not.toBeNull();
    expect(body.operationalOwner.userId).toBe(COLLECTOR_ID);
    expect(body.operationalOwner.roleLabel).toBe("District Collector / CALA");
    expect(body.operationalOwner.jurisdiction).toBe("Pune District");
  });

  it("403s the collector on Odisha work (different state hierarchy)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${JATNI_ID}`,
      headers: asActor(COLLECTOR_ID),
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("FORBIDDEN");
    expect(res.json().error.message).toMatch(/outside the jurisdiction scope/);
  });

  it("403s the state nodal officer on Odisha work", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${JATNI_ID}`,
      headers: asActor(STATE_NODAL_ID),
    });
    expect(res.statusCode).toBe(403);
  });

  it("403s the field officer on a project whose only assignment is parcel-level", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${RING_ROAD_ID}`,
      headers: asActor(FIELD_OFFICER_ID),
    });
    expect(res.statusCode).toBe(403);
  });

  it("allows the state nodal officer inside Maharashtra (unowned project)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${PUNE_WATER_ID}`,
      headers: asActor(STATE_NODAL_ID),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().operationalOwner).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Assignment creation — validated, resolved, audited, transactional
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/assignments", () => {
  let puneWaterAssignmentId: string;

  it("creates project ownership with database-resolved org/jurisdiction + PROJECT_ASSIGNED audit", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/assignments",
      headers: asActor(STATE_NODAL_ID),
      payload: {
        entityType: "project",
        entityId: PUNE_WATER_ID,
        assignedToUserId: COLLECTOR_ID,
        reason: "Collector assumes operational ownership of the Pune Water Supply hearing.",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    puneWaterAssignmentId = body.id;
    expect(body.status).toBe("active");
    expect(body.assignedToUserId).toBe(COLLECTOR_ID);
    expect(body.assignedRole).toBe("collector_cala");
    expect(body.organizationId).toBe(ORG_COL_PUNE_ID);
    expect(body.jurisdictionId).toBe("00000000-0000-4000-8000-000000000005");
    expect(body.createdBy).toBe(STATE_NODAL_ID);
    expect(body.entityLabel).toContain("Pune Metropolitan Water Supply");

    const audits = await sql<{ id: string }>(
      `SELECT id FROM audit_events
        WHERE action = 'PROJECT_ASSIGNED' AND entity_id = $1 AND actor_user_id = $2`,
      [PUNE_WATER_ID, STATE_NODAL_ID],
    );
    expect(audits.length).toBe(1);

    const detail = await app.inject({
      method: "GET",
      url: `/api/projects/${PUNE_WATER_ID}`,
      headers: asActor(STATE_NODAL_ID),
    });
    expect(detail.json().operationalOwner?.userId).toBe(COLLECTOR_ID);
  });

  it("lists the seeded Ring Road ownership with labels", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/assignments?entityType=project&entityId=${RING_ROAD_ID}&status=active`,
      headers: asActor(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.items[0].assignedToName).toBe("Dr. Suhas Diwase, IAS");
    expect(body.items[0].entityLabel).toBe("Pune Ring Road — Phase 2 (Eastern Spur)");
  });

  it("409s a duplicate active owner (one-active-per-entity invariant)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/assignments",
      headers: asActor(),
      payload: { entityType: "project", entityId: RING_ROAD_ID, assignedToUserId: STATE_NODAL_ID },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("CONFLICT");
    expect(res.json().error.message).toMatch(/active operational owner/);
  });

  it("404s an unknown target user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/assignments",
      headers: asActor(),
      payload: { entityType: "project", entityId: MIHAN_ID, assignedToUserId: randomUUID() },
    });
    expect(res.statusCode).toBe(404);
  });

  it("409s an ineligible target role", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/assignments",
      headers: asActor(),
      payload: { entityType: "project", entityId: MIHAN_ID, assignedToUserId: REQUIRING_ORG_ID },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.message).toMatch(/not eligible to own project work/);
  });

  it("403s an assignor outside the entity's jurisdiction hierarchy", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/assignments",
      headers: asActor(STATE_NODAL_ID),
      payload: { entityType: "project", entityId: JATNI_ID, assignedToUserId: COLLECTOR_ID },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.message).toMatch(/Cannot assign work belonging to/);
  });

  it("403s a target whose jurisdiction does not cover the entity", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/assignments",
      headers: asActor(),
      payload: { entityType: "project", entityId: MIHAN_ID, assignedToUserId: COLLECTOR_ID },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.message).toMatch(/Jurisdiction mismatch/);
  });

  it("409s a client-asserted organization that contradicts the target's row", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/assignments",
      headers: asActor(),
      payload: {
        entityType: "project",
        entityId: MIHAN_ID,
        assignedToUserId: STATE_NODAL_ID,
        organizationId: ORG_MADC_ID,
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.message).toMatch(/ownership is resolved from the database/);
  });

  it("403s a role that may not assign work", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/assignments",
      headers: asActor(FIELD_OFFICER_ID),
      payload: { entityType: "project", entityId: MIHAN_ID, assignedToUserId: STATE_NODAL_ID },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.message).toMatch(/cannot assign work/);
  });

  it("writes no audit rows for any of the failed attempts above", async () => {
    // Ring Road is excluded on purpose: its seeded ownership carries a real
    // PROJECT_ASSIGNED audit row (asserted by the list test above).
    for (const projectId of [MIHAN_ID, JATNI_ID]) {
      const n = await countRows(
        `SELECT count(*)::text AS n FROM audit_events
          WHERE action IN ('PROJECT_ASSIGNED', 'ASSIGNMENT_RELEASED') AND entity_id = $1`,
        [projectId],
      );
      expect(n).toBe(0);
    }
    const mihanAssignments = await countRows(
      "SELECT count(*)::text AS n FROM assignments WHERE entity_type = 'project' AND entity_id = $1",
      [MIHAN_ID],
    );
    expect(mihanAssignments).toBe(0);
  });

  it("releases ownership with an ASSIGNMENT_RELEASED audit, then allows re-assignment", async () => {
    const release = await app.inject({
      method: "PATCH",
      url: `/api/assignments/${puneWaterAssignmentId}/release`,
      headers: asActor(STATE_NODAL_ID),
      payload: { reason: "Collector reassigned after the objections hearing cycle." },
    });
    expect(release.statusCode).toBe(200);
    expect(release.json().status).toBe("released");
    expect(release.json().releasedAt).not.toBeNull();

    const releaseAudits = await countRows(
      "SELECT count(*)::text AS n FROM audit_events WHERE action = 'ASSIGNMENT_RELEASED' AND entity_id = $1",
      [PUNE_WATER_ID],
    );
    expect(releaseAudits).toBe(1);

    const again = await app.inject({
      method: "PATCH",
      url: `/api/assignments/${puneWaterAssignmentId}/release`,
      headers: asActor(STATE_NODAL_ID),
      payload: { reason: "Second release must be rejected." },
    });
    expect(again.statusCode).toBe(409);

    const reassign = await app.inject({
      method: "POST",
      url: "/api/assignments",
      headers: asActor(STATE_NODAL_ID),
      payload: {
        entityType: "project",
        entityId: PUNE_WATER_ID,
        assignedToUserId: COLLECTOR_ID,
        reason: "Re-assigned after release — history is preserved, ownership is fresh.",
      },
    });
    expect(reassign.statusCode).toBe(201);
    expect(reassign.json().status).toBe("active");
    expect(reassign.json().id).not.toBe(puneWaterAssignmentId);
  });

  it("rolls back the assignment row when the audit write fails (single transaction)", async () => {
    // A BEFORE INSERT trigger on audit_events raises for this probe reason, so
    // the assignment insert succeeds first and the audit insert fails — the
    // whole transaction must roll back, leaving neither row behind.
    await sql(`
      CREATE OR REPLACE FUNCTION test_force_rollback_probe() RETURNS trigger AS $$
      BEGIN
        IF new.reason LIKE '%FORCE_ROLLBACK%' THEN
          RAISE EXCEPTION 'forced rollback probe';
        END IF;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql;
    `);
    await sql(
      `DROP TRIGGER IF EXISTS test_force_rollback ON audit_events;
       CREATE TRIGGER test_force_rollback BEFORE INSERT ON audit_events
         FOR EACH ROW EXECUTE FUNCTION test_force_rollback_probe();`,
    );

    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/assignments",
        headers: asActor(),
        payload: {
          entityType: "project",
          entityId: MIHAN_ID,
          assignedToUserId: STATE_NODAL_ID,
          reason: "FORCE_ROLLBACK probe — audit insert must fail and roll everything back.",
        },
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(500);

      const mihanAssignments = await countRows(
        "SELECT count(*)::text AS n FROM assignments WHERE entity_type = 'project' AND entity_id = $1",
        [MIHAN_ID],
      );
      expect(mihanAssignments).toBe(0);
      const mihanAudits = await countRows(
        "SELECT count(*)::text AS n FROM audit_events WHERE action = 'PROJECT_ASSIGNED' AND entity_id = $1",
        [MIHAN_ID],
      );
      expect(mihanAudits).toBe(0);
    } finally {
      await sql(
        `DROP TRIGGER IF EXISTS test_force_rollback ON audit_events;
         DROP FUNCTION IF EXISTS test_force_rollback_probe();`,
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Operational scope on workflow transitions — jurisdiction is necessary
//    ON TOP OF stage ownership; denials leave no side effects.
// ─────────────────────────────────────────────────────────────────────────────

describe("workflow operational scope (POST /api/workflow/instances/:id/transitions)", () => {
  it("denies a stage-owning actor from a jurisdiction that does not cover the work", async () => {
    // state_nodal owns stage "sia", but this project lives in Odisha.
    const before = await transitionSnapshot(JATNI_INSTANCE_ID);
    expect(before.current_stage).toBe("sia");

    const res = await app.inject({
      method: "POST",
      url: `/api/workflow/instances/${JATNI_INSTANCE_ID}/transitions`,
      headers: asActor(STATE_NODAL_ID),
      payload: { toStage: "preliminary_notification" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.message).toMatch(/cannot operate on this project/);

    const after = await transitionSnapshot(JATNI_INSTANCE_ID);
    expect(after).toEqual(before);
  });

  it("denies the Pune collector on Nagpur work despite owning the stage", async () => {
    const before = await transitionSnapshot(MIHAN_INSTANCE_ID);
    expect(before.current_stage).toBe("preliminary_notification");

    const res = await app.inject({
      method: "POST",
      url: `/api/workflow/instances/${MIHAN_INSTANCE_ID}/transitions`,
      headers: asActor(COLLECTOR_ID),
      payload: { toStage: "public_disclosure" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.message).toMatch(/cannot operate on this project/);

    const after = await transitionSnapshot(MIHAN_INSTANCE_ID);
    expect(after).toEqual(before);
  });

  it("keeps jurisdiction-covered stage owners working (no regression)", async () => {
    // Same stage, same role family — Jatni is Odisha, so hand the state
    // nodal officer Maharashtra work instead: the collector owns Ring Road's
    // compensation stage inside Pune and remains fully functional (read-only
    // proof here: the instance still resolves and no denial is returned).
    const ringRoadInstance = await instanceIdFor(RING_ROAD_ID);
    const snapshot = await transitionSnapshot(ringRoadInstance);
    expect(snapshot.current_stage).toBe("compensation");

    const res = await app.inject({
      method: "GET",
      url: "/api/workflow/instances?entityType=project&entityId=" + RING_ROAD_ID,
      headers: asActor(COLLECTOR_ID),
    });
    expect(res.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. User provisioning — real rows, real validation, real audit
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/users", () => {
  const probeEmail = `task4.probe.${randomUUID().slice(0, 8)}@terranex.test`;
  let probeUserId: string;

  it("provisions a real user with validated role/organization/jurisdiction", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: asActor(),
      payload: {
        name: "Smt. Task Four Probe",
        email: probeEmail,
        designation: "Field Officer (provisioned by test)",
        roleId: "field_officer",
        organizationId: ORG_COL_PUNE_ID,
        jurisdictionId: BARAMATI_JURIS_ID,
        status: "active",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    probeUserId = body.id;
    expect(body.roleId).toBe("field_officer");
    expect(body.role).toBe("Field Officer / VAO");
    expect(body.organizationId).toBe(ORG_COL_PUNE_ID);
    expect(body.organization).toBe("Collectorate, Pune");
    expect(body.jurisdictionId).toBe(BARAMATI_JURIS_ID);
    expect(body.jurisdiction).toBe("Baramati Tehsil");
    expect(body.status).toBe("active");

    const audits = await sql<{ n: string }>(
      "SELECT count(*)::text AS n FROM audit_events WHERE action = 'USER_PROVISIONED' AND entity_id = $1",
      [probeUserId],
    );
    expect(Number(audits[0].n)).toBe(1);

    const context = await app.inject({
      method: "GET",
      url: "/api/actor/context",
      headers: asActor(probeUserId),
    });
    expect(context.statusCode).toBe(200);
    expect(context.json().jurisdiction.name).toBe("Baramati Tehsil");
  });

  it("409s a duplicate email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: asActor(),
      payload: {
        name: "Smt. Task Four Probe",
        email: probeEmail.toUpperCase(),
        roleId: "field_officer",
        organizationId: ORG_COL_PUNE_ID,
        jurisdictionId: BARAMATI_JURIS_ID,
      },
    });
    expect(res.statusCode).toBe(409);

    const rows = await sql<{ n: string }>(
      "SELECT count(*)::text AS n FROM users WHERE lower(email) = lower($1)",
      [probeEmail],
    );
    expect(Number(rows[0].n)).toBe(1);
  });

  it("400s an unknown role and an unknown jurisdiction", async () => {
    const badRole = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: asActor(),
      payload: {
        name: "Smt. Bad Role",
        email: `bad.role.${randomUUID().slice(0, 8)}@terranex.test`,
        roleId: "definitely_not_a_role",
        organizationId: ORG_COL_PUNE_ID,
        jurisdictionId: BARAMATI_JURIS_ID,
      },
    });
    expect(badRole.statusCode).toBe(400);
    expect(badRole.json().error.code).toBe("VALIDATION_ERROR");

    const badJuris = await app.inject({
      method: "POST",
      url: "/api/users",
      headers: asActor(),
      payload: {
        name: "Smt. Bad Jurisdiction",
        email: `bad.juris.${randomUUID().slice(0, 8)}@terranex.test`,
        roleId: "field_officer",
        organizationId: ORG_COL_PUNE_ID,
        jurisdictionId: randomUUID(),
      },
    });
    expect(badJuris.statusCode).toBe(400);
    expect(badJuris.json().error.code).toBe("VALIDATION_ERROR");
  });
});
