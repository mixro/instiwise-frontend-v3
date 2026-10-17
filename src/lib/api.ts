/**
 * Thin fetch wrapper for the backend. All paths are relative to /api, which the
 * Vite dev proxy (and the production reverse proxy) forwards to the backend.
 *
 * The backend returns { error: { code, message } } for failures. The code is
 * stable and machine-readable; the UI translates it, never shows `message`.
 * When the server cannot be reached at all the code is NETWORK_ERROR. When a proxy
 * in front of it (Vite in development, nginx in production) answers 5xx without our
 * JSON error body, the backend is down or not started: SERVER_UNREACHABLE.
 */

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message?: string) {
    super(message ?? code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export interface Health {
  status: "ok";
  version: string;
  time: string;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    // Absolute URL: same origin in the browser, and resolvable in tests (Node).
    response = await fetch(new URL(`/api${path}`, window.location.origin), {
      credentials: "include",
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", 0);
  }

  if (!response.ok) {
    const isJson = response.headers.get("Content-Type")?.includes("application/json") ?? false;
    if (!isJson && response.status >= 500) {
      throw new ApiError("SERVER_UNREACHABLE", response.status);
    }
    let code = "UNKNOWN_ERROR";
    let message: string | undefined;
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message;
    } catch {
      // The body was not JSON; keep the generic code.
    }
    throw new ApiError(code, response.status, message);
  }

  return (await response.json()) as T;
}

/** POST a JSON body. */
export function postJson<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const getHealth = () => api<Health>("/health");
