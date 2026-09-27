import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
// src/config -> server/ -> repository root
const serverRoot = path.resolve(here, "..", "..");
const repoRoot = path.resolve(serverRoot, "..");

// Server-side env only. Never expose these to the browser bundle.
for (const file of [path.join(serverRoot, ".env"), path.join(repoRoot, ".env")]) {
  if (existsSync(file)) loadDotenv({ path: file, override: false });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().url({ message: "DATABASE_URL must be a postgresql:// connection string" }),

  /**
   * Supabase project credentials. Optional for now: this deployment reads the
   * same Supabase PostgreSQL instance through DATABASE_URL. These are kept here
   * so the future Supabase Auth / Storage work has a single, server-only home.
   * They must NEVER be referenced from frontend code.
   */
  SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal("")),

  /**
   * Authentication boundary. `development-header` resolves an actor from the
   * `x-actor-id` header by loading the user row from the database — the role,
   * organization and jurisdiction always come from the DB, never from the
   * client. Replace with a Supabase-JWT strategy without touching domain code.
   */
  AUTH_MODE: z.enum(["development-header", "disabled"]).default("development-header"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${details}\n\nSee .env.example for required variables.`);
}

export const env = {
  ...parsed.data,
  SUPABASE_URL: parsed.data.SUPABASE_URL || undefined,
  SUPABASE_SERVICE_ROLE_KEY: parsed.data.SUPABASE_SERVICE_ROLE_KEY || undefined,
  isTest: parsed.data.NODE_ENV === "test",
};

export type Env = typeof env;
