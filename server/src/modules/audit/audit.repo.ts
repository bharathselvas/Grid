import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { auditEvents, organizations, projects, roles, users } from "../../db/schema.js";

export type AuditListRow = {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  actorRoleId: string | null;
  actorRoleLabel: string | null;
  organizationName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: unknown;
  afterState: unknown;
  reason: string | null;
  ip: string | null;
  projectName: string | null;
  createdAt: Date | string;
};

export async function listAuditEvents(
  db: Db,
  filters: {
    action?: string;
    entityType?: string;
    entityId?: string;
    actorUserId?: string;
    limit: number;
    offset: number;
  },
): Promise<{ rows: AuditListRow[]; total: number }> {
  const conditions = [];
  if (filters.action) conditions.push(eq(auditEvents.action, filters.action));
  if (filters.entityType) conditions.push(eq(auditEvents.entityType, filters.entityType));
  if (filters.entityId) conditions.push(eq(auditEvents.entityId, filters.entityId));
  if (filters.actorUserId) conditions.push(eq(auditEvents.actorUserId, filters.actorUserId));
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: auditEvents.id,
      actorUserId: auditEvents.actorUserId,
      actorName: users.name,
      actorRoleId: auditEvents.actorRole,
      actorRoleLabel: roles.label,
      organizationName: organizations.name,
      action: auditEvents.action,
      entityType: auditEvents.entityType,
      entityId: auditEvents.entityId,
      beforeState: auditEvents.beforeState,
      afterState: auditEvents.afterState,
      reason: auditEvents.reason,
      ip: auditEvents.ip,
      projectName: projects.projectName,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.actorUserId, users.id))
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(organizations, eq(users.organizationId, organizations.id))
    .leftJoin(
      projects,
      sql`(${auditEvents.entityType} = 'project' AND ${projects.id}::text = ${auditEvents.entityId})`,
    )
    .where(where)
    .orderBy(desc(auditEvents.createdAt))
    .limit(filters.limit)
    .offset(filters.offset);

  const totalRows = await db.select({ total: sql<number>`count(*)::int` }).from(auditEvents).where(where);
  return { rows, total: totalRows[0]?.total ?? 0 };
}
