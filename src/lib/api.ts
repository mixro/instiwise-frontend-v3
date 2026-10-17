/**
 * Thin fetch wrapper for the backend. All paths are relative to /api, which the
 * Vite dev proxy (and the production reverse proxy) forwards to the backend.
 *
 * The backend returns { error: { code, message } } for failures. The code is
 * stable and machine-readable; the UI translates it, never shows `message`.
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
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });

  if (!response.ok) {
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

export const getHealth = () => api<Health>("/health");
