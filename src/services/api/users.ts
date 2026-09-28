import { apiRequest, type Paginated } from "./client";
import type { UserDto } from "./types";

export async function listUsers(
  query: { q?: string; roleId?: string; status?: string; limit?: number } = {},
): Promise<Paginated<UserDto>> {
  return apiRequest<Paginated<UserDto>>("/api/users", {
    query: { limit: 200, ...query },
  });
}

export type CreateUserInput = {
  name: string;
  email: string;
  designation?: string;
  phone?: string;
  /** existing canonical role id (e.g. "collector_cala") */
  roleId: string;
  /** existing organization uuid */
  organizationId: string;
  /** existing jurisdiction uuid */
  jurisdictionId: string;
  status?: "active" | "pending" | "suspended";
};

/** Provision a real user; the server validates role/org/jurisdiction rows. */
export function createUser(input: CreateUserInput): Promise<UserDto> {
  return apiRequest<UserDto>("/api/users", { method: "POST", body: input });
}
