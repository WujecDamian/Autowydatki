import { useOutletContext } from "react-router";
import { getCostPerKm, getMonthlyCosts, getSummary } from "../../calculations.js";
import { useGetFuelQuery, useGetServicesQuery } from "../../app/api.js";
import { consumption, money } from "../../lib/format.js";
import { useCountUp } from "../../lib/useCountUp.js";
import { ExpiryTiles } from "../ExpiryTiles/ExpiryTiles.jsx";
import { MonthlyChart } from "../MonthlyChart/MonthlyChart.jsx";
import { StatTile } from "../StatTile/StatTile.jsx";
import { PageHeader } from "../PageHeader/PageHeader.jsx";

const formatAverage = (value) => (value === null ? "—" : consumption.format(value));

// One wide card with petrol and LPG fuel cost per 100 km side by side, split by a line.
const FuelCostBlock = ({ lpg, petrol }) => (
  <div
    data-glow=""
    style={{ "--i": 4 }}
    className="reveal grid gap-3 rounded-2xl border bg-card px-5 py-4 sm:col-span-2"
  >
    <p className="text-xs text-muted-foreground">Koszt paliwa na 100 km</p>
    <div className="grid grid-cols-2 divide-x">
      {[
        { label: "LPG", value: lpg },
        { label: "Benzyna", value: petrol },
      ].map((item, index) => (
        <div key={item.label} className={`grid gap-1 ${index === 0 ? "pr-5" : "pl-5"}`}>
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="font-heading text-xl font-semibold tracking-tight tabular-nums">
            {item.value === null ? (
              "—"
            ) : (
              <>
                {money.format(item.value)}{" "}
                <span className="text-xs font-normal text-muted-foreground">/ 100 km</span>
              </>
            )}
          </p>
        </div>
      ))}
    </div>
  </div>
);

const percent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

// One row of the cost split: a colour dot, the label, the amount and an optional breakdown.
const SplitRow = ({ color, label, amount, share, hint }) => (
  <div className="grid gap-0.5">
    <div className="flex items-center gap-2">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      <span className="flex-1 text-muted-foreground">
        {label} <span className="text-xs tabular-nums">{share}%</span>
      </span>
      <span className="font-medium tabular-nums">{money.format(amount)}</span>
    </div>
    {hint ? <p className="pl-[18px] text-xs text-muted-foreground tabular-nums">{hint}</p> : null}
  </div>
);

// The big total: counts up on load, with the split as a bar and a legend.
const CostHero = ({ car, total, parts }) => {
  const shown = useCountUp(total);

  return (
    <div
      data-glow=""
      style={{ "--i": 0 }}
      className="reveal group relative order-first grid gap-6 lg:order-none overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/25 to-card to-60% p-5 sm:p-6 lg:sticky lg:top-24"
    >
      {car.coverUrl ? (
        <>
          <img
            src={car.coverUrl}
            alt=""
            className="absolute inset-0 size-full scale-125 object-cover opacity-45 blur-3xl saturate-150 transition-transform duration-700 ease-out group-hover:scale-150"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background/30 via-transparent to-background/60" />
        </>
      ) : null}
      <div className="relative grid gap-1">
        <p className="text-foreground/80">Łączny koszt auta</p>
        <p className="font-heading text-4xl font-semibold tracking-tight tabular-nums lg:text-[40px] lg:leading-[44px]">
          {money.format(shown)}
        </p>
      </div>
      {total > 0 ? (
        <div
          role="img"
          aria-label={parts.map((part) => `${part.label} ${percent(part.amount, total)}%`).join(", ")}
          className="trend-wipe relative flex h-3 gap-[3px]"
        >
          {parts
            .filter((part) => part.amount > 0)
            .map((part) => (
              <span
                key={part.key}
                className="rounded-full"
                style={{ flexGrow: part.amount, background: part.color }}
              />
            ))}
        </div>
      ) : null}
      <div className="relative grid gap-2.5">
        {parts.map(({ key, ...rest }) => (
          <SplitRow key={key} share={percent(rest.amount, total)} {...rest} />
        ))}
      </div>
    </div>
  );
};

