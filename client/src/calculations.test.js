import assert from "node:assert/strict";
import test from "node:test";
import {
  getCostPerKm,
  getFuelStats,
  getMonthlyCosts,
  getSummary,
  roundMoney,
  sumMoney,
} from "./calculations.js";

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

test("monthly costs cover the last months, oldest first, and ignore older entries", () => {
  const months = getMonthlyCosts(
    [
      { entryDate: "2026-10-05", totalCost: 200 },
      { entryDate: "2026-10-20", totalCost: 100 },
      { entryDate: "2025-01-01", totalCost: 999 },
    ],
    [{ entryDate: "2026-08-10", cost: 300 }],
    new Date(2026, 9, 30),
    3,
  );

  assert.deepEqual(
    months.map((month) => [month.key, month.fuel, month.service, month.total]),
    [
      ["2026-08", 0, 300, 300],
      ["2026-09", 0, 0, 0],
      ["2026-10", 300, 0, 300],
    ],
  );
});

test("cost per km spreads fuel and service over the odometer span", () => {
  const perKm = getCostPerKm(
    [
      { odometerKm: 10000, totalCost: 200 },
      { odometerKm: 10500, totalCost: 150 },
    ],
    [{ odometerKm: 10200, cost: 150 }],
  );

  assert.equal(perKm, 1);
});

test("cost per km needs a distance", () => {
  assert.equal(getCostPerKm([{ odometerKm: 10000, totalCost: 200 }], []), null);
});

test("fuel stats keep petrol and LPG prices apart and find the newest fill-up", () => {
  const stats = getFuelStats([
    { id: 1, entryDate: "2026-10-02", odometerKm: 100, liters: 40, totalCost: 240, fuelType: "PETROL" },
    { id: 2, entryDate: "2026-09-01", odometerKm: 50, liters: 50, totalCost: 300 },
    { id: 3, entryDate: "2026-10-10", odometerKm: 200, liters: 30, totalCost: 90, fuelType: "LPG" },
  ]);

  assert.equal(stats.totalLiters, 120);
  assert.deepEqual(
    stats.byFuelType.PETROL.series.map((point) => [point.date, point.price]),
    [
      ["2026-09-01", 6],
      ["2026-10-02", 6],
    ],
  );
  assert.equal(stats.byFuelType.PETROL.averagePrice, 6);
  assert.equal(stats.byFuelType.LPG.latestPrice, 3);
  assert.equal(stats.last.id, 3);
});

test("fuel cost per 100 km is consumption times the average price per litre", () => {
  const summary = getSummary(
    [
      { id: 1, odometerKm: 1000, liters: 40, totalCost: 240, fuelType: "PETROL" },
      { id: 2, odometerKm: 1500, liters: 25, totalCost: 150, fuelType: "PETROL" },
      { id: 3, odometerKm: 1000, liters: 40, totalCost: 120, fuelType: "LPG" },
    ],
    [],
  );

  // 25 l over 500 km is 5 l/100km, and 390 zł for 65 l is 6 zł/l.
  assert.equal(summary.byFuelType.PETROL.costPer100km, 30);
  assert.equal(summary.byFuelType.LPG.costPer100km, null);
});

test("adds money without floating point noise", () => {
  assert.equal(sumMoney([{ cost: 0.1 }, { cost: 0.2 }], (item) => item.cost), 0.3);
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
});

test("totals fuel and service costs exactly", () => {
  const fuel = [
    { entryDate: "2026-01-01", odometerKm: 1, liters: 10, totalCost: 0.1 },
    { entryDate: "2026-01-02", odometerKm: 2, liters: 10, totalCost: 0.2 },
  ];
  const summary = getSummary(fuel, [{ kind: "REPAIR", cost: 0.7 }]);

  assert.equal(summary.fuelCost, 0.3);
  assert.equal(summary.totalCost, 1);
});
