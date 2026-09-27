import { and, asc, eq, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { jurisdictions, projects, users } from "../../db/schema.js";

export type JurisdictionListRow = {
  id: string;
  level: string;
  name: string;
  code: string;
  parentId: string | null;
  stateCode: string | null;
  districtCode: string | null;
  tehsilCode: string | null;
  projectCount: number;
  officials: string[] | null;
  createdAt: Date | string;
};

const selection = {
  id: jurisdictions.id,
  level: jurisdictions.level,
  name: jurisdictions.name,
  code: jurisdictions.code,
  parentId: jurisdictions.parentId,
  stateCode: jurisdictions.stateCode,
  districtCode: jurisdictions.districtCode,
  tehsilCode: jurisdictions.tehsilCode,
  projectCount: sql<number>`(SELECT count(*)::int FROM projects WHERE projects.jurisdiction_id = ${jurisdictions.id})`,
  officials: sql<string[] | null>`(
    SELECT json_agg(u.name ORDER BY u.name)
      FROM users u
     WHERE u.jurisdiction_id = ${jurisdictions.id}
  )`,
  createdAt: jurisdictions.createdAt,
};

export async function listJurisdictions(
  db: Db,
  filters: { level?: string; parentId?: string; q?: string },
): Promise<JurisdictionListRow[]> {
  const conditions = [];
  if (filters.level) conditions.push(eq(jurisdictions.level, filters.level));
  if (filters.parentId) conditions.push(eq(jurisdictions.parentId, filters.parentId));
  if (filters.q) conditions.push(sql`${jurisdictions.name} ILIKE ${`%${filters.q}%`}`);

  return db
    .select(selection)
    .from(jurisdictions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(jurisdictions.level), asc(jurisdictions.name));
}

export async function findJurisdictionById(db: Db, id: string): Promise<JurisdictionListRow | undefined> {
  const rows = await db.select(selection).from(jurisdictions).where(eq(jurisdictions.id, id)).limit(1);
  return rows[0];
}

export type UserCountRow = { jurisdictionId: string | null; userCount: number };

export async function countUsersByJurisdiction(db: Db): Promise<Map<string, number>> {
  const rows = await db
    .select({ jurisdictionId: users.jurisdictionId, n: sql<number>`count(*)::int` })
    .from(users)
    .groupBy(users.jurisdictionId);
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.jurisdictionId) map.set(row.jurisdictionId, row.n);
  }
  return map;
}

export async function countProjectsByJurisdiction(db: Db): Promise<Map<string, number>> {
  const rows = await db
    .select({ jurisdictionId: projects.jurisdictionId, n: sql<number>`count(*)::int` })
    .from(projects)
    .groupBy(projects.jurisdictionId);
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.jurisdictionId) map.set(row.jurisdictionId, row.n);
  }
  return map;
}
