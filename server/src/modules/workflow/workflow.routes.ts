import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireActor } from "../../plugins/auth.js";
import { AppError } from "../../shared/errors/AppError.js";
import { parseOrThrow } from "../../shared/validation/pagination.js";
import { isStageId, WORKFLOW_STAGES } from "../../shared/workflow/stages.js";
import { getWorkflowForEntity, transitionWorkflow } from "./workflow.service.js";

const instanceQuerySchema = z.object({
  entityType: z.enum(["project", "parcel", "case"]),
  entityId: z.string().uuid("entityId must be a uuid"),
});

const transitionParamsSchema = z.object({
  id: z.string().uuid("id must be a uuid"),
});

const transitionBodySchema = z.object({
  toStage: z.string().refine(isStageId, "Unknown workflow stage"),
  reason: z.string().min(3).max(500).optional(),
});

export async function workflowRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Canonical workflow definition. The frontend demo workflow screens must not
   * be treated as production authorization — this endpoint is the source the
   * UI should read stage metadata from.
   */
  app.get("/stages", async () => ({
    count: WORKFLOW_STAGES.length,
    stages: WORKFLOW_STAGES.map((stage) => ({
      id: stage.id,
      label: stage.label,
      shortLabel: stage.shortLabel,
      order: stage.order,
      group: stage.group,
      statutoryReference: stage.statutoryReference,
      slaDays: stage.slaDays,
      ownerRoles: stage.ownerRoles,
      prerequisites: stage.prerequisites,
    })),
  }));

  /**
   * Live workflow instance + full stage history for one entity. This is what
   * the project detail Workflow tab renders — no client-side mock timeline.
   */
  app.get("/instances", async (request) => {
    const query = parseOrThrow(instanceQuerySchema, request.query);
    const instance = await getWorkflowForEntity(query.entityType, query.entityId);
    if (!instance) {
      throw AppError.notFound(`No ${query.entityType} workflow instance exists for ${query.entityId}.`);
    }
    return instance;
  });

  /**
   * Advance a workflow instance by exactly one canonical stage. Authorization
   * (role owns the current stage), the linear lifecycle rule and the full
   * write set (instance + entity mirror + transition + audit) are enforced in
   * the service inside one transaction — see workflow.service.ts.
   */
  app.post("/instances/:id/transitions", async (request) => {
    const actor = requireActor(request);
    const params = parseOrThrow(transitionParamsSchema, request.params);
    const body = parseOrThrow(transitionBodySchema, request.body);

    return transitionWorkflow({
      instanceId: params.id,
      toStage: body.toStage,
      reason: body.reason,
      actor: { userId: actor.userId, roleId: actor.roleId },
    });
  });
}
