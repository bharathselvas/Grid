import { apiRequest } from "./client";
import type { HealthDto } from "./types";

/** Public endpoint — no actor header required. */
export function getHealth(): Promise<HealthDto> {
  return apiRequest<HealthDto>("/health");
}
