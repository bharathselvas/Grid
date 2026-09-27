import { and, asc, eq, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { parcels, projects } from "../../db/schema.js";
import type { ListParcelsQuery } from "./parcels.schemas.js";

export type ParcelListRow = {
  id: string;
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  surveyNumber: string;
  subdivisionNumber: string | null;
  ulpin: string | null;
  state: string;
  district: string;
  taluk: string;
  village: string;
  areaHa: string;
  landType: string;
  classificationStatus: string;
  routingStatus: string;
  currentWorkflowStage: string;
  sourceDatasetId: string | null;
  hasGeometry: boolean;
  geometryGeojson: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function buildFilters(query: ListParcelsQuery) {
  const conditions = [];
  if (query.projectId) conditions.push(eq(parcels.projectId, query.projectId));
  if (query.state) conditions.push(eq(parcels.state, query.state));
  if (query.district) conditions.push(eq(parcels.district, query.district));
  if (query.village) conditions.push(eq(parcels.village, query.village));
  if (query.stage) conditions.push(eq(parcels.currentWorkflowStage, query.stage));
  if (query.landType) conditions.push(eq(parcels.landType, query.landType));
  if (query.classificationStatus) conditions.push(eq(parcels.classificationStatus, query.classificationStatus));
  return conditions.length ? and(...conditions) : undefined;
}

export async function listParcels(db: Db, query: ListParcelsQuery): Promise<{ rows: ParcelListRow[]; total: number }> {
  const where = buildFilters(query);

  const rows = await db
    .select({
      id: parcels.id,
      projectId: parcels.projectId,
      projectCode: projects.projectCode,
      projectName: projects.projectName,
      surveyNumber: parcels.surveyNumber,
      subdivisionNumber: parcels.subdivisionNumber,
      ulpin: parcels.ulpin,
      state: parcels.state,
      district: parcels.district,
      taluk: parcels.taluk,
      village: parcels.village,
      areaHa: parcels.areaHa,
      landType: parcels.landType,
      classificationStatus: parcels.classificationStatus,
      routingStatus: parcels.routingStatus,
      currentWorkflowStage: parcels.currentWorkflowStage,
      sourceDatasetId: parcels.sourceDatasetId,
      hasGeometry: sql<boolean>`${parcels.geometry} IS NOT NULL`,
      geometryGeojson: query.includeGeometry
        ? sql<string | null>`ST_AsGeoJSON(${parcels.geometry})`
        : sql<null>`NULL::text`,
      createdAt: parcels.createdAt,
      updatedAt: parcels.updatedAt,
    })
    .from(parcels)
    .leftJoin(projects, eq(parcels.projectId, projects.id))
    .where(where)
    .orderBy(asc(parcels.surveyNumber))
    .limit(query.limit)
    .offset(query.offset);

  const totalRows = await db.select({ total: sql<number>`count(*)::int` }).from(parcels).where(where);

  return { rows, total: totalRows[0]?.total ?? 0 };
}

export async function findParcelById(db: Db, id: string, includeGeometry: boolean): Promise<ParcelListRow | undefined> {
  const rows = await db
    .select({
      id: parcels.id,
      projectId: parcels.projectId,
      projectCode: projects.projectCode,
      projectName: projects.projectName,
      surveyNumber: parcels.surveyNumber,
      subdivisionNumber: parcels.subdivisionNumber,
      ulpin: parcels.ulpin,
      state: parcels.state,
      district: parcels.district,
      taluk: parcels.taluk,
      village: parcels.village,
      areaHa: parcels.areaHa,
      landType: parcels.landType,
      classificationStatus: parcels.classificationStatus,
      routingStatus: parcels.routingStatus,
      currentWorkflowStage: parcels.currentWorkflowStage,
      sourceDatasetId: parcels.sourceDatasetId,
      hasGeometry: sql<boolean>`${parcels.geometry} IS NOT NULL`,
      geometryGeojson: includeGeometry
        ? sql<string | null>`ST_AsGeoJSON(${parcels.geometry})`
        : sql<null>`NULL::text`,
      createdAt: parcels.createdAt,
      updatedAt: parcels.updatedAt,
    })
    .from(parcels)
    .leftJoin(projects, eq(parcels.projectId, projects.id))
    .where(eq(parcels.id, id))
    .limit(1);

  return rows[0];
}
