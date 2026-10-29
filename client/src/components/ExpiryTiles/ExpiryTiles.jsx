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
    <div className={cn("grid gap-3", fields.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {fields.map(({ field, label }) => {
        const status = getExpiryStatus(car[field], today);

        if (!status) {
          return (
            <Link
              key={field}
              to="/auto"
              className="grid content-start gap-1 rounded-2xl border border-dashed p-3 text-muted-foreground transition-colors hover:bg-accent/40"
            >
              <span className="text-xs">{label}</span>
              <span className="text-sm font-medium text-primary">Ustaw datę</span>
            </Link>
          );
        }

        return (
          <Link
            key={field}
            to="/auto"
            className={cn("grid content-start gap-1 rounded-2xl border p-3", expiryTone[status.level])}
          >
            <span className="text-xs text-foreground/80">{label}</span>
            <span className="font-heading text-xl leading-tight font-semibold">{headline(status)}</span>
            <span className="text-xs text-foreground/70">
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