export const Summary = () => {
  const { car } = useOutletContext();
  const fuelQuery = useGetFuelQuery(car.id);
  const serviceQuery = useGetServicesQuery(car.id);

  if (fuelQuery.isLoading || serviceQuery.isLoading) {
    return <p className="text-muted-foreground">Wczytywanie podsumowania...</p>;
  }

  if (fuelQuery.isError || serviceQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Nie udało się wczytać podsumowania.
      </p>
    );
  }

  const summary = getSummary(fuelQuery.data, serviceQuery.data);
  const purchase = car.purchasePrice ?? 0;
  const total = summary.totalCost + purchase;
  // The split appears for LPG cars, and for cars that once had LPG fill-ups.
  const showLpg = car.hasLpg || summary.byFuelType.LPG.count > 0;
  const parts = [
    { key: "purchase", label: "Zakup", amount: purchase, color: "var(--chart-5)" },
    {
      key: "fuel",
      label: "Paliwo",
      amount: summary.fuelCost,
      color: "var(--chart-3)",
      hint: showLpg
        ? `Benzyna ${money.format(summary.byFuelType.PETROL.cost)} · LPG ${money.format(summary.byFuelType.LPG.cost)}`
        : null,
    },
    {
      key: "service",
      label: "Serwis",
      amount: summary.serviceCost,
      color: "var(--chart-1)",
      hint:
        summary.inspectionCost > 0
          ? `Naprawy ${money.format(summary.repairCost)} · badania ${money.format(summary.inspectionCost)}`
          : null,
    },
  ];

  const perKm = getCostPerKm(fuelQuery.data, serviceQuery.data);
  const months = getMonthlyCosts(fuelQuery.data, serviceQuery.data);
  const unit = <span className="text-xs font-normal text-muted-foreground">l/100 km</span>;
  const tiles = showLpg
    ? [
        {
          label: "Spalanie LPG",
          value: <>{formatAverage(summary.byFuelType.LPG.averageLitersPer100km)} {unit}</>,
        },
        {
          label: "Spalanie benzyna",
          value: <>{formatAverage(summary.byFuelType.PETROL.averageLitersPer100km)} {unit}</>,
        },
      ]
    : [
        {
          label: "Średnie spalanie",
          value:
            summary.averageLitersPer100km === null ? (
              "—"
            ) : (
              <>{consumption.format(summary.averageLitersPer100km)} {unit}</>
            ),
          hint:
            summary.averageLitersPer100km === null
              ? "Potrzebne dwa tankowania z rosnącym przebiegiem."
              : null,
        },
      ];

  if (!showLpg) {
    tiles.push({
      label: "Koszt na 100 km",
      value:
        perKm === null ? (
          "—"
        ) : (
          <>{money.format(perKm * 100)} <span className="text-xs font-normal text-muted-foreground">/ 100 km</span></>
        ),
      hint: perKm === null ? "Potrzebne wpisy z różnym przebiegiem." : "Paliwo i serwis, bez zakupu.",
    });
  }

  return (
    <section className="grid gap-4 md:gap-6">
      <PageHeader title="Pulpit" description={car.name} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6">
        <div className="grid gap-4">
          <div className="reveal" style={{ "--i": 1 }}>
            <ExpiryTiles car={car} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {tiles.map((tile, index) => (
              <StatTile key={tile.label} order={index + 2} {...tile} />
            ))}
            {showLpg ? (
              <FuelCostBlock
                lpg={summary.byFuelType.LPG.costPer100km}
                petrol={summary.byFuelType.PETROL.costPer100km}
              />
            ) : null}
          </div>
          <div className="reveal" style={{ "--i": 5 }}>
            <MonthlyChart months={months} />
          </div>
        </div>
        <CostHero car={car} total={total} parts={parts} />
      </div>
    </section>
  );
};
