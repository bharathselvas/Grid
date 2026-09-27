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
  parcelCount: number;
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
