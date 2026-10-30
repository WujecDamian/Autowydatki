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

test("service cost is split into repairs and inspections", () => {
  const summary = getSummary(
    [],
    [
      { id: 1, kind: "REPAIR", cost: 540 },
      { id: 2, kind: "INSPECTION", cost: 149 },
      { id: 3, kind: "REPAIR", cost: 60 },
    ],
  );

  assert.equal(summary.serviceCost, 749);
  assert.equal(summary.repairCost, 600);
  assert.equal(summary.inspectionCost, 149);
});

test("petrol and LPG consumption are measured against fills of the same fuel", () => {
  const summary = getSummary(
    [
      { id: 1, fuelType: "LPG", odometerKm: 10000, liters: 40, totalCost: 120 },
      { id: 2, fuelType: "PETROL", odometerKm: 10050, liters: 30, totalCost: 180 },
      { id: 3, fuelType: "LPG", odometerKm: 10400, liters: 40, totalCost: 120 },
      { id: 4, fuelType: "PETROL", odometerKm: 11050, liters: 10, totalCost: 60 },
    ],
    [],
  );

  // LPG: 40 l over 400 km. Petrol: 10 l over 1000 km.
  assert.equal(summary.byFuelType.LPG.averageLitersPer100km, 10);
  assert.equal(summary.byFuelType.PETROL.averageLitersPer100km, 1);
  assert.equal(summary.averageLitersPer100km, 1);
  assert.equal(summary.byFuelType.LPG.cost, 240);
  assert.equal(summary.byFuelType.PETROL.cost, 240);
  assert.equal(summary.fuelCost, 480);
  assert.deepEqual(
    [...summary.perFill].sort((a, b) => a.id - b.id),
    [
      { id: 3, litersPer100km: 10 },
      { id: 4, litersPer100km: 1 },
    ],
  );
});

test("entries without a fuel type count as petrol", () => {
  const summary = getSummary(
    [
      { id: 1, odometerKm: 10000, liters: 40, totalCost: 200 },
      { id: 2, odometerKm: 10500, liters: 25, totalCost: 150 },
    ],
    [],
  );

  assert.equal(summary.byFuelType.PETROL.averageLitersPer100km, 5);
  assert.equal(summary.byFuelType.LPG.count, 0);
  assert.equal(summary.byFuelType.LPG.averageLitersPer100km, null);
});
