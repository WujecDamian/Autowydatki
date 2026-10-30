import { useOutletContext } from "react-router";
import { getSummary } from "../../calculations.js";
import { useGetFuelQuery, useGetServicesQuery } from "../../app/api.js";
import { consumption, money } from "../../lib/format.js";
import { ExpiryTiles } from "../ExpiryTiles/ExpiryTiles.jsx";
import { PageHeader } from "../PageHeader/PageHeader.jsx";

const formatAverage = (value) => (value === null ? "—" : consumption.format(value));

const Tile = ({ label, value, hint }) => (
  <div data-glow="" className="grid content-start gap-1 rounded-2xl border bg-card px-5 py-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="font-heading text-xl font-semibold tracking-tight tabular-nums">{value}</div>
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

const percent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

// One row of the cost split: a colour dot, the label, the amount and an optional breakdown.
const SplitRow = ({ color, label, amount, hint }) => (
  <div className="grid gap-0.5">
    <div className="flex items-center gap-2">
      <span className={`size-2.5 rounded-full ${color}`} />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{money.format(amount)}</span>
    </div>
    {hint ? <p className="pl-[18px] text-xs text-muted-foreground tabular-nums">{hint}</p> : null}
  </div>
);

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
    { key: "purchase", label: "Zakup", amount: purchase, color: "bg-chart-5" },
    {
      key: "fuel",
      label: "Paliwo",
      amount: summary.fuelCost,
      color: "bg-chart-3",
      hint: showLpg
        ? `Benzyna ${money.format(summary.byFuelType.PETROL.cost)} · LPG ${money.format(summary.byFuelType.LPG.cost)}`
        : null,
    },
    {
      key: "service",
      label: "Serwis",
      amount: summary.serviceCost,
      color: "bg-chart-1",
      hint:
        summary.inspectionCost > 0
          ? `Naprawy ${money.format(summary.repairCost)} · badania ${money.format(summary.inspectionCost)}`
          : null,
    },
  ];

  return (
    <section className="grid gap-4 md:gap-6">
      <PageHeader title="Pulpit" description={car.name} />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6">
        <div className="grid gap-4">
          <ExpiryTiles car={car} />
          <div className="grid gap-3 sm:grid-cols-2">
            {showLpg ? (
              <>
                <Tile
                  label="Spalanie LPG"
                  value={<>{formatAverage(summary.byFuelType.LPG.averageLitersPer100km)} <span className="text-xs font-normal text-muted-foreground">l/100 km</span></>}
                />
                <Tile
                  label="Spalanie benzyna"
                  value={<>{formatAverage(summary.byFuelType.PETROL.averageLitersPer100km)} <span className="text-xs font-normal text-muted-foreground">l/100 km</span></>}
                />
              </>
            ) : (
              <Tile
                label="Średnie spalanie"
                value={
                  summary.averageLitersPer100km === null ? (
                    "—"
                  ) : (
                    <>{consumption.format(summary.averageLitersPer100km)} <span className="text-xs font-normal text-muted-foreground">l/100 km</span></>
                  )
                }
                hint={
                  summary.averageLitersPer100km === null
                    ? "Potrzebne dwa tankowania z rosnącym przebiegiem."
                    : null
                }
              />
            )}
          </div>
        </div>
        <div
          data-glow=""
          className="group relative grid gap-5 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/25 to-card to-60% p-5 sm:p-6"
        >
          {car.coverUrl ? (
            <>
              <img
                src={car.coverUrl}
                alt=""
                className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-background/85 via-background/70 to-background/85" />
            </>
          ) : null}
          <div className="relative grid gap-1">
            <p className="text-foreground/80">Łączny koszt auta</p>
            <p className="font-heading text-4xl font-semibold tracking-tight tabular-nums lg:text-[40px] lg:leading-[44px]">
              {money.format(total)}
            </p>
          </div>
          {total > 0 ? (
            <div
              role="img"
              aria-label={parts.map((part) => `${part.label} ${percent(part.amount, total)}%`).join(", ")}
              className="relative flex h-3 gap-[3px]"
            >
              {parts
                .filter((part) => part.amount > 0)
                .map((part) => (
                  <span
                    key={part.key}
                    className={`rounded-full ${part.color}`}
                    style={{ flexGrow: part.amount }}
                  />
                ))}
            </div>
          ) : null}
          <div className="relative grid gap-2.5">
            {parts.map((part) => (
              <SplitRow key={part.key} {...part} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
