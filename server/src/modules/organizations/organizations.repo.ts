import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "../../db/client.js";
import { jurisdictions, organizations } from "../../db/schema.js";

export type OrganizationListRow = {
  id: string;
  name: string;
  code: string | null;
  orgType: string;
  parentId: string | null;
  parentName: string | null;
  jurisdictionId: string | null;
  jurisdictionName: string | null;
  jurisdictionLabel: string;
  status: string;
  projectCount: number;
  userCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export async function listOrganizations(
  db: Db,
  filters: { orgType?: string; status?: string; q?: string; limit: number; offset: number },
): Promise<{ rows: OrganizationListRow[]; total: number }> {
  const conditions = [];
  if (filters.orgType) conditions.push(eq(organizations.orgType, filters.orgType));
  if (filters.status) conditions.push(eq(organizations.status, filters.status));
  if (filters.q) conditions.push(sql`${organizations.name} ILIKE ${`%${filters.q}%`}`);
  const where = conditions.length ? and(...conditions) : undefined;

  const parentOrg = alias(organizations, "org_parent");

  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      code: organizations.code,
      orgType: organizations.orgType,
      parentId: organizations.parentId,
      parentName: parentOrg.name,
      jurisdictionId: organizations.jurisdictionId,
      jurisdictionName: jurisdictions.name,
      jurisdictionLabel: organizations.jurisdictionLabel,
      status: organizations.status,
      projectCount: sql<number>`(SELECT count(*)::int FROM projects p WHERE p.requiring_organization_id = ${organizations.id})`,
      userCount: sql<number>`(SELECT count(*)::int FROM users u WHERE u.organization_id = ${organizations.id})`,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
    })
    .from(organizations)
    .leftJoin(parentOrg, eq(organizations.parentId, parentOrg.id))
    .leftJoin(jurisdictions, eq(organizations.jurisdictionId, jurisdictions.id))
    .where(where)
    .orderBy(asc(organizations.name))
    .limit(filters.limit)
    .offset(filters.offset);

  const totalRows = await db.select({ total: sql<number>`count(*)::int` }).from(organizations).where(where);
  return { rows, total: totalRows[0]?.total ?? 0 };
}

export async function countOrganizationsByStatus(db: Db): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: organizations.status, n: sql<number>`count(*)::int` })
    .from(organizations)
    .groupBy(organizations.status);
  const counts: Record<string, number> = { active: 0, pending: 0, suspended: 0 };
  for (const row of rows) counts[row.status] = row.n;
  return counts;
}
