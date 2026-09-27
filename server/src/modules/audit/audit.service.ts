import { getDb } from "../../db/client.js";
import { listAuditEvents, type AuditListRow } from "./audit.repo.js";

export type AuditEventDto = {
  id: string;
  timestamp: string;
  actor: string;
  actorUserId: string | null;
  role: string;
  organization: string;
  action: string;
  project: string;
  entityType: string;
  entityId: string;
  previousState: string | null;
  newState: string | null;
  justification: string | null;
  ip: string | null;
  createdAt: string;
};

const asIso = (value: string | Date): string => (value instanceof Date ? value.toISOString() : String(value));

/** Turn stored JSON state into the short human label the UI shows. */
export function stateLabel(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["status", "currentWorkflowStage", "projectCode", "stage", "label"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.length > 0) return candidate;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

export function toAuditDto(row: AuditListRow): AuditEventDto {
  const createdAt = asIso(row.createdAt);
  return {
    id: row.id,
    timestamp: createdAt,
    actor: row.actorName ?? "System",
    actorUserId: row.actorUserId,
    role: row.actorRoleLabel ?? row.actorRoleId ?? "system",
    organization: row.organizationName ?? "—",
    action: row.action,
    project: row.projectName ?? (row.entityType === "project" ? row.entityId : "—"),
    entityType: row.entityType,
    entityId: row.entityId,
    previousState: stateLabel(row.beforeState),
    newState: stateLabel(row.afterState),
    justification: row.reason,
    ip: row.ip,
    createdAt,
  };
}

export async function getAuditEvents(filters: {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  limit: number;
  offset: number;
}): Promise<{ items: AuditEventDto[]; total: number; limit: number; offset: number }> {
  const db = getDb();
  const { rows, total } = await listAuditEvents(db, filters);
  return { items: rows.map(toAuditDto), total, limit: filters.limit, offset: filters.offset };
}
