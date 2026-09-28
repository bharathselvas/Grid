import { and, eq } from "drizzle-orm";
import { getDb, withTransaction, type Db } from "../../db/client.js";
import { assignments, jurisdictions, organizations, users } from "../../db/schema.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { Actor } from "../../plugins/auth.js";
import { recordAuditEvent } from "../audit/audit.writer.js";
import {
  canOperateOnJurisdiction,
  getActorContext,
  jurisdictionAncestors,
  type ActorContext,
  type JurisdictionRef,
} from "../actorContext/actorContext.service.js";
import {
  findActiveAssignment,
  findAssignmentById,
  findAssignmentEntity,
  listAssignments,
  type AssignmentEntity,
  type AssignmentListRow,
} from "./assignments.repo.js";
import type { CreateAssignmentInput, ListAssignmentsQuery } from "./assignments.schemas.js";

/**
 * Assignment domain rules — deterministic, explainable, all enforced
 * server-side. Nothing about organization or jurisdiction is trusted from the
 * client: both are resolved from the target user's database row.
 */

/** Roles allowed to CREATE/RELEASE operational ownership (assignors). */
export const ASSIGNOR_ROLES = ["national_admin", "state_nodal", "collector_cala", "tehsil_sdo"] as const;
/** Roles that may hold PROJECT-level operational ownership. */
export const PROJECT_OWNER_ROLES = ["state_nodal", "collector_cala", "tehsil_sdo"] as const;
/** Roles that may hold PARCEL-level assignment (field execution). */
export const PARCEL_ASSIGNEE_ROLES = ["collector_cala", "tehsil_sdo", "field_officer"] as const;

export type AssignmentDto = {
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
  assignedAt: string;
  releasedAt: string | null;
  reason: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};

const asIso = (value: Date | string | null): string | null =>
  value === null ? null : value instanceof Date ? value.toISOString() : String(value);

export function toAssignmentDto(row: AssignmentListRow): AssignmentDto {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    entityLabel: row.entityLabel,
    assignedToUserId: row.assignedToUserId,
    assignedToName: row.assignedToName,
    assignedRole: row.assignedRole,
    assignedRoleLabel: row.assignedRoleLabel,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    jurisdictionId: row.jurisdictionId,
    jurisdictionName: row.jurisdictionName,
    jurisdictionLevel: row.jurisdictionLevel,
    status: row.status,
    assignedAt: asIso(row.assignedAt) ?? "",
    releasedAt: asIso(row.releasedAt),
    reason: row.reason,
    createdBy: row.createdBy,
    createdByName: row.createdByName,
    createdAt: asIso(row.createdAt) ?? "",
  };
}

export async function getAssignments(query: ListAssignmentsQuery): Promise<{
  items: AssignmentDto[];
  total: number;
  limit: number;
  offset: number;
}> {
  const db = getDb();
  const { rows, total } = await listAssignments(db, query);
  return { items: rows.map(toAssignmentDto), total, limit: query.limit, offset: query.offset };
}

export async function getAssignment(id: string): Promise<AssignmentDto> {
  const db = getDb();
  const row = await findAssignmentById(db, id);
  if (!row) throw AppError.notFound(`Assignment ${id} not found.`);
  return toAssignmentDto(row);
}

// ── Shared validation for assignors ──────────────────────────────────────────

type TargetUserRow = {
  id: string;
  name: string;
  status: string;
  roleId: string;
  organizationId: string | null;
  organizationStatus: string | null;
  jurisdictionId: string | null;
};

async function loadTargetUser(db: Db, userId: string): Promise<TargetUserRow> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      status: users.status,
      roleId: users.roleId,
      organizationId: users.organizationId,
      organizationStatus: organizations.status,
      jurisdictionId: users.jurisdictionId,
    })
    .from(users)
    .leftJoin(organizations, eq(users.organizationId, organizations.id))
    .where(eq(users.id, userId))
    .limit(1);
  const row = rows[0];
  if (!row) throw AppError.notFound(`User ${userId} does not exist.`);
  return row;
}

