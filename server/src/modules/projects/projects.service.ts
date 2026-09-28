import { AppError } from "../../shared/errors/AppError.js";
import { getDb, withTransaction, type Db } from "../../db/client.js";
import type { Actor } from "../../plugins/auth.js";
import { STAGE_BY_ID, type StageId } from "../../shared/workflow/stages.js";
import { recordAuditEvent } from "../audit/audit.writer.js";
import { openWorkflowInstance } from "../workflow/workflow.service.js";
import type { CreateProjectInput, ListProjectsQuery } from "./projects.schemas.js";
import {
  findProjectByCode,
  findProjectById,
  insertProject,
  jurisdictionExists,
  listProjects,
  organizationExists,
  type ProjectListRow,
  type ProjectOperationalOwner,
} from "./projects.repo.js";
import {
  canAccessJurisdiction,
  getActorContext,
  jurisdictionAncestors,
} from "../actorContext/actorContext.service.js";
import { findActiveAssignment } from "../assignments/assignments.repo.js";

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
  /** derived risk level (see shared/workflow/risk.ts) */
  risk: string;
  /** live project overdue on its target date or past its stage SLA */
  delayed: boolean;
  /** most recent project/transition activity timestamp */
  lastActivityAt: string;
  parcelCount: number;
  /**
   * Current operational owner — the ACTIVE assignment row for this project
   * (person + role + organization + jurisdiction). Distinct from
   * `requiringOrganizationId` (who requested the acquisition) and from
   * monitoring authority (oversight roles can view without owning).
   */
  operationalOwner: ProjectOperationalOwner | null;
};

const asIso = (value: string | Date | null): string | null =>
  value === null ? null : value instanceof Date ? value.toISOString() : String(value);

const asNumber = (value: string | null): number | null => (value === null ? null : Number(value));

export function toProjectDto(row: ProjectListRow): ProjectDto {
  return {
    id: row.id,
    projectCode: row.projectCode,
    projectName: row.projectName,
    requiringOrganizationId: row.requiringOrganizationId,
    requiringOrganizationName: row.requiringOrganizationName,
    projectCategory: row.projectCategory,
    applicableAct: row.applicableAct,
    purpose: row.purpose,
    description: row.description,
    status: row.status,
    currentWorkflowStage: row.currentWorkflowStage,
    jurisdictionId: row.jurisdictionId,
    jurisdictionName: row.jurisdictionName,
    state: row.state,
    district: row.district,
    ministry: row.ministry,
    budgetCr: asNumber(row.budgetCr),
    requiredAreaHa: asNumber(row.requiredAreaHa),
    targetDate: row.targetDate,
    createdBy: row.createdBy,
    createdByUser: row.createdByUser,
    createdAt: asIso(row.createdAt) ?? "",
    updatedAt: asIso(row.updatedAt) ?? "",
    stageEnteredAt: asIso(row.stageEnteredAt) ?? "",
    stageSlaDays: Number(row.stageSlaDays),
    daysInStage: Math.round(Number(row.daysInStage) * 10) / 10,
    risk: row.risk,
    delayed: row.delayed,
    lastActivityAt: asIso(row.lastActivityAt) ?? "",
    parcelCount: row.parcelCount ?? 0,
    operationalOwner: row.operationalOwner ?? null,
  };
}

export async function getProjects(query: ListProjectsQuery): Promise<{
  items: ProjectDto[];
  total: number;
  limit: number;
  offset: number;
}> {
  const db = getDb();
  const { rows, total } = await listProjects(db, query);
  return { items: rows.map(toProjectDto), total, limit: query.limit, offset: query.offset };
}

/**
 * Single-project read with VIEW SCOPE enforcement: oversight roles (national /
 * ministry) and anyone whose jurisdiction covers the project can read it; the
 * project's operational assignee can always read their own work. This is read
 * authority only — operational authority is checked separately at mutation
 * time (workflow transitions, assignments).
 */
export async function getProject(id: string, actor: Actor): Promise<ProjectDto> {
  const db = getDb();
  const row = await findProjectById(db, id);
  if (!row) throw AppError.notFound(`Project ${id} not found.`);

  const ctx = await getActorContext(actor.userId, db);
  const chain = row.jurisdictionId ? await jurisdictionAncestors(db, row.jurisdictionId) : null;
  const active = await findActiveAssignment(db, "project", id);
  if (!canAccessJurisdiction(ctx, chain, active)) {
    throw AppError.forbidden(
      `Project ${row.projectCode} is outside the jurisdiction scope of ${ctx.user.name} (${ctx.role.label}).`,
    );
  }
  return toProjectDto(row);
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}

export async function createProject(input: CreateProjectInput, actor: Actor): Promise<ProjectDto> {
  const db = getDb();

  // ── Business rules (server-side, never the client) ────────────────────────
  if (!(await organizationExists(db, input.requiringOrganizationId))) {
    throw AppError.validation("requiringOrganizationId does not match an existing organization.", [
      { path: "requiringOrganizationId", message: "Unknown organization." },
    ]);
  }

  if (input.jurisdictionId && !(await jurisdictionExists(db, input.jurisdictionId))) {
    throw AppError.validation("jurisdictionId does not match an existing jurisdiction.", [
      { path: "jurisdictionId", message: "Unknown jurisdiction." },
    ]);
  }

  const stage = STAGE_BY_ID[input.currentWorkflowStage as StageId];
  if (!stage) {
    throw AppError.validation("currentWorkflowStage is not a canonical workflow stage.", [
      { path: "currentWorkflowStage", message: "Unknown stage." },
    ]);
  }

  if (await findProjectByCode(db, input.projectCode)) {
    throw AppError.conflict(`A project with code ${input.projectCode} already exists.`);
  }

  try {
    const row = await withTransaction(async (tx: Db) => {
      const created = await insertProject(tx, {
        projectCode: input.projectCode,
        projectName: input.projectName,
        requiringOrganizationId: input.requiringOrganizationId,
        projectCategory: input.projectCategory,
        applicableAct: input.applicableAct,
        purpose: input.purpose,
        description: input.description,
        status: input.status,
        currentWorkflowStage: input.currentWorkflowStage,
        jurisdictionId: input.jurisdictionId,
        state: input.state,
        district: input.district,
        ministry: input.ministry,
        budgetCr: input.budgetCr,
        requiredAreaHa: input.requiredAreaHa,
        targetDate: input.targetDate,
        createdBy: actor.userId,
      });

      await openWorkflowInstance(tx, {
        entityType: "project",
        entityId: created.id,
        stage: input.currentWorkflowStage,
        actorUserId: actor.userId,
        actorRole: actor.roleId,
        reason: "Workflow opened for a newly created project.",
      });

      await recordAuditEvent(tx, {
        actorUserId: actor.userId,
        actorRole: actor.roleId,
        action: "PROJECT_CREATED",
        entityType: "project",
        entityId: created.id,
        beforeState: null,
        afterState: {
          projectCode: created.projectCode,
          projectName: created.projectName,
          status: created.status,
          currentWorkflowStage: created.currentWorkflowStage,
          state: created.state,
          district: created.district,
        },
        reason: "Project created via POST /api/projects.",
      });

      return created;
    });

    return toProjectDto(row);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw AppError.conflict(`A project with code ${input.projectCode} already exists.`);
    }
    throw error;
  }
}
