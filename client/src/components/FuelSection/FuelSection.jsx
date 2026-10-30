import { useState } from "react";
import { useOutletContext } from "react-router";
import { Button } from "@/components/ui/button";
import {
  useAddFuelMutation,
  useDeleteFuelMutation,
  useGetFuelQuery,
  useUpdateFuelMutation,
} from "../../app/api.js";
import { getSummary } from "../../calculations.js";
import {
  consumption,
  errorText,
  formatDate,
  kilometers,
  litersFormat,
  money,
  todayString,
} from "../../lib/format.js";
import { AddButton } from "../AddButton/AddButton.jsx";
import { ConfirmDelete } from "../ConfirmDelete/ConfirmDelete.jsx";
import { EditButton } from "../EditButton/EditButton.jsx";
import { Field } from "../Field/Field.jsx";
import { FormDrawer } from "../FormDrawer/FormDrawer.jsx";
import { PageHeader } from "../PageHeader/PageHeader.jsx";
import { StationPicker } from "../StationPicker/StationPicker.jsx";

const initialForm = (entry) =>
  entry
    ? {
        entryDate: entry.entryDate,
        odometerKm: String(entry.odometerKm),
        liters: String(entry.liters),
        totalCost: String(entry.totalCost),
      }
    : {
        entryDate: todayString(),
        odometerKm: "",
        liters: "",
        totalCost: "",
      };

const FuelForm = ({ carId, entry, defaultStationId, onSaved }) => {
  const [form, setForm] = useState(() => initialForm(entry));
  const [stationId, setStationId] = useState(entry ? (entry.station?.id ?? null) : defaultStationId);
  const [addFuel, addState] = useAddFuelMutation();
  const [updateFuel, updateState] = useUpdateFuelMutation();
  const saveState = entry ? updateState : addState;
  const errorMessage = errorText(saveState.error, "Nie udało się zapisać tankowania.");

  const onChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    const body = {
      entryDate: form.entryDate,
      odometerKm: Number(form.odometerKm),
      liters: Number(form.liters),
      totalCost: Number(form.totalCost),
      stationId,
    };

    try {
      if (entry) {
        await updateFuel({ id: entry.id, ...body }).unwrap();
      } else {
        await addFuel({ carId, ...body }).unwrap();
      }

      onSaved();
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  return (
    <form className="grid grid-cols-2 gap-4" onSubmit={onSubmit}>
      <div className="col-span-2">
        <StationPicker value={stationId} onChange={setStationId} />
      </div>
      <Field
        id="fuel-date"
        label="Data"
        name="entryDate"
        type="date"
        value={form.entryDate}
        onChange={onChange}
        required
      />
      <Field
        id="fuel-odometer"
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
        id="fuel-liters"
        label="Litry"
        name="liters"
        type="number"
        inputMode="decimal"
        min="0.01"
        step="0.01"
        value={form.liters}
        onChange={onChange}
        required
      />
      <Field
        id="fuel-cost"
        label="Koszt (zł)"
        name="totalCost"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={form.totalCost}
        onChange={onChange}
        required
      />
      {errorMessage ? (
        <p role="alert" className="col-span-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="col-span-2" disabled={saveState.isLoading}>
        {saveState.isLoading ? "Zapisywanie..." : entry ? "Zapisz zmiany" : "Dodaj tankowanie"}
      </Button>
    </form>
  );
};

export const FuelSection = () => {
  const { car } = useOutletContext();
  const fuelQuery = useGetFuelQuery(car.id);
  const [deleteFuel, deleteState] = useDeleteFuelMutation();
  // null: drawer closed, { entry: null }: new fill-up, { entry }: editing that fill-up.
  const [editing, setEditing] = useState(null);
  const fuel = fuelQuery.data ?? [];
  const usageById = {};

  for (const item of getSummary(fuel, []).perFill) {
    usageById[item.id] = item.litersPer100km;
  }

  return (
    <section className="grid gap-4">
      <PageHeader title="Paliwo" description="Każde tankowanie liczy się jako pełny bak." />
      {fuelQuery.isLoading ? <p className="text-muted-foreground">Wczytywanie tankowań...</p> : null}
      {fuelQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Nie udało się wczytać tankowań.
        </p>
      ) : null}
      {!fuelQuery.isLoading && !fuelQuery.isError && fuel.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Brak tankowań. Dodaj pierwsze przyciskiem +.
        </p>
      ) : null}
      <ul className="grid gap-3">
        {fuel.map((entry) => {
          const litersPer100km = usageById[entry.id];
          let usageText = null;

          if (litersPer100km === null) {
            usageText = "Przebieg nie jest większy niż poprzedni.";
          } else if (litersPer100km !== undefined) {
            usageText = `${consumption.format(litersPer100km)} l/100 km`;
          }

          return (
            <li key={entry.id} className="flex items-start gap-1 rounded-2xl border bg-card p-1">
              <button
                type="button"
                onClick={() => setEditing({ entry })}
                className="grid min-w-0 flex-1 gap-2 rounded-xl p-3 text-left transition-colors hover:bg-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {entry.station ? entry.station.name : formatDate(entry.entryDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.station ? `${formatDate(entry.entryDate)} · ` : ""}
                      {kilometers.format(entry.odometerKm)} km
                    </p>
                  </div>
                  <p className="shrink-0 font-heading text-lg font-semibold">
                    {money.format(entry.totalCost)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{litersFormat.format(entry.liters)} l</span>
                  <span>{money.format(entry.totalCost / entry.liters)}/l</span>
                  {usageText ? (
                    <span className={litersPer100km === null ? "text-warning" : "text-primary"}>
                      {usageText}
                    </span>
                  ) : null}
                </div>
              </button>
              <div className="flex flex-col pt-2 pr-1">
                <EditButton label="Edytuj tankowanie" onClick={() => setEditing({ entry })} />
                <ConfirmDelete
                  title="Usunąć tankowanie?"
                  description={`Tankowanie z ${formatDate(entry.entryDate)} zostanie usunięte.`}
                  onConfirm={() => deleteFuel(entry.id)}
                  disabled={deleteState.isLoading}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <AddButton label="Dodaj tankowanie" onClick={() => setEditing({ entry: null })} />
      <FormDrawer
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        title={editing?.entry ? "Edytuj tankowanie" : "Nowe tankowanie"}
      >
        {editing ? (
          // The newest entry's station is the default for a new fill-up, so regulars tap it only once.
          <FuelForm
            key={editing.entry?.id ?? "new"}
            carId={car.id}
            entry={editing.entry}
            defaultStationId={fuel[0]?.station?.id ?? null}
            onSaved={() => setEditing(null)}
          />
        ) : null}
      </FormDrawer>
    </section>
  );
};
