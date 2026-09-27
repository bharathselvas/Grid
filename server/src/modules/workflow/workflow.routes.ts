import type { FastifyInstance } from "fastify";
import { WORKFLOW_STAGES } from "../../shared/workflow/stages.js";

export async function workflowRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Canonical workflow definition. The frontend demo workflow screens must not
   * be treated as production authorization — this endpoint is the source the
   * UI should read stage metadata from.
   */
  app.get("/stages", async () => ({
    count: WORKFLOW_STAGES.length,
    stages: WORKFLOW_STAGES.map((stage) => ({
      id: stage.id,
      label: stage.label,
      shortLabel: stage.shortLabel,
      order: stage.order,
      group: stage.group,
      statutoryReference: stage.statutoryReference,
      slaDays: stage.slaDays,
      ownerRoles: stage.ownerRoles,
      prerequisites: stage.prerequisites,
    })),
  }));
}
