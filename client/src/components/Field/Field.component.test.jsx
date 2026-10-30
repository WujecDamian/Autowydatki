import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./Field.jsx";

describe("Field", () => {
  it("shows the label and no error by default", () => {
    render(<Field id="quantity" label="Ilość" />);

    expect(screen.getByLabelText("Ilość")).toBeInTheDocument();
    expect(screen.queryByText(/musi/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ilość")).not.toHaveAttribute("aria-invalid");
  });

  it("shows the error under the input and links it for screen readers", () => {
    render(<Field id="quantity" label="Ilość" error="Ilość musi być większa od 0." />);

    const input = screen.getByLabelText("Ilość");
    const message = screen.getByText("Ilość musi być większa od 0.");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", message.id);
  });
});
