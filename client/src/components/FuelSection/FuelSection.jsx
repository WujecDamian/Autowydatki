import { useState } from "react";
import { useOutletContext } from "react-router";
import { FuelStationIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useAddFuelMutation,
  useDeleteFuelMutation,
  useGetFuelQuery,
  useUpdateFuelMutation,
} from "../../app/api.js";
import { getFuelStats, getSummary } from "../../calculations.js";
import { useMediaQuery } from "../../lib/useMediaQuery.js";
import { FormPanel } from "../FormPanel/FormPanel.jsx";
import {
  consumption,
  errorText,
  formatDate,
  formatRelativeDay,
  kilometers,
  litersFormat,
  money,
  plural,
  todayString,
} from "../../lib/format.js";
import { AddButton } from "../AddButton/AddButton.jsx";
import { ConfirmDelete } from "../ConfirmDelete/ConfirmDelete.jsx";
import { EditButton } from "../EditButton/EditButton.jsx";
import { Field } from "../Field/Field.jsx";
import { Icon } from "../Icon/Icon.jsx";
import { FormDrawer } from "../FormDrawer/FormDrawer.jsx";
import { PageHeader } from "../PageHeader/PageHeader.jsx";
import { PriceTrend } from "../PriceTrend/PriceTrend.jsx";
import { StatTile } from "../StatTile/StatTile.jsx";
import { StationLogo } from "../StationLogo/StationLogo.jsx";
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

const fuelTypeLabels = { PETROL: "Benzyna", LPG: "LPG" };

const FuelTypeToggle = ({ value, onChange }) => (
  <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="group" aria-label="Rodzaj paliwa">
    {Object.entries(fuelTypeLabels).map(([fuelType, label]) => (
      <button
        key={fuelType}
        type="button"
        aria-pressed={value === fuelType}
        onClick={() => onChange(fuelType)}
        className="h-11 rounded-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-primary-fill aria-pressed:text-primary-foreground"
      >
        {label}
      </button>
    ))}
  </div>
);

const FuelForm = ({ carId, entry, defaultStationId, showFuelType, defaultFuelType, onSaved }) => {
  const [form, setForm] = useState(() => initialForm(entry));
  const [fuelType, setFuelType] = useState(entry?.fuelType ?? defaultFuelType);
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
      fuelType,
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
      {showFuelType ? (
        <div className="col-span-2">
          <FuelTypeToggle value={fuelType} onChange={setFuelType} />
        </div>
      ) : null}
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
  // From lg up the form stays open beside the list instead of sliding up in a drawer.
  const desktop = useMediaQuery("(min-width: 64rem)");
  const active = editing ?? (desktop ? { entry: null } : null);
  const fuel = fuelQuery.data ?? [];
  const usageById = {};

  for (const item of getSummary(fuel, []).perFill) {
    usageById[item.id] = item.litersPer100km;
  }

  const summary = getSummary(fuel, []);
  const stats = getFuelStats(fuel);
  const showLpgPrice = car.hasLpg || stats.byFuelType.LPG.series.length > 0;
  const petrolPrice = stats.byFuelType.PETROL.averagePrice;
  const lpgPrice = stats.byFuelType.LPG.averagePrice;

  // The newest entry's station is the default for a new fill-up, so regulars tap it only once.
  const fuelForm = active ? (
    <FuelForm
      key={active.entry?.id ?? "new"}
      carId={car.id}
      entry={active.entry}
      defaultStationId={fuel[0]?.station?.id ?? null}
      showFuelType={car.hasLpg || active.entry?.fuelType === "LPG"}
      defaultFuelType={car.hasLpg ? (fuel[0]?.fuelType ?? "PETROL") : "PETROL"}
      onSaved={() => setEditing(null)}
    />
  ) : null;

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
      {fuel.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Wydane na paliwo" value={money.format(summary.fuelCost)} order={1} />
          <StatTile
            label="Zatankowano"
            value={<>{litersFormat.format(stats.totalLiters)} <span className="text-xs font-normal text-muted-foreground">l</span></>}
            hint={`${fuel.length} ${plural(fuel.length, "tankowanie", "tankowania", "tankowań")}`}
            order={2}
          />
          <StatTile
            label={showLpgPrice ? "Średnia cena benzyny" : "Średnia cena litra"}
            value={petrolPrice === null ? "—" : <>{money.format(petrolPrice)} <span className="text-xs font-normal text-muted-foreground">/ l</span></>}
            hint={showLpgPrice && lpgPrice !== null ? `LPG ${money.format(lpgPrice)} / l` : null}
            order={3}
          />
          <StatTile
            label="Ostatnie tankowanie"
            value={formatRelativeDay(`${stats.last.entryDate}T00:00:00`)}
            hint={`${kilometers.format(stats.last.odometerKm)} km`}
            order={4}
          />
        </div>
      ) : null}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid gap-3">
      <PriceTrend byFuelType={stats.byFuelType} />
      <ul className="grid gap-3">
        {fuel.map((entry, index) => {
          const litersPer100km = usageById[entry.id];
          let usageText = null;

          if (litersPer100km === null) {
            usageText = "Przebieg nie jest większy niż poprzedni.";
          } else if (litersPer100km !== undefined) {
            usageText = `${consumption.format(litersPer100km)} l/100 km`;
          }

          return (
            <li
              key={entry.id}
              data-glow=""
              style={{ "--i": index + 3 }}
              className="reveal flex items-start gap-1 rounded-2xl border bg-card p-1 md:items-center"
            >
              <button
                type="button"
                onClick={() => setEditing({ entry })}
                className="grid min-w-0 flex-1 gap-2 rounded-xl p-3 text-left transition-colors hover:bg-accent/40 xl:flex xl:items-center xl:gap-3 xl:px-4"
              >
                <div className="flex items-start justify-between gap-3 xl:contents">
                  {entry.station ? (
                    <StationLogo name={entry.station.name} />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Icon icon={FuelStationIcon} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {entry.station ? entry.station.name : formatDate(entry.entryDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.station ? `${formatDate(entry.entryDate)} · ` : ""}
                      {kilometers.format(entry.odometerKm)} km
                    </p>
                  </div>
                  <p className="shrink-0 font-heading text-lg font-semibold tabular-nums xl:order-last xl:w-24 xl:text-right">
                    {money.format(entry.totalCost)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums xl:flex-nowrap xl:justify-end">
                  {car.hasLpg || entry.fuelType === "LPG" ? (
                    <Badge variant={entry.fuelType === "LPG" ? "default" : "secondary"}>
                      {fuelTypeLabels[entry.fuelType]}
                    </Badge>
                  ) : null}
                  <span>{litersFormat.format(entry.liters)} l</span>
                  <span>{money.format(entry.totalCost / entry.liters)}/l</span>
                  {usageText ? (
                    <span className={litersPer100km === null ? "text-warning" : "text-primary"}>
                      {usageText}
                    </span>
                  ) : null}
                </div>
              </button>
              <div className="flex flex-col pt-2 pr-1 md:flex-row md:pt-0">
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
      </div>
      {desktop && active ? (
        <FormPanel
          title={active.entry ? "Edytuj tankowanie" : "Nowe tankowanie"}
          onReset={editing ? () => setEditing(null) : undefined}
        >
          {fuelForm}
        </FormPanel>
      ) : null}
      </div>
      <AddButton label="Dodaj tankowanie" onClick={() => setEditing({ entry: null })} />
      <FormDrawer
        open={editing !== null && !desktop}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        title={editing?.entry ? "Edytuj tankowanie" : "Nowe tankowanie"}
      >
        {fuelForm}
      </FormDrawer>
    </section>
  );
};
