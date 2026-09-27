import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { paginationSchema, parseOrThrow } from "../../shared/validation/pagination.js";
import { getUsers } from "./users.service.js";

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
}
