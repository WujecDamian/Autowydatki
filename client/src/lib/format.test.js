import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { errorText, fieldError, formErrors } from "./format.js";
import { isSessionExpired } from "./session.js";

describe("errorText", () => {
  it("is empty when there is no error", () => {
    assert.equal(errorText(undefined, "fallback"), "");
  });

  it("uses the message from the API", () => {
    assert.equal(errorText({ status: 400, data: { message: "Zły przebieg" } }, "fallback"), "Zły przebieg");
  });

  it("falls back when the API sent no message, for example an HTML error page", () => {
    assert.equal(errorText({ status: 500, data: "<html>" }, "fallback"), "fallback");
  });

  it("explains a network failure", () => {
    assert.match(errorText({ status: "FETCH_ERROR", error: "x" }, "fallback"), /połączenia/);
  });

  it("keeps the rate limit message", () => {
    assert.equal(errorText({ status: 429, data: { message: "Za dużo" } }, "fallback"), "Za dużo");
  });
});

describe("fieldError", () => {
  const error = { status: 400, data: { fields: { liters: "Litry muszą być większe od 0." } } };

  it("returns the message for a field", () => {
    assert.equal(fieldError(error, "liters"), "Litry muszą być większe od 0.");
  });

  it("is empty for other fields and for errors without fields", () => {
    assert.equal(fieldError(error, "totalCost"), "");
    assert.equal(fieldError({ status: 500 }, "liters"), "");
    assert.equal(fieldError(undefined, "liters"), "");
  });
});

describe("isSessionExpired", () => {
  it("is true for a 401 when the user had a token", () => {
    assert.equal(isSessionExpired({ error: { status: 401 } }, "abc"), true);
  });

  it("is false for a 401 without a token, such as a wrong password", () => {
    assert.equal(isSessionExpired({ error: { status: 401 } }, null), false);
  });

  it("is false for other errors and for success", () => {
    assert.equal(isSessionExpired({ error: { status: 500 } }, "abc"), false);
    assert.equal(isSessionExpired({ data: {} }, "abc"), false);
  });
});

describe("formErrors", () => {
  const error = {
    status: 400,
    data: { message: "Zły litry", fields: { liters: "Zły litry" } },
  };

  it("hides the general message when the field shows its own", () => {
    const errors = formErrors(error, "fallback", ["liters", "totalCost"]);

    assert.equal(errors.message, "");
    assert.equal(errors.field("liters"), "Zły litry");
  });

  it("shows the general message when the failing field has no input", () => {
    assert.equal(formErrors(error, "fallback", ["totalCost"]).message, "Zły litry");
  });

  it("shows the general message for errors without fields", () => {
    const serverError = { status: 500, data: { message: "Coś poszło nie tak" } };

    assert.equal(formErrors(serverError, "fallback", ["liters"]).message, "Coś poszło nie tak");
  });

  it("is empty when there is no error", () => {
    const errors = formErrors(undefined, "fallback", ["liters"]);

    assert.equal(errors.message, "");
    assert.equal(errors.field("liters"), "");
  });
});
