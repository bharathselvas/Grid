import { create } from "zustand";
import type { RoleId } from "@/types/rbac";
import { ROLE_BY_ID } from "@/types/rbac";
import { ACTOR_ID_BY_ROLE } from "@/services/api/actors";
import { setApiActorId } from "@/services/api/client";

export type SessionUser = {
  name: string;
  roleId: RoleId;
  jurisdiction: string;
};

const DEFAULT_ROLE: RoleId = "collector_cala";

const ROLE_DEFAULT_USER: Record<RoleId, SessionUser> = {
  national_admin: { name: "Smt. Meera Joshi, IAS", roleId: "national_admin", jurisdiction: "Department of Land Resources — National" },
  ministry_nodal: { name: "Shri. Rajiv Malhotra, IAS", roleId: "ministry_nodal", jurisdiction: "Ministry of Road Transport & Highways" },
  requiring_org: { name: "Shri. A. Deshmukh", roleId: "requiring_org", jurisdiction: "NHAI — Pune Region" },
  state_nodal: { name: "Shri. R. K. Sable, IAS", roleId: "state_nodal", jurisdiction: "Maharashtra — Mumbai" },
  collector_cala: { name: "Dr. Suhas Diwase, IAS", roleId: "collector_cala", jurisdiction: "Pune District" },
  tehsil_sdo: { name: "Smt. Kavita Patil", roleId: "tehsil_sdo", jurisdiction: "Haveli Tehsil, Pune" },
  field_officer: { name: "Shri. M. Kamble", roleId: "field_officer", jurisdiction: "Mulshi Circle, Pune" },
  sia_expert: { name: "Prof. S. Mishra", roleId: "sia_expert", jurisdiction: "SIA Expert Group — Khordha" },
  rnr_officer: { name: "Smt. Asha Khedkar", roleId: "rnr_officer", jurisdiction: "Pune — R&R Division" },
  finance_officer: { name: "Smt. R. Kulkarni", roleId: "finance_officer", jurisdiction: "Pune — PFMS Cell" },
  citizen: { name: "Shri. Baban R. Khomane", roleId: "citizen", jurisdiction: "Pargaon, Purandar — Landholder" },
};

export type JurisdictionContext = { roleId: RoleId; scope: string; jurisdiction: string; label: string };

type SessionState = {
  roleId: RoleId;
  user: SessionUser;
  jurisdictionContext: JurisdictionContext;
  switchRole: (roleId: RoleId) => void;
};

function buildJurisdictionContext(roleId: RoleId, user: SessionUser): JurisdictionContext {
  const meta = ROLE_BY_ID[roleId];
  return { roleId, scope: meta?.scope ?? "district", jurisdiction: user.jurisdiction, label: meta?.jurisdictionHint ?? user.jurisdiction };
}

/**
 * Keep the development `x-actor-id` header in step with the selected session
 * role, so the identity the UI shows is the identity the backend resolves
 * (the server reads role/organization from the users row — the client can
 * never assert a role). `VITE_DEV_ACTOR_ID` pins the actor for debugging and
 * wins over role switching. Roles without a seeded user keep the current
 * actor.
 */
function syncApiActor(roleId: RoleId): void {
  if (import.meta.env.VITE_DEV_ACTOR_ID) return;
  const actorId = ACTOR_ID_BY_ROLE[roleId];
  if (actorId) setApiActorId(actorId);
}

export const useSessionStore = create<SessionState>((set) => {
  syncApiActor(DEFAULT_ROLE);
  return {
    roleId: DEFAULT_ROLE,
    user: ROLE_DEFAULT_USER[DEFAULT_ROLE],
    jurisdictionContext: buildJurisdictionContext(DEFAULT_ROLE, ROLE_DEFAULT_USER[DEFAULT_ROLE]),
    switchRole: (roleId: RoleId) =>
      set(() => {
        syncApiActor(roleId);
        const user = ROLE_DEFAULT_USER[roleId] ?? {
          name: ROLE_BY_ID[roleId]?.label ?? roleId,
          roleId,
          jurisdiction: ROLE_BY_ID[roleId]?.jurisdictionHint ?? "",
        };
        return { roleId, user, jurisdictionContext: buildJurisdictionContext(roleId, user) };
      }),
  };
});
