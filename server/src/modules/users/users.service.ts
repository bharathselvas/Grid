import { eq } from "drizzle-orm";
import { getDb, withTransaction, type Db } from "../../db/client.js";
import { jurisdictions, organizations, roles, users } from "../../db/schema.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { Actor } from "../../plugins/auth.js";
import { recordAuditEvent } from "../audit/audit.writer.js";
import { findUserByEmail, findUserById, listUsers, type UserListRow } from "./users.repo.js";
import type { CreateUserInput } from "./users.schemas.js";

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

// ── Provisioning (Task #4: truthful, database-backed) ────────────────────────

/**
 * Create a real user row. Every relationship (role, organization,
 * jurisdiction) is validated against the database — the request only says
 * WHICH existing rows to link, never what they mean.
 */
export async function createUser(input: CreateUserInput, actor: Actor): Promise<UserDto> {
  const db = getDb();

  const roleRows = await db.select({ id: roles.id }).from(roles).where(eq(roles.id, input.roleId)).limit(1);
  if (roleRows.length === 0) {
    throw AppError.validation("roleId does not match a canonical role.", [
      { path: "roleId", message: "Unknown role." },
    ]);
  }

  const orgRows = await db
    .select({ id: organizations.id, status: organizations.status })
    .from(organizations)
    .where(eq(organizations.id, input.organizationId))
    .limit(1);
  if (orgRows.length === 0) {
    throw AppError.validation("organizationId does not match an existing organization.", [
      { path: "organizationId", message: "Unknown organization." },
    ]);
  }
  if (orgRows[0].status !== "active") {
    throw AppError.conflict("Cannot provision a user into an organization that is not active.");
  }

  const jurisRows = await db
    .select({ id: jurisdictions.id })
    .from(jurisdictions)
    .where(eq(jurisdictions.id, input.jurisdictionId))
    .limit(1);
  if (jurisRows.length === 0) {
    throw AppError.validation("jurisdictionId does not match an existing jurisdiction.", [
      { path: "jurisdictionId", message: "Unknown jurisdiction." },
    ]);
  }

  if (await findUserByEmail(db, input.email)) {
    throw AppError.conflict(`A user with email ${input.email} already exists.`);
  }

  const created = await withTransaction(async (tx: Db) => {
    const inserted = await tx
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        designation: input.designation ?? null,
        roleId: input.roleId,
        organizationId: input.organizationId,
        jurisdictionId: input.jurisdictionId,
        status: input.status,
      })
      .returning({ id: users.id });

    await recordAuditEvent(tx, {
      actorUserId: actor.userId,
      actorRole: actor.roleId,
      action: "USER_PROVISIONED",
      entityType: "user",
      entityId: inserted[0].id,
      beforeState: null,
      afterState: {
        name: input.name,
        email: input.email,
        roleId: input.roleId,
        organizationId: input.organizationId,
        jurisdictionId: input.jurisdictionId,
        status: input.status,
      },
      reason: "User provisioned via POST /api/users.",
    });

    return inserted[0].id;
  });

  const row = await findUserById(db, created);
  if (!row) throw AppError.internal("User disappeared after creation.");
  return toUserDto(row);
}
