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
import { limits } from "../../lib/limits.js";
import { isElectric, powertrainTexts } from "../../lib/powertrain.js";
import { useMediaQuery } from "../../lib/useMediaQuery.js";
import { FormPanel } from "../FormPanel/FormPanel.jsx";
import {
  consumption,
  formErrors,
  formatDate,
  formatRelativeDay,
  kilometers,
  quantityFormat,
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
import { SegmentedToggle } from "../SegmentedToggle/SegmentedToggle.jsx";
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
        quantity: String(entry.quantity),
        totalCost: String(entry.totalCost),
      }
    : {
        entryDate: todayString(),
        odometerKm: "",
        quantity: "",
        totalCost: "",
      };

const fuelTypeLabels = { PETROL: "Benzyna", LPG: "LPG" };
const fuelTypeOptions = Object.entries(fuelTypeLabels).map(([value, label]) => ({ value, label }));

const FuelForm = ({ car, entry, defaultStationId, showFuelType, defaultFuelType, onSaved }) => {
  const texts = powertrainTexts(car);
  const [form, setForm] = useState(() => initialForm(entry));
  const [fuelType, setFuelType] = useState(entry?.fuelType ?? defaultFuelType);
  const [stationId, setStationId] = useState(entry ? (entry.station?.id ?? null) : defaultStationId);
  const [addFuel, addState] = useAddFuelMutation();
  const [updateFuel, updateState] = useUpdateFuelMutation();
  const saveState = entry ? updateState : addState;
  // A validation error shows under the field that is wrong; any other error shows above the button.
  const errors = formErrors(saveState.error, texts.saveError, [
    "entryDate",
    "odometerKm",
    "quantity",
    "totalCost",
  ]);
  const errorFor = errors.field;
  const errorMessage = errors.message;

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
      quantity: Number(form.quantity),
      totalCost: Number(form.totalCost),
      stationId,
      fuelType,
    };

    try {
      if (entry) {
        await updateFuel({ id: entry.id, ...body }).unwrap();
      } else {
        await addFuel({ carId: car.id, ...body }).unwrap();
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
          <SegmentedToggle label="Rodzaj paliwa" options={fuelTypeOptions} value={fuelType} onChange={setFuelType} />
        </div>
      ) : null}
      <div className="col-span-2">
        <StationPicker charging={isElectric(car)} value={stationId} onChange={setStationId} />
      </div>
      <Field
        id="fuel-date"
        label="Data"
        name="entryDate"
        error={errorFor("entryDate")}
        type="date"
        max={todayString()}
        value={form.entryDate}
        onChange={onChange}
        required
      />
      <Field
        id="fuel-odometer"
        label="Przebieg (km)"
        name="odometerKm"
        error={errorFor("odometerKm")}
        type="number"
        inputMode="numeric"
        min="0"
        max={limits.maximumOdometerKm}
        step="1"
        value={form.odometerKm}
        onChange={onChange}
        required
      />
      <Field
        id="fuel-quantity"
        label={texts.quantityLabel}
        name="quantity"
        error={errorFor("quantity")}
        type="number"
        inputMode="decimal"
        min="0.01"
        max={limits.maximumQuantity}
        step="0.01"
        value={form.quantity}
        onChange={onChange}
        required
      />
      <Field
        id="fuel-cost"
        label="Koszt (zł)"
        name="totalCost"
        error={errorFor("totalCost")}
        type="number"
        inputMode="decimal"
        min="0"
        max={limits.maximumFuelCost}
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
        {saveState.isLoading ? "Zapisywanie..." : entry ? "Zapisz zmiany" : texts.add}
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
  const isEmpty = !fuelQuery.isLoading && !fuelQuery.isError && fuel.length === 0;
  const usageById = {};

  for (const item of getSummary(fuel, []).perFill) {
    usageById[item.id] = item.per100km;
  }

  const summary = getSummary(fuel, []);
  const stats = getFuelStats(fuel);
  const electricCar = isElectric(car);
  const texts = powertrainTexts(car);
  const showLpgPrice = !electricCar && (car.hasLpg || stats.byFuelType.LPG.series.length > 0);
  const mainPrice = stats.byFuelType[electricCar ? "ELECTRIC" : "PETROL"].averagePrice;
  const lpgPrice = stats.byFuelType.LPG.averagePrice;

  // The newest entry's station is the default for a new fill-up, so regulars tap it only once.
  const fuelForm = active ? (
    <FuelForm
      key={active.entry?.id ?? "new"}
      car={car}
      entry={active.entry}
      defaultStationId={fuel[0]?.station?.id ?? null}
      showFuelType={!electricCar && car.hasLpg || active.entry?.fuelType === "LPG"}
      defaultFuelType={electricCar ? "ELECTRIC" : car.hasLpg ? (fuel[0]?.fuelType ?? "PETROL") : "PETROL"}
      onSaved={() => setEditing(null)}
    />
  ) : null;

  return (
    <section className="grid gap-4">
      <PageHeader title={texts.fuelWord} description={texts.pageDescription} />
      {fuelQuery.isLoading ? <p className="text-muted-foreground">{texts.loading}</p> : null}
      {fuelQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {texts.loadError}
        </p>
      ) : null}
      {fuel.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label={texts.spent} value={money.format(summary.fuelCost)} order={1} />
          <StatTile
            label={texts.bought}
            value={<>{quantityFormat.format(stats.totalQuantity)} <span className="text-xs font-normal text-muted-foreground">{texts.unit}</span></>}
            hint={`${fuel.length} ${plural(fuel.length, ...texts.count)}`}
            order={2}
          />
          <StatTile
            label={showLpgPrice ? "Średnia cena benzyny" : texts.averagePrice}
            value={mainPrice === null ? "—" : <>{money.format(mainPrice)} <span className="text-xs font-normal text-muted-foreground">/ {texts.unit}</span></>}
            hint={showLpgPrice && lpgPrice !== null ? `LPG ${money.format(lpgPrice)} / l` : null}
            order={3}
          />
          <StatTile
            label={texts.last}
            value={formatRelativeDay(`${stats.last.entryDate}T00:00:00`)}
            hint={`${kilometers.format(stats.last.odometerKm)} km`}
            order={4}
          />
        </div>
      ) : null}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid gap-3">
        {isEmpty ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {desktop ? texts.emptyDesktop : texts.empty}
          </p>
        ) : null}
      <PriceTrend byFuelType={stats.byFuelType} texts={texts} />
      <ul className="grid gap-3">
        {fuel.map((entry, index) => {
          const per100km = usageById[entry.id];
          let usageText = null;

          if (per100km === null) {
            usageText = "Przebieg nie jest większy niż poprzedni.";
          } else if (per100km !== undefined) {
            usageText = `${consumption.format(per100km)} ${texts.consumptionUnit}`;
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
                  {!electricCar && (car.hasLpg || entry.fuelType === "LPG") ? (
                    <Badge variant={entry.fuelType === "LPG" ? "default" : "secondary"}>
                      {fuelTypeLabels[entry.fuelType]}
                    </Badge>
                  ) : null}
                  <span>{quantityFormat.format(entry.quantity)} {texts.unit}</span>
                  <span>{money.format(entry.totalCost / entry.quantity)}/{texts.unit}</span>
                  {usageText ? (
                    <span className={per100km === null ? "text-warning" : "text-primary"}>
                      {usageText}
                    </span>
                  ) : null}
                </div>
              </button>
              <div className="flex flex-col pt-2 pr-1 md:flex-row md:pt-0">
                <EditButton label={texts.edit} onClick={() => setEditing({ entry })} />
                <ConfirmDelete
                  title={texts.deleteTitle}
                  description={texts.deleteDescription(formatDate(entry.entryDate))}
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
          title={active.entry ? texts.edit : texts.new}
          onReset={editing ? () => setEditing(null) : undefined}
        >
          {fuelForm}
        </FormPanel>
      ) : null}
      </div>
      <AddButton label={texts.add} onClick={() => setEditing({ entry: null })} />
      <FormDrawer
        open={editing !== null && !desktop}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        title={editing?.entry ? texts.edit : texts.new}
      >
        {fuelForm}
      </FormDrawer>
    </section>
  );
};
