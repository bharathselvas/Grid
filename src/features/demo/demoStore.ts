import { create } from "zustand";
import type { WorkflowStage } from "./workflowTypes";
import {
  STAGE_ORDER,
  STAGE_GATES,
  getStageStatus,
} from "./workflowTypes";
import type {
  DemoParcel,
  DemoObjection,
  DemoAward,
  DemoPayment,
  DemoPossession,
  DemoRR,
  DemoDocument,
  DemoAuditEvent,
  DemoNotification,
  DemoSIA,
} from "./demoData";
import {
  INITIAL_DEMO_PROJECT,
  INITIAL_DEMO_PARCELS,
  INITIAL_DEMO_SIA,
  INITIAL_DEMO_OBJECTIONS,
  INITIAL_DEMO_AWARDS,
  INITIAL_DEMO_PAYMENTS,
  INITIAL_DEMO_POSSESSION,
  INITIAL_DEMO_RR,
  INITIAL_DEMO_DOCUMENTS,
  INITIAL_DEMO_AUDIT,
  INITIAL_DEMO_NOTIFICATIONS,
} from "./demoData";

// ═══════════════════════════════════════════════════════════════════════
// Demo Store — single source of truth for all roles
// ═══════════════════════════════════════════════════════════════════════

type DemoState = {
  // Project
  project: typeof INITIAL_DEMO_PROJECT;
  // Lifecycle
  currentStage: WorkflowStage;
  completedStages: WorkflowStage[];
  // Entities
  parcels: DemoParcel[];
  objections: DemoObjection[];
  awards: DemoAward[];
  payments: DemoPayment[];
  possession: DemoPossession[];
  rr: DemoRR[];
  documents: DemoDocument[];
  sia: DemoSIA;
  // Observability
  audit: DemoAuditEvent[];
  notifications: DemoNotification[];
  // Demo flags
  isDemoMode: boolean;
  demoSpeed: "slow" | "normal" | "fast";
};

type DemoActions = {
  // Navigation
  advanceStage: () => void;
  resetDemo: () => void;
  goToStage: (stage: WorkflowStage) => void;
  // Entity mutations
  updateParcelVerification: (parcelId: string, status: "verified" | "discrepancy") => void;
  updateParcelAward: (parcelId: string, status: "pending" | "draft" | "finalized" | "approved") => void;
  updatePaymentStatus: (paymentId: string, status: "pending" | "initiated" | "completed" | "failed" | "returned" | "pending_verification", externalRef?: string, failureReason?: string) => void;
  addObjection: (objection: DemoObjection) => void;
  updateObjectionStatus: (objectionId: string, status: DemoObjection["status"], decision?: { authority: string; reason: string }) => void;
  updateSIA: (updates: Partial<DemoSIA>) => void;
  // Audit
  addAuditEvent: (event: Omit<DemoAuditEvent, "id">) => void;
  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (role?: string) => void;
  addNotification: (notification: Omit<DemoNotification, "id">) => void;
  // Helpers
  getParcelById: (parcelId: string) => DemoParcel | undefined;
  getObjectionById: (objectionId: string) => DemoObjection | undefined;
  getAwardByParcelId: (parcelId: string) => DemoAward | undefined;
  getPaymentByParcelId: (parcelId: string) => DemoPayment | undefined;
  getNotificationsForRole: (role: string) => DemoNotification[];
  getStageStatus: (stage: WorkflowStage) => ReturnType<typeof getStageStatus>;
  getCompletedParcelCount: () => number;
  getTotalParcels: () => number;
  getTotalAwardAmount: () => number;
  getTotalPaymentAmount: () => number;
};

export type DemoStore = DemoState & DemoActions;

let auditCounter = INITIAL_DEMO_AUDIT.length;
let notifCounter = INITIAL_DEMO_NOTIFICATIONS.length;

