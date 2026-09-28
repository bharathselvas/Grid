import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email("A valid email is required.").max(200),
  designation: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(5).max(20).optional(),
  roleId: z.string().trim().min(1).max(60),
  organizationId: z.string().uuid("organizationId must be a uuid"),
  jurisdictionId: z.string().uuid("jurisdictionId must be a uuid"),
  status: z.enum(["active", "pending", "suspended"]).default("active"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
