import { useState } from "react";
import { formatDate, money } from "../../lib/format.js";

const lines = [
  { fuelType: "PETROL", label: "Benzyna", color: "var(--chart-3)" },
  { fuelType: "LPG", label: "LPG", color: "var(--chart-1)" },
];

const toTime = (date) => Date.parse(`${date}T00:00:00`);

// Price per litre over time for one fuel at a time (petrol and LPG prices differ too much to share
// a scale); only fuels with 2+ fill-ups can be shown.
export const PriceTrend = ({ byFuelType }) => {
  const [chosen, setChosen] = useState(null);
  const options = lines.filter((line) => byFuelType[line.fuelType].series.length >= 2);

  if (options.length === 0) {
    return null;
  }

  const active = options.find((line) => line.fuelType === chosen) ?? options[0];
  const drawn = [active];

  const points = drawn.flatMap((line) => byFuelType[line.fuelType].series);
  const times = points.map((point) => toTime(point.date));
  const prices = points.map((point) => point.price);
  const firstTime = Math.min(...times);
  const lastTime = Math.max(...times);
  const span = lastTime - firstTime;

  if (span <= 0) {
    return null;
  }

  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const pad = Math.max((high - low) * 0.15, 0.1);
  const floor = low - pad;
  const ceiling = high + pad;
  const x = (point) => ((toTime(point.date) - firstTime) / span) * 100;
  const y = (point) => 100 - ((point.price - floor) / (ceiling - floor)) * 100;

  return (
    <div data-glow="" className="reveal grid gap-4 rounded-3xl border bg-card p-5 sm:p-6" style={{ "--i": 2 }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-heading text-base font-semibold">Cena za litr</h2>
        <div className="flex gap-1 rounded-full bg-muted p-1 text-xs" role="group" aria-label="Rodzaj paliwa">
          {options.map((line) => (
            <button
              key={line.fuelType}
              type="button"
              aria-pressed={line === active}
              onClick={() => setChosen(line.fuelType)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground tabular-nums transition-colors hover:text-foreground aria-pressed:bg-primary-fill aria-pressed:text-primary-foreground"
            >
              {line.label} {money.format(byFuelType[line.fuelType].latestPrice)}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-36">
        <svg
          key={active.fuelType}
          role="img"
          aria-label={`Cena za litr od ${formatDate(new Date(firstTime).toLocaleDateString("sv-SE"))} do ${formatDate(new Date(lastTime).toLocaleDateString("sv-SE"))}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="trend-wipe size-full overflow-visible"
        >
          <defs>
            {drawn.map((line) => (
              <linearGradient key={line.fuelType} id={`trend-${line.fuelType}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={line.color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={line.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {[0, 50, 100].map((row) => (
            <line
              key={row}
              x1="0"
              x2="100"
              y1={row}
              y2={row}
              stroke="currentColor"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className="text-foreground/8"
            />
          ))}
          {drawn.map((line) => {
            const series = byFuelType[line.fuelType].series;
            const path = series.map((point, index) => `${index === 0 ? "M" : "L"}${x(point)} ${y(point)}`).join(" ");
            const first = series[0];
            const last = series[series.length - 1];

            return (
              <g key={line.fuelType}>
                <path
                  d={`${path} L${x(last)} 100 L${x(first)} 100 Z`}
                  fill={`url(#trend-${line.fuelType})`}
                />
                <path
                  d={path}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>
        {drawn.map((line) => {
          const series = byFuelType[line.fuelType].series;

          return series.map((point, index) => {
            const isLast = index === series.length - 1;
            const left = x(point);
            // Near the edges the tooltip anchors to the dot's side so it stays inside the card.
            const anchor = left < 12 ? "left-0" : left > 88 ? "right-0" : "left-1/2 -translate-x-1/2";

            return (
              <span
                key={`${line.fuelType}-${point.date}-${index}`}
                tabIndex={0}
                aria-label={`${formatDate(point.date)}: ${money.format(point.price)} za litr`}
                className="group/dot absolute z-10 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none"
                style={{ left: `${left}%`, top: `${y(point)}%` }}
              >
                <span
                  className={`rounded-full border-2 border-card transition-transform group-hover/dot:scale-150 group-focus-visible/dot:scale-150 ${isLast ? "size-3" : "size-2.5"}`}
                  style={{ background: line.color }}
                />
                <span
                  className={`pointer-events-none absolute bottom-full mb-1 w-max rounded-lg border bg-popover px-2.5 py-1.5 text-center text-xs opacity-0 shadow-lg transition-opacity group-hover/dot:opacity-100 group-focus-visible/dot:opacity-100 ${anchor}`}
                >
                  <span className="block font-semibold tabular-nums">{money.format(point.price)} / l</span>
                  <span className="block text-muted-foreground tabular-nums">{formatDate(point.date)}</span>
                </span>
              </span>
            );
          });
        })}
        <span className="absolute top-0 left-0 -translate-y-1/2 rounded bg-card/80 px-1 text-[11px] text-muted-foreground tabular-nums">
          {money.format(ceiling)}
        </span>
        <span className="absolute bottom-0 left-0 translate-y-1/2 rounded bg-card/80 px-1 text-[11px] text-muted-foreground tabular-nums">
          {money.format(floor)}
        </span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{formatDate(new Date(firstTime).toLocaleDateString("sv-SE"))}</span>
        <span>{formatDate(new Date(lastTime).toLocaleDateString("sv-SE"))}</span>
      </div>
    </div>
  );
};
