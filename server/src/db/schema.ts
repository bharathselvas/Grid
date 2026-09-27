import {
  bigint,
  boolean,
  customType,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * PostGIS geometry column (SRID 4326). Values are handled as GeoJSON strings
 * on the wire; the application never hand-writes geometry SQL outside the
 * repository layer.
 */
export const geometry4326 = customType<{ data: string; driverData: string }>({
  dataType: () => "geometry(Geometry, 4326)",
});

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

// ── Canonical role model ─────────────────────────────────────────────────────
export const roles = pgTable("roles", {
  id: text("id").primaryKey(),
  label: text("label").notNull().unique(),
  shortLabel: text("short_label").notNull(),
  description: text("description").notNull().default(""),
  level: integer("level").notNull().unique(),
  scope: text("scope").notNull(),
});

// ── Jurisdiction hierarchy ───────────────────────────────────────────────────
export const jurisdictions = pgTable(
  "jurisdictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    level: text("level").notNull(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    parentId: uuid("parent_id").references((): AnyPgColumn => jurisdictions.id, { onDelete: "cascade" }),
    stateCode: text("state_code"),
    districtCode: text("district_code"),
    tehsilCode: text("tehsil_code"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("jurisdictions_parent_idx").on(t.parentId), index("jurisdictions_level_idx").on(t.level)],
);

// ── Organizations ────────────────────────────────────────────────────────────
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    code: text("code").unique(),
    orgType: text("org_type").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => organizations.id, { onDelete: "set null" }),
    jurisdictionLabel: text("jurisdiction_label").notNull().default(""),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("organizations_parent_idx").on(t.parentId), index("organizations_type_idx").on(t.orgType)],
);

// ── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").unique(),
    phone: text("phone"),
    designation: text("designation"),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    jurisdictionId: uuid("jurisdiction_id").references(() => jurisdictions.id, { onDelete: "set null" }),
    authSubject: text("auth_subject").unique(),
    status: text("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("users_role_idx").on(t.roleId),
    index("users_org_idx").on(t.organizationId),
    index("users_juris_idx").on(t.jurisdictionId),
  ],
);

// ── Datasets (ingestion foundation only) ─────────────────────────────────────
export const datasets = pgTable("datasets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  source: text("source").notNull(),
  format: text("format"),
  status: text("status").notNull().default("registered"),
  recordCount: integer("record_count").notNull().default(0),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const datasetRecords = pgTable(
  "dataset_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    datasetId: uuid("dataset_id")
      .notNull()
      .references(() => datasets.id, { onDelete: "cascade" }),
    externalRef: text("external_ref"),
    payload: jsonb("payload").notNull().default({}),
    geometry: geometry4326("geometry"),
    createdAt: createdAt(),
  },
  (t) => [index("dataset_records_dataset_idx").on(t.datasetId)],
);

// ── Projects ─────────────────────────────────────────────────────────────────
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectCode: text("project_code").notNull().unique(),
    projectName: text("project_name").notNull(),
    requiringOrganizationId: uuid("requiring_organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    projectCategory: text("project_category").notNull(),
    applicableAct: text("applicable_act").notNull().default("RFCTLARR"),
    purpose: text("purpose"),
    description: text("description"),
    status: text("status").notNull().default("active"),
    currentWorkflowStage: text("current_workflow_stage").notNull().default("project_proposal"),
    jurisdictionId: uuid("jurisdiction_id").references(() => jurisdictions.id, { onDelete: "set null" }),
    state: text("state").notNull(),
    district: text("district").notNull(),
    ministry: text("ministry"),
    budgetCr: numeric("budget_cr", { precision: 12, scale: 2 }),
    requiredAreaHa: numeric("required_area_ha", { precision: 14, scale: 4 }),
    targetDate: date("target_date"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("projects_org_idx").on(t.requiringOrganizationId),
    index("projects_state_idx").on(t.state),
    index("projects_stage_idx").on(t.currentWorkflowStage),
    index("projects_status_idx").on(t.status),
    index("projects_juris_idx").on(t.jurisdictionId),
  ],
);

