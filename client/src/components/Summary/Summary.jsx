import { useOutletContext } from "react-router";
import { getSummary } from "../../calculations.js";
import { useGetFuelQuery, useGetServicesQuery } from "../../app/api.js";
import { consumption, money } from "../../lib/format.js";
import { ExpiryTiles } from "../ExpiryTiles/ExpiryTiles.jsx";
import { PageHeader } from "../PageHeader/PageHeader.jsx";

const Tile = ({ label, value, hint }) => (
  <div className="grid content-start gap-1 rounded-2xl border bg-card p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-heading text-xl font-semibold tracking-tight">{value}</p>
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

  return (
    <section className="grid gap-4">
      <PageHeader title="Pulpit" description={car.name} />
      <ExpiryTiles car={car} />
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/35 via-primary/10 to-card p-5">
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-primary/30 blur-3xl" />
        <p className="relative text-sm text-foreground/80">Łączny koszt auta</p>
        <p className="relative mt-1 font-heading text-4xl font-semibold tracking-tight">
          {money.format(summary.totalCost + purchase)}
        </p>
        <p className="relative mt-2 text-xs text-foreground/70">
          Zakup, paliwo i serwis razem
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Paliwo" value={money.format(summary.fuelCost)} />
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
      </div>
    </section>
  );
};
