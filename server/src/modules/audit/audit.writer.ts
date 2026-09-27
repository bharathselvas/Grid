import type { Db } from "../../db/client.js";
import { auditEvents } from "../../db/schema.js";

export type AuditInput = {
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState?: unknown;
  afterState?: unknown;
  reason?: string;
  ip?: string | null;
};

/**
 * Append a real audit event. `audit_events` is append-only (enforced by a
 * database trigger) and every meaningful backend mutation records one here.
 */
export async function recordAuditEvent(db: Db, input: AuditInput): Promise<{ id: string }> {
  const rows = await db
    .insert(auditEvents)
    .values({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeState: input.beforeState ?? null,
      afterState: input.afterState ?? null,
      reason: input.reason ?? null,
      ip: input.ip ?? null,
    })
    .returning({ id: auditEvents.id });
  return { id: rows[0].id };
}