// ── Parcels ──────────────────────────────────────────────────────────────────
export const parcels = pgTable(
  "parcels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    surveyNumber: text("survey_number").notNull(),
    subdivisionNumber: text("subdivision_number"),
    ulpin: text("ulpin"),
    state: text("state").notNull(),
    district: text("district").notNull(),
    taluk: text("taluk").notNull(),
    village: text("village").notNull(),
    areaHa: numeric("area_ha", { precision: 14, scale: 4 }).notNull(),
    landType: text("land_type").notNull(),
    geometry: geometry4326("geometry"),
    classificationStatus: text("classification_status").notNull().default("unclassified"),
    routingStatus: text("routing_status").notNull().default("unrouted"),
    currentWorkflowStage: text("current_workflow_stage").notNull().default("gis_identification"),
    sourceDatasetId: uuid("source_dataset_id").references(() => datasets.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("parcels_project_idx").on(t.projectId),
    index("parcels_district_idx").on(t.district),
    index("parcels_stage_idx").on(t.currentWorkflowStage),
  ],
);

// ── Parcel assignments ───────────────────────────────────────────────────────
export const parcelAssignments = pgTable(
  "parcel_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parcelId: uuid("parcel_id")
      .notNull()
      .references(() => parcels.id, { onDelete: "cascade" }),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    assignedRole: text("assigned_role").references(() => roles.id, { onDelete: "set null" }),
    assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }),
    status: text("status").notNull().default("pending"),
    dueDate: date("due_date"),
    notes: text("notes"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("parcel_assignments_parcel_idx").on(t.parcelId),
    index("parcel_assignments_assignee_idx").on(t.assignedTo),
  ],
);

// ── Workflow ─────────────────────────────────────────────────────────────────
export const workflowInstances = pgTable(
  "workflow_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    currentStage: text("current_stage").notNull(),
    status: text("status").notNull().default("active"),
    ownerRoleId: text("owner_role_id").references(() => roles.id, { onDelete: "set null" }),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: updatedAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("workflow_instances_entity_unique").on(t.entityType, t.entityId),
    index("workflow_instances_stage_idx").on(t.currentStage),
  ],
);

export const workflowTransitions = pgTable(
  "workflow_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowInstanceId: uuid("workflow_instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "cascade" }),
    fromStage: text("from_stage"),
    toStage: text("to_stage").notNull(),
    action: text("action").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorRole: text("actor_role").references(() => roles.id, { onDelete: "set null" }),
    isAllowed: boolean("is_allowed").notNull().default(true),
    reason: text("reason"),
    beforeState: jsonb("before_state"),
    afterState: jsonb("after_state"),
    createdAt: createdAt(),
  },
  (t) => [
    index("workflow_transitions_instance_idx").on(t.workflowInstanceId),
    index("workflow_transitions_created_idx").on(t.createdAt),
  ],
);

// ── Documents (metadata only; bytes live in Supabase Storage) ────────────────
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    stage: text("stage"),
    documentType: text("document_type").notNull(),
    title: text("title").notNull(),
    bucket: text("bucket"),
    storagePath: text("storage_path"),
    filename: text("filename").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    checksum: text("checksum"),
    verificationStatus: text("verification_status").notNull().default("pending"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("documents_entity_idx").on(t.entityType, t.entityId)],
);

// ── Audit events (append-only, enforced by a DB trigger) ─────────────────────
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    beforeState: jsonb("before_state"),
    afterState: jsonb("after_state"),
    reason: text("reason"),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_events_created_idx").on(t.createdAt),
    index("audit_events_entity_idx").on(t.entityType, t.entityId),
    index("audit_events_actor_idx").on(t.actorUserId),
  ],
);

// ── Notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body"),
    type: text("type").notNull().default("info"),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_role_idx").on(t.roleId),
    index("notifications_read_idx").on(t.isRead),
  ],
);

export type Role = typeof roles.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Jurisdiction = typeof jurisdictions.$inferSelect;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Parcel = typeof parcels.$inferSelect;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type WorkflowTransition = typeof workflowTransitions.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Dataset = typeof datasets.$inferSelect;
export type ParcelAssignment = typeof parcelAssignments.$inferSelect;
