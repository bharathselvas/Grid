import { apiRequest, type Paginated } from "./client";
import type { AuditEventDto } from "./types";

export async function listAuditEvents(
  query: { action?: string; entityType?: string; entityId?: string; actorUserId?: string; limit?: number; offset?: number } = {},
): Promise<Paginated<AuditEventDto>> {
  return apiRequest<Paginated<AuditEventDto>>("/api/audit", {
    query: { limit: 200, ...query },
  });
}
