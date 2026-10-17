import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("labels the control", () => {
    render(
      <FormField label="Client phone number">{(control) => <input {...control} />}</FormField>,
    );
    const input = screen.getByLabelText("Client phone number");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("announces the hint with the control", () => {
    render(
      <FormField label="Client phone number" hint="e.g. +255 754 321 987">
        {(control) => <input {...control} />}
      </FormField>,
    );
    expect(screen.getByLabelText("Client phone number")).toHaveAccessibleDescription(
      "e.g. +255 754 321 987",
    );
  });

  it("marks the control invalid and announces hint and error", () => {
    render(
      <FormField
        label="Client phone number"
        hint="e.g. +255 754 321 987"
        error="Enter a Tanzanian number starting with +255."
      >
        {(control) => <input {...control} />}
      </FormField>,
    );
    const input = screen.getByLabelText("Client phone number");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "e.g. +255 754 321 987 Enter a Tanzanian number starting with +255.",
    );
  });

  it("adds a translated optional marker", async () => {
    await i18n.changeLanguage("sw");
    render(
      <FormField label="Namba ya muamala" optional>
        {(control) => <input {...control} />}
      </FormField>,
    );
    expect(screen.getByLabelText("Namba ya muamala (si lazima)")).toBeInTheDocument();
  });
});
