import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { closePool, getPool } from "../src/db/client.js";

export const NATIONAL_ADMIN_ID = "00000000-0000-4000-8000-000000000201";
export const NHAI_ORG_ID = "00000000-0000-4000-8000-000000000103";
export const PUNE_JURISDICTION_ID = "00000000-0000-4000-8000-000000000005";
export const INDIA_JURISDICTION_ID = "00000000-0000-4000-8000-000000000001";
export const SEEDED_PROJECT_CODE = "MH/PUNE/NHAI/2025-26/042";
export const SEEDED_ULPIN = "MH2715001P0078R0003";

export async function startApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

export async function stopApp(app: FastifyInstance): Promise<void> {
  await app.close();
  await closePool();
}

export function asActor(actorId: string = NATIONAL_ADMIN_ID): Record<string, string> {
  return { "x-actor-id": actorId };
}

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await getPool().query(text, params as never[]);
  return res.rows as T[];
}

export function uniqueProjectCode(): string {
  return `TST-${crypto.randomUUID().toUpperCase().slice(0, 13)}`;
}
