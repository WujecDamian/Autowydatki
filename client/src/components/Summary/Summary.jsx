import { useOutletContext } from "react-router";
import { getSummary } from "../../calculations.js";
import { useGetFuelQuery, useGetServicesQuery } from "../../app/api.js";
import { consumption, money } from "../../lib/format.js";
import { ExpiryTiles } from "../ExpiryTiles/ExpiryTiles.jsx";
import { PageHeader } from "../PageHeader/PageHeader.jsx";

const formatAverage = (value) => (value === null ? "—" : consumption.format(value));

const Tile = ({ label, value, hint }) => (
  <div className="grid content-start gap-1 rounded-2xl border bg-card p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="font-heading text-xl font-semibold tracking-tight">{value}</div>
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
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
  // The split appears for LPG cars, and for cars that once had LPG fill-ups.
  const showLpg = car.hasLpg || summary.byFuelType.LPG.count > 0;

  return (
    <section className="grid gap-4">
      <PageHeader title="Pulpit" description={car.name} />
      <ExpiryTiles car={car} />
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/35 via-primary/10 to-card p-5">
        {car.coverUrl ? (
          <>
            <img src={car.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-background/85 via-primary/40 to-background/60" />
          </>
        ) : null}
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-primary/30 blur-3xl" />
        <p className="relative text-sm text-foreground/80">Łączny koszt auta</p>
        <p className="relative mt-1 font-heading text-4xl font-semibold tracking-tight drop-shadow">
          {money.format(summary.totalCost + purchase)}
        </p>
        <p className="relative mt-2 text-xs text-foreground/70">
          Zakup, paliwo i serwis razem
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Paliwo"
          value={money.format(summary.fuelCost)}
          hint={
            showLpg
              ? `Benzyna ${money.format(summary.byFuelType.PETROL.cost)} · LPG ${money.format(summary.byFuelType.LPG.cost)}`
              : null
          }
        />
        <Tile
          label="Serwis"
          value={money.format(summary.serviceCost)}
          hint={
            summary.inspectionCost > 0
              ? `Naprawy ${money.format(summary.repairCost)} · badania ${money.format(summary.inspectionCost)}`
              : null
          }
        />
        <Tile
          label="Cena zakupu"
          value={car.purchasePrice === null ? "—" : money.format(purchase)}
        />
        {showLpg ? (
          <Tile
            label="Spalanie (l/100 km)"
            value={
              <span className="grid gap-0.5">
                <span>LPG {formatAverage(summary.byFuelType.LPG.averageLitersPer100km)}</span>
                <span className="text-base text-muted-foreground">
                  Benzyna {formatAverage(summary.byFuelType.PETROL.averageLitersPer100km)}
                </span>
              </span>
            }
            hint="Każde paliwo liczone osobno."
          />
        ) : (
          <Tile
            label="Średnie spalanie"
            value={
              summary.averageLitersPer100km === null
                ? "—"
                : `${consumption.format(summary.averageLitersPer100km)} l/100 km`
            }
            hint={
              summary.averageLitersPer100km === null
                ? "Potrzebne dwa tankowania z rosnącym przebiegiem."
                : null
            }
          />
        )}
      </div>
    </section>
  );
};
