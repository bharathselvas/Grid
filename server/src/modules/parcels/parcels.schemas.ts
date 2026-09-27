import { z } from "zod";
import { paginationSchema } from "../../shared/validation/pagination.js";

export const listParcelsQuerySchema = paginationSchema.extend({
  projectId: z.string().uuid().optional(),
  state: z.string().min(1).max(100).optional(),
  district: z.string().min(1).max(100).optional(),
  village: z.string().min(1).max(120).optional(),
  stage: z.string().min(1).max(60).optional(),
  landType: z
    .enum(["agricultural", "barren", "commercial", "residential", "forest", "government", "industrial"])
    .optional(),
  classificationStatus: z.enum(["unclassified", "classified", "disputed", "exempted"]).optional(),
  includeGeometry: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const parcelParamsSchema = z.object({ id: z.string().uuid("id must be a uuid") });

export type ListParcelsQuery = z.infer<typeof listParcelsQuerySchema>;
