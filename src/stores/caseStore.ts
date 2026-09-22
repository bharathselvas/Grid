import { create } from "zustand";
import type { AcquisitionCase, AuditEvent, LifecycleStage } from "@/types/domain";
import type { RoleId } from "@/types/rbac";
import { MOCK_CASES } from "@/mocks/cases";
import { MOCK_PROJECTS } from "@/mocks/projects";
import { MOCK_AUDIT } from "@/mocks/audit";
import { nextStage, stageProgress } from "@/lib/stages";
import type { Project } from "@/types/domain";

export type AdvanceResult =
  | { ok: true }
  | { ok: false; code: "final" | "sia_gate" | "not_found"; reason: string };

type CaseStore = {
  cases: AcquisitionCase[];
  projects: Project[];
  audit: AuditEvent[];
  /** caseId → SIA prerequisite complete (gate for leaving stage `sia`) */
  siaCompleted: Record<string, boolean>;
  selectedCaseId: string | null;
  query: string;
  /** spec alias: search */
  search: string;
  stageFilter: LifecycleStage | "all";
  districtFilter: string;
  /** spec alias: { stage, district, search } */
  filters: { stage: LifecycleStage | "all"; district: string; search: string };

  setQuery: (q: string) => void;
  setSearch: (q: string) => void;
  setStageFilter: (s: LifecycleStage | "all") => void;
  setDistrictFilter: (d: string) => void;
  setFilters: (patch: Partial<{ stage: LifecycleStage | "all"; district: string; search: string }>) => void;
  selectCase: (id: string | null) => void;

  advanceStage: (caseId: string, actorName: string, actorRole: RoleId) => AdvanceResult;
  completeSia: (caseId: string, actorName: string, actorRole: RoleId) => void;
  assignCase: (caseId: string, roleId: RoleId, assigneeName?: string) => void;
  addAuditEvent: (event: AuditEvent) => void;
  updateCase: (caseId: string, patch: Partial<AcquisitionCase>) => void;
};

function nowISO(): string {
  return new Date().toISOString();
}

function enrich(c: AcquisitionCase): AcquisitionCase {
  const progress = stageProgress(c.stage);
  const slaDue = c.slaDueAt ?? c.slaDue ?? null;
  const created = c.createdAt ?? c.created ?? "";
  const updated = c.updatedAt ?? c.updated ?? "";
  return {
    ...c,
    progress,
    created: created || c.createdAt,
    createdAt: c.createdAt || created,
    updated: updated || c.updatedAt,
    updatedAt: c.updatedAt || updated,
    slaDue: slaDue,
    slaDueAt: slaDue,
    amountSanctioned: c.amountSanctionedCr ?? c.amountSanctioned ?? null,
    stats: c.stats ?? {
      parcelsCount: c.parcelsCount,
      objectionsCount: c.objectionsCount,
      amountSanctioned: c.amountSanctionedCr ?? c.amountSanctioned ?? null,
    },
    dates: c.dates ?? { created: created || c.createdAt, updated: updated || c.updatedAt, slaDue },
  };
}

const SEEDED_CASES = MOCK_CASES.map(enrich);