/** The assignor's own authority: eligible role + jurisdiction scope over the entity. */
function assertAssignorAuthority(
  ctx: ActorContext,
  entity: AssignmentEntity,
  entityChain: JurisdictionRef[] | null,
): void {
  if (!(ASSIGNOR_ROLES as readonly string[]).includes(ctx.role.id)) {
    throw AppError.forbidden(
      `Role "${ctx.role.label}" cannot assign work. Assignors: ${ASSIGNOR_ROLES.join(", ")}.`,
    );
  }
  const decision = canOperateOnJurisdiction(ctx, entityChain, null);
  if (!decision.allowed) {
    throw AppError.forbidden(
      `Cannot assign work belonging to "${entity.label}": ${decision.reason}`,
    );
  }
}

function eligibleRolesFor(entityType: "project" | "parcel"): readonly string[] {
  return entityType === "project" ? PROJECT_OWNER_ROLES : PARCEL_ASSIGNEE_ROLES;
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createAssignment(
  input: CreateAssignmentInput,
  actor: Actor,
): Promise<AssignmentDto> {
  const db = getDb();
  const ctx = await getActorContext(actor.userId, db);

  const entity = await findAssignmentEntity(db, input.entityType, input.entityId);
  if (!entity) {
    throw AppError.notFound(`${input.entityType} ${input.entityId} does not exist.`);
  }
  const entityChain = entity.jurisdictionId ? await jurisdictionAncestors(db, entity.jurisdictionId) : null;

  // 1. assignor authorization (role + jurisdiction scope)
  assertAssignorAuthority(ctx, entity, entityChain);

  // 2. target user exists + is active
  const target = await loadTargetUser(db, input.assignedToUserId);
  if (target.status !== "active") {
    throw AppError.conflict(`User ${target.name} is ${target.status}; work cannot be assigned to them.`);
  }

  // 3. target role is compatible with this entity type
  if (!(eligibleRolesFor(entity.type) as readonly string[]).includes(target.roleId)) {
    throw AppError.conflict(
      `Role "${target.roleId}" is not eligible to own ${entity.type} work.`,
      { entityType: entity.type, roleId: target.roleId, eligibleRoles: eligibleRolesFor(entity.type) },
    );
  }

  // 4. target organization must exist and be active; client-asserted org must match
  if (!target.organizationId) {
    throw AppError.conflict(`User ${target.name} has no organization; cannot assign organizational work.`);
  }
  if (target.organizationStatus !== "active") {
    throw AppError.conflict(`The organization of ${target.name} is not active.`);
  }
  if (input.organizationId && input.organizationId !== target.organizationId) {
    throw AppError.conflict(
      "organizationId does not match the target user's organization — ownership is resolved from the database, not the request.",
      { userOrganizationId: target.organizationId },
    );
  }

  // 5. target jurisdiction must exist and cover the entity's jurisdiction
  if (!target.jurisdictionId) {
    throw AppError.conflict(`User ${target.name} has no jurisdiction scope; cannot assign scoped work.`);
  }
  if (input.jurisdictionId && input.jurisdictionId !== target.jurisdictionId) {
    throw AppError.conflict(
      "jurisdictionId does not match the target user's jurisdiction scope — ownership is resolved from the database, not the request.",
      { userJurisdictionId: target.jurisdictionId },
    );
  }
  if (entityChain && !entityChain.some((node) => node.id === target.jurisdictionId)) {
    const targetJuris = await db
      .select({ name: jurisdictions.name })
      .from(jurisdictions)
      .where(eq(jurisdictions.id, target.jurisdictionId))
      .limit(1);
    throw AppError.forbidden(
      `Jurisdiction mismatch: ${target.name} operates in "${targetJuris[0]?.name ?? target.jurisdictionId}", which does not cover "${entity.label}".`,
    );
  }

  // 6. no duplicate active owner (also enforced by a partial unique index)
  const existing = await findActiveAssignment(db, entity.type, entity.id);
  if (existing) {
    throw AppError.conflict(`${entity.type === "project" ? "Project" : "Parcel"} ${entity.label} already has an active operational owner.`, {
      activeAssignmentId: existing.id,
    });
  }

  const reason =
    input.reason ??
    `Assigned ${entity.type} "${entity.label}" to ${target.name} via POST /api/assignments.`;

  const created = await withTransaction(async (tx: Db) => {
    const inserted = await tx
      .insert(assignments)
      .values({
        entityType: entity.type,
        entityId: entity.id,
        assignedToUserId: target.id,
        assignedRole: target.roleId,
        organizationId: target.organizationId,
        jurisdictionId: target.jurisdictionId,
        status: "active",
        reason,
        createdBy: actor.userId,
      })
      .returning({ id: assignments.id });

    await recordAuditEvent(tx, {
      actorUserId: actor.userId,
      actorRole: actor.roleId,
      action: entity.type === "project" ? "PROJECT_ASSIGNED" : "PARCEL_ASSIGNED",
      entityType: entity.type,
      entityId: entity.id,
      beforeState: { operationalOwner: null },
      afterState: {
        assignmentId: inserted[0].id,
        assignedToUserId: target.id,
        assignedToName: target.name,
        assignedRole: target.roleId,
        organizationId: target.organizationId,
        jurisdictionId: target.jurisdictionId,
        status: "active",
      },
      reason,
    });

    return inserted[0].id;
  });

  const row = await findAssignmentById(db, created);
  if (!row) throw AppError.internal("Assignment disappeared after creation.");
  return toAssignmentDto(row);
}

// ── Release ──────────────────────────────────────────────────────────────────

export async function releaseAssignment(
  id: string,
  input: { reason?: string },
  actor: Actor,
): Promise<AssignmentDto> {
  const db = getDb();
  const ctx = await getActorContext(actor.userId, db);

  const existing = await findAssignmentById(db, id);
  if (!existing) throw AppError.notFound(`Assignment ${id} not found.`);
  if (existing.status === "released") {
    throw AppError.conflict("Assignment has already been released.", { assignmentId: id });
  }

  const entity = await findAssignmentEntity(
    db,
    existing.entityType as "project" | "parcel",
    existing.entityId,
  );
  if (!entity) throw AppError.notFound(`The assigned ${existing.entityType} no longer exists.`);

  // Assignor authority is judged against the ENTITY's location (where the work
  // is), the same basis used when the assignment was created.
  const entityChain = entity.jurisdictionId ? await jurisdictionAncestors(db, entity.jurisdictionId) : null;
  assertAssignorAuthority(ctx, entity, entityChain);

  const reason =
    input.reason ??
    `Assignment released for ${entity.type} "${entity.label}" via PATCH /api/assignments/${id}/release.`;

  await withTransaction(async (tx: Db) => {
    const updated = await tx
      .update(assignments)
      .set({
        status: "released",
        releasedAt: new Date(),
        releasedBy: actor.userId,
        reason,
        updatedAt: new Date(),
      })
      .where(and(eq(assignments.id, id), eq(assignments.status, "active")))
      .returning({ id: assignments.id });
    if (updated.length === 0) {
      throw AppError.conflict("Assignment changed concurrently; reload and retry.", { assignmentId: id });
    }

    await recordAuditEvent(tx, {
      actorUserId: actor.userId,
      actorRole: actor.roleId,
      action: "ASSIGNMENT_RELEASED",
      entityType: existing.entityType,
      entityId: existing.entityId,
      beforeState: {
        assignmentId: existing.id,
        assignedToUserId: existing.assignedToUserId,
        assignedToName: existing.assignedToName,
        status: "active",
      },
      afterState: {
        assignmentId: existing.id,
        status: "released",
        releasedBy: actor.userId,
      },
      reason,
    });
  });

  const row = await findAssignmentById(db, id);
  if (!row) throw AppError.internal("Assignment disappeared during release.");
  return toAssignmentDto(row);
}
