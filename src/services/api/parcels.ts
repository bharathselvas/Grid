import { apiRequest, type Paginated } from "./client";
import type { ParcelDto } from "./types";

export async function listParcels(
  query: {
    projectId?: string;
    district?: string;
    classificationStatus?: string;
    includeGeometry?: boolean;
    limit?: number;
    offset?: number;
  } = {},
): Promise<Paginated<ParcelDto>> {
  const { includeGeometry, ...rest } = query;
  return apiRequest<Paginated<ParcelDto>>("/api/parcels", {
    query: { limit: 100, ...rest, includeGeometry: includeGeometry ? "true" : undefined },
  });
}

export async function getParcel(id: string, includeGeometry = true): Promise<ParcelDto> {
  return apiRequest<ParcelDto>(`/api/parcels/${id}`, {
    query: { includeGeometry: includeGeometry ? "true" : "false" },
  });
}
