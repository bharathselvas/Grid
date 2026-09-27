import { getDb } from "../../db/client.js";
import { listUsers, type UserListRow } from "./users.repo.js";

export type UserDto = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  roleId: string;
  role: string;
  roleShortLabel: string;
  roleLevel: number;
  roleScope: string;
  organizationId: string | null;
  organization: string;
  parentAuthority: string;
  jurisdictionId: string | null;
  jurisdiction: string;
  jurisdictionLevel: string | null;
  status: string;
  assignedProjects: number;
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
};

const asIso = (value: string | Date): string => (value instanceof Date ? value.toISOString() : String(value));

export function toUserDto(row: UserListRow): UserDto {
  const createdAt = asIso(row.createdAt);
  const updatedAt = asIso(row.updatedAt);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    designation: row.designation,
    roleId: row.roleId,
    role: row.roleLabel,
    roleShortLabel: row.roleShortLabel,
    roleLevel: row.roleLevel,
    roleScope: row.roleScope,
    organizationId: row.organizationId,
    organization: row.organizationName ?? "—",
    parentAuthority: row.parentOrganizationName ?? "—",
    jurisdictionId: row.jurisdictionId,
    jurisdiction: row.jurisdictionName ?? "—",
    jurisdictionLevel: row.jurisdictionLevel,
    status: row.status,
    assignedProjects: row.assignedProjects ?? 0,
    createdAt,
    updatedAt,
    lastActivity: updatedAt,
  };
}

export async function getUsers(filters: {
  roleId?: string;
  status?: string;
  q?: string;
  limit: number;
  offset: number;
}): Promise<{ items: UserDto[]; total: number; limit: number; offset: number }> {
  const db = getDb();
  const { rows, total } = await listUsers(db, filters);
  return { items: rows.map(toUserDto), total, limit: filters.limit, offset: filters.offset };
}
