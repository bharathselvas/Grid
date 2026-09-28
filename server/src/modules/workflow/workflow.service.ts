import { and, asc, eq } from "drizzle-orm";
import { getDb, withTransaction, type Db } from "../../db/client.js";
import { parcels, projects, roles, users, workflowInstances, workflowTransitions } from "../../db/schema.js";
import { AppError } from "../../shared/errors/AppError.js";
import { recordAuditEvent } from "../audit/audit.writer.js";
import {
  canRoleActOnStage,
  nextStageId,
  STAGE_BY_ID,
  type StageId,
} from "../../shared/workflow/stages.js";
import {
  canOperateOnJurisdiction,
  getActorContext,
  jurisdictionAncestors,
} from "../actorContext/actorContext.service.js";
import { findActiveAssignment, findAssignmentEntity } from "../assignments/assignments.repo.js";

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

// ── Read side ───────────────────────────────────────────────────────────────

export type WorkflowTransitionDto = {
  id: string;
  fromStage: string | null;
  toStage: string;
  action: string;
  actorUserId: string | null;
  actorName: string | null;
  actorRole: string | null;
  actorRoleLabel: string | null;
  isAllowed: boolean;
  reason: string | null;
  createdAt: string;
};

export type WorkflowInstanceDto = {
  id: string;
  entityType: string;
  entityId: string;
  currentStage: string;
  status: string;
  ownerRoleId: string | null;
  ownerRoleLabel: string | null;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  transitions: WorkflowTransitionDto[];
};

const asIso = (value: Date | string | null): string | null =>
  value === null ? null : value instanceof Date ? value.toISOString() : String(value);

/** Workflow instance + full stage history for one entity (project/parcel/case). */
export async function getWorkflowForEntity(
  entityType: string,
  entityId: string,
): Promise<WorkflowInstanceDto | null> {
  const db = getDb();

  const instances = await db
    .select({
      id: workflowInstances.id,
      entityType: workflowInstances.entityType,
      entityId: workflowInstances.entityId,
      currentStage: workflowInstances.currentStage,
      status: workflowInstances.status,
      ownerRoleId: workflowInstances.ownerRoleId,
      ownerRoleLabel: roles.label,
      startedAt: workflowInstances.startedAt,
      updatedAt: workflowInstances.updatedAt,
      completedAt: workflowInstances.completedAt,
    })
    .from(workflowInstances)
    .leftJoin(roles, eq(workflowInstances.ownerRoleId, roles.id))
    .where(and(eq(workflowInstances.entityType, entityType), eq(workflowInstances.entityId, entityId)))
    .limit(1);

  const instance = instances[0];
  if (!instance) return null;

  const transitionRows = await db
    .select({
      id: workflowTransitions.id,
      fromStage: workflowTransitions.fromStage,
      toStage: workflowTransitions.toStage,
      action: workflowTransitions.action,
      actorUserId: workflowTransitions.actorUserId,
      actorName: users.name,
      actorRole: workflowTransitions.actorRole,
      actorRoleLabel: roles.label,
      isAllowed: workflowTransitions.isAllowed,
      reason: workflowTransitions.reason,
      createdAt: workflowTransitions.createdAt,
    })
    .from(workflowTransitions)
    .leftJoin(users, eq(workflowTransitions.actorUserId, users.id))
    .leftJoin(roles, eq(workflowTransitions.actorRole, roles.id))
    .where(eq(workflowTransitions.workflowInstanceId, instance.id))
    .orderBy(asc(workflowTransitions.createdAt));

  return {
    id: instance.id,
    entityType: instance.entityType,
    entityId: instance.entityId,
    currentStage: instance.currentStage,
    status: instance.status,
    ownerRoleId: instance.ownerRoleId,
    ownerRoleLabel: instance.ownerRoleLabel,
    startedAt: asIso(instance.startedAt) ?? "",
    updatedAt: asIso(instance.updatedAt) ?? "",
    completedAt: asIso(instance.completedAt),
    transitions: transitionRows.map((row) => ({
      id: row.id,
      fromStage: row.fromStage,
      toStage: row.toStage,
      action: row.action,
      actorUserId: row.actorUserId,
      actorName: row.actorName,
      actorRole: row.actorRole,
      actorRoleLabel: row.actorRoleLabel,
      isAllowed: row.isAllowed,
      reason: row.reason,
      createdAt: asIso(row.createdAt) ?? "",
    })),
  };
}

// ── Write side: stage transitions ────────────────────────────────────────────

export type TransitionActor = { userId: string; roleId: string };

export type TransitionInput = {
  instanceId: string;
  toStage: StageId;
  reason?: string;
  actor: TransitionActor;
};

/**
 * Execute a single linear stage transition inside one transaction.
 *
 * Rules enforced (all server-side, none trusted from the client):
 *   1. the instance must exist (404) and still be active (409);
 *   2. `toStage` must be exactly the next canonical stage — no skipping, no
 *      revisits (409; the statutory lifecycle is strictly linear);
 *   3. the actor's role must own the stage they are acting on
 *      (`canRoleActOnStage` → 403);
 *   4. within one transaction: instance row (stage, SLA clock restarts via
 *      `started_at`, owner) + mirrored entity stage column + transition row +
 *      audit event — any failure rolls the whole transition back.
 */
