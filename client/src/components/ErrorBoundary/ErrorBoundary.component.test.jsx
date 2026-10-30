import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary.jsx";

const Broken = () => {
  throw new Error("boom");
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React logs the caught error; keep the test output clean.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("renders its children when nothing fails", () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("shows a message instead of a blank page when a child throws", () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Coś poszło nie tak");
    expect(screen.getByRole("button", { name: "Odśwież stronę" })).toBeInTheDocument();
  });
});
