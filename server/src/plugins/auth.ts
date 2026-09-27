import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { env } from "../config/env.js";
import { getDb } from "../db/client.js";
import { roles, users } from "../db/schema.js";
import { AppError } from "../shared/errors/AppError.js";

/**
 * The authentication boundary.
 *
 * Domain modules never read headers or trust client-supplied claims. They only
 * ever see the resolved `request.actor`, whose role / organization /
 * jurisdiction come from the `users` row in the database.
 *
 * Development strategy (`AUTH_MODE=development-header`): the caller sends
 * `x-actor-id: <uuid>`; the server loads that user row. The client can pick an
 * identity (temporary stand-in for login) but can NEVER assert a role.
 *
 * Production strategy (separate task): verify a Supabase JWT, map `sub` to
 * `users.auth_subject`, return the same `Actor` shape. Nothing else changes.
 */
export type Actor = {
  userId: string;
  name: string;
  roleId: string;
  organizationId: string | null;
  jurisdictionId: string | null;
  status: string;
};

declare module "fastify" {
  interface FastifyRequest {
    actor?: Actor;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadActorByUserId(userId: string): Promise<Actor | null> {
  const db = getDb();
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      roleId: users.roleId,
      roleLabel: roles.label,
      organizationId: users.organizationId,
      jurisdictionId: users.jurisdictionId,
      status: users.status,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    userId: row.userId,
    name: row.name,
    roleId: row.roleId,
    organizationId: row.organizationId,
    jurisdictionId: row.jurisdictionId,
    status: row.status,
  };
}

export function requireActor(request: FastifyRequest): Actor {
  if (!request.actor) {
    throw AppError.unauthenticated(
      "Authentication required. Send the x-actor-id header (development auth boundary) — the role is resolved server-side from the database.",
    );
  }
  return request.actor;
}

export function registerAuth(app: FastifyInstance): void {
  app.addHook("preHandler", async (request: FastifyRequest, _reply: FastifyReply) => {
    if (env.AUTH_MODE !== "development-header") return;

    const header = request.headers["x-actor-id"];
    const raw = Array.isArray(header) ? header[0] : header;

    if (!raw) {
      throw AppError.unauthenticated(
        "Missing x-actor-id header. Development auth: pass the id of a seeded user; role/organization/jurisdiction are read from the database.",
      );
    }
    if (!UUID_RE.test(raw)) {
      throw AppError.unauthenticated("x-actor-id must be a valid user id (uuid).");
    }

    const actor = await loadActorByUserId(raw.toLowerCase());
    if (!actor) {
      throw AppError.unauthenticated("Unknown actor: no user exists with that id.");
    }
    if (actor.status !== "active") {
      throw AppError.forbidden("This user account is not active.");
    }

    request.actor = actor;
  });
}
