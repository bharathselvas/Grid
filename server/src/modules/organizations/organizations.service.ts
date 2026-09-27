import { getDb } from "../../db/client.js";
import { listOrganizations, type OrganizationListRow } from "./organizations.repo.js";

export type OrganizationDto = {
  id: string;
  name: string;
  code: string | null;
  type: string;
  orgType: string;
  parentId: string | null;
  parentOrg: string;
  jurisdiction: string;
  projects: number;
  users: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const asIso = (value: string | Date): string => (value instanceof Date ? value.toISOString() : String(value));

export function toOrganizationDto(row: OrganizationListRow): OrganizationDto {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    type: row.orgType,
    orgType: row.orgType,
    parentId: row.parentId,
    parentOrg: row.parentName ?? "—",
    jurisdiction: row.jurisdictionLabel || "—",
    projects: row.projectCount ?? 0,
    users: row.userCount ?? 0,
    status: row.status,
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

export async function getOrganizations(filters: {
  orgType?: string;
  status?: string;
  q?: string;
  limit: number;
  offset: number;
}): Promise<{ items: OrganizationDto[]; total: number; limit: number; offset: number }> {
  const db = getDb();
  const { rows, total } = await listOrganizations(db, filters);
  return { items: rows.map(toOrganizationDto), total, limit: filters.limit, offset: filters.offset };
}
