import { apiRequest, type Paginated } from "./client";
import type { RoleDto } from "./types";

export async function listRoles(): Promise<Paginated<RoleDto>> {
  return apiRequest<Paginated<RoleDto>>("/api/roles");
}
