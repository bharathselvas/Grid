import type { FastifyInstance } from "fastify";
import { requireActor } from "../../plugins/auth.js";
import { getActorContextDto } from "./actorContext.service.js";

/**
 * GET /api/actor/context — the authenticated actor as resolved from the
 * database (user + role + organization + jurisdiction scope + assignments).
 * Nothing here comes from the client: the x-actor-id header only selects WHICH
 * user row to load, never what that user is allowed to do.
 */
export async function actorContextRoutes(app: FastifyInstance): Promise<void> {
  app.get("/context", async (request) => {
    const actor = requireActor(request);
    return getActorContextDto(actor.userId);
  });
}
