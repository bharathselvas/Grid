import { apiRequest, type Paginated } from "./client";
import type { OrganizationDto } from "./types";

export async function listOrganizations(query: { q?: string; orgType?: string; status?: string } = {}): Promise<
  Paginated<OrganizationDto>
> {
  return apiRequest<Paginated<OrganizationDto>>("/api/organizations", {
    query: { limit: 200, ...query },
  });
}
