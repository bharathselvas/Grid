import { AppError } from "../../shared/errors/AppError.js";
import { getDb } from "../../db/client.js";
import type { ListParcelsQuery } from "./parcels.schemas.js";
import { findParcelById, listParcels, type ParcelListRow } from "./parcels.repo.js";

export type ParcelDto = {
  id: string;
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
  surveyNumber: string;
  subdivisionNumber: string | null;
  ulpin: string | null;
  state: string;
  district: string;
  /** canonical DB column is `taluk`; `tehsil` is the alias used across the UI */
  taluk: string;
  tehsil: string;
  village: string;
  areaHa: number;
  landType: string;
  classificationStatus: string;
  routingStatus: string;
  currentWorkflowStage: string;
  sourceDatasetId: string | null;
  hasGeometry: boolean;
  geometry: unknown;
  createdAt: string;
  updatedAt: string;
};

const asIso = (value: string | Date): string => (value instanceof Date ? value.toISOString() : String(value));

export function toParcelDto(row: ParcelListRow): ParcelDto {
  let geometry: unknown = null;
  if (row.geometryGeojson) {
    try {
      geometry = JSON.parse(row.geometryGeojson);
    } catch {
      geometry = null;
    }
  }

  return {
    id: row.id,
    projectId: row.projectId,
    projectCode: row.projectCode,
    projectName: row.projectName,
    surveyNumber: row.surveyNumber,
    subdivisionNumber: row.subdivisionNumber,
    ulpin: row.ulpin,
    state: row.state,
    district: row.district,
    taluk: row.taluk,
    tehsil: row.taluk,
    village: row.village,
    areaHa: Number(row.areaHa),
    landType: row.landType,
    classificationStatus: row.classificationStatus,
    routingStatus: row.routingStatus,
    currentWorkflowStage: row.currentWorkflowStage,
    sourceDatasetId: row.sourceDatasetId,
    hasGeometry: Boolean(row.hasGeometry),
    geometry,
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

export async function getParcels(query: ListParcelsQuery): Promise<{
  items: ParcelDto[];
  total: number;
  limit: number;
  offset: number;
}> {
  const db = getDb();
  const { rows, total } = await listParcels(db, query);
  return { items: rows.map(toParcelDto), total, limit: query.limit, offset: query.offset };
}

export async function getParcel(id: string, includeGeometry = false): Promise<ParcelDto> {
  const db = getDb();
  const row = await findParcelById(db, id, includeGeometry);
  if (!row) throw AppError.notFound(`Parcel ${id} not found.`);
  return toParcelDto(row);
}
