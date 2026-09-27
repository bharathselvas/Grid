import { apiRequest, type Paginated } from "./client";
import type { ProjectDto } from "./types";

export async function listProjects(
  query: { q?: string; state?: string; status?: string; stage?: string; limit?: number; offset?: number } = {},
): Promise<Paginated<ProjectDto>> {
  return apiRequest<Paginated<ProjectDto>>("/api/projects", { query: { limit: 100, ...query } });
}

export async function getProject(id: string): Promise<ProjectDto> {
  return apiRequest<ProjectDto>(`/api/projects/${id}`);
}

export type CreateProjectInput = {
  projectCode: string;
  projectName: string;
  requiringOrganizationId: string;
  projectCategory: "industrial" | "infrastructure" | "irrigation" | "defence" | "housing" | "mining";
  state: string;
  district: string;
  jurisdictionId?: string;
  purpose?: string;
  description?: string;
  budgetCr?: number;
  requiredAreaHa?: number;
  targetDate?: string;
};

export function createProject(input: CreateProjectInput): Promise<ProjectDto> {
  return apiRequest<ProjectDto>("/api/projects", { method: "POST", body: input });
}
