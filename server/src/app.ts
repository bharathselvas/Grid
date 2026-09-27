import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { env } from "./config/env.js";
import { auditRoutes } from "./modules/audit/audit.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { jurisdictionRoutes } from "./modules/jurisdictions/jurisdictions.routes.js";
import { organizationRoutes } from "./modules/organizations/organizations.routes.js";
import { parcelRoutes } from "./modules/parcels/parcels.routes.js";
import { projectRoutes } from "./modules/projects/projects.routes.js";
import { roleRoutes } from "./modules/roles/roles.routes.js";
import { userRoutes } from "./modules/users/users.routes.js";
import { workflowRoutes } from "./modules/workflow/workflow.routes.js";
import { registerAuth } from "./plugins/auth.js";
import { registerErrorHandler } from "./plugins/errorHandler.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.isTest ? false : { level: env.NODE_ENV === "production" ? "info" : "info" },
    trustProxy: true,
    bodyLimit: 1_048_576,
  });

  await app.register(cors, {
    origin: [env.CORS_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:4173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-actor-id", "Authorization"],
  });

  registerErrorHandler(app);

  // Public liveness/readiness probe (no auth).
  await app.register(healthRoutes);

  // Everything under /api is behind the authentication boundary.
  await app.register(
    async (api) => {
      registerAuth(api);

      await api.register(projectRoutes, { prefix: "/projects" });
      await api.register(parcelRoutes, { prefix: "/parcels" });
      await api.register(jurisdictionRoutes, { prefix: "/jurisdictions" });
      await api.register(userRoutes, { prefix: "/users" });
      await api.register(organizationRoutes, { prefix: "/organizations" });
      await api.register(workflowRoutes, { prefix: "/workflow" });
      await api.register(auditRoutes, { prefix: "/audit" });
      await api.register(roleRoutes, { prefix: "/roles" });
    },
    { prefix: "/api" },
  );

  return app;
}
