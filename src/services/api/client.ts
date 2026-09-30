export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

/** Error thrown for any non-2xx API response or network failure. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

/**
 * Development actor. Until Supabase Auth lands, the browser sends the id of a
 * seeded user; the server resolves role / organization / jurisdiction from the
 * database and ignores any client-supplied claims.
 */
const DEFAULT_ACTOR_ID =
  import.meta.env.VITE_DEV_ACTOR_ID ?? "00000000-0000-4000-8000-000000000201";

let actorId = DEFAULT_ACTOR_ID;

export function setApiActorId(id: string): void {
  actorId = id;
}

export function getApiActorId(): string {
  return actorId;
}

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  signal?: AbortSignal;
  /** Override the actor for a single request (e.g. admin tooling). */
  actorId?: string;
};

function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/**
 * Fetch wrapper: same-origin `/api` by default (Vite proxy in dev), attaches
 * the actor header, parses the shared `{ error: { code, message } }` contract.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, signal, actorId: requestActor } = options;

  const headers: Record<string, string> = {
    accept: "application/json",
    "x-actor-id": requestActor ?? actorId,
  };
  if (body !== undefined) headers["content-type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      `Could not reach the Terranex API: ${error instanceof Error ? error.message : "network error"}`,
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = undefined;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    const errorBody = payload as ApiErrorBody | undefined;
    throw new ApiError(
      response.status,
      errorBody?.error?.code ?? `HTTP_${response.status}`,
      errorBody?.error?.message ?? response.statusText ?? "Request failed",
      errorBody?.error?.details,
    );
  }

  return payload as T;
}

export type Paginated<T> = {
  items: T[];
  total: number;
  limit?: number;
  offset?: number;
};
