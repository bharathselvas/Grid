import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { jurisdictions, organizations, projects, users } from "../../db/schema.js";
import type { ListProjectsQuery } from "./projects.schemas.js";

export type ProjectListRow = {
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
  budgetCr: string | null;
  requiredAreaHa: string | null;
  targetDate: string | null;
  createdBy: string | null;
  createdByUser: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  parcelCount: number;
};

const selection = {
  id: projects.id,
  projectCode: projects.projectCode,
  projectName: projects.projectName,
  requiringOrganizationId: projects.requiringOrganizationId,
  requiringOrganizationName: organizations.name,
  projectCategory: projects.projectCategory,
  applicableAct: projects.applicableAct,
  purpose: projects.purpose,
  description: projects.description,
  status: projects.status,
  currentWorkflowStage: projects.currentWorkflowStage,
  jurisdictionId: projects.jurisdictionId,
  jurisdictionName: jurisdictions.name,
  state: projects.state,
  district: projects.district,
  ministry: projects.ministry,
  budgetCr: projects.budgetCr,
  requiredAreaHa: projects.requiredAreaHa,
  targetDate: projects.targetDate,
  createdBy: projects.createdBy,
  createdByUser: users.name,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
  parcelCount: sql<number>`(SELECT count(*)::int FROM parcels WHERE parcels.project_id = ${projects.id})`,
};

function baseQuery(db: Db) {
  return db
    .select(selection)
    .from(projects)
    .leftJoin(organizations, eq(projects.requiringOrganizationId, organizations.id))
    .leftJoin(jurisdictions, eq(projects.jurisdictionId, jurisdictions.id))
    .leftJoin(users, eq(projects.createdBy, users.id));
}

function buildFilters(query: ListProjectsQuery) {
  const conditions = [];
  if (query.state) conditions.push(eq(projects.state, query.state));
  if (query.district) conditions.push(eq(projects.district, query.district));
  if (query.stage) conditions.push(eq(projects.currentWorkflowStage, query.stage));
  if (query.status) conditions.push(eq(projects.status, query.status));
  if (query.category) conditions.push(eq(projects.projectCategory, query.category));
  if (query.q) {
    const pattern = `%${query.q}%`;
    conditions.push(sql`(${projects.projectName} ILIKE ${pattern} OR ${projects.projectCode} ILIKE ${pattern})`);
  }
  return conditions.length ? and(...conditions) : undefined;
}

export async function listProjects(db: Db, query: ListProjectsQuery): Promise<{ rows: ProjectListRow[]; total: number }> {
  const where = buildFilters(query);
  const rows = await baseQuery(db)
    .where(where)
    .orderBy(asc(projects.createdAt))
    .limit(query.limit)
    .offset(query.offset);

  const totalRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(projects)
    .where(where);

  return { rows, total: totalRows[0]?.total ?? 0 };
}

export async function findProjectById(db: Db, id: string): Promise<ProjectListRow | undefined> {
  const rows = await baseQuery(db).where(eq(projects.id, id)).limit(1);
  return rows[0];
}

export async function findProjectByCode(db: Db, projectCode: string): Promise<{ id: string } | undefined> {
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.projectCode, projectCode))
    .limit(1);
  return rows[0];
}

export async function organizationExists(db: Db, id: string): Promise<boolean> {
  const rows = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, id)).limit(1);
  return rows.length > 0;
}

export async function jurisdictionExists(db: Db, id: string): Promise<boolean> {
  const rows = await db.select({ id: jurisdictions.id }).from(jurisdictions).where(eq(jurisdictions.id, id)).limit(1);
  return rows.length > 0;
}

export type InsertProjectValues = {
  id?: string;
  projectCode: string;
  projectName: string;
  requiringOrganizationId: string;
  projectCategory: string;
  applicableAct: string;
  purpose?: string;
  description?: string;
  status: string;
  currentWorkflowStage: string;
  jurisdictionId?: string;
  state: string;
  district: string;
  ministry?: string;
  budgetCr?: number;
  requiredAreaHa?: number;
  targetDate?: string;
  createdBy: string;
};

export async function insertProject(db: Db, values: InsertProjectValues): Promise<ProjectListRow> {
  const inserted = await db
    .insert(projects)
    .values({
      ...values,
      jurisdictionId: values.jurisdictionId ?? null,
      purpose: values.purpose ?? null,
      description: values.description ?? null,
      ministry: values.ministry ?? null,
      budgetCr: values.budgetCr === undefined ? null : String(values.budgetCr),
      requiredAreaHa: values.requiredAreaHa === undefined ? null : String(values.requiredAreaHa),
      targetDate: values.targetDate ?? null,
    })
    .returning({ id: projects.id });

  const row = await findProjectById(db, inserted[0].id);
  if (!row) throw new Error("project insert did not return a row");
  return row;
}

export async function recentProjects(db: Db, limit = 5): Promise<Array<{ id: string; projectCode: string }>> {
  return db
    .select({ id: projects.id, projectCode: projects.projectCode })
    .from(projects)
    .orderBy(desc(projects.createdAt))
    .limit(limit);
}
