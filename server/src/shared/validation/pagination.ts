import { z } from "zod";
import { AppError } from "../errors/AppError.js";

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

export type Pagination = z.infer<typeof paginationSchema>;

/** Parse + validate request input, converting Zod issues into a 400 API error. */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    throw AppError.validation("Request validation failed.", details);
  }
  return result.data;
}
