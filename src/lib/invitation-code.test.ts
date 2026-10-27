import { describe, expect, it } from "vitest";
import { parseInvitationInput, parseResetCodeInput } from "./invitation-code";

describe("parseInvitationInput", () => {
  it.each([
    ["KX7P-M4Q2", "KX7P-M4Q2"],
    ["kx7p-m4q2", "KX7P-M4Q2"],
    ["  KX7P M4Q2 ", "KX7P-M4Q2"],
    ["kx7pm4q2", "KX7P-M4Q2"],
    ["https://app.instiwise.co.tz/invite/KX7P-M4Q2", "KX7P-M4Q2"],
    ["http://localhost:5173/invite/kx7p-m4q2?utm=whatsapp", "KX7P-M4Q2"],
    ["Join here: https://app.instiwise.co.tz/invite/KX7P-M4Q2 thanks", "KX7P-M4Q2"],
  ])("reads %j as %s", (input, expected) => {
    expect(parseInvitationInput(input)).toBe(expected);
  });

  it.each(["", "KX7P", "KX7P-M4Q2-X", "KX7P_M4Q!", "https://app.instiwise.co.tz/login"])(
    "rejects %j",
    (input) => {
      expect(parseInvitationInput(input)).toBeNull();
    },
  );
});

describe("parseResetCodeInput", () => {
  it.each([
    ["R7KM-2QXP", "R7KM-2QXP"],
    ["r7km 2qxp", "R7KM-2QXP"],
    ["https://app.instiwise.co.tz/reset/R7KM-2QXP", "R7KM-2QXP"],
    ["Your reset link: http://localhost:5173/reset/r7km-2qxp?x=1 thanks", "R7KM-2QXP"],
  ])("reads %j as %s", (input, expected) => {
    expect(parseResetCodeInput(input)).toBe(expected);
  });

  it.each(["", "R7KM", "R7KM-2QXP-1", "https://app.instiwise.co.tz/invite/KX7P"])(
    "rejects %j",
    (input) => {
      expect(parseResetCodeInput(input)).toBeNull();
    },
  );
});
