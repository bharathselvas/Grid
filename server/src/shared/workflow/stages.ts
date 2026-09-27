/**
 * Canonical workflow model — backend authoritative.
 *
 * This mirrors the frontend's `src/lib/stages.ts` LifecycleStage vocabulary
 * (the DoLR / National Admin UI stage list). The duplicate demo vocabulary in
 * `src/features/demo/workflowTypes.ts` (`proposal`, `section_11`, …) is an
 * ALIAS of these stages, not a second workflow system — see
 * `src/lib/canonical.ts` on the frontend for the alias mapping.
 *
 * Rules the backend will enforce (transition execution lands in a later task):
 *   - linear prerequisites (stage N requires stage N-1 completed)
 *   - actor authorization: actor role must be in `ownerRoles`
 *   - ownership + audit for every transition
 */

export const CANONICAL_STAGE_IDS = [
  "project_proposal",
  "land_requirement",
  "gis_identification",
  "submission",
  "scrutiny",
  "sia",
  "preliminary_notification",
  "public_disclosure",
  "objections_hearing",
  "declaration",
  "field_verification",
  "compensation",
  "award",
  "payment",
  "possession",
  "r_and_r",
  "closed",
] as const;

export type StageId = (typeof CANONICAL_STAGE_IDS)[number];

export type StageGroup =
  | "initiation"
  | "assessment"
  | "notification"
  | "adjudication"
  | "settlement"
  | "closure";

export type StageDefinition = {
  id: StageId;
  label: string;
  shortLabel: string;
  order: number;
  statutoryReference: string;
  slaDays: number;
  group: StageGroup;
  ownerRoles: readonly string[];
  /** previous stage that must be completed first (linear lifecycle) */
  prerequisites: readonly StageId[];
};

const RAW: Array<Omit<StageDefinition, "prerequisites" | "order">> = [
  { id: "project_proposal", label: "Project Proposal", shortLabel: "Proposal", statutoryReference: "RFCTLARR §4 — Preparation of SIA", slaDays: 14, group: "initiation", ownerRoles: ["requiring_org", "ministry_nodal"] },
  { id: "land_requirement", label: "Land Requirement", shortLabel: "Requirement", statutoryReference: "RFCTLARR §4(1)", slaDays: 7, group: "initiation", ownerRoles: ["requiring_org", "collector_cala"] },
  { id: "gis_identification", label: "GIS Land Identification", shortLabel: "GIS ID", statutoryReference: "DoLR GIS Guidelines 2023", slaDays: 14, group: "initiation", ownerRoles: ["collector_cala", "field_officer", "tehsil_sdo"] },
  { id: "submission", label: "Submission", shortLabel: "Submission", statutoryReference: "RFCTLARR §6 — Submission to Collector", slaDays: 7, group: "initiation", ownerRoles: ["requiring_org", "collector_cala"] },
  { id: "scrutiny", label: "Scrutiny", shortLabel: "Scrutiny", statutoryReference: "RFCTLARR §7 — Scrutiny by Collector", slaDays: 21, group: "assessment", ownerRoles: ["collector_cala", "tehsil_sdo", "state_nodal"] },
  { id: "sia", label: "Social Impact Assessment", shortLabel: "SIA", statutoryReference: "RFCTLARR Ch. II (§4–§9)", slaDays: 180, group: "assessment", ownerRoles: ["sia_expert", "collector_cala", "state_nodal"] },
  { id: "preliminary_notification", label: "Preliminary Notification", shortLabel: "11(1) Notice", statutoryReference: "RFCTLARR §11 — Preliminary Notification", slaDays: 14, group: "notification", ownerRoles: ["collector_cala", "state_nodal"] },
  { id: "public_disclosure", label: "Public Disclosure", shortLabel: "Disclosure", statutoryReference: "RFCTLARR §11(3) — Public Display", slaDays: 30, group: "notification", ownerRoles: ["collector_cala", "tehsil_sdo", "field_officer"] },
  { id: "objections_hearing", label: "Objections & Hearing", shortLabel: "Objections", statutoryReference: "RFCTLARR §15 — Hearing of Objections", slaDays: 60, group: "adjudication", ownerRoles: ["collector_cala", "tehsil_sdo"] },
  { id: "declaration", label: "Declaration", shortLabel: "19(1) Decl.", statutoryReference: "RFCTLARR §19 — Declaration", slaDays: 30, group: "adjudication", ownerRoles: ["collector_cala", "state_nodal", "national_admin"] },
  { id: "field_verification", label: "Field Verification", shortLabel: "Field Verify", statutoryReference: "RFCTLARR §20 — Survey & Measurement", slaDays: 30, group: "adjudication", ownerRoles: ["field_officer", "tehsil_sdo", "collector_cala"] },
  { id: "compensation", label: "Compensation Assessment", shortLabel: "Compensation", statutoryReference: "RFCTLARR §26–§30 — Determination of Compensation", slaDays: 45, group: "settlement", ownerRoles: ["collector_cala", "finance_officer"] },
  { id: "award", label: "Award", shortLabel: "Award", statutoryReference: "RFCTLARR §23 / §37 — Award Enquiry", slaDays: 30, group: "settlement", ownerRoles: ["collector_cala", "finance_officer"] },
  { id: "payment", label: "Payment", shortLabel: "Payment", statutoryReference: "RFCTLARR §31–§33 — Payment & Possession", slaDays: 30, group: "settlement", ownerRoles: ["finance_officer", "collector_cala"] },
  { id: "possession", label: "Possession", shortLabel: "Possession", statutoryReference: "RFCTLARR §38 — Taking Possession", slaDays: 14, group: "settlement", ownerRoles: ["collector_cala", "tehsil_sdo", "field_officer"] },
  { id: "r_and_r", label: "Rehabilitation & Resettlement", shortLabel: "R&R", statutoryReference: "RFCTLARR Ch. V–VI — R&R Scheme", slaDays: 90, group: "closure", ownerRoles: ["rnr_officer", "collector_cala", "state_nodal"] },
  { id: "closed", label: "Closed", shortLabel: "Closed", statutoryReference: "RFCTLARR §49 — Completion", slaDays: 0, group: "closure", ownerRoles: ["collector_cala", "national_admin"] },
];

export const WORKFLOW_STAGES: readonly StageDefinition[] = RAW.map((stage, index) => ({
  ...stage,
  order: index + 1,
  prerequisites: index === 0 ? [] : [RAW[index - 1].id as StageId],
}));

export const STAGE_BY_ID: Record<StageId, StageDefinition> = Object.fromEntries(
  WORKFLOW_STAGES.map((s) => [s.id, s]),
) as Record<StageId, StageDefinition>;

export function isStageId(value: string): value is StageId {
  return (CANONICAL_STAGE_IDS as readonly string[]).includes(value);
}

export function nextStageId(current: string): StageId | null {
  const index = CANONICAL_STAGE_IDS.indexOf(current as StageId);
  if (index === -1 || index === CANONICAL_STAGE_IDS.length - 1) return null;
  return CANONICAL_STAGE_IDS[index + 1];
}

/** Whether `role` may act on `stage` (RBAC + workflow ownership). */
export function canRoleActOnStage(role: string, stage: string): boolean {
  const definition = STAGE_BY_ID[stage as StageId];
  if (!definition) return false;
  return definition.ownerRoles.includes(role);
}
