import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/roles";
import { NAVIGATION, ROLE_HOME, findNavItem } from "./navigation";

describe("navigation", () => {
  it("starts every role's navigation at that role's home", () => {
    for (const role of ROLES) {
      expect(NAVIGATION[role][0]?.to).toBe(ROLE_HOME[role]);
      for (const item of NAVIGATION[role]) {
        expect(item.to.startsWith(ROLE_HOME[role])).toBe(true);
      }
    }
  });

  it("finds the most specific item for a path", () => {
    expect(findNavItem("OPERATOR", "/operator")?.label).toBe("nav.operator.dashboard");
    expect(findNavItem("OPERATOR", "/operator/")?.label).toBe("nav.operator.dashboard");
    expect(findNavItem("OPERATOR", "/operator/clients")?.label).toBe("nav.operator.clients");
    // Future detail pages belong to their section.
    expect(findNavItem("OPERATOR", "/operator/clients/c_42")?.label).toBe("nav.operator.clients");
    expect(findNavItem("OPERATOR", "/operator/nowhere")).toBeUndefined();
  });
});
