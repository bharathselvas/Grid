import { apiRequest } from "./client";
import type { NationalOverviewDto, ProjectFacetsDto } from "./types";

/** National overview — live aggregations from the DoLR database. */
export async function getNationalOverview(): Promise<NationalOverviewDto> {
  return apiRequest<NationalOverviewDto>("/api/admin/overview");
}

/** Filter dropdown options (states, ministries, stages, risks) with live counts. */
export async function getProjectFacets(): Promise<ProjectFacetsDto> {
  return apiRequest<ProjectFacetsDto>("/api/admin/projects/facets");
}
