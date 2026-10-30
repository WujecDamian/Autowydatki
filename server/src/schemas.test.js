import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HttpError } from "./errors.js";
import {
  carCreateSchema,
  carUpdateSchema,
  fuelSchema,
  noteCreateSchema,
  noteUpdateSchema,
  parseId,
  serviceSchema,
  stationSchema,
} from "./schemas.js";

const validFuel = { entryDate: "2026-01-02", odometerKm: 1000, quantity: 40, totalCost: 250 };

const firstMessage = (result) => result.error.issues[0].message;

describe("fuelSchema", () => {
  it("accepts a valid entry and leaves the fuel type to the car", () => {
    const result = fuelSchema.safeParse(validFuel);

    assert.equal(result.success, true);
    assert.equal(result.data.fuelType, undefined);
    assert.equal(result.data.stationId, undefined);
  });

  it("accepts numeric strings, including a decimal comma", () => {
    const result = fuelSchema.safeParse({ ...validFuel, quantity: "40,5", odometerKm: "1000" });

    assert.equal(result.data.quantity, 40.5);
    assert.equal(result.data.odometerKm, 1000);
  });

  it("turns a blank station into null", () => {
    assert.equal(fuelSchema.parse({ ...validFuel, stationId: "" }).stationId, null);
  });

  for (const [name, patch] of [
    ["exponent notation", { odometerKm: "1e3" }],
    ["hex", { odometerKm: "0x10" }],
    ["a fractional odometer", { odometerKm: 10.5 }],
    ["a negative odometer", { odometerKm: -1 }],
    ["an odometer over the limit", { odometerKm: 99999999999 }],
    ["zero quantity", { quantity: 0 }],
    ["quantity over the limit", { quantity: 5000 }],
    ["a negative cost", { totalCost: -1 }],
    ["a cost over the limit", { totalCost: 1e9 }],
    ["Infinity", { quantity: Infinity }],
    ["a missing cost", { totalCost: undefined }],
    ["an unknown fuel type", { fuelType: "DIESEL" }],
    ["an impossible date", { entryDate: "2026-02-30" }],
    ["a date in the far future", { entryDate: "2999-01-01" }],
    ["a date before 1950", { entryDate: "1900-01-01" }],
    ["a non-numeric station id", { stationId: "abc" }],
  ]) {
    it(`rejects ${name}`, () => {
      assert.equal(fuelSchema.safeParse({ ...validFuel, ...patch }).success, false);
    });
  }

  it("reports the failing field", () => {
    const result = fuelSchema.safeParse({ ...validFuel, quantity: 0 });

    assert.deepEqual(result.error.issues[0].path, ["quantity"]);
    assert.equal(firstMessage(result), "Ilość musi być większa od 0.");
  });
});

describe("carCreateSchema and carUpdateSchema", () => {
  it("trims the name and treats a blank price as none", () => {
    assert.deepEqual(carCreateSchema.parse({ name: "  Golf  ", purchasePrice: "" }), {
      name: "Golf",
      powertrain: "PETROL",
      purchasePrice: null,
    });
  });

  it("rejects an empty or too long name", () => {
    assert.equal(carCreateSchema.safeParse({ name: "   " }).success, false);
    assert.equal(carCreateSchema.safeParse({ name: "x".repeat(61) }).success, false);
  });

  it("rejects a negative or absurd price", () => {
    assert.equal(carCreateSchema.safeParse({ name: "A", purchasePrice: -1 }).success, false);
    assert.equal(carCreateSchema.safeParse({ name: "A", purchasePrice: 1e12 }).success, false);
  });

  it("only returns the fields that were sent", () => {
    assert.deepEqual(carUpdateSchema.parse({ hasLpg: true }), { hasLpg: true });
  });

  it("clears a date with null or a blank string", () => {
    assert.deepEqual(carUpdateSchema.parse({ ocValidUntil: "", acValidUntil: null }), {
      ocValidUntil: null,
      acValidUntil: null,
    });
  });

  it("rejects a non-boolean LPG flag and an impossible date", () => {
    assert.equal(carUpdateSchema.safeParse({ hasLpg: "yes" }).success, false);
    assert.equal(carUpdateSchema.safeParse({ ocValidUntil: "2026-02-30" }).success, false);
  });

  it("allows a future validity date", () => {
    assert.equal(carUpdateSchema.safeParse({ ocValidUntil: "2040-01-01" }).success, true);
  });
});

describe("serviceSchema", () => {
  const item = { category: "Inne", name: "Olej", cost: 100 };
  const base = { kind: "REPAIR", entryDate: "2026-01-02", odometerKm: 5000, items: [item] };

  it("accepts a valid entry", () => {
    const result = serviceSchema.safeParse(base);

    assert.equal(result.success, true, result.error?.message);
    assert.equal(result.data.title, null);
  });

  it("requires at least one item and caps the number of items", () => {
    assert.equal(serviceSchema.safeParse({ ...base, items: [] }).success, false);
    assert.equal(serviceSchema.safeParse({ ...base, items: Array(51).fill(item) }).success, false);
  });

  it("rejects a negative cost and a blank item name", () => {
    assert.equal(serviceSchema.safeParse({ ...base, items: [{ ...item, cost: -1 }] }).success, false);
    assert.equal(serviceSchema.safeParse({ ...base, items: [{ ...item, name: " " }] }).success, false);
  });

  it("requires the next inspection to be after the inspection date", () => {
    const inspection = { ...base, kind: "INSPECTION" };

    assert.equal(serviceSchema.safeParse({ ...inspection, nextInspectionDate: "2027-01-02" }).success, true);
    assert.equal(serviceSchema.safeParse({ ...inspection, nextInspectionDate: "2026-01-02" }).success, false);
  });

  it("ignores the next inspection date on a repair", () => {
    const result = serviceSchema.parse({ ...base, nextInspectionDate: "2027-01-02" });

    assert.equal(result.nextInspectionDate, null);
  });
});

describe("notes and stations", () => {
  it("trims the note and defaults pinned to false", () => {
    assert.deepEqual(noteCreateSchema.parse({ body: "  hi  " }), { body: "hi", pinned: false });
  });

  it("rejects an empty or oversized note", () => {
    assert.equal(noteCreateSchema.safeParse({ body: "  " }).success, false);
    assert.equal(noteCreateSchema.safeParse({ body: "x".repeat(5001) }).success, false);
  });

  it("accepts a pin-only update", () => {
    assert.deepEqual(noteUpdateSchema.parse({ pinned: true }), { pinned: true });
    assert.equal(noteUpdateSchema.safeParse({ pinned: "true" }).success, false);
  });

  it("validates the station name", () => {
    assert.equal(stationSchema.parse({ name: " Orlen " }).name, "Orlen");
    assert.equal(stationSchema.safeParse({ name: "" }).success, false);
    assert.equal(stationSchema.safeParse({ name: "x".repeat(41) }).success, false);
  });
});

describe("parseId", () => {
  it("accepts positive integers", () => {
    assert.equal(parseId("12"), 12);
    assert.equal(parseId(7), 7);
  });

  for (const bad of ["abc", "0", "-1", "1.5", "1e3", "99999999999", "", undefined, null]) {
    it(`throws a 400 for ${JSON.stringify(bad)}`, () => {
      assert.throws(
        () => parseId(bad),
        (error) => error instanceof HttpError && error.status === 400,
      );
    });
  }
});
