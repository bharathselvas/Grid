import { z } from "zod";
import { paginationSchema } from "../../shared/validation/pagination.js";

export const entityTypeSchema = z.enum(["project", "parcel"]);

export const listAssignmentsQuerySchema = paginationSchema.extend({
  entityType: entityTypeSchema.optional(),
  entityId: z.string().uuid("entityId must be a uuid").optional(),
  /** assignments currently held by this user */
  userId: z.string().uuid("userId must be a uuid").optional(),
  organizationId: z.string().uuid("organizationId must be a uuid").optional(),
  jurisdictionId: z.string().uuid("jurisdictionId must be a uuid").optional(),
  status: z.enum(["active", "released"]).optional(),
});

export const createAssignmentSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid("entityId must be a uuid"),
  assignedToUserId: z.string().uuid("assignedToUserId must be a uuid"),
  /**
   * Optional cross-checks. The server resolves organization/jurisdiction from
   * the target user's database row regardless — if the client asserts a
   * different value it is rejected rather than trusted.
   */
  organizationId: z.string().uuid().optional(),
  jurisdictionId: z.string().uuid().optional(),
  reason: z.string().min(3).max(500).optional(),
});

export const releaseAssignmentSchema = z.object({
  reason: z.string().min(3).max(500).optional(),
});

export const assignmentParamsSchema = z.object({
  id: z.string().uuid("id must be a uuid"),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type ListAssignmentsQuery = z.infer<typeof listAssignmentsQuerySchema>;
