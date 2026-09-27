import { AppError } from "../../shared/errors/AppError.js";
import { getDb } from "../../db/client.js";
import { findJurisdictionById, listJurisdictions, type JurisdictionListRow } from "./jurisdictions.repo.js";

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

const asIso = (value: string | Date): string => (value instanceof Date ? value.toISOString() : String(value));

export function toJurisdictionDto(row: JurisdictionListRow): JurisdictionDto {
  return {
    id: row.id,
    level: row.level,
    name: row.name,
    code: row.code,
    parentId: row.parentId,
    stateCode: row.stateCode,
    districtCode: row.districtCode,
    tehsilCode: row.tehsilCode,
    projectCount: row.projectCount ?? 0,
    officials: row.officials ?? [],
    createdAt: asIso(row.createdAt),
  };
}

export async function getJurisdictions(filters: {
  level?: string;
  parentId?: string;
  q?: string;
  tree?: boolean;
}): Promise<{ items: JurisdictionDto[]; tree: JurisdictionTreeNode[]; total: number }> {
  const db = getDb();
  const rows = await listJurisdictions(db, filters);
  const items = rows.map(toJurisdictionDto);

  const byId = new Map<string, JurisdictionTreeNode>();
  for (const item of items) byId.set(item.id, { ...item, children: [] });

  const roots: JurisdictionTreeNode[] = [];
  for (const item of items) {
    const node = byId.get(item.id)!;
    if (item.parentId && byId.has(item.parentId)) {
      byId.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return { items, tree: roots, total: items.length };
}

export async function getJurisdiction(id: string): Promise<JurisdictionDto> {
  const db = getDb();
  const row = await findJurisdictionById(db, id);
  if (!row) throw AppError.notFound(`Jurisdiction ${id} not found.`);
  return toJurisdictionDto(row);
}
