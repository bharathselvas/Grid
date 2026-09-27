/**
 * Canonical role identifiers. This list MUST stay in sync with:
 *   - `roles` table (seeded by migration 0002_seed_roles.sql) — authoritative
 *   - frontend `src/types/rbac.ts` RoleId (display mirror)
 *
 * There is deliberately NO second role enum anywhere in the backend.
 */
export const CANONICAL_ROLES = [
  "national_admin",
  "ministry_nodal",
  "requiring_org",
  "state_nodal",
  "collector_cala",
  "tehsil_sdo",
  "field_officer",
  "sia_expert",
  "rnr_officer",
  "finance_officer",
  "citizen",
] as const;

export type RoleId = (typeof CANONICAL_ROLES)[number];

export const ROLE_SCOPES: Record<RoleId, "national" | "ministry" | "project" | "state" | "district" | "tehsil" | "village"> = {
  national_admin: "national",
  ministry_nodal: "ministry",
  requiring_org: "project",
  state_nodal: "state",
  collector_cala: "district",
  tehsil_sdo: "tehsil",
  field_officer: "village",
  sia_expert: "district",
  rnr_officer: "district",
  finance_officer: "district",
  citizen: "village",
};

export function isRoleId(value: string): value is RoleId {
  return (CANONICAL_ROLES as readonly string[]).includes(value);
}
