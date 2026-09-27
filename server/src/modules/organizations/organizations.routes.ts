import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { paginationSchema, parseOrThrow } from "../../shared/validation/pagination.js";
import { getOrganizations } from "./organizations.service.js";

const listQuerySchema = paginationSchema.extend({
  orgType: z
    .enum(["central_ministry", "state_dept", "requiring_org", "implementing_agency", "district_auth", "other"])
    .optional(),
  status: z.enum(["active", "pending", "suspended"]).optional(),
  q: z.string().min(1).max(120).optional(),
});

export async function organizationRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request) => {
    const query = parseOrThrow(listQuerySchema, request.query);
    return getOrganizations(query);
  });
}
