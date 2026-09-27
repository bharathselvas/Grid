import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError, type ApiErrorBody } from "../shared/errors/AppError.js";

function toErrorBody(statusCode: number, code: ApiErrorBody["error"]["code"], message: string, details?: unknown): ApiErrorBody {
  return { error: { code, message, ...(details === undefined ? {} : { details }) } };
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | AppError | ZodError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(toErrorBody(error.statusCode, error.code, error.message, error.details));
    }

    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
      return reply.status(400).send(toErrorBody(400, "VALIDATION_ERROR", "Request validation failed.", details));
    }

    const statusCode = typeof error.statusCode === "number" ? error.statusCode : 500;

    if (statusCode === 400 || statusCode === 415 || statusCode === 422) {
      return reply.status(400).send(toErrorBody(400, "VALIDATION_ERROR", "Malformed request."));
    }

    if (statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send(toErrorBody(statusCode, "NOT_FOUND", "Resource not found."));
    }

    // Unexpected error: log server-side only. Never leak DB internals.
    request.log.error({ err: error }, "unhandled error");
    return reply.status(500).send(toErrorBody(500, "INTERNAL_ERROR", "Unexpected server error."));
  });

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send(toErrorBody(404, "NOT_FOUND", `Route ${request.method} ${request.url} not found.`));
  });
}
