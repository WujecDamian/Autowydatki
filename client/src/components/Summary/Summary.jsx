import { getSummary } from "../../calculations.js";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetFuelQuery, useGetServicesQuery } from "../../app/api.js";

const money = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

const consumption = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const Summary = ({ carId, purchasePrice }) => {
  const fuelQuery = useGetFuelQuery(carId);
  const serviceQuery = useGetServicesQuery(carId);

  if (fuelQuery.isLoading || serviceQuery.isLoading) {
    return <p>Wczytywanie podsumowania...</p>;
  }

  if (fuelQuery.isError || serviceQuery.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Nie udało się wczytać podsumowania.
      </p>
    );
  }

  const summary = getSummary(fuelQuery.data, serviceQuery.data);
  const purchase = purchasePrice ?? 0;

  return (
    <section className="grid gap-4">
      <h2 className="text-lg font-semibold">Podsumowanie</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Cena zakupu</CardDescription>
            <CardTitle className="text-2xl">
              {purchasePrice === null ? "—" : money.format(purchase)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Koszt paliwa</CardDescription>
            <CardTitle className="text-2xl">{money.format(summary.fuelCost)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Koszt serwisu</CardDescription>
            <CardTitle className="text-2xl">{money.format(summary.serviceCost)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Razem</CardDescription>
            <CardTitle className="text-2xl">{money.format(summary.totalCost + purchase)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Średnie spalanie</CardDescription>
            <CardTitle className="text-2xl">
              {summary.averageLitersPer100km === null
                ? "—"
                : `${consumption.format(summary.averageLitersPer100km)} l/100 km`}
            </CardTitle>
            {summary.averageLitersPer100km === null ? (
              <CardDescription>
                Dodaj dwa tankowania z rosnącym przebiegiem, żeby policzyć spalanie.
              </CardDescription>
            ) : null}
          </CardHeader>
        </Card>
      </div>
    </section>
  );
};
