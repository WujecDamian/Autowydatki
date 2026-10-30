import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./Field.jsx";

describe("Field", () => {
  it("shows the label and no error by default", () => {
    render(<Field id="liters" label="Litry" />);

    expect(screen.getByLabelText("Litry")).toBeInTheDocument();
    expect(screen.queryByText(/musi/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Litry")).not.toHaveAttribute("aria-invalid");
  });

  it("shows the error under the input and links it for screen readers", () => {
    render(<Field id="liters" label="Litry" error="Litry muszą być większe od 0." />);

    const input = screen.getByLabelText("Litry");
    const message = screen.getByText("Litry muszą być większe od 0.");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", message.id);
  });
});
