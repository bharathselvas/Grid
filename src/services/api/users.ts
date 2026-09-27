import { apiRequest, type Paginated } from "./client";
import type { UserDto } from "./types";

export async function listUsers(query: { q?: string; roleId?: string; status?: string } = {}): Promise<
  Paginated<UserDto>
> {
  return apiRequest<Paginated<UserDto>>("/api/users", {
    query: { limit: 200, ...query },
  });
}
