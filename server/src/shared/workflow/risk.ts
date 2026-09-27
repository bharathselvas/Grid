import { sql, type SQL } from "drizzle-orm";
import { WORKFLOW_STAGES } from "./stages.js";

/**
 * Risk and delay derivation — owned by the backend, computed from real data.
 *
 * Nothing here is stored or invented: every expression is evaluated by
 * PostgreSQL against the project's current stage, its workflow instance's
 * stage-entry timestamp, and its statutory target date. The SLA days come
 * from the canonical stage table in `stages.ts`, so there is exactly one
 * source of truth for how long a project may legally stay in a stage.
 *
 * Risk rules (evaluated in order):
 *   1. `closed` / `cancelled` projects are `on_track` (no live timeline).
 *   2. live project whose target date is in the past → `critical` (overdue).
 *   3. stage without an SLA (the `closed` stage)      → `low`.
 *   4. time in stage > 2 × SLA                        → `critical`.
 *   5. time in stage > 1 × SLA                        → `high`.
 *   6. time in stage > 0.5 × SLA                      → `medium`.
 *   7. otherwise                                      → `low`.
 *
 * A project is `delayed` when it is still live AND (its target date has
 * passed OR it has overrun the SLA of its current stage).
 *
 * The table aliases passed to these helpers are always literals written in
 * this codebase (`projects`, `workflow_instances`, …) — never request input.
 */

export const RISK_LEVELS = ["on_track", "low", "medium", "high", "critical"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const TERMINAL_PROJECT_STATUSES = ["closed", "cancelled"] as const;

const ALIAS_RE = /^[a-z_][a-z0-9_]*$/i;

function ident(name: string): string {
  if (!ALIAS_RE.test(name)) throw new Error(`unsafe sql identifier: ${name}`);
  return name;
}

function col(table: string, column: string): SQL {
  return sql.raw(`${ident(table)}.${column}`);
}

/** `CASE <project>.current_workflow_stage WHEN … THEN <slaDays> … ELSE 0 END` */
export function slaDaysSql(projectTable: string): SQL<number> {
  // Stage ids / SLA days are inlined as literals (validated below) rather than
  // bound parameters: PostgreSQL compares GROUP BY and SELECT expressions
  // structurally, and parameter ids would make two identical CASE expressions
  // unequal (breaking `GROUP BY <risk expression>`).
  const whens = WORKFLOW_STAGES.map((stage) => {
    if (!/^[a-z][a-z0-9_]*$/.test(stage.id)) throw new Error(`unsafe stage id: ${stage.id}`);
    if (!Number.isInteger(stage.slaDays) || stage.slaDays < 0) throw new Error(`unsafe slaDays: ${stage.id}`);
    return sql.raw(`WHEN '${stage.id}' THEN ${stage.slaDays}`);
  });
  return sql`(CASE ${col(projectTable, "current_workflow_stage")} ${sql.join(whens, sql` `)} ELSE 0 END)`;
}

/** Days elapsed since the project entered its current stage (fractional). */
export function daysInStageSql(projectTable: string, wiTable: string): SQL<number> {
  return sql`(EXTRACT(EPOCH FROM (now() - COALESCE(${col(wiTable, "started_at")}, ${col(projectTable, "created_at")}))) / 86400.0)`;
}

/** Live project that is overdue on its target date or past its stage SLA. */
export function isDelayedSql(projectTable: string, wiTable: string): SQL<boolean> {
  const sla = slaDaysSql(projectTable);
  const days = daysInStageSql(projectTable, wiTable);
  return sql`(${col(projectTable, "status")} NOT IN ('closed', 'cancelled') AND (
    (${col(projectTable, "target_date")} IS NOT NULL AND ${col(projectTable, "target_date")} < CURRENT_DATE)
    OR (${sla} > 0 AND ${days} > ${sla})
  ))`;
}

/** Derived risk level — see the rule table above. */
export function riskSql(projectTable: string, wiTable: string): SQL<string> {
  const sla = slaDaysSql(projectTable);
  const days = daysInStageSql(projectTable, wiTable);
  return sql`(CASE
    WHEN ${col(projectTable, "status")} IN ('closed', 'cancelled') THEN 'on_track'
    WHEN (${col(projectTable, "target_date")} IS NOT NULL AND ${col(projectTable, "target_date")} < CURRENT_DATE) THEN 'critical'
    WHEN ${sla} <= 0 THEN 'low'
    WHEN ${days} > 2 * ${sla} THEN 'critical'
    WHEN ${days} > ${sla} THEN 'high'
    WHEN ${days} > ${sla} * 0.5 THEN 'medium'
    ELSE 'low'
  END)`;
}

/**
 * Stage progress as a 0–100 percentage of the canonical lifecycle, derived
 * from stage order only (pure presentation of real workflow state).
 */
export function stageProgressPercent(stageId: string): number {
  const stage = WORKFLOW_STAGES.find((s) => s.id === stageId);
  if (!stage) return 0;
  return Math.round((stage.order / WORKFLOW_STAGES.length) * 100);
}