export async function transitionWorkflow(input: TransitionInput): Promise<WorkflowInstanceDto> {
  const db = getDb();

  const instances = await db
    .select({
      id: workflowInstances.id,
      entityType: workflowInstances.entityType,
      entityId: workflowInstances.entityId,
      currentStage: workflowInstances.currentStage,
      status: workflowInstances.status,
    })
    .from(workflowInstances)
    .where(eq(workflowInstances.id, input.instanceId))
    .limit(1);

  const instance = instances[0];
  if (!instance) {
    throw AppError.notFound(`Workflow instance ${input.instanceId} not found.`);
  }
  if (instance.status !== "active") {
    throw AppError.conflict(
      `Workflow is ${instance.status}; no further transitions are allowed.`,
      { status: instance.status },
    );
  }

  const expectedNext = nextStageId(instance.currentStage);
  if (instance.currentStage === input.toStage) {
    throw AppError.conflict(
      `Invalid transition: workflow is already at stage "${instance.currentStage}".`,
      { currentStage: instance.currentStage, toStage: input.toStage },
    );
  }
  if (input.toStage !== expectedNext) {
    throw AppError.conflict(
      `Invalid transition: "${instance.currentStage}" can only advance to "${expectedNext ?? "no further stage"}", not "${input.toStage}".`,
      { currentStage: instance.currentStage, expectedStage: expectedNext, toStage: input.toStage },
    );
  }

  if (!canRoleActOnStage(input.actor.roleId, instance.currentStage)) {
    throw AppError.forbidden(
      `Role "${input.actor.roleId}" does not own stage "${instance.currentStage}" and cannot advance it.`,
    );
  }

  // Operational scope (Task #4): stage ownership is necessary but not
  // sufficient — the actor must also be able to operate inside the entity's
  // jurisdiction (role scope + jurisdiction + active assignment, resolved from
  // the database via getActorContext). Oversight roles (national/ministry)
  // monitor and act nationally; the assignee of the work always qualifies.
  const scopedType = instance.entityType === "project" || instance.entityType === "parcel" ? instance.entityType : null;
  const entity = scopedType ? await findAssignmentEntity(db, scopedType, instance.entityId) : null;
  const entityChain = entity?.jurisdictionId ? await jurisdictionAncestors(db, entity.jurisdictionId) : null;
  const activeAssignment = scopedType ? await findActiveAssignment(db, scopedType, instance.entityId) : null;
  const ctx = await getActorContext(input.actor.userId, db);
  const decision = canOperateOnJurisdiction(ctx, entityChain, activeAssignment);
  if (!decision.allowed) {
    throw AppError.forbidden(
      `Actor "${ctx.user.name}" (${ctx.role.label}) cannot operate on this ${instance.entityType}: ${decision.reason}`,
    );
  }

  const target = STAGE_BY_ID[input.toStage];
  const closing = input.toStage === "closed";
  const now = new Date();

  await withTransaction(async (tx: Db) => {
    // Optimistic guard: only transition if the stage has not moved concurrently.
    const updated = await tx
      .update(workflowInstances)
      .set({
        currentStage: input.toStage,
        startedAt: now,
        ownerRoleId: target.ownerRoles[0] ?? null,
        ownerUserId: input.actor.userId,
        ...(closing ? { status: "completed", completedAt: now } : {}),
      })
      .where(and(eq(workflowInstances.id, instance.id), eq(workflowInstances.currentStage, instance.currentStage)))
      .returning({ id: workflowInstances.id });
    if (updated.length === 0) {
      throw AppError.conflict("Workflow instance changed concurrently; reload and retry.", {
        instanceId: instance.id,
      });
    }

    // Mirror the stage onto the entity row — risk/KPI queries read it.
    if (instance.entityType === "project") {
      await tx
        .update(projects)
        .set({ currentWorkflowStage: input.toStage })
        .where(eq(projects.id, instance.entityId));
    } else if (instance.entityType === "parcel") {
      await tx
        .update(parcels)
        .set({ currentWorkflowStage: input.toStage })
        .where(eq(parcels.id, instance.entityId));
    }

    await tx.insert(workflowTransitions).values({
      workflowInstanceId: instance.id,
      fromStage: instance.currentStage,
      toStage: input.toStage,
      action: "advance",
      actorUserId: input.actor.userId,
      actorRole: input.actor.roleId,
      isAllowed: true,
      reason: input.reason ?? null,
      beforeState: { stage: instance.currentStage },
      afterState: { stage: input.toStage },
    });

    await recordAuditEvent(tx, {
      actorUserId: input.actor.userId,
      actorRole: input.actor.roleId,
      action: "WORKFLOW_STAGE_CHANGED",
      entityType: instance.entityType,
      entityId: instance.entityId,
      beforeState: { stage: instance.currentStage },
      afterState: { stage: input.toStage },
      reason:
        input.reason ??
        `Stage advanced from ${instance.currentStage} to ${input.toStage} via POST /api/workflow/instances/${instance.id}/transitions.`,
    });
  });

  const result = await getWorkflowForEntity(instance.entityType, instance.entityId);
  if (!result) {
    throw AppError.internal("Workflow instance disappeared during transition.");
  }
  return result;
}
