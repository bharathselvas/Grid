import { apiRequest, type Paginated } from "./client";
import type { DocumentDto } from "./types";

/** Document metadata rows that actually exist for an entity (never fabricated). */
export async function listDocuments(
  query: { entityType: "project" | "parcel" | "case"; entityId: string; limit?: number; offset?: number },
): Promise<Paginated<DocumentDto>> {
  return apiRequest<Paginated<DocumentDto>>("/api/documents", {
    query: { limit: 50, ...query },
  });
}
