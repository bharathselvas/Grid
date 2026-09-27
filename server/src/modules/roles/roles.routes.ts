import type { FastifyInstance } from "fastify";
import { getRoles } from "./roles.service.js";

export async function roleRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    const items = await getRoles();
    return { items, total: items.length };
  });
}
