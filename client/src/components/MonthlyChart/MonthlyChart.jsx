import { money } from "../../lib/format.js";

const monthLabel = (monthIndex) =>
  new Date(2000, monthIndex, 1).toLocaleDateString("pl-PL", { month: "short" }).replace(".", "");

// Stacked bars of fuel and service spending per month; heights are relative to the biggest month.
export const MonthlyChart = ({ months }) => {
  const max = Math.max(...months.map((month) => month.total), 0);
  const sum = months.reduce((total, month) => total + month.total, 0);

  return (
    <div data-glow="" className="grid gap-4 rounded-3xl border bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-base font-semibold">Wydatki miesięczne</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {money.format(sum / months.length)} / mies.
        </p>
      </div>
      {max > 0 ? (
        <>
          <div
            role="img"
            aria-label={months.map((month) => `${monthLabel(month.monthIndex)} ${money.format(month.total)}`).join(", ")}
            className="flex h-40 items-end gap-2 sm:gap-3"
          >
            {months.map((month, index) => (
              <div
                key={month.key}
                title={`${monthLabel(month.monthIndex)}: ${money.format(month.total)}`}
                className="group/bar flex h-full flex-1 flex-col justify-end"
              >
                <p className="mb-1 text-center text-[11px] text-muted-foreground tabular-nums opacity-0 transition-opacity group-hover/bar:opacity-100">
                  {Math.round(month.total)}
                </p>
                <div
                  className="bar-grow flex flex-col justify-end gap-[2px]"
                  style={{ height: month.total === 0 ? "4px" : `${(month.total / max) * 85}%`, "--i": index }}
                >
                  {month.service > 0 ? (
                    <span
                      className="min-h-1 rounded-t-lg bg-chart-1"
                      style={{ flexGrow: month.service }}
                    />
                  ) : null}
                  {month.fuel > 0 ? (
                    <span
                      className={`min-h-1 bg-chart-3 ${month.service > 0 ? "rounded-b-md" : "rounded-lg"}`}
                      style={{ flexGrow: month.fuel }}
                    />
                  ) : null}
                  {month.total === 0 ? <span className="h-1 rounded-full bg-foreground/10" /> : null}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 sm:gap-3">
            {months.map((month) => (
              <p key={month.key} className="flex-1 text-center text-xs text-muted-foreground capitalize">
                {monthLabel(month.monthIndex)}
              </p>
            ))}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-chart-3" />
              Paliwo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-chart-1" />
              Serwis
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Brak wydatków w ostatnich 6 miesiącach. Dodaj tankowanie lub serwis, a wykres się pojawi.
        </p>
      )}
    </div>
  );
};
