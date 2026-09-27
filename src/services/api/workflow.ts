import { apiRequest } from "./client";
import type { WorkflowStageDto } from "./types";

export async function listWorkflowStages(): Promise<{ count: number; stages: WorkflowStageDto[] }> {
  return apiRequest<{ count: number; stages: WorkflowStageDto[] }>("/api/workflow/stages");
}
