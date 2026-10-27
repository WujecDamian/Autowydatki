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
import {
  useAddServiceMutation,
  useDeleteServiceMutation,
  useGetServicesQuery,
} from "../../app/api.js";

const money = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

const formatDate = (value) => {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
};

const emptyForm = {
  title: "",
  entryDate: "",
  odometerKm: "",
  cost: "",
};

export const ServiceSection = ({ carId }) => {
  const serviceQuery = useGetServicesQuery(carId);
  const [form, setForm] = useState(emptyForm);
  const [addService, addState] = useAddServiceMutation();
  const [deleteService, deleteState] = useDeleteServiceMutation();
  const services = serviceQuery.data ?? [];
  const errorMessage =
    addState.error?.data?.message || (addState.error ? "Nie udało się zapisać serwisu." : "");

  const onChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      await addService({
        carId,
        title: form.title,
        entryDate: form.entryDate,
        odometerKm: Number(form.odometerKm),
        cost: Number(form.cost),
      }).unwrap();
      setForm(emptyForm);
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  return (
    <section className="grid gap-4">
      <h2 className="text-lg font-semibold">Serwis</h2>
      <Card>
        <CardHeader>
          <CardTitle>Nowa wizyta</CardTitle>
          <CardDescription>Na przykład olej, opony albo przegląd.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="service-title">Nazwa</Label>
              <Input
                id="service-title"
                name="title"
                value={form.title}
                onChange={onChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="service-date">Data</Label>
              <Input
                id="service-date"
                name="entryDate"
                type="date"
                value={form.entryDate}
                onChange={onChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="service-odometer">Przebieg (km)</Label>
              <Input
                id="service-odometer"
                name="odometerKm"
                type="number"
                min="0"
                step="1"
                value={form.odometerKm}
                onChange={onChange}
                required
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="service-cost">Koszt (zł)</Label>
              <Input
                id="service-cost"
                name="cost"
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
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
              {addState.isLoading ? "Zapisywanie..." : "Dodaj serwis"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {serviceQuery.isLoading ? <p>Wczytywanie serwisów...</p> : null}
      {serviceQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Nie udało się wczytać serwisów.
        </p>
      ) : null}
      {!serviceQuery.isLoading && !serviceQuery.isError && services.length === 0 ? (
        <p>Brak serwisów.</p>
      ) : null}
      {services.map((entry) => (
        <Card key={entry.id}>
          <CardHeader>
            <CardTitle>{entry.title}</CardTitle>
            <CardDescription>
              {formatDate(entry.entryDate)} · {entry.odometerKm} km
            </CardDescription>
            <CardAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => deleteService(entry.id)}
                disabled={deleteState.isLoading}
              >
                Usuń
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{money.format(entry.cost)}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
};
