import { apiRequest } from "./client";
import type { WorkflowInstanceDto, WorkflowStageDto } from "./types";

export async function listWorkflowStages(): Promise<{ count: number; stages: WorkflowStageDto[] }> {
  return apiRequest<{ count: number; stages: WorkflowStageDto[] }>("/api/workflow/stages");
}

/** Live workflow instance + full stage history for one entity. */
export async function getWorkflowInstance(
  entityType: "project" | "parcel" | "case",
  entityId: string,
): Promise<WorkflowInstanceDto> {
  return apiRequest<WorkflowInstanceDto>("/api/workflow/instances", {
    query: { entityType, entityId },
  });
}

/**
 * Advance a workflow instance by exactly one canonical stage. Authorization
 * (role owns the current stage), the linear lifecycle rule and the audit
 * trail are enforced server-side; non-2xx throws ApiError (403/409/400/404).
 */
export async function advanceWorkflowStage(
  instanceId: string,
  input: { toStage: string; reason?: string },
): Promise<WorkflowInstanceDto> {
  return apiRequest<WorkflowInstanceDto>(`/api/workflow/instances/${instanceId}/transitions`, {
    method: "POST",
    body: input,
  });
}
