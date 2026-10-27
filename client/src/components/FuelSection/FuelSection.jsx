import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddFuelMutation, useDeleteFuelMutation, useGetFuelQuery } from "../../app/api.js";
import { getSummary } from "../../calculations.js";

const money = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

const litersFormat = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const consumption = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatDate = (value) => {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
};

const emptyForm = {
  entryDate: "",
  odometerKm: "",
  liters: "",
  totalCost: "",
};

export const FuelSection = ({ carId }) => {
  const fuelQuery = useGetFuelQuery(carId);
  const [form, setForm] = useState(emptyForm);
  const [addFuel, addState] = useAddFuelMutation();
  const [deleteFuel, deleteState] = useDeleteFuelMutation();
  const fuel = fuelQuery.data ?? [];
  const usageById = {};

  for (const item of getSummary(fuel, []).perFill) {
    usageById[item.id] = item.litersPer100km;
  }

  const errorMessage =
    addState.error?.data?.message || (addState.error ? "Nie udało się zapisać tankowania." : "");

  const onChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      await addFuel({
        carId,
        entryDate: form.entryDate,
        odometerKm: Number(form.odometerKm),
        liters: Number(form.liters),
        totalCost: Number(form.totalCost),
      }).unwrap();
      setForm(emptyForm);
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  return (
    <section className="grid gap-4">
      <h2 className="text-lg font-semibold">Paliwo</h2>
      <Card>
        <CardHeader>
          <CardTitle>Nowe tankowanie</CardTitle>
          <CardDescription>Każde tankowanie liczy się jako pełny bak.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="fuel-date">Data</Label>
              <Input
                id="fuel-date"
                name="entryDate"
                type="date"
                value={form.entryDate}
                onChange={onChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fuel-odometer">Przebieg (km)</Label>
              <Input
                id="fuel-odometer"
                name="odometerKm"
                type="number"
                min="0"
                step="1"
                value={form.odometerKm}
                onChange={onChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fuel-liters">Litry</Label>
              <Input
                id="fuel-liters"
                name="liters"
                type="number"
                min="0.01"
                step="0.01"
                value={form.liters}
                onChange={onChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fuel-cost">Koszt (zł)</Label>
              <Input
                id="fuel-cost"
                name="totalCost"
                type="number"
                min="0"
                step="0.01"
                value={form.totalCost}
                onChange={onChange}
                required
              />
            </div>
            {errorMessage ? (
              <p role="alert" className="text-sm text-destructive sm:col-span-2">
                {errorMessage}
              </p>
            ) : null}
            <Button type="submit" className="sm:col-span-2" disabled={addState.isLoading}>
              {addState.isLoading ? "Zapisywanie..." : "Dodaj tankowanie"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {fuelQuery.isLoading ? <p>Wczytywanie tankowań...</p> : null}
      {fuelQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Nie udało się wczytać tankowań.
        </p>
      ) : null}
      {!fuelQuery.isLoading && !fuelQuery.isError && fuel.length === 0 ? <p>Brak tankowań.</p> : null}
      {fuel.map((entry) => {
        const litersPer100km = usageById[entry.id];
        let usageText = null;

        if (litersPer100km === null) {
          usageText = "Przebieg nie jest większy niż poprzedni.";
        } else if (litersPer100km !== undefined) {
          usageText = `${consumption.format(litersPer100km)} l/100 km`;
        }

        return (
          <Card key={entry.id}>
            <CardHeader>
              <CardTitle>{formatDate(entry.entryDate)}</CardTitle>
              <CardDescription>{entry.odometerKm} km</CardDescription>
              <CardAction>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => deleteFuel(entry.id)}
                  disabled={deleteState.isLoading}
                >
                  Usuń
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <p>{litersFormat.format(entry.liters)} l</p>
              <p>{money.format(entry.totalCost)}</p>
              <p>Cena za litr: {money.format(entry.totalCost / entry.liters)}</p>
              {usageText ? <p>{usageText}</p> : null}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
};
