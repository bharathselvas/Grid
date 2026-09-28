import { apiRequest, type Paginated } from "./client";
import type { AssignmentDto, CreateAssignmentInput } from "./types";

/**
 * Work-ownership API. Mutations are authorized server-side (assignor role +
 * jurisdiction scope); this client only carries the request.
 */
export async function listAssignments(
  query: {
    entityType?: "project" | "parcel";
    entityId?: string;
    userId?: string;
    organizationId?: string;
    jurisdictionId?: string;
    status?: "active" | "released";
    limit?: number;
    offset?: number;
  } = {},
): Promise<Paginated<AssignmentDto>> {
  return apiRequest<Paginated<AssignmentDto>>("/api/assignments", {
    query: { limit: 100, ...query },
  });
}

export function getAssignment(id: string): Promise<AssignmentDto> {
  return apiRequest<AssignmentDto>(`/api/assignments/${id}`);
}

export function createAssignment(input: CreateAssignmentInput): Promise<AssignmentDto> {
  return apiRequest<AssignmentDto>("/api/assignments", { method: "POST", body: input });
}

export function releaseAssignment(id: string, reason?: string): Promise<AssignmentDto> {
  return apiRequest<AssignmentDto>(`/api/assignments/${id}/release`, {
    method: "PATCH",
    body: reason ? { reason } : {},
  });
}
