import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../../db/client.js";
import { jurisdictions, organizations, roles, users } from "../../db/schema.js";

export type UserListRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  roleId: string;
  roleLabel: string;
  roleShortLabel: string;
  roleLevel: number;
  roleScope: string;
  organizationId: string | null;
  organizationName: string | null;
  parentOrganizationName: string | null;
  jurisdictionId: string | null;
  jurisdictionName: string | null;
  jurisdictionLevel: string | null;
  status: string;
  assignedProjects: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export async function listUsers(
  db: Db,
  filters: { roleId?: string; status?: string; q?: string; limit: number; offset: number },
): Promise<{ rows: UserListRow[]; total: number }> {
  const conditions = [];
  if (filters.roleId) conditions.push(eq(users.roleId, filters.roleId));
  if (filters.status) conditions.push(eq(users.status, filters.status));
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(sql`(${users.name} ILIKE ${pattern} OR ${users.email} ILIKE ${pattern})`);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const parentOrg = alias(organizations, "parent_org");
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      designation: users.designation,
      roleId: users.roleId,
      roleLabel: roles.label,
      roleShortLabel: roles.shortLabel,
      roleLevel: roles.level,
      roleScope: roles.scope,
      organizationId: users.organizationId,
      organizationName: organizations.name,
      parentOrganizationName: parentOrg.name,
      jurisdictionId: users.jurisdictionId,
      jurisdictionName: jurisdictions.name,
      jurisdictionLevel: jurisdictions.level,
      status: users.status,
      assignedProjects: sql<number>`(
        SELECT count(*)::int FROM projects p WHERE p.created_by = ${users.id}
      )`,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(organizations, eq(users.organizationId, organizations.id))
    .leftJoin(parentOrg, eq(organizations.parentId, parentOrg.id))
    .leftJoin(jurisdictions, eq(users.jurisdictionId, jurisdictions.id))
    .where(where)
    .orderBy(asc(roles.level), asc(users.name))
    .limit(filters.limit)
    .offset(filters.offset);

  const totalRows = await db.select({ total: sql<number>`count(*)::int` }).from(users).where(where);
  return { rows, total: totalRows[0]?.total ?? 0 };
}
