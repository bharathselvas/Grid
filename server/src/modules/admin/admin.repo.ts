import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { auditEvents, jurisdictions, parcels, projects, workflowInstances } from "../../db/schema.js";
import { isDelayedSql, riskSql } from "../../shared/workflow/risk.js";

/**
 * National overview aggregations.
 *
 * Every number returned here is produced by PostgreSQL from live rows —
 * there are no constants in this module. Derived concepts (delay, risk)
 * come from the shared expressions in `shared/workflow/risk.ts`.
 */

const PROJECT = "projects";
const WI = "workflow_instances";

const projectWorkflowJoin = () =>
  and(eq(workflowInstances.entityType, "project"), eq(workflowInstances.entityId, projects.id));

export type ProjectTotalsRow = {
  total: number;
  active: number;
  completed: number;
  delayed: number;
  attention: number;
  requiredAreaHa: number;
};

export async function projectTotals(db: Db): Promise<ProjectTotalsRow> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) FILTER (WHERE ${projects}.status = 'active')::int`,
      completed: sql<number>`count(*) FILTER (WHERE ${projects}.status = 'closed')::int`,
      delayed: sql<number>`count(*) FILTER (WHERE ${isDelayedSql(PROJECT, WI)})::int`,
      attention: sql<number>`count(*) FILTER (WHERE ${riskSql(PROJECT, WI)} IN ('critical', 'high'))::int`,
      requiredAreaHa: sql<number>`COALESCE(sum(${projects}.required_area_ha), 0)::float`,
    })
    .from(projects)
    .leftJoin(workflowInstances, projectWorkflowJoin());
  return {
    total: row?.total ?? 0,
    active: row?.active ?? 0,
    completed: row?.completed ?? 0,
    delayed: row?.delayed ?? 0,
    attention: row?.attention ?? 0,
    requiredAreaHa: row?.requiredAreaHa ?? 0,
  };
}

export type StageCountRow = { stage: string; count: number; delayed: number; attention: number };

export async function stageCounts(db: Db): Promise<StageCountRow[]> {
  return db
    .select({
      stage: projects.currentWorkflowStage,
      count: sql<number>`count(*)::int`,
      delayed: sql<number>`count(*) FILTER (WHERE ${isDelayedSql(PROJECT, WI)})::int`,
      attention: sql<number>`count(*) FILTER (WHERE ${riskSql(PROJECT, WI)} IN ('critical', 'high'))::int`,
    })
    .from(projects)
    .leftJoin(workflowInstances, projectWorkflowJoin())
    .groupBy(projects.currentWorkflowStage);
}

export type StateCountRow = {
  state: string;
  projects: number;
  activeProjects: number;
  delayedProjects: number;
  attentionProjects: number;
  requiredAreaHa: number;
};

export async function stateCounts(db: Db): Promise<StateCountRow[]> {
  return db
    .select({
      state: projects.state,
      projects: sql<number>`count(*)::int`,
      activeProjects: sql<number>`count(*) FILTER (WHERE ${projects}.status = 'active')::int`,
      delayedProjects: sql<number>`count(*) FILTER (WHERE ${isDelayedSql(PROJECT, WI)})::int`,
      attentionProjects: sql<number>`count(*) FILTER (WHERE ${riskSql(PROJECT, WI)} IN ('critical', 'high'))::int`,
      requiredAreaHa: sql<number>`COALESCE(sum(${projects}.required_area_ha), 0)::float`,
    })
    .from(projects)
    .leftJoin(workflowInstances, projectWorkflowJoin())
    .groupBy(projects.state)
    .orderBy(projects.state);
}

export type ParcelStateRow = { state: string; parcels: number; areaHa: number };

export async function parcelStateCounts(db: Db): Promise<ParcelStateRow[]> {
  return db
    .select({
      state: parcels.state,
      parcels: sql<number>`count(*)::int`,
      areaHa: sql<number>`COALESCE(sum(${parcels}.area_ha), 0)::float`,
    })
    .from(parcels)
    .groupBy(parcels.state)
    .orderBy(parcels.state);
}

export type ParcelTotalsRow = { parcels: number; areaHa: number };

export async function parcelTotals(db: Db): Promise<ParcelTotalsRow> {
  const [row] = await db
    .select({
      parcels: sql<number>`count(*)::int`,
      areaHa: sql<number>`COALESCE(sum(${parcels}.area_ha), 0)::float`,
    })
    .from(parcels);
  return { parcels: row?.parcels ?? 0, areaHa: row?.areaHa ?? 0 };
}

export type JurisdictionCountsRow = { states: number; districts: number };

export async function jurisdictionCounts(db: Db): Promise<JurisdictionCountsRow> {
  const [row] = await db
    .select({
      states: sql<number>`count(*) FILTER (WHERE ${jurisdictions}.level = 'state')::int`,
      districts: sql<number>`count(*) FILTER (WHERE ${jurisdictions}.level = 'district')::int`,
    })
    .from(jurisdictions);
  return { states: row?.states ?? 0, districts: row?.districts ?? 0 };
}

export async function auditEventsLast7Days(db: Db): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditEvents)
    .where(sql`${auditEvents}.created_at >= now() - interval '7 days'`);
  return row?.count ?? 0;
}

// ── Facet options for the monitoring page's filter dropdowns ────────────────

export type FacetRow = { value: string; count: number };

export async function stateFacets(db: Db): Promise<FacetRow[]> {
  return db
    .select({ value: projects.state, count: sql<number>`count(*)::int` })
    .from(projects)
    .groupBy(projects.state)
    .orderBy(projects.state);
}

export async function ministryFacets(db: Db): Promise<FacetRow[]> {
  const rows = await db
    .select({ value: projects.ministry, count: sql<number>`count(*)::int` })
    .from(projects)
    .where(sql`${projects}.ministry IS NOT NULL`)
    .groupBy(projects.ministry)
    .orderBy(projects.ministry);
  return rows.filter((row): row is FacetRow => row.value !== null);
}

export async function riskFacets(db: Db): Promise<FacetRow[]> {
  return db
    .select({ value: riskSql(PROJECT, WI), count: sql<number>`count(*)::int` })
    .from(projects)
    .leftJoin(workflowInstances, projectWorkflowJoin())
    .groupBy(sql`${riskSql(PROJECT, WI)}`);
}
