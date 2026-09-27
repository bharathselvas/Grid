import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { paginationSchema, parseOrThrow } from "../../shared/validation/pagination.js";
import { getAuditEvents } from "./audit.service.js";

const listQuerySchema = paginationSchema.extend({
  action: z.string().min(1).max(80).optional(),
  entityType: z.enum(["project", "parcel", "case", "user", "document", "workflow", "organization"]).optional(),
  entityId: z.string().min(1).max(80).optional(),
  actorUserId: z.string().uuid().optional(),
});

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request) => {
    const query = parseOrThrow(listQuerySchema, request.query);
    return getAuditEvents(query);
  });
}
