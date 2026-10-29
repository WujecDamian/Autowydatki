import { useState } from "react";
import { useOutletContext } from "react-router";
import { Button } from "@/components/ui/button";
import {
  useAddServiceMutation,
  useDeleteServiceMutation,
  useGetServicesQuery,
} from "../../app/api.js";
import { errorText, formatDate, kilometers, money, todayString } from "../../lib/format.js";
import { AddButton } from "../AddButton/AddButton.jsx";
import { ConfirmDelete } from "../ConfirmDelete/ConfirmDelete.jsx";
import { Field } from "../Field/Field.jsx";
import { FormDrawer } from "../FormDrawer/FormDrawer.jsx";
import { PageHeader } from "../PageHeader/PageHeader.jsx";

const emptyForm = () => ({
  title: "",
  entryDate: todayString(),
  odometerKm: "",
  cost: "",
});

const ServiceForm = ({ carId, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [addService, addState] = useAddServiceMutation();
  const errorMessage = errorText(addState.error, "Nie udało się zapisać serwisu.");

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
      setForm(emptyForm());
      onSaved();
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  return (
    <form className="grid grid-cols-2 gap-4" onSubmit={onSubmit}>
      <Field
        id="service-title"
        label="Nazwa"
        name="title"
        className="col-span-2"
        value={form.title}
        onChange={onChange}
        required
      />
      <Field
        id="service-date"
        label="Data"
        name="entryDate"
        type="date"
        value={form.entryDate}
        onChange={onChange}
        required
      />
      <Field
        id="service-odometer"
        label="Przebieg (km)"
        name="odometerKm"
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        value={form.odometerKm}
        onChange={onChange}
        required
      />
      <Field
        id="service-cost"
        label="Koszt (zł)"
        name="cost"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        className="col-span-2"
        value={form.cost}
        onChange={onChange}
        required
      />
      {errorMessage ? (
        <p role="alert" className="col-span-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="col-span-2" disabled={addState.isLoading}>
        {addState.isLoading ? "Zapisywanie..." : "Dodaj serwis"}
      </Button>
    </form>
  );
};

export const ServiceSection = () => {
  const { car } = useOutletContext();
  const serviceQuery = useGetServicesQuery(car.id);
  const [deleteService, deleteState] = useDeleteServiceMutation();
  const [formOpen, setFormOpen] = useState(false);
  const services = serviceQuery.data ?? [];

  return (
    <section className="grid gap-4">
      <PageHeader title="Serwis" description="Naprawy, wymiany i przeglądy." />
      {serviceQuery.isLoading ? (
        <p className="text-muted-foreground">Wczytywanie serwisów...</p>
      ) : null}
      {serviceQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Nie udało się wczytać serwisów.
        </p>
      ) : null}
      {!serviceQuery.isLoading && !serviceQuery.isError && services.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Brak serwisów. Dodaj pierwszy przyciskiem +.
        </p>
      ) : null}
      <ul className="grid gap-3">
        {services.map((entry) => (
          <li key={entry.id} className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{entry.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(entry.entryDate)} · {kilometers.format(entry.odometerKm)} km
              </p>
            </div>
            <div className="flex items-center gap-1">
              <p className="font-heading text-lg font-semibold">{money.format(entry.cost)}</p>
              <ConfirmDelete
                title="Usunąć serwis?"
                description={`„${entry.title}” zostanie usunięty.`}
                onConfirm={() => deleteService(entry.id)}
                disabled={deleteState.isLoading}
              />
            </div>
          </li>
        ))}
      </ul>
      <AddButton label="Dodaj serwis" onClick={() => setFormOpen(true)} />
      <FormDrawer open={formOpen} onOpenChange={setFormOpen} title="Nowy serwis">
        <ServiceForm carId={car.id} onSaved={() => setFormOpen(false)} />
      </FormDrawer>
    </section>
  );
};
