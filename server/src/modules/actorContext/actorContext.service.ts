import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, type Db } from "../../db/client.js";
import { assignments, jurisdictions, organizations, roles, users } from "../../db/schema.js";
import { AppError } from "../../shared/errors/AppError.js";
import { ROLE_SCOPES, type RoleId } from "../../shared/roles/roles.js";

/**
 * Actor context — the ONE authoritative way to resolve who an actor is and
 * what they can see or operate on:
 *
 *   user + role + organization + jurisdiction scope + active assignments
 *
 * Services must not re-implement these queries with ad-hoc joins. The access
 * helpers below keep VIEW SCOPE and OPERATIONAL OWNERSHIP distinct: oversight
 * roles can monitor nationally without becoming operational owners, while
 * restricted roles operate only inside their jurisdiction scope.
 */

export type JurisdictionRef = {
  id: string;
  level: string;
  name: string;
  code: string;
  parentId: string | null;
};

export type ActorOrganization = {
  id: string;
  name: string;
  orgType: string;
  status: string;
  jurisdictionId: string | null;
  jurisdictionName: string | null;
};

export type ActorAssignmentRef = {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  organizationId: string | null;
  jurisdictionId: string | null;
  assignedAt: string;
};

export type ActorContext = {
  user: {
    id: string;
    name: string;
    email: string | null;
    designation: string | null;
    status: string;
  };
  role: {
    id: string;
    label: string;
    scope: string;
    level: number;
  };
  organization: ActorOrganization | null;
  jurisdiction: JurisdictionRef | null;
  /** Active assignments held by this user right now. */
  assignments: ActorAssignmentRef[];
  /** national / ministry roles monitor without jurisdictional restriction. */
  isOversight: boolean;
};

const asIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : String(value);

/**
 * Ancestor chain of a jurisdiction: [self, parent, … root]. This is the set of
 * scopes a work item inside that jurisdiction belongs to — an actor whose own
 * jurisdiction id appears in this chain covers the work item.
 */
export async function jurisdictionAncestors(db: Db, jurisdictionId: string): Promise<JurisdictionRef[]> {
  const chain: JurisdictionRef[] = [];
  let cursor: string | null = jurisdictionId;
  const seen = new Set<string>();

  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    // Explicit annotation: `cursor` narrows from `row.parentId`, so without it
    // TypeScript sees a circular type dependency between cursor and the query.
    const rows: JurisdictionRef[] = await db
      .select({
        id: jurisdictions.id,
        level: jurisdictions.level,
        name: jurisdictions.name,
        code: jurisdictions.code,
        parentId: jurisdictions.parentId,
      })
      .from(jurisdictions)
      .where(eq(jurisdictions.id, cursor))
      .limit(1);
    const row = rows[0];
    if (!row) break;
    chain.push(row);
    cursor = row.parentId;
  }
  return chain;
}

/**
 * Resolve the full context for an actor id. Throws 404 for unknown users —
 * callers that already hold a validated `Actor` still use this to gain the
 * organization / jurisdiction / assignment joins the auth plugin does not load.
 */
export async function getActorContext(userId: string, db: Db = getDb()): Promise<ActorContext> {
  const orgJuris = alias(jurisdictions, "org_juris");
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      designation: users.designation,
      status: users.status,
      roleId: users.roleId,
      roleLabel: roles.label,
      roleScope: roles.scope,
      roleLevel: roles.level,
      organizationId: users.organizationId,
      orgName: organizations.name,
      orgType: organizations.orgType,
      orgStatus: organizations.status,
      orgJurisdictionId: organizations.jurisdictionId,
      orgJurisdictionName: orgJuris.name,
      jurisdictionId: users.jurisdictionId,
      jurisLevel: jurisdictions.level,
      jurisName: jurisdictions.name,
      jurisCode: jurisdictions.code,
      jurisParentId: jurisdictions.parentId,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(organizations, eq(users.organizationId, organizations.id))
    .leftJoin(orgJuris, eq(organizations.jurisdictionId, orgJuris.id))
    .leftJoin(jurisdictions, eq(users.jurisdictionId, jurisdictions.id))
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row) {
    throw AppError.notFound(`No user exists with id ${userId}.`);
  }

  const activeAssignments = await db
    .select({
      id: assignments.id,
      entityType: assignments.entityType,
      entityId: assignments.entityId,
      status: assignments.status,
      organizationId: assignments.organizationId,
      jurisdictionId: assignments.jurisdictionId,
      assignedAt: assignments.assignedAt,
    })
    .from(assignments)
    .where(eq(assignments.assignedToUserId, userId))
    .orderBy(asc(assignments.assignedAt));

  const scope = ROLE_SCOPES[row.roleId as RoleId] ?? "project";

  return {
    user: {
      id: row.userId,
      name: row.name,
      email: row.email,
      designation: row.designation,
      status: row.status,
    },
    role: {
      id: row.roleId,
      label: row.roleLabel,
      scope,
      level: row.roleLevel,
    },
    organization: row.organizationId
      ? {
          id: row.organizationId,
          name: row.orgName ?? "",
          orgType: row.orgType ?? "",
          status: row.orgStatus ?? "",
          jurisdictionId: row.orgJurisdictionId,
          jurisdictionName: row.orgJurisdictionName ?? null,
        }
      : null,
    jurisdiction: row.jurisdictionId
      ? {
          id: row.jurisdictionId,
          level: row.jurisLevel ?? "",
          name: row.jurisName ?? "",
          code: row.jurisCode ?? "",
          parentId: row.jurisParentId,
        }
      : null,
    assignments: activeAssignments.map((a) => ({
      id: a.id,
      entityType: a.entityType,
      entityId: a.entityId,
      status: a.status,
      organizationId: a.organizationId,
      jurisdictionId: a.jurisdictionId,
      assignedAt: asIso(a.assignedAt),
    })),
    isOversight: scope === "national" || scope === "ministry",
  };
}

