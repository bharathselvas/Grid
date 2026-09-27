import { asc } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import { roles } from "../../db/schema.js";

export type RoleDto = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  level: number;
  scope: string;
};

export async function getRoles(): Promise<RoleDto[]> {
  const db = getDb();
  const rows = await db.select().from(roles).orderBy(asc(roles.level));
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    shortLabel: row.shortLabel,
    description: row.description,
    level: row.level,
    scope: row.scope,
  }));
}
