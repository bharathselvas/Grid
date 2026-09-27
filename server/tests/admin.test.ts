import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { asActor, sql, startApp, stopApp } from "./helpers.js";
import { CANONICAL_STAGE_IDS, WORKFLOW_STAGES } from "../src/shared/workflow/stages.js";

type OverviewBody = {
  asOf: string;
  kpis: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    delayedProjects: number;
    attentionProjects: number;
    totalParcels: number;
    parcelAreaHa: number;
    requiredAreaHa: number;
    stateCount: number;
    districtCount: number;
    auditEventsLast7Days: number;
    unavailableMetrics: Array<{ key: string; label: string; reason: string }>;
  };
  pipeline: Array<{
    stage: string;
    count: number;
    delayedCount: number;
    percentage: number;
    attention: boolean;
  }>;
  states: Array<{
    state: string;
    projects: number;
    activeProjects: number;
    delayedProjects: number;
    attentionProjects: number;
    parcels: number;
    parcelAreaHa: number;
    requiredAreaHa: number;
  }>;
};

async function fetchOverview(app: FastifyInstance): Promise<OverviewBody> {
  const res = await app.inject({ method: "GET", url: "/api/admin/overview", headers: asActor() });
  expect(res.statusCode).toBe(200);
  return res.json() as OverviewBody;
}

