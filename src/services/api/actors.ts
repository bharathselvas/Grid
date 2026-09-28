import type { RoleId } from "@/types/rbac";

/**
 * Development auth identities (`x-actor-id`) — mirrors `SEED_ACTOR_IDS` in
 * server/src/db/seed.ts. Selecting a session role sends the matching seeded
 * user id so the identity shown in the UI is the identity the backend
 * resolves. Roles without a seeded user have no entry and keep the previously
 * active actor (the backend rejects unknown ids with 401).
 */
export const ACTOR_ID_BY_ROLE: Partial<Record<RoleId, string>> = {
  national_admin: "00000000-0000-4000-8000-000000000201",
  state_nodal: "00000000-0000-4000-8000-000000000202",
  collector_cala: "00000000-0000-4000-8000-000000000203",
  requiring_org: "00000000-0000-4000-8000-000000000204",
  tehsil_sdo: "00000000-0000-4000-8000-000000000205",
  field_officer: "00000000-0000-4000-8000-000000000206",
};
