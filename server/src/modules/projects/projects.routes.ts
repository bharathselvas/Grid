import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { requireActor } from "../../plugins/auth.js";
import { parseOrThrow } from "../../shared/validation/pagination.js";
import { createProjectSchema, listProjectsQuerySchema } from "./projects.schemas.js";
import { createProject, getProject, getProjects } from "./projects.service.js";

const idParamsSchema = z.object({ id: z.string().uuid("id must be a uuid") });

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request) => {
    const query = parseOrThrow(listProjectsQuerySchema, request.query);
    return getProjects(query);
  });

  app.get("/:id", async (request) => {
    const { id } = parseOrThrow(idParamsSchema, request.params);
    return getProject(id);
  });

  app.post("/", async (request, reply) => {
    const actor = requireActor(request);
    const input = parseOrThrow(createProjectSchema, request.body);
    const project = await createProject(input, actor);
    return reply.status(201).send(project);
  });
}
