import { describe, expect, it } from "vitest";
import { login } from "@/features/auth/api";
import { clientApi } from "@/features/client/api";
import { changesApi } from "@/features/changes/api";
import { DEMO_PASSWORD } from "@/mocks/demo-data";
import type { ApiPath, JsonResponseOf, Method, Operation } from "./types";

/*
 * Clients never see expenses, costs, profit or margins (decided 2026-10-25).
 * Two checks:
 * 1. The type check (npm run typecheck) fails if any response a client can get
 *    (every /client/* operation, sign-in and invitations) has such a field, at
 *    any depth, in the generated contract types.
 * 2. At run time, every client endpoint of the mock backend is called and the
 *    keys of what it answers are scanned.
 */

// ----- 1. The contract

/** Field names that must never reach a client. */
type Forbidden =
  `${string}${"expense" | "Expense" | "cost" | "Cost" | "profit" | "Profit" | "margin" | "Margin"}${string}`;

/**
 * Every named property in a type, at any depth (bounded; the contract is not
 * recursive). Index signatures (ErrorResponse.details) are skipped: their key
 * type is `string`, which would swallow every literal name and hide a leak.
 */
type NamedKeys<T> = keyof { [K in keyof T as string extends K ? never : K]: 0 } & string;

type KeysDeep<T, Depth extends unknown[] = []> = Depth["length"] extends 10
  ? never
  : T extends readonly (infer Item)[]
    ? KeysDeep<Item, [...Depth, 0]>
    : T extends object
      ? { [K in NamedKeys<T>]-?: K | KeysDeep<T[K & keyof T], [...Depth, 0]> }[NamedKeys<T>]
      : never;

/** What a client can be answered: its own area, and the public sign-in and invitation flow. */
type ClientPath = Extract<
  ApiPath,
  `/client/${string}` | `/auth/${string}` | `/invitations/${string}`
>;

type ResponsesOf<P extends ApiPath> = {
  [M in Method]: [Operation<P, M>] extends [never] ? never : JsonResponseOf<Operation<P, M>>;
}[Method];

/** Field names per path, then together (one big union would be too much for the checker). */
type ClientKeys = { [P in ClientPath]: KeysDeep<ResponsesOf<P>> }[ClientPath];

/** The client-facing fields that break the rule. Must stay empty. */
type ClientLeaks = Extract<ClientKeys, Forbidden>;

// The key list is real: it holds client fields and never collapses to `string`.
const keysAreReal: [string] extends [ClientKeys]
  ? false
  : "unreadMessages" | "balanceAfter" | "accessToken" extends ClientKeys
    ? true
    : false = true;

// If a client-facing schema gains such a field, this line stops compiling.
const noClientLeaks: [ClientLeaks] extends [never] ? true : false = true;

// The detector itself works: a nested `netProfit` is found.
type Probe = Extract<KeysDeep<{ rows: { netProfit: number }[] }>, Forbidden>;
const detectsLeaks: [Probe] extends [never] ? false : true = true;

// ----- 2. The mock backend

const FORBIDDEN_KEY = /expense|cost|profit|margin/i;

function forbiddenKeys(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) return value.flatMap((item, i) => forbiddenKeys(item, `${path}[${i}]`));
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => [
    ...(FORBIDDEN_KEY.test(key) ? [`${path}.${key}`] : []),
    ...forbiddenKeys(child, `${path}.${key}`),
  ]);
}

describe("clients never see expenses, costs, profit or margins", () => {
  it("is enforced by the contract types", () => {
    expect(noClientLeaks).toBe(true);
    expect(detectsLeaks).toBe(true);
    expect(keysAreReal).toBe(true);
  });

  it("holds for every answer the mock backend gives a client", async () => {
    const answers: Record<string, unknown> = {
      login: await login({ email: "neema@example.com", password: DEMO_PASSWORD }),
      home: await clientApi.home(),
      projects: await clientApi.projects(),
      payments: await clientApi.payments(),
      profile: await clientApi.profile(),
    };
    for (const project of await clientApi.projects()) {
      answers[`${project.id}`] = await clientApi.project(project.id);
      answers[`${project.id}/agreement`] = await clientApi.agreement(project.id);
      answers[`${project.id}/progress`] = await clientApi.progress(project.id);
      answers[`${project.id}/messages`] = await clientApi.messages(project.id);
      answers[`${project.id}/payments`] = await clientApi.projectPayments(project.id);
      answers[`${project.id}/documents`] = await clientApi.documents(project.id);
      answers[`${project.id}/changes`] = await changesApi.client.list(project.id);
    }
    const payments = await clientApi.payments();
    for (const payment of payments.payments.filter((p) => p.kind === "PAYMENT")) {
      answers[`receipt ${payment.receiptNumber}`] = await clientApi.receipt(payment.receiptNumber);
    }

    expect(Object.keys(answers).length).toBeGreaterThan(20);
    expect(forbiddenKeys(answers)).toEqual([]);
  });

  it("would catch such a field", () => {
    expect(forbiddenKeys({ projects: [{ totals: { netProfit: 1 } }] })).toEqual([
      "$.projects[0].totals.netProfit",
    ]);
  });
});
