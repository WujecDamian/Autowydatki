import assert from "node:assert/strict";
import test from "node:test";
import { getExpiryStatus, mostUrgentExpiry, needsAttention } from "./expiry.js";

const today = "2026-10-29";

test("no date has no status", () => {
  assert.equal(getExpiryStatus(null, today), null);
});

test("more than 30 days left is ok", () => {
  assert.deepEqual(getExpiryStatus("2026-12-29", today), {
    daysLeft: 61,
    level: "ok",
    message: "Wygasa za 61 dni",
  });
});

test("30 days left is soon", () => {
  assert.equal(getExpiryStatus("2026-11-28", today).level, "soon");
});

test("8 days left is soon, 7 days left is urgent", () => {
  assert.equal(getExpiryStatus("2026-11-06", today).level, "soon");
  assert.equal(getExpiryStatus("2026-11-05", today).level, "urgent");
});

test("today and tomorrow have their own messages", () => {
  assert.equal(getExpiryStatus("2026-10-29", today).message, "Wygasa dzisiaj");
  assert.equal(getExpiryStatus("2026-10-30", today).message, "Wygasa jutro");
});

test("a past date is expired", () => {
  assert.deepEqual(getExpiryStatus("2026-10-28", today), {
    daysLeft: -1,
    level: "expired",
    message: "Wygasło 1 dzień temu",
  });
  assert.equal(getExpiryStatus("2026-10-24", today).message, "Wygasło 5 dni temu");
});

test("Polish plurals for days", () => {
  assert.equal(getExpiryStatus("2026-11-01", today).message, "Wygasa za 3 dni");
  assert.equal(getExpiryStatus("2026-11-20", today).message, "Wygasa za 22 dni");
});

test("days are counted across a DST change", () => {
  // Poland moves clocks back on 2026-10-25.
  assert.equal(getExpiryStatus("2026-10-29", "2026-10-20").daysLeft, 9);
});

test("urgent and expired need attention", () => {
  assert.equal(needsAttention(getExpiryStatus("2026-10-28", today)), true);
  assert.equal(needsAttention(getExpiryStatus("2026-11-03", today)), true);
  assert.equal(needsAttention(getExpiryStatus("2026-11-20", today)), false);
  assert.equal(needsAttention(null), false);
});

test("the most urgent expiry is the one with the fewest days left", () => {
  const car = {
    inspectionValidUntil: "2026-11-03",
    ocValidUntil: "2026-10-25",
    acValidUntil: "2027-03-01",
  };

  assert.equal(mostUrgentExpiry(car, today).label, "OC");
  assert.equal(mostUrgentExpiry({ inspectionValidUntil: "2027-01-01" }, today), null);
});
