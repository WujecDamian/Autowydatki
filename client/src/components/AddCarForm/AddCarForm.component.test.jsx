import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../app/api.js";
import { authReducer } from "../../features/auth/authSlice.js";
import { AddCarForm } from "./AddCarForm.jsx";

const renderForm = (onAdded = vi.fn()) => {
  const store = configureStore({
    reducer: { auth: authReducer, [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
    preloadedState: { auth: { token: "test-token" } },
  });

  render(
    <Provider store={store}>
      <AddCarForm onAdded={onAdded} />
    </Provider>,
  );

  return { onAdded };
};

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("AddCarForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the car and reports the new id", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(201, { id: 7, name: "Golf" }));
    vi.stubGlobal("fetch", fetchMock);
    const { onAdded } = renderForm();

    await userEvent.type(screen.getByLabelText("Nazwa auta"), "Golf");
    await userEvent.click(screen.getByRole("button", { name: "Dodaj auto" }));

    await waitFor(() => expect(onAdded).toHaveBeenCalledWith(7));
    const request = fetchMock.mock.calls[0][0];
    expect(request.headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("shows the server's field error under the right input", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(400, {
          message: "Cena zakupu jest zbyt duża.",
          code: "VALIDATION",
          fields: { purchasePrice: "Cena zakupu jest zbyt duża." },
        }),
      ),
    );
    renderForm();

    await userEvent.type(screen.getByLabelText("Nazwa auta"), "Golf");
    await userEvent.click(screen.getByRole("button", { name: "Dodaj auto" }));

    const input = await screen.findByLabelText("Cena zakupu (zł)");
    await waitFor(() => expect(input).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getAllByText("Cena zakupu jest zbyt duża.")).toHaveLength(1);
  });

  it("explains a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    renderForm();

    await userEvent.type(screen.getByLabelText("Nazwa auta"), "Golf");
    await userEvent.click(screen.getByRole("button", { name: "Dodaj auto" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Brak połączenia z serwerem");
  });
});
