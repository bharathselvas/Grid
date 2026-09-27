import type { Db } from "../../db/client.js";
import { workflowInstances, workflowTransitions } from "../../db/schema.js";
import { STAGE_BY_ID, type StageId } from "../../shared/workflow/stages.js";

export type OpenWorkflowInput = {
  entityType: "project" | "parcel" | "case";
  entityId: string;
  stage: string;
  actorUserId: string | null;
  actorRole: string | null;
  reason?: string;
};

/** Create a workflow instance for a freshly created entity + its first transition. */
export async function openWorkflowInstance(db: Db, input: OpenWorkflowInput): Promise<{ id: string }> {
  const stage = STAGE_BY_ID[input.stage as StageId];
  const ownerRoleId = stage?.ownerRoles[0] ?? null;

  const instance = await db
    .insert(workflowInstances)
    .values({
      entityType: input.entityType,
      entityId: input.entityId,
      currentStage: input.stage,
      status: "active",
      ownerRoleId,
      ownerUserId: input.actorUserId,
    })
    .returning({ id: workflowInstances.id });

  await db.insert(workflowTransitions).values({
    workflowInstanceId: instance[0].id,
    fromStage: null,
    toStage: input.stage,
    action: "create",
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    isAllowed: true,
    reason: input.reason ?? "Workflow instance opened.",
    afterState: { stage: input.stage },
  });

  return { id: instance[0].id };
}
