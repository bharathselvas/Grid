import { getDb } from "../../db/client.js";
import { stageProgressPercent } from "../../shared/workflow/risk.js";
import { WORKFLOW_STAGES } from "../../shared/workflow/stages.js";
import {
  auditEventsLast7Days,
  jurisdictionCounts,
  ministryFacets,
  parcelStateCounts,
  parcelTotals,
  projectTotals,
  riskFacets,
  stageCounts,
  stateCounts,
  stateFacets,
  type FacetRow,
} from "./admin.repo.js";

/**
 * National overview — every figure below is aggregated from live database
 * rows at request time. Metrics whose underlying registers do not exist yet
 * are explicitly reported as unavailable instead of being approximated.
 */

export type UnavailableMetric = {
  key: string;
  label: string;
  reason: string;
};

export type OverviewKpis = {
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
  unavailableMetrics: UnavailableMetric[];
};

export type OverviewPipelineRow = {
  stage: string;
  label: string;
  shortLabel: string;
  group: string;
  order: number;
  slaDays: number;
  count: number;
  delayedCount: number;
  percentage: number;
  attention: boolean;
  progress: number;
};

export type OverviewStateRow = {
  state: string;
  projects: number;
  activeProjects: number;
  delayedProjects: number;
  attentionProjects: number;
  parcels: number;
  parcelAreaHa: number;
  requiredAreaHa: number;
};

export type NationalOverviewDto = {
  asOf: string;
  kpis: OverviewKpis;
  pipeline: OverviewPipelineRow[];
  states: OverviewStateRow[];
};

const round = (value: number, digits = 4): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const UNAVAILABLE_METRICS: UnavailableMetric[] = [
  {
    key: "compensationAssessedCr",
    label: "Compensation Assessed",
    reason: "No compensation assessment register exists in this database yet.",
  },
  {
    key: "compensationDisbursedCr",
    label: "Compensation Disbursed",
    reason: "Payment disbursement data (PFMS) is not connected to this system yet.",
  },
  {
    key: "affectedFamilies",
    label: "Affected Families",
    reason: "No affected-family register exists in this database yet.",
  },
  {
    key: "rrPending",
    label: "R&R Pending",
    reason: "No rehabilitation & resettlement case register exists in this database yet.",
  },
];

export async function getNationalOverview(): Promise<NationalOverviewDto> {
  const db = getDb();

  const [totals, stageRows, stateRows, parcelRows, parcelTotalsRow, jurisdictions, auditRecent] =
    await Promise.all([
      projectTotals(db),
      stageCounts(db),
      stateCounts(db),
      parcelStateCounts(db),
      parcelTotals(db),
      jurisdictionCounts(db),
      auditEventsLast7Days(db),
    ]);

  const totalProjects = totals.total;

  const pipeline: OverviewPipelineRow[] = WORKFLOW_STAGES.map((stage) => {
    const row = stageRows.find((r) => r.stage === stage.id);
    const count = row?.count ?? 0;
    const delayedCount = row?.delayed ?? 0;
    return {
      stage: stage.id,
      label: stage.label,
      shortLabel: stage.shortLabel,
      group: stage.group,
      order: stage.order,
      slaDays: stage.slaDays,
      count,
      delayedCount,
      percentage: totalProjects > 0 ? Math.round((count / totalProjects) * 1000) / 10 : 0,
      attention: delayedCount > 0,
      progress: stageProgressPercent(stage.id),
    };
  });

  const parcelsByState = new Map(parcelRows.map((row) => [row.state, row]));
  const states: OverviewStateRow[] = stateRows.map((row) => {
    const parcels = parcelsByState.get(row.state);
    return {
      state: row.state,
      projects: row.projects,
      activeProjects: row.activeProjects,
      delayedProjects: row.delayedProjects,
      attentionProjects: row.attentionProjects,
      parcels: parcels?.parcels ?? 0,
      parcelAreaHa: round(parcels?.areaHa ?? 0),
      requiredAreaHa: round(row.requiredAreaHa),
    };
  });

  return {
    asOf: new Date().toISOString(),
    kpis: {
      totalProjects,
      activeProjects: totals.active,
      completedProjects: totals.completed,
      delayedProjects: totals.delayed,
      attentionProjects: totals.attention,
      totalParcels: parcelTotalsRow.parcels,
      parcelAreaHa: round(parcelTotalsRow.areaHa),
      requiredAreaHa: round(totals.requiredAreaHa),
      stateCount: jurisdictions.states,
      districtCount: jurisdictions.districts,
      auditEventsLast7Days: auditRecent,
      unavailableMetrics: UNAVAILABLE_METRICS,
    },
    pipeline,
    states,
  };
}

// ── Monitoring filter facets ────────────────────────────────────────────────

export type ProjectFacetsDto = {
  states: FacetRow[];
  ministries: FacetRow[];
  stages: FacetRow[];
  risks: FacetRow[];
};

/** Distinct filter values (with live counts) for the national monitoring page. */
export async function getProjectFacets(): Promise<ProjectFacetsDto> {
  const db = getDb();
  const [states, ministries, stageRows, riskRows] = await Promise.all([
    stateFacets(db),
    ministryFacets(db),
    stageCounts(db),
    riskFacets(db),
  ]);

  const countByStage = new Map(stageRows.map((row) => [row.stage, row.count]));
  const stages = WORKFLOW_STAGES.map((stage) => ({
    value: stage.id,
    count: countByStage.get(stage.id) ?? 0,
  }));

  // Most severe first — matches the order the UI filter presents.
  const severityOrder = ["critical", "high", "medium", "low", "on_track"];
  const rank = new Map(severityOrder.map((level, index) => [level, index]));
  const risks = [...riskRows].sort(
    (a, b) => (rank.get(a.value) ?? 99) - (rank.get(b.value) ?? 99),
  );

  return { states, ministries, stages, risks };
}
