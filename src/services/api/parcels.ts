import { apiRequest, type Paginated } from "./client";
import type { ParcelDto } from "./types";

export async function listParcels(
  query: { projectId?: string; district?: string; classificationStatus?: string; limit?: number; offset?: number } = {},
): Promise<Paginated<ParcelDto>> {
  return apiRequest<Paginated<ParcelDto>>("/api/parcels", { query: { limit: 100, ...query } });
}

export async function getParcel(id: string, includeGeometry = true): Promise<ParcelDto> {
  return apiRequest<ParcelDto>(`/api/parcels/${id}`, {
    query: { includeGeometry: includeGeometry ? "true" : "false" },
  });
}
