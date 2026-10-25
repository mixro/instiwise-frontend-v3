import type {
  BodyRequired,
  ContractErrorCode,
  Method,
  Operation,
  PathParamsOf,
  PathsFor,
  QueryOf,
  RequestBodyOf,
  Schema,
  SuccessOf,
} from "@/lib/contract/types";

/**
 * Typed client for the backend, generated from contracts/openapi.yaml. Paths are
 * the contract's (`/client/projects/{projectId}`) and relative to /api, which the
 * Vite dev proxy (and the production reverse proxy) forwards to the backend.
 * Parameters, bodies and results are checked against the contract at compile time.
 *
 * The backend returns { error: { code, message } } for failures. The code is
 * stable and machine-readable; the UI translates it, never shows `message`.
 * When the server cannot be reached at all the code is NETWORK_ERROR. When a proxy
 * in front of it (Vite in development, nginx in production) answers 5xx without our
 * JSON error body, the backend is down or not started: SERVER_UNREACHABLE.
 */

/** Contract codes plus the ones the client produces itself. */
export type ApiErrorCode =
  ContractErrorCode | "NETWORK_ERROR" | "SERVER_UNREACHABLE" | "UNKNOWN_ERROR";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, status: number, message?: string) {
    super(message ?? code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export type Health = Schema<"Health">;

type QueryValue = string | number | boolean | undefined | null;

type PathOption<O> = [PathParamsOf<O>] extends [never]
  ? { path?: never }
  : { path: PathParamsOf<O> };
type QueryOption<O> = [QueryOf<O>] extends [never] ? { query?: never } : { query?: QueryOf<O> };
type BodyOption<O> = [RequestBodyOf<O>] extends [never]
  ? { body?: never }
  : BodyRequired<O> extends true
    ? { body: RequestBodyOf<O> }
    : { body?: RequestBodyOf<O> };

export type RequestOptions<O> = PathOption<O> & QueryOption<O> & BodyOption<O>;

/** Options can be left out when nothing in them is required. */
type OptionsArgs<O> =
  object extends RequestOptions<O> ? [options?: RequestOptions<O>] : [options: RequestOptions<O>];

interface RawOptions {
  path?: Record<string, string | number>;
  query?: Record<string, QueryValue>;
  body?: unknown;
}

function buildUrl(path: string, options: RawOptions): URL {
  const filled = path.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = options.path?.[name];
    if (value === undefined) throw new Error(`Missing path parameter ${name} for ${path}`);
    return encodeURIComponent(String(value));
  });
  // Absolute URL: same origin in the browser, and resolvable in tests (Node).
  const url = new URL(`/api${filled}`, window.location.origin);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "")
      url.searchParams.set(key, String(value));
  }
  return url;
}

async function send(method: Method, path: string, options: RawOptions = {}): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined || method !== "get") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body ?? {});
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options), {
      method: method.toUpperCase(),
      credentials: "include",
      headers,
      body,
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", 0);
  }

  const type = response.headers.get("Content-Type") ?? "";
  if (!response.ok) {
    if (!type.includes("application/json") && response.status >= 500) {
      throw new ApiError("SERVER_UNREACHABLE", response.status);
    }
    let code: ApiErrorCode = "UNKNOWN_ERROR";
    let message: string | undefined;
    try {
      const failure = (await response.json()) as {
        error?: { code?: ApiErrorCode; message?: string };
      };
      code = failure.error?.code ?? code;
      message = failure.error?.message;
    } catch {
      // The body was not JSON; keep the generic code.
    }
    throw new ApiError(code, response.status, message);
  }

  if (response.status === 204 || response.status === 202) return undefined;
  if (type.includes("application/pdf")) return response.blob();
  return response.json();
}

function method<M extends Method>(name: M) {
  return <P extends PathsFor<M>>(
    path: P,
    ...[options]: OptionsArgs<Operation<P, M>>
  ): Promise<SuccessOf<Operation<P, M>>> =>
    send(name, path, options as RawOptions) as Promise<SuccessOf<Operation<P, M>>>;
}

/** The only way the app talks to the backend. */
export const apiClient = {
  GET: method("get"),
  POST: method("post"),
  PUT: method("put"),
  PATCH: method("patch"),
  DELETE: method("delete"),
};

export const getHealth = () => apiClient.GET("/health");
