import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { expiryFields, expiryTone, getExpiryStatus } from "../../lib/expiry.js";
import { formatDate, plural, todayString } from "../../lib/format.js";

const headline = (status) => {
  if (status.daysLeft < 0) {
    return "Wygasło";
  }

  if (status.daysLeft === 0) {
    return "Dzisiaj";
  }

  if (status.daysLeft === 1) {
    return "Jutro";
  }

  return `${status.daysLeft} ${plural(status.daysLeft, "dzień", "dni", "dni")}`;
};

export const ExpiryTiles = ({ car }) => {
  const today = todayString();
  // AC is optional insurance, so its tile only appears once a date is set.
  const fields = expiryFields.filter(({ field }) => field !== "acValidUntil" || car[field]);

  return (
    <div className={cn("grid gap-3 sm:gap-4", fields.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {fields.map(({ field, label }) => {
        const status = getExpiryStatus(car[field], today);

        if (!status) {
          return (
            <Link
              key={field}
              to="/auto"
              state={{ highlight: field }}
              className="grid min-h-32 content-start gap-2 rounded-2xl border border-dashed p-4 text-muted-foreground sm:p-5 transition-colors hover:bg-accent/40"
            >
              <span className="text-sm">{label}</span>
              <span className="font-medium text-primary">Ustaw datę</span>
            </Link>
          );
        }

        return (
          <Link
            key={field}
            to="/auto"
            state={{ highlight: field }}
            className={cn("grid min-h-32 content-start gap-2 rounded-2xl border p-4 sm:p-5", expiryTone[status.level])}
          >
            <span className="text-sm text-foreground/80">{label}</span>
            <span className="font-heading text-2xl leading-tight sm:text-3xl font-semibold">{headline(status)}</span>
            <span className="text-sm text-foreground/70">
              {status.daysLeft < 0
                ? `${-status.daysLeft} ${plural(-status.daysLeft, "dzień", "dni", "dni")} temu`
                : `do ${formatDate(car[field])}`}
            </span>
          </Link>
        );
      })}
    </div>
  );
};
