import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { expiryFields, expiryTone, getExpiryStatus, needsAttention } from "../../lib/expiry.js";
import { formatDate, plural, todayString } from "../../lib/format.js";

const pillText = (status) => {
  if (status.daysLeft < 0) {
    return `${-status.daysLeft} ${plural(-status.daysLeft, "dzień", "dni", "dni")} temu`;
  }

  if (status.daysLeft === 0) {
    return "dzisiaj";
  }

  if (status.daysLeft === 1) {
    return "jutro";
  }

  return `za ${status.daysLeft} ${plural(status.daysLeft, "dzień", "dni", "dni")}`;
};

// "AC wygasło 3 dni temu": the status message starts a sentence, so it loses its capital here.
const bannerTitle = (label, message) => `${label} ${message.charAt(0).toLowerCase()}${message.slice(1)}`;

// The deadline that needs action first, then every date as a row. Rows and the banner open
// the Auto tab with that date highlighted.
export const ExpiryTiles = ({ car }) => {
  const today = todayString();
  // AC is optional insurance, so its row only appears once a date is set.
  const fields = expiryFields.filter(({ field }) => field !== "acValidUntil" || car[field]);
  const rows = fields.map(({ field, label }) => ({ field, label, status: getExpiryStatus(car[field], today) }));
  const urgent = rows
    .filter(({ status }) => needsAttention(status))
    .sort((a, b) => a.status.daysLeft - b.status.daysLeft)[0];

  return (
    <div className="grid gap-4">
      {urgent ? (
        <section
          data-glow=""
          className="flex flex-col gap-3 rounded-2xl border border-destructive/50 bg-destructive/15 p-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-5"
        >
          <div className="grid flex-1 gap-1">
            <p className="font-heading text-lg font-semibold text-destructive-soft">
              {bannerTitle(urgent.label, urgent.status.message)}
            </p>
            <p className="text-foreground/80">
              Po odnowieniu wpisz nową datę, żeby przypomnienie wróciło.
            </p>
          </div>
          <Link
            to="/auto"
            state={{ highlight: urgent.field }}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-primary-fill px-6 font-medium text-primary-foreground transition-colors hover:bg-primary-fill-hover"
          >
            Ustaw nową datę
          </Link>
        </section>
      ) : null}
      <section aria-labelledby="expiry-title" data-glow="" className="grid gap-2 rounded-2xl border bg-card p-1 pt-4">
        <h2 id="expiry-title" className="px-5 font-heading font-semibold">
          Terminy
        </h2>
        <ul className="grid">
          {rows.map(({ field, label, status }, index) => (
            <li key={field} className={cn(index > 0 && "border-t border-border/70")}>
              <Link
                to="/auto"
                state={{ highlight: field }}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 transition-colors hover:bg-accent/40"
              >
                <span className="grid min-w-0 flex-1">
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {status ? `do ${formatDate(car[field])}` : "Brak daty"}
                  </span>
                </span>
                {status ? (
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums",
                      expiryTone[status.level],
                    )}
                  >
                    {pillText(status)}
                  </span>
                ) : (
                  <span className="font-medium text-primary">Ustaw datę</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
