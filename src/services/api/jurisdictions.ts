import { apiRequest, type Paginated } from "./client";
import type { JurisdictionDto, JurisdictionTreeNode } from "./types";

export async function listJurisdictions(
  query: { level?: string; parentId?: string; q?: string } = {},
): Promise<Paginated<JurisdictionDto>> {
  return apiRequest<Paginated<JurisdictionDto>>("/api/jurisdictions", {
    query: { limit: 500, ...query },
  });
}

export async function getJurisdictionTree(): Promise<Paginated<JurisdictionTreeNode>> {
  return apiRequest<Paginated<JurisdictionTreeNode>>("/api/jurisdictions", {
    query: { tree: "true" },
  });
}

export async function getJurisdiction(id: string): Promise<JurisdictionDto> {
  return apiRequest<JurisdictionDto>(`/api/jurisdictions/${id}`);
}
