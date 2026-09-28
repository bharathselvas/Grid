import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { requireActor } from "../../plugins/auth.js";
import { paginationSchema, parseOrThrow } from "../../shared/validation/pagination.js";
import { createUser, getUsers } from "./users.service.js";
import { createUserSchema } from "./users.schemas.js";

const listQuerySchema = paginationSchema.extend({
  roleId: z.string().min(1).max(60).optional(),
  status: z.enum(["active", "pending", "suspended"]).optional(),
  q: z.string().min(1).max(120).optional(),
});

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request) => {
    const query = parseOrThrow(listQuerySchema, request.query);
    return getUsers(query);
  });

  /**
   * Provision a real user. All referenced rows (role, organization,
   * jurisdiction) are validated server-side; nothing about identity or scope
   * is asserted by the client.
   */
  app.post("/", async (request, reply) => {
    const actor = requireActor(request);
    const input = parseOrThrow(createUserSchema, request.body);
    const user = await createUser(input, actor);
    return reply.status(201).send(user);
  });
}
