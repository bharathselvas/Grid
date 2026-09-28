import type { FastifyInstance } from "fastify";
import { requireActor } from "../../plugins/auth.js";
import { parseOrThrow } from "../../shared/validation/pagination.js";
import {
  assignmentParamsSchema,
  createAssignmentSchema,
  listAssignmentsQuerySchema,
  releaseAssignmentSchema,
} from "./assignments.schemas.js";
import { createAssignment, getAssignment, getAssignments, releaseAssignment } from "./assignments.service.js";

/**
 * Work-ownership API.
 *
 * Mutations are backend-authorized (assignor role + jurisdiction scope) and run
 * inside a single transaction: assignment row + audit event commit together or
 * not at all. Reads support filtering by entity / user / organization /
 * jurisdiction / status so future routing and dashboards can query ownership
 * without inventing their own joins.
 */
export async function assignmentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request) => {
    const query = parseOrThrow(listAssignmentsQuerySchema, request.query);
    return getAssignments(query);
  });

  app.get("/:id", async (request) => {
    const params = parseOrThrow(assignmentParamsSchema, request.params);
    return getAssignment(params.id);
  });

  app.post("/", async (request, reply) => {
    const actor = requireActor(request);
    const input = parseOrThrow(createAssignmentSchema, request.body);
    const assignment = await createAssignment(input, actor);
    return reply.status(201).send(assignment);
  });

  app.patch("/:id/release", async (request) => {
    const actor = requireActor(request);
    const params = parseOrThrow(assignmentParamsSchema, request.params);
    const input = parseOrThrow(releaseAssignmentSchema, request.body ?? {});
    return releaseAssignment(params.id, input, actor);
  });
}
