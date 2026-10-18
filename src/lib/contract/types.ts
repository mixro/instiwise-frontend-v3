import type { components, paths } from "./schema";

/*
 * Types derived from the generated contract (schema.d.ts, `npm run api:generate`).
 * Never edit schema.d.ts by hand: change ../workspace/contracts/openapi.yaml and
 * regenerate. Both the API client (lib/api.ts) and the mock handlers
 * (mocks/contract.ts) are typed from these, so a contract change that the
 * screens or mocks do not follow fails the type check.
 */

export type Schemas = components["schemas"];
export type Schema<Name extends keyof Schemas> = Schemas[Name];

/** Every error code the API can return. */
export type ContractErrorCode = Schema<"ErrorCode">;
export type ErrorBody = Schema<"ErrorResponse">;

export type Method = "get" | "post" | "put" | "patch" | "delete";
export type ApiPath = keyof paths;

/** Paths that have an operation for this method. */
export type PathsFor<M extends Method> = {
  [P in ApiPath]: paths[P] extends Record<M, object> ? P : never;
}[ApiPath];

export type Operation<P extends ApiPath, M extends Method> =
  paths[P] extends Record<M, infer O> ? O : never;

type ParametersOf<O> = O extends { parameters: infer X } ? X : never;

/** Path parameters, or never when the path has none. */
export type PathParamsOf<O> = ParametersOf<O> extends { path: infer X } ? X : never;

/** Query parameters (all optional in this contract), or never. */
export type QueryOf<O> =
  ParametersOf<O> extends { query?: infer Q } ? Exclude<Q, undefined> : never;

type BodyFromContent<C> = C extends { "application/json": infer B }
  ? B
  : C extends { "multipart/form-data": unknown }
    ? FormData
    : never;

/** The request body, or never when the operation takes none. */
export type RequestBodyOf<O> = [O] extends [{ requestBody?: never }]
  ? never
  : O extends { requestBody?: { content: infer C } }
    ? BodyFromContent<C>
    : never;

export type BodyRequired<O> = O extends { requestBody: object } ? true : false;

type ResponsesOf<O> = O extends { responses: infer R } ? R : never;
type ContentOf<R> = R extends { content: infer C } ? C : never;

type SuccessStatus = 200 | 201 | 202 | 204;

type SuccessBody<R> = [ContentOf<R>] extends [never]
  ? undefined
  : ContentOf<R> extends { "application/json": infer B }
    ? B
    : ContentOf<R> extends { "application/pdf": unknown }
      ? Blob
      : undefined;

/** What a successful call resolves to. */
export type SuccessOf<O> = {
  [S in keyof ResponsesOf<O>]: S extends SuccessStatus ? SuccessBody<ResponsesOf<O>[S]> : never;
}[keyof ResponsesOf<O>];

/** Every JSON body the operation may answer with, errors included (for the mocks). */
export type JsonResponseOf<O> = {
  [S in keyof ResponsesOf<O>]: ContentOf<ResponsesOf<O>[S]> extends { "application/json": infer B }
    ? B
    : never;
}[keyof ResponsesOf<O>];

/** `/client/projects/{projectId}` → `/client/projects/:projectId` (MSW and router style). */
export function toColonPath(path: string): string {
  return path.replace(/\{(\w+)\}/g, ":$1");
}
