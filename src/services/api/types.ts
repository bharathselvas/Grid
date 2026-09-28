/** Response DTOs — mirror of the Fastify API payloads (server/src/modules/*). */

export type HealthDto = {
  status: "ok" | "degraded";
  service: string;
  environment: string;
  uptimeSeconds: number;
  time: string;
  database: {
    connected: boolean;
    latencyMs: number | null;
    name: string | null;
    postgisVersion: string | null;
    error?: string;
  };
  migrations: { applied: number; names: string[] };
  authMode: string;
};

export type OrganizationDto = {
  id: string;
  name: string;
  code: string;
  type: string;
  orgType: string;
  parentId: string | null;
  parentOrg: string;
  jurisdictionId: string | null;
  jurisdiction: string;
  projects: number;
  users: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type UserDto = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  roleId: string;
  role: string;
  roleShortLabel: string;
  roleLevel: number;
  roleScope: string;
  organizationId: string | null;
  organization: string;
  parentAuthority: string;
  jurisdictionId: string | null;
  jurisdiction: string;
  jurisdictionLevel: string | null;
  status: string;
  assignedProjects: number;
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
};

export type AuditEventDto = {
  id: string;
  timestamp: string;
  actor: string;
  actorUserId: string | null;
  role: string;
  organization: string;
  action: string;
  project: string;
  entityType: string;
  entityId: string;
  previousState: string | null;
  newState: string | null;
  justification: string | null;
  ip: string | null;
  createdAt: string;
};

export type RiskLevel = "critical" | "high" | "medium" | "low" | "on_track";

export type ProjectDto = {
  id: string;
  projectCode: string;
  projectName: string;
  requiringOrganizationId: string | null;
  requiringOrganizationName: string | null;
  projectCategory: string;
  applicableAct: string;
  purpose: string | null;
  description: string | null;
  status: string;
  currentWorkflowStage: string;
  jurisdictionId: string | null;
  jurisdictionName: string | null;
  state: string;
  district: string;
  ministry: string | null;
  budgetCr: number | null;
  requiredAreaHa: number | null;
  targetDate: string | null;
  createdBy: string | null;
  createdByUser: string | null;
  createdAt: string;
  updatedAt: string;
  /** when the project entered its current workflow stage */
  stageEnteredAt: string;
  /** statutory SLA (days) for the current stage */
  stageSlaDays: number;
  /** days elapsed in the current stage */
  daysInStage: number;
  /** derived risk level (see server shared/workflow/risk.ts) */
  risk: RiskLevel;
  /** live project overdue on its target date or past its stage SLA */
  delayed: boolean;
  /** most recent project/transition activity timestamp */
  lastActivityAt: string;
  parcelCount: number;
  /**
   * Current operational owner — the ACTIVE assignment row for this project
   * (person + role + organization + jurisdiction), or null when unowned.
   * Distinct from `requiringOrganizationId` and from monitoring authority.
   */
  operationalOwner: OperationalOwner | null;
};

/** Active ownership row as embedded in ProjectDto. */
export type OperationalOwner = {
  userId: string;
  name: string;
  roleId: string;
  roleLabel: string | null;
  organizationId: string | null;
  organization: string | null;
  jurisdictionId: string | null;
  jurisdiction: string | null;
  assignedAt: string;
};

// ── Work ownership (assignments) ─────────────────────────────────────────────

export type AssignmentStatus = "active" | "released";

export type AssignmentDto = {
  id: string;
  entityType: "project" | "parcel" | string;
  entityId: string;
  entityLabel: string | null;
  assignedToUserId: string;
  assignedToName: string | null;
  assignedRole: string;
  assignedRoleLabel: string | null;
  organizationId: string | null;
  organizationName: string | null;
  jurisdictionId: string | null;
  jurisdictionName: string | null;
  jurisdictionLevel: string | null;
  status: AssignmentStatus | string;
  assignedAt: string;
  releasedAt: string | null;
  reason: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type CreateAssignmentInput = {
  entityType: "project" | "parcel";
  entityId: string;
  assignedToUserId: string;
  /** cross-checks — the server resolves these from the target user's row */
  organizationId?: string;
  jurisdictionId?: string;
  reason?: string;
};

// ── National admin (DoLR) aggregates ────────────────────────────────────────

export type UnavailableMetric = { key: string; label: string; reason: string };

export type OverviewKpis = {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  delayedProjects: number;
  attentionProjects: number;
  totalParcels: number;
  parcelAreaHa: number;
  requiredAreaHa: number;
  stateCount: number;
  districtCount: number;
  auditEventsLast7Days: number;
  unavailableMetrics: UnavailableMetric[];
};

export type OverviewPipelineRow = {
  stage: string;
  label: string;
  shortLabel: string;
  group: string;
  order: number;
  slaDays: number;
  count: number;
  delayedCount: number;
  percentage: number;
  attention: boolean;
  progress: number;
};

export type OverviewStateRow = {
  state: string;
  projects: number;
  activeProjects: number;
  delayedProjects: number;
  attentionProjects: number;
  parcels: number;
  parcelAreaHa: number;
  requiredAreaHa: number;
};

export type NationalOverviewDto = {
  asOf: string;
  kpis: OverviewKpis;
  pipeline: OverviewPipelineRow[];
  states: OverviewStateRow[];
};

export type FacetRow = { value: string; count: number };

export type ProjectFacetsDto = {
  states: FacetRow[];
  ministries: FacetRow[];
  stages: FacetRow[];
  risks: FacetRow[];
};

// ── Workflow instance history ───────────────────────────────────────────────

export type WorkflowTransitionDto = {
  id: string;
  fromStage: string | null;
  toStage: string;
  action: string;
  actorUserId: string | null;
  actorName: string | null;
  actorRole: string | null;
  actorRoleLabel: string | null;
  isAllowed: boolean;
  reason: string | null;
  createdAt: string;
};

export type WorkflowInstanceDto = {
  id: string;
  entityType: string;
  entityId: string;
  currentStage: string;
  status: string;
  ownerRoleId: string | null;
  ownerRoleLabel: string | null;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  transitions: WorkflowTransitionDto[];
};

// ── Document metadata ───────────────────────────────────────────────────────

export type DocumentDto = {
  id: string;
  entityType: string;
  entityId: string;
  stage: string | null;
  documentType: string;
  title: string;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  verificationStatus: string;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: string;
};

export type ParcelDto = {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  surveyNumber: string;
  subdivisionNumber: string | null;
  ulpin: string | null;
  state: string;
  district: string;
  taluk: string | null;
  tehsil: string | null;
  village: string | null;
  areaHa: number | null;
  landType: string | null;
  classificationStatus: string;
  routingStatus: string;
  currentWorkflowStage: string | null;
  sourceDatasetId: string | null;
  hasGeometry: boolean;
  geometry: GeoJsonPolygon | null;
  createdAt: string;
  updatedAt: string;
};

export type GeoJsonPolygon = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};

export type JurisdictionDto = {
  id: string;
  level: string;
  name: string;
  code: string;
  parentId: string | null;
  stateCode: string | null;
  districtCode: string | null;
  tehsilCode: string | null;
  projectCount: number;
  officials: string[];
  createdAt: string;
};

export type JurisdictionTreeNode = JurisdictionDto & { children: JurisdictionTreeNode[] };

export type RoleDto = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  level: number;
  scope: string;
};

export type WorkflowStageDto = {
  id: string;
  label: string;
  shortLabel: string;
  order: number;
  group: string;
  statutoryReference: string | null;
  slaDays: number | null;
  ownerRoles: string[];
  prerequisites: string[];
};
