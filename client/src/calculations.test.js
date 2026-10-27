import assert from "node:assert/strict";
import test from "node:test";
import { getSummary } from "./calculations.js";

test("25 liters over 500 km is 5 l/100km", () => {
  const summary = getSummary(
    [
      { id: 1, odometerKm: 10000, liters: 40, totalCost: 200 },
      { id: 2, odometerKm: 10500, liters: 25, totalCost: 150 },
    ],
    [],
  );

  assert.equal(summary.averageLitersPer100km, 5);
  assert.deepEqual(summary.perFill, [{ id: 2, litersPer100km: 5 }]);
});

test("one fill-up has no average", () => {
  const summary = getSummary([{ id: 1, odometerKm: 10000, liters: 40, totalCost: 200 }], []);

  assert.equal(summary.averageLitersPer100km, null);
  assert.deepEqual(summary.perFill, []);
});

test("an odometer that does not increase is left out of the average", () => {
  const summary = getSummary(
    [
      { id: 1, odometerKm: 10000, liters: 40, totalCost: 100 },
      { id: 2, odometerKm: 10000, liters: 20, totalCost: 80 },
    ],
    [],
  );

  assert.equal(summary.averageLitersPer100km, null);
  assert.deepEqual(summary.perFill, [{ id: 2, litersPer100km: null }]);
});

test("money totals add fuel and service", () => {
  const summary = getSummary(
    [
      { id: 1, odometerKm: 10000, liters: 40, totalCost: 200 },
      { id: 2, odometerKm: 10500, liters: 25, totalCost: 150 },
    ],
    [{ id: 1, cost: 80 }],
  );

  assert.equal(summary.fuelCost, 350);
  assert.equal(summary.serviceCost, 80);
  assert.equal(summary.totalCost, 430);
});
