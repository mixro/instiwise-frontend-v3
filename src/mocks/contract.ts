import { http, HttpResponse, type DefaultBodyType, type HttpResponseResolver } from "msw";
import {
  toColonPath,
  type ContractErrorCode,
  type ErrorBody,
  type JsonResponseOf,
  type Method,
  type Operation,
  type PathParamsOf,
  type PathsFor,
  type RequestBodyOf,
} from "@/lib/contract/types";

/*
 * MSW handlers typed against contracts/openapi.yaml. A handler is declared with
 * the contract's path (`/client/projects/{projectId}`); its params are the
 * contract's path parameters, `request.json()` is the contract's request body,
 * and it may only answer with a body the contract lists for that operation
 * (success or ErrorResponse). Change the contract and regenerate, and every mock
 * that no longer matches fails the type check.
 */

/** MSW hands every path parameter over as a string. */
type MockParams<O> = [PathParamsOf<O>] extends [never]
  ? Record<string, never>
  : { [K in keyof PathParamsOf<O>]: string };

type MockBody<O> = [RequestBodyOf<O>] extends [never] ? undefined : RequestBodyOf<O>;

type MockResponse<O> = JsonResponseOf<O> extends DefaultBodyType ? JsonResponseOf<O> : never;

type MockResolver<O> = HttpResponseResolver<MockParams<O>, MockBody<O>, MockResponse<O>>;

function route<M extends Method>(method: M) {
  return <P extends PathsFor<M>>(path: P, resolver: MockResolver<Operation<P, M>>) =>
    http[method](`/api${toColonPath(path)}`, resolver as unknown as HttpResponseResolver);
}

export const on = {
  get: route("get"),
  post: route("post"),
  put: route("put"),
  patch: route("patch"),
  delete: route("delete"),
};

/** An error answer in the contract's ErrorResponse shape, with a contract error code. */
export function fail(status: number, code: ContractErrorCode) {
  return HttpResponse.json<ErrorBody>({ error: { code, message: code } }, { status });
}
