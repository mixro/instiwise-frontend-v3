import type { Schema } from "@/lib/contract/types";

/** The three roles (product brief section 5), as the contract defines them. */
export type Role = Schema<"Role">;

const ROLE_SET: Record<Role, true> = { CLIENT: true, OPERATOR: true, ADMIN: true };

export const ROLES = Object.keys(ROLE_SET) as Role[];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && value in ROLE_SET;
}
