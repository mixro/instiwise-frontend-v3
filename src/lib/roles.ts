/** The three roles (product brief section 5). Values match the backend enum. */
export const ROLES = ["CLIENT", "OPERATOR", "ADMIN"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