export const useCaseStore = create<CaseStore>((set, get) => ({
  cases: [...SEEDED_CASES],
  projects: [...MOCK_PROJECTS],
  audit: [...MOCK_AUDIT],
  siaCompleted: {},
  selectedCaseId: null,
  query: "",
  get search() {
    return get().query;
  },
  set search(v: string) {
    set({ query: v });
  },
  stageFilter: "all",
  districtFilter: "all",
  get filters(): { stage: LifecycleStage | "all"; district: string; search: string } {
    const s = get();
    return { stage: s.stageFilter, district: s.districtFilter, search: s.query };
  },
  set filters(_v: { stage: LifecycleStage | "all"; district: string; search: string }) {
    // allow assignment for spec compat: store.filters = { ... }
  },

  setQuery: (q) => set({ query: q }),
  setSearch: (q) => set({ query: q }),
  setStageFilter: (s) => set({ stageFilter: s }),
  setDistrictFilter: (d) => set({ districtFilter: d }),
  setFilters: (patch) =>
    set((s) => ({
      query: patch.search !== undefined ? patch.search : s.query,
      stageFilter: patch.stage !== undefined ? patch.stage : s.stageFilter,
      districtFilter: patch.district !== undefined ? patch.district : s.districtFilter,
    })),
  selectCase: (id) => set({ selectedCaseId: id }),

  assignCase: (caseId, roleId, assigneeName) =>
    set((s) => {
      const today = nowISO().slice(0, 10);
      return {
        cases: s.cases.map((c) =>
          c.id === caseId
            ? enrich({ ...c, assigneeRoleId: roleId, assigneeName: assigneeName ?? c.assigneeName, updatedAt: today, updated: today })
            : c,
        ),
      };
    }),

  addAuditEvent: (event) => set((s) => ({ audit: [event, ...s.audit] })),

  updateCase: (caseId, patch) =>
    set((s) => {
      const today = nowISO().slice(0, 10);
      return {
        cases: s.cases.map((c) => {
          if (c.id !== caseId) return c;
          const merged: AcquisitionCase = {
            ...c,
            ...patch,
            updatedAt: today,
            updated: today,
          };
          if (patch.slaDueAt !== undefined) (merged as unknown as Record<string, unknown>).slaDue = patch.slaDueAt;
          if ((patch as unknown as Record<string, unknown>).slaDue !== undefined)
            (merged as unknown as Record<string, unknown>).slaDueAt = (patch as unknown as Record<string, unknown>).slaDue as string | null;
          if (patch.amountSanctionedCr !== undefined)
            (merged as unknown as Record<string, unknown>).amountSanctioned = patch.amountSanctionedCr;
          return enrich(merged);
        }),
      };
    }),

  completeSia: (caseId, actorName, actorRole) => {
    const c = get().cases.find((x) => x.id === caseId);
    if (!c) return;
    set((s) => ({
      siaCompleted: { ...s.siaCompleted, [caseId]: true },
      audit: [
        {
          id: `aud-${Date.now()}`,
          caseId,
          at: nowISO(),
          actorName,
          actorRole,
          action: "Completed SIA assessment prerequisite (mock)",
          stage: c.stage,
          before: c.stage,
          after: c.stage,
          ip: "10.194.22.99",
        } satisfies AuditEvent,
        ...s.audit,
      ],
    }));
  },

  advanceStage: (caseId, actorName, actorRole) => {
    const c = get().cases.find((x) => x.id === caseId);
    if (!c) return { ok: false, code: "not_found", reason: "Case not found." };
    const nxt = nextStage(c.stage);
    if (!nxt) return { ok: false, code: "final", reason: "Cannot advance — already at final stage." };

    // SIA prerequisite gate: leaving stage `sia` requires completed SIA assessment
    if (c.stage === "sia" && !get().siaCompleted[caseId]) {
      return {
        ok: false,
        code: "sia_gate",
        reason: "Required prerequisite: SIA assessment is incomplete.",
      };
    }

    const today = nowISO().slice(0, 10);
    const slaDueAt = nxt === "closed" ? null : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const updated: AcquisitionCase = enrich({
      ...c,
      stage: nxt,
      status: nxt === "closed" ? "closed" : "active",
      updatedAt: today,
      updated: today,
      slaStatus: nxt === "closed" ? null : "on_track",
      slaDueAt,
      slaDue: slaDueAt,
    });

    const event: AuditEvent = {
      id: `aud-${Date.now()}`,
      caseId,
      at: nowISO(),
      actorName,
      actorRole,
      action: `Advanced case from ${c.stage} → ${nxt} (mock)`,
      stage: nxt,
      before: c.stage,
      after: nxt,
      ip: "10.194.22.99",
    };

    set((s) => ({
      cases: s.cases.map((x) => (x.id === caseId ? updated : x)),
      audit: [event, ...s.audit],
    }));
    return { ok: true };
  },
}));

// Keep `search` and `filters` in sync as live derived accessors even when state is mutated via `set({ query })`.
// Zustand state is a plain object; we install getters that always reflect current query/stageFilter/districtFilter.
{
  const proto = useCaseStore as unknown as { getState: () => CaseStore };
  const origGetState = proto.getState.bind(proto);
  // Wrap getState to inject derived fields
  (useCaseStore as unknown as Record<string, unknown>).getState = () => {
    const s = origGetState() as unknown as Record<string, unknown>;
    return {
      ...s,
      get search() {
        return (s.query as string) ?? "";
      },
      get filters() {
        return { stage: s.stageFilter, district: s.districtFilter, search: s.query };
      },
    } as unknown as CaseStore;
  };
}