// ── Authorization primitives ─────────────────────────────────────────────────

export type OperateDecision =
  | { allowed: true; basis: "oversight" | "assignment" | "jurisdiction" }
  | { allowed: false; reason: string };

/**
 * VIEW SCOPE — can the actor look at work bound to this jurisdiction?
 *
 * `entityChain` is `jurisdictionAncestors(entity.jurisdictionId)` (null when the
 * entity is not bound to the hierarchy yet, in which case no scope restriction
 * applies). Oversight roles (national / ministry) monitor everything without
 * being operational owners.
 */
export function canAccessJurisdiction(
  ctx: ActorContext,
  entityChain: JurisdictionRef[] | null,
  activeAssignment: { assignedToUserId: string } | null = null,
): boolean {
  if (ctx.isOversight) return true;
  if (entityChain === null) return true; // entity not attached to the hierarchy
  if (activeAssignment && activeAssignment.assignedToUserId === ctx.user.id) return true;
  const actorJurisdictionId = ctx.jurisdiction?.id ?? null;
  if (!actorJurisdictionId) return false;
  return entityChain.some((node) => node.id === actorJurisdictionId);
}

/**
 * OPERATIONAL AUTHORITY — can the actor modify/operate on this entity?
 *
 * Layered on purpose so future policies (e.g. "assignment required") can be
 * added without touching call sites:
 *   1. oversight role               → basis "oversight"
 *   2. actor is the active assignee → basis "assignment"
 *   3. actor's jurisdiction covers  → basis "jurisdiction"
 * Stage ownership (workflow) is an ADDITIONAL check performed by the workflow
 * engine itself — this function never replaces it.
 */
export function canOperateOnJurisdiction(
  ctx: ActorContext,
  entityChain: JurisdictionRef[] | null,
  activeAssignment: { assignedToUserId: string } | null = null,
): OperateDecision {
  if (ctx.isOversight) return { allowed: true, basis: "oversight" };
  if (activeAssignment && activeAssignment.assignedToUserId === ctx.user.id) {
    return { allowed: true, basis: "assignment" };
  }
  if (entityChain === null) return { allowed: true, basis: "jurisdiction" };
  const actorJurisdictionId = ctx.jurisdiction?.id ?? null;
  if (!actorJurisdictionId) {
    return { allowed: false, reason: "Actor has no jurisdiction scope recorded." };
  }
  const covered = entityChain.some((node) => node.id === actorJurisdictionId);
  if (!covered) {
    return {
      allowed: false,
      reason: `Actor jurisdiction "${ctx.jurisdiction?.name}" does not cover this work.`,
    };
  }
  return { allowed: true, basis: "jurisdiction" };
}

// ── API response shape ───────────────────────────────────────────────────────

export type ActorContextDto = {
  user: ActorContext["user"];
  role: ActorContext["role"];
  organization: ActorContext["organization"];
  jurisdiction: (ActorContext["jurisdiction"] & { scopeChain: string[] }) | null;
  assignments: ActorContext["assignments"];
  isOversight: boolean;
};

/** Serialise context for GET /api/actor/context (includes the scope chain). */
export async function getActorContextDto(userId: string, db: Db = getDb()): Promise<ActorContextDto> {
  const ctx = await getActorContext(userId, db);
  const chain = ctx.jurisdiction ? await jurisdictionAncestors(db, ctx.jurisdiction.id) : [];
  return {
    user: ctx.user,
    role: ctx.role,
    organization: ctx.organization,
    jurisdiction: ctx.jurisdiction
      ? { ...ctx.jurisdiction, scopeChain: chain.map((node) => node.name) }
      : null,
    assignments: ctx.assignments,
    isOversight: ctx.isOversight,
  };
}
