import type { FastifyInstance } from "fastify";
import { getNationalOverview, getProjectFacets } from "./admin.service.js";

/**
 * DoLR / National Admin read endpoints. The authentication boundary in
 * `plugins/auth.ts` has already resolved the actor for every route here; thes
 * endpoints are read-only and safe for any authenticated role to view.
 */
export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.get("/overview", async () => getNationalOverview());

  /** Filter dropdown options for the national monitoring page. */
  app.get("/projects/facets", async () => getProjectFacets());
}
