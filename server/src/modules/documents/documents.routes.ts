import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { paginationSchema, parseOrThrow } from "../../shared/validation/pagination.js";
import { listDocuments } from "./documents.service.js";

const listDocumentsQuerySchema = paginationSchema.extend({
  entityType: z.enum(["project", "parcel", "case"]),
  entityId: z.string().uuid("entityId must be a uuid"),
});

export async function documentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request) => {
    const query = parseOrThrow(listDocumentsQuerySchema, request.query);
    return listDocuments(query);
  });
}
