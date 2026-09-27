import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { parseOrThrow } from "../../shared/validation/pagination.js";
import { getJurisdiction, getJurisdictions } from "./jurisdictions.service.js";

const listQuerySchema = z.object({
  level: z.enum(["national", "state", "district", "tehsil", "village"]).optional(),
  parentId: z.string().uuid().optional(),
  q: z.string().min(1).max(120).optional(),
  tree: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

const idParamsSchema = z.object({ id: z.string().uuid("id must be a uuid") });

export async function jurisdictionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request) => {
    const query = parseOrThrow(listQuerySchema, request.query);
    const result = await getJurisdictions(query);
    return { items: query.tree ? result.tree : result.items, total: result.total };
  });

  app.get("/:id", async (request) => {
    const { id } = parseOrThrow(idParamsSchema, request.params);
    return getJurisdiction(id);
  });
}
