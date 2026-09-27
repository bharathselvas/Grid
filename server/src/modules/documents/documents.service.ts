import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/client.js";
import { documents, users } from "../../db/schema.js";

/**
 * Document metadata read API (bytes live in object storage, which is a later
 * task). Returns whatever metadata rows actually exist for the entity — an
 * empty list is an honest answer, never fabricated sample documents.
 */

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

const asIso = (value: Date | string): string => (value instanceof Date ? value.toISOString() : String(value));

export type ListDocumentsQuery = {
  entityType: "project" | "parcel" | "case";
  entityId: string;
  limit: number;
  offset: number;
};

export async function listDocuments(
  query: ListDocumentsQuery,
): Promise<{ items: DocumentDto[]; total: number; limit: number; offset: number }> {
  const db = getDb();
  const where = and(eq(documents.entityType, query.entityType), eq(documents.entityId, query.entityId));

  const rows = await db
    .select({
      id: documents.id,
      entityType: documents.entityType,
      entityId: documents.entityId,
      stage: documents.stage,
      documentType: documents.documentType,
      title: documents.title,
      filename: documents.filename,
      mimeType: documents.mimeType,
      sizeBytes: documents.sizeBytes,
      verificationStatus: documents.verificationStatus,
      uploadedBy: documents.uploadedBy,
      uploadedByName: users.name,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .leftJoin(users, eq(documents.uploadedBy, users.id))
    .where(where)
    .orderBy(desc(documents.createdAt))
    .limit(query.limit)
    .offset(query.offset);

  const totalRows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(documents)
    .where(where);

  return {
    items: rows.map((row) => ({
      ...row,
      sizeBytes: row.sizeBytes ?? null,
      createdAt: asIso(row.createdAt),
    })),
    total: totalRows[0]?.total ?? 0,
    limit: query.limit,
    offset: query.offset,
  };
}
