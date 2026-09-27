import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { parseOrThrow } from "../../shared/validation/pagination.js";
import { listParcelsQuerySchema, parcelParamsSchema } from "./parcels.schemas.js";
import { getParcel, getParcels } from "./parcels.service.js";

const parcelQueryWithGeometry = listParcelsQuerySchema;

export async function parcelRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request) => {
    const query = parseOrThrow(parcelQueryWithGeometry, request.query);
    return getParcels(query);
  });

  app.get("/:id", async (request) => {
    const { id } = parseOrThrow(parcelParamsSchema, request.params);
    const query = parseOrThrow(
      z.object({ includeGeometry: z.enum(["true", "false"]).default("true").transform((v) => v === "true") }),
      request.query,
    );
    return getParcel(id, query.includeGeometry);
  });
}
