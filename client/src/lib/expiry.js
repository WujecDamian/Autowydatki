import { plural } from "./format.js";

const dayMs = 24 * 60 * 60 * 1000;

const toUtcDay = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

const days = (count) => `${count} ${plural(count, "dzień", "dni", "dni")}`;

// Thresholds: more than 30 days is fine, 8–30 is soon, 0–7 is urgent, past the date is expired.
export const getExpiryStatus = (dateString, todayString) => {
  if (!dateString) {
    return null;
  }

  const daysLeft = Math.round((toUtcDay(dateString) - toUtcDay(todayString)) / dayMs);

  if (daysLeft < 0) {
    return { daysLeft, level: "expired", message: `Wygasło ${days(-daysLeft)} temu` };
  }

  let message = `Wygasa za ${days(daysLeft)}`;

  if (daysLeft === 0) {
    message = "Wygasa dzisiaj";
  } else if (daysLeft === 1) {
    message = "Wygasa jutro";
  }

  let level = "ok";

  if (daysLeft <= 7) {
    level = "urgent";
  } else if (daysLeft <= 30) {
    level = "soon";
  }

  return { daysLeft, level, message };
};

export const needsAttention = (status) =>
  status?.level === "urgent" || status?.level === "expired";

export const expiryFields = [
  { field: "inspectionValidUntil", label: "Badanie techniczne" },
  { field: "ocValidUntil", label: "OC" },
  { field: "acValidUntil", label: "AC" },
];

export const carNeedsAttention = (car, todayString) =>
  expiryFields.some(({ field }) => needsAttention(getExpiryStatus(car[field], todayString)));

// Tailwind classes per level, shared by the dashboard tiles and the car form.
export const expiryTone = {
  ok: "border-success/30 bg-success/10 text-success",
  soon: "border-warning/40 bg-warning/10 text-warning",
  urgent: "border-destructive/50 bg-destructive/15 text-destructive",
  expired: "border-destructive/50 bg-destructive/15 text-destructive",
};