describe("admin overview API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await stopApp(app);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({ method: "GET", url: "/api/admin/overview" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("UNAUTHENTICATED");
  });

  it("returns KPI, pipeline and state aggregations that match the database", async () => {
    const overview = await fetchOverview(app);

    const [totals] = await sql<{
      total: number;
      active: number;
      completed: number;
    }>(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status = 'active')::int AS active,
              count(*) FILTER (WHERE status = 'closed')::int AS completed
       FROM projects`,
    );
    expect(overview.kpis.totalProjects).toBe(totals.total);
    expect(overview.kpis.activeProjects).toBe(totals.active);
    expect(overview.kpis.completedProjects).toBe(totals.completed);

    // Independent implementation of the documented delay rule: live project
    // whose statutory target date passed OR whose current stage SLA is overrun.
    const slaByStage = new Map(WORKFLOW_STAGES.map((stage) => [stage.id, stage.slaDays]));
    const projectRows = await sql<{
      status: string;
      stage: string;
      targetDate: string | null;
      stageEnteredAt: Date;
    }>(
      `SELECT p.status,
              p.current_workflow_stage AS stage,
              p.target_date::text AS "targetDate",
              COALESCE(wi.started_at, p.created_at) AS "stageEnteredAt"
       FROM projects p
       LEFT JOIN workflow_instances wi
         ON wi.entity_type = 'project' AND wi.entity_id = p.id`,
    );
    const now = Date.now();
    const todayIso = new Date(now).toISOString().slice(0, 10);
    const expectedDelayed = projectRows.filter((row) => {
      if (row.status === "closed" || row.status === "cancelled") return false;
      const overdue = row.targetDate !== null && row.targetDate < todayIso;
      const sla = slaByStage.get(row.stage) ?? 0;
      const daysInStage = (now - new Date(row.stageEnteredAt).getTime()) / 86_400_000;
      return overdue || (sla > 0 && daysInStage > sla);
    }).length;
    expect(overview.kpis.delayedProjects).toBe(expectedDelayed);

    const [parcelsRow] = await sql<{ parcels: number; area: number }>(
      `SELECT count(*)::int AS parcels, COALESCE(sum(area_ha), 0)::float AS area FROM parcels`,
    );
    expect(overview.kpis.totalParcels).toBe(parcelsRow.parcels);
    expect(overview.kpis.parcelAreaHa).toBeCloseTo(parcelsRow.area, 3);

    const [jurisRow] = await sql<{ states: number }>(
      `SELECT count(*)::int AS states FROM jurisdictions WHERE level = 'state'`,
    );
    expect(overview.kpis.stateCount).toBe(jurisRow.states);

    // Pipeline covers exactly the canonical stage vocabulary, sums to the
    // project total, and its percentages add up to ~100%.
    expect(overview.pipeline.map((row) => row.stage)).toEqual([...CANONICAL_STAGE_IDS]);
    const pipelineTotal = overview.pipeline.reduce((sum, row) => sum + row.count, 0);
    expect(pipelineTotal).toBe(totals.total);
    const percentageTotal = overview.pipeline.reduce((sum, row) => sum + row.percentage, 0);
    expect(percentageTotal).toBeGreaterThanOrEqual(99.5);
    expect(percentageTotal).toBeLessThanOrEqual(100.5);

    // Per-state rows match an independent GROUP BY over the same table.
    const stateRows = await sql<{ state: string; projects: number }>(
      `SELECT state, count(*)::int AS projects FROM projects GROUP BY state ORDER BY state`,
    );
    expect(overview.states.map((row) => row.state)).toEqual(stateRows.map((row) => row.state));
    for (const expected of stateRows) {
      const actual = overview.states.find((row) => row.state === expected.state);
      expect(actual?.projects).toBe(expected.projects);
    }

    // The seeded overdue project proves derived delay from real rows.
    expect(overview.kpis.delayedProjects).toBeGreaterThanOrEqual(1);
    expect(overview.pipeline.find((row) => row.stage === "objections_hearing")?.attention).toBe(true);
  });

  it("reports metrics with no backing register as unavailable instead of inventing values", async () => {
    const overview = await fetchOverview(app);
    const keys = overview.kpis.unavailableMetrics.map((metric) => metric.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "compensationAssessedCr",
        "compensationDisbursedCr",
        "affectedFamilies",
        "rrPending",
      ]),
    );
    expect(overview.kpis).not.toHaveProperty("compensationAssessedCr");
    expect(overview.kpis).not.toHaveProperty("affectedFamilies");
    for (const metric of overview.kpis.unavailableMetrics) {
      expect(metric.reason.length).toBeGreaterThan(10);
    }
  });

  it("changes its response when the underlying rows change", async () => {
    const before = await fetchOverview(app);

    const projectId = randomUUID();
    const projectCode = `TST-DELAY-${projectId.slice(0, 8).toUpperCase()}`;
    const state = `Testovia ${projectId.slice(0, 6)}`;
    await sql(
      `INSERT INTO projects (id, project_code, project_name, project_category, applicable_act,
                             status, current_workflow_stage, state, district, ministry,
                             budget_cr, required_area_ha, target_date)
       VALUES ($1, $2, 'Delay Probe Project', 'infrastructure', 'RFCTLARR',
               'active', 'scrutiny', $3, 'Probe District', 'Ministry of Test',
               10.00, 5.0000, CURRENT_DATE - 1)`,
      [projectId, projectCode, state],
    );

    try {
      const after = await fetchOverview(app);

      expect(after.kpis.totalProjects).toBe(before.kpis.totalProjects + 1);
      expect(after.kpis.delayedProjects).toBeGreaterThanOrEqual(before.kpis.delayedProjects + 1);
      expect(after.kpis.attentionProjects).toBeGreaterThanOrEqual(before.kpis.attentionProjects + 1);

      const stateRow = after.states.find((row) => row.state === state);
      expect(stateRow).toBeDefined();
      expect(stateRow?.projects).toBe(1);
      expect(stateRow?.delayedProjects).toBe(1);
      expect(stateRow?.attentionProjects).toBe(1);

      const scrutiny = after.pipeline.find((row) => row.stage === "scrutiny");
      expect(scrutiny?.count).toBeGreaterThanOrEqual(1);
      expect(scrutiny?.delayedCount).toBeGreaterThanOrEqual(1);
      expect(scrutiny?.attention).toBe(true);
    } finally {
      await sql(`DELETE FROM projects WHERE id = $1`, [projectId]);
    }
  });

  it("serves monitoring filter facets from live rows", async () => {
    const noAuth = await app.inject({ method: "GET", url: "/api/admin/projects/facets" });
    expect(noAuth.statusCode).toBe(401);

    const res = await app.inject({ method: "GET", url: "/api/admin/projects/facets", headers: asActor() });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      states: Array<{ value: string; count: number }>;
      ministries: Array<{ value: string; count: number }>;
      stages: Array<{ value: string; count: number }>;
      risks: Array<{ value: string; count: number }>;
    };

    const stateRows = await sql<{ state: string }>(`SELECT DISTINCT state FROM projects`);
    expect(body.states.map((row) => row.value).sort()).toEqual(
      stateRows.map((row) => row.state).sort(),
    );

    expect(body.ministries.map((row) => row.value)).toContain("Ministry of Jal Shakti");
    expect(body.ministries.every((row) => row.count >= 1)).toBe(true);

    expect(body.stages.map((row) => row.value)).toEqual([...CANONICAL_STAGE_IDS]);
    expect(body.stages.reduce((sum, row) => sum + row.count, 0)).toBe(
      body.states.reduce((sum, row) => sum + row.count, 0),
    );

    expect(body.risks[0]?.value).toBe("critical");
    expect(body.risks.reduce((sum, row) => sum + row.count, 0)).toBe(
      body.states.reduce((sum, row) => sum + row.count, 0),
    );
  });
});