export const useDemoStore = create<DemoStore>((set, get) => ({
  // ── Initial State ──────────────────────────────────────────────────
  project: INITIAL_DEMO_PROJECT,
  currentStage: "proposal",
  completedStages: [],
  parcels: [...INITIAL_DEMO_PARCELS],
  objections: [...INITIAL_DEMO_OBJECTIONS],
  awards: [...INITIAL_DEMO_AWARDS],
  payments: [...INITIAL_DEMO_PAYMENTS],
  possession: [...INITIAL_DEMO_POSSESSION],
  rr: [...INITIAL_DEMO_RR],
  documents: [...INITIAL_DEMO_DOCUMENTS],
  sia: { ...INITIAL_DEMO_SIA },
  audit: [...INITIAL_DEMO_AUDIT],
  notifications: [...INITIAL_DEMO_NOTIFICATIONS],
  isDemoMode: true,
  demoSpeed: "normal",

  // ── Navigation ─────────────────────────────────────────────────────
  advanceStage: () =>
    set((state) => {
      const idx = STAGE_ORDER.indexOf(state.currentStage);
      if (idx < STAGE_ORDER.length - 1) {
        const next = STAGE_ORDER[idx + 1];
        return {
          currentStage: next,
          completedStages: [...STAGE_ORDER.slice(0, idx + 1)],
        };
      }
      return {};
    }),

  goToStage: (stage) =>
    set((state) => {
      const targetIdx = STAGE_ORDER.indexOf(stage);
      if (targetIdx < 0) return {};
      return {
        currentStage: stage,
        completedStages: [...STAGE_ORDER.slice(0, targetIdx)],
      };
    }),

  resetDemo: () =>
    set({
      currentStage: "proposal",
      completedStages: [],
      parcels: INITIAL_DEMO_PARCELS.map((p) => ({
        ...p,
        currentStage: "proposal" as WorkflowStage,
        status: "active" as const,
        verificationStatus: "pending" as const,
        awardStatus: "pending" as const,
        paymentStatus: "pending" as const,
        possessionStatus: "pending" as const,
        rrStatus: "pending" as const,
      })),
      objections: [],
      awards: [],
      payments: [],
      possession: [],
      rr: [],
      documents: INITIAL_DEMO_DOCUMENTS.filter((d) => d.stage === "proposal"),
      sia: { ...INITIAL_DEMO_SIA, status: "pending", completedDate: undefined, reportDocId: undefined },
      audit: [],
      notifications: [],
    }),

  // ── Entity Mutations ───────────────────────────────────────────────
  updateParcelVerification: (parcelId, status) =>
    set((state) => ({
      parcels: state.parcels.map((p) =>
        p.parcelId === parcelId ? { ...p, verificationStatus: status } : p,
      ),
    })),

  updateParcelAward: (parcelId, status) =>
    set((state) => ({
      parcels: state.parcels.map((p) =>
        p.parcelId === parcelId ? { ...p, awardStatus: status } : p,
      ),
    })),

  updatePaymentStatus: (paymentId, status, externalRef, failureReason) =>
    set((state) => ({
      payments: state.payments.map((p) =>
        p.paymentId === paymentId
          ? {
              ...p,
              status,
              externalReference: externalRef ?? p.externalReference,
              failureReason: failureReason ?? p.failureReason,
              completedDate: status === "completed" ? new Date().toLocaleDateString() : p.completedDate,
              failedDate: status === "failed" ? new Date().toLocaleDateString() : p.failedDate,
            }
          : p,
      ),
    })),

  addObjection: (objection) =>
    set((state) => ({
      objections: [...state.objections, objection],
    })),

  updateObjectionStatus: (objectionId, status, decision) =>
    set((state) => ({
      objections: state.objections.map((o) =>
        o.objectionId === objectionId
          ? {
              ...o,
              status,
              decisionDate: decision ? new Date().toLocaleDateString() : o.decisionDate,
              decisionAuthority: decision?.authority ?? o.decisionAuthority,
              decisionReason: decision?.reason ?? o.decisionReason,
            }
          : o,
      ),
    })),

  updateSIA: (updates) =>
    set((state) => ({
      sia: { ...state.sia, ...updates },
    })),

  // ── Audit ──────────────────────────────────────────────────────────
  addAuditEvent: (event) =>
    set((state) => {
      auditCounter += 1;
      return {
        audit: [
          ...state.audit,
          { ...event, id: `AUD-${String(auditCounter).padStart(3, "0")}` },
        ],
      };
    }),

  // ── Notifications ──────────────────────────────────────────────────
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    })),

  markAllNotificationsRead: (role) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        role && role !== "all" ? (n.targetRole === role ? { ...n, read: true } : n) : { ...n, read: true },
      ),
    })),

  addNotification: (notification) =>
    set((state) => {
      notifCounter += 1;
      return {
        notifications: [
          ...state.notifications,
          { ...notification, id: `DN-${String(notifCounter).padStart(3, "0")}` },
        ],
      };
    }),

  // ── Helpers ────────────────────────────────────────────────────────
  getParcelById: (parcelId) => get().parcels.find((p) => p.parcelId === parcelId),
  getObjectionById: (objectionId) => get().objections.find((o) => o.objectionId === objectionId),
  getAwardByParcelId: (parcelId) => get().awards.find((a) => a.parcelId === parcelId),
  getPaymentByParcelId: (parcelId) => get().payments.find((p) => p.parcelId === parcelId),

  getNotificationsForRole: (role) => {
    const notifications = get().notifications;
    if (role === "all") return notifications;
    return notifications.filter((n) => n.targetRole === role || n.targetRole === "all");
  },

  getStageStatus: (stage) => {
    const { completedStages, currentStage } = get();
    return getStageStatus(stage, completedStages, currentStage);
  },

  getCompletedParcelCount: () => get().parcels.filter((p) => p.status === "completed").length,
  getTotalParcels: () => get().parcels.length,
  getTotalAwardAmount: () => get().awards.reduce((sum, a) => sum + a.totalAmount, 0),
  getTotalPaymentAmount: () => get().payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0),
}));
