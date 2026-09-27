import { z } from "zod";
import { paginationSchema } from "../../shared/validation/pagination.js";
import { isStageId } from "../../shared/workflow/stages.js";

export const PROJECT_CATEGORIES = [
  "industrial",
  "infrastructure",
  "irrigation",
  "defence",
  "housing",
  "mining",
] as const;

export const PROJECT_STATUSES = ["draft", "active", "on_hold", "closed", "cancelled"] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export const listProjectsQuerySchema = paginationSchema.extend({
  state: z.string().min(1).max(100).optional(),
  district: z.string().min(1).max(100).optional(),
  stage: z.string().refine(isStageId, "Unknown workflow stage").optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  category: z.enum(PROJECT_CATEGORIES).optional(),
  q: z.string().min(1).max(200).optional(),
});

export const createProjectSchema = z
  .object({
    projectCode: z
      .string()
      .min(3)
      .max(64)
      .regex(/^[A-Za-z0-9][A-Za-z0-9/_-]*$/, "Only letters, digits, / _ - are allowed"),
    projectName: z.string().min(3).max(200),
    requiringOrganizationId: z.string().uuid("requiringOrganizationId must be a uuid"),
    projectCategory: z.enum(PROJECT_CATEGORIES),
    applicableAct: z.string().min(2).max(120).default("RFCTLARR"),
    purpose: z.string().max(500).optional(),
    description: z.string().max(2000).optional(),
    status: z.enum(PROJECT_STATUSES).default("active"),
    currentWorkflowStage: z
      .string()
      .refine(isStageId, "Unknown workflow stage")
      .default("project_proposal"),
    jurisdictionId: z.string().uuid("jurisdictionId must be a uuid").optional(),
    state: z.string().min(1).max(100),
    district: z.string().min(1).max(100),
    ministry: z.string().max(200).optional(),
    budgetCr: z.number().nonnegative().max(100_000_000).optional(),
    requiredAreaHa: z.number().positive().max(100_000_000).optional(),
    targetDate: z
      .string()
      .refine(isValidDateString, "targetDate must be a valid YYYY-MM-DD date")
      .optional(),
  })
  .strict();

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
