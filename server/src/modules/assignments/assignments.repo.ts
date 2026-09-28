import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { assignments, jurisdictions, parcels, projects, roles, users, organizations } from "../../db/schema.js";
import type { ListAssignmentsQuery } from "./assignments.schemas.js";

/** The entity a piece of work belongs to, resolved from the database. */
export type AssignmentEntity = {
  type: "project" | "parcel";
  id: string;
  label: string;
  /** hierarchy binding used for jurisdiction checks (null = not attached) */
  jurisdictionId: string | null;
};

export async function findProjectEntity(db: Db, id: string): Promise<AssignmentEntity | null> {
  const rows = await db
    .select({ id: projects.id, label: projects.projectName, jurisdictionId: projects.jurisdictionId })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { type: "project", id: row.id, label: row.label, jurisdictionId: row.jurisdictionId };
}

export async function findParcelEntity(db: Db, id: string): Promise<AssignmentEntity | null> {
  const rows = await db
    .select({
      id: parcels.id,
      surveyNumber: parcels.surveyNumber,
      subdivisionNumber: parcels.subdivisionNumber,
      village: parcels.village,
      taluk: parcels.taluk,
    })
    .from(parcels)
    .where(eq(parcels.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  // Parcels carry state/district/taluk/village text, not a jurisdiction FK.
  // Resolve the canonical village jurisdiction (seeded names are unique) so
  // parcel-level authorization uses the same hierarchy as everything else.
  const village = await db
    .select({ id: jurisdictions.id })
    .from(jurisdictions)
    .where(and(eq(jurisdictions.level, "village"), eq(jurisdictions.name, row.village)))
    .limit(1);

  const suffix = row.subdivisionNumber ? `/${row.subdivisionNumber}` : "";
  return {
    type: "parcel",
    id: row.id,
    label: `${row.surveyNumber}${suffix} — ${row.village}`,
    jurisdictionId: village[0]?.id ?? null,
  };
}

export async function findAssignmentEntity(
  db: Db,
  type: "project" | "parcel",
  id: string,
): Promise<AssignmentEntity | null> {
  return type === "project" ? findProjectEntity(db, id) : findParcelEntity(db, id);
}

// ── Assignment rows ──────────────────────────────────────────────────────────

export async function findActiveAssignment(
  db: Db,
  entityType: string,
  entityId: string,
): Promise<{ id: string; assignedToUserId: string } | null> {
  const rows = await db
    .select({ id: assignments.id, assignedToUserId: assignments.assignedToUserId })
    .from(assignments)
    .where(
      and(
        eq(assignments.entityType, entityType),
        eq(assignments.entityId, entityId),
        eq(assignments.status, "active"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export type AssignmentListRow = {
  id: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  assignedToUserId: string;
  assignedToName: string | null;
  assignedRole: string;
  assignedRoleLabel: string | null;
  organizationId: string | null;
  organizationName: string | null;
  jurisdictionId: string | null;
  jurisdictionName: string | null;
  jurisdictionLevel: string | null;
  status: string;
  assignedAt: Date | string;
  releasedAt: Date | string | null;
  reason: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: Date | string;
};

const entityLabelSql = sql<string | null>`CASE
  WHEN assignments.entity_type = 'project'
    THEN (SELECT p.project_name FROM projects p WHERE p.id = assignments.entity_id)
  ELSE (SELECT pa.survey_number || COALESCE('/' || pa.subdivision_number, '') || ' — ' || pa.village
          FROM parcels pa WHERE pa.id = assignments.entity_id)
END`;

const selection = {
  id: assignments.id,
  entityType: assignments.entityType,
  entityId: assignments.entityId,
  entityLabel: entityLabelSql,
  assignedToUserId: assignments.assignedToUserId,
  assignedToName: users.name,
  assignedRole: assignments.assignedRole,
  assignedRoleLabel: roles.label,
  organizationId: assignments.organizationId,
  organizationName: organizations.name,
  jurisdictionId: assignments.jurisdictionId,
  jurisdictionName: jurisdictions.name,
  jurisdictionLevel: jurisdictions.level,
  status: assignments.status,
  assignedAt: assignments.assignedAt,
  releasedAt: assignments.releasedAt,
  reason: assignments.reason,
  createdBy: assignments.createdBy,
  createdByName: sql<string | null>`(SELECT u2.name FROM users u2 WHERE u2.id = assignments.created_by)`,
  createdAt: assignments.createdAt,
};

function baseQuery(db: Db) {
  return db
    .select(selection)
    .from(assignments)
    .innerJoin(users, eq(assignments.assignedToUserId, users.id))
    .leftJoin(roles, eq(assignments.assignedRole, roles.id))
    .leftJoin(organizations, eq(assignments.organizationId, organizations.id))
    .leftJoin(jurisdictions, eq(assignments.jurisdictionId, jurisdictions.id));
}

export async function listAssignments(
  db: Db,
  query: ListAssignmentsQuery,
): Promise<{ rows: AssignmentListRow[]; total: number }> {
  const conditions = [];
  if (query.entityType) conditions.push(eq(assignments.entityType, query.entityType));
  if (query.entityId) conditions.push(eq(assignments.entityId, query.entityId));
  if (query.userId) conditions.push(eq(assignments.assignedToUserId, query.userId));
  if (query.organizationId) conditions.push(eq(assignments.organizationId, query.organizationId));
  if (query.jurisdictionId) conditions.push(eq(assignments.jurisdictionId, query.jurisdictionId));
  if (query.status) conditions.push(eq(assignments.status, query.status));
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await baseQuery(db)
    .where(where)
    .orderBy(desc(assignments.assignedAt), asc(assignments.id))
    .limit(query.limit)
    .offset(query.offset);

  const totalRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(assignments)
    .where(where);

  return { rows, total: totalRows[0]?.total ?? 0 };
}

export async function findAssignmentById(db: Db, id: string): Promise<AssignmentListRow | undefined> {
  const rows = await baseQuery(db).where(eq(assignments.id, id)).limit(1);
  return rows[0];
}
