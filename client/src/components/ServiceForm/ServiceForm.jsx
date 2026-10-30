import { useState } from "react";
import { flushSync } from "react-dom";
import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddServiceMutation, useUpdateServiceMutation } from "../../app/api.js";
import {
  categoryNames,
  inspectionCategory,
  inspectionFeeItem,
  otherCategory,
  serviceCatalog,
} from "../../features/services/catalog.js";
import { errorText, money, plural, todayString } from "../../lib/format.js";
import { Field } from "../Field/Field.jsx";
import { Icon } from "../Icon/Icon.jsx";

const catalogKey = (category, name) => `${category}|${name}`;
const isInCatalog = (category, name) =>
  serviceCatalog.some((group) => group.category === category && group.items.includes(name));

let customCounter = 0;
const nextCustomKey = () => {
  customCounter += 1;
  return `custom-${customCounter}`;
};

// Items are kept as { key, category, name, cost, custom } with cost as the input's string.
const itemsFromEntry = (entry) =>
  entry.items.map((item) => {
    const custom = !isInCatalog(item.category, item.name);

    return {
      key: custom ? nextCustomKey() : catalogKey(item.category, item.name),
      category: item.category,
      name: item.name,
      cost: String(item.cost),
      custom,
    };
  });

const feeItem = () => ({
  key: catalogKey(inspectionCategory, inspectionFeeItem),
  category: inspectionCategory,
  name: inspectionFeeItem,
  cost: "",
  custom: false,
});

const initialState = (entry, defaultKind) => {
  if (entry) {
    return {
      kind: entry.kind,
      title: entry.title ?? "",
      entryDate: entry.entryDate,
      odometerKm: String(entry.odometerKm),
      items: itemsFromEntry(entry),
      // Editing never moves the car's inspection date unless a new one is typed in.
      nextInspectionDate: "",
    };
  }

  return {
    kind: defaultKind,
    title: "",
    entryDate: todayString(),
    odometerKm: "",
    items: defaultKind === "INSPECTION" ? [feeItem()] : [],
    // null follows the entry date (one year later) until the user picks a date.
    nextInspectionDate: null,
  };
};

// "2026-10-29" -> "2027-10-29"; 29 February becomes 28 February.
const oneYearLater = (dateString) => {
  if (!dateString) {
    return "";
  }

  const [year, month, day] = dateString.split("-");
  return `${Number(year) + 1}-${month}-${month === "02" && day === "29" ? "28" : day}`;
};

const toCents = (cost) => {
  const value = Number(cost);
  return cost !== "" && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : 0;
};

const PriceInput = ({ item, label, onChange }) => (
  <Input
    aria-label={`Cena: ${label}`}
    type="number"
    inputMode="decimal"
    min="0"
    step="0.01"
    placeholder="zł"
    className="h-10 w-28 shrink-0 text-right text-base"
    value={item.cost}
    onChange={(event) => onChange(item.key, event.target.value)}
    required
  />
);

const KindToggle = ({ kind, onChange }) => (
  <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="group" aria-label="Rodzaj wpisu">
    {[
      ["REPAIR", "Naprawa"],
      ["INSPECTION", "Badanie techniczne"],
    ].map(([value, label]) => (
      <button
        key={value}
        type="button"
        aria-pressed={kind === value}
        onClick={() => onChange(value)}
        className="h-11 rounded-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-primary-fill aria-pressed:text-primary-foreground"
      >
        {label}
      </button>
    ))}
  </div>
);

export const ServiceForm = ({ carId, entry, defaultKind = "REPAIR", onSaved }) => {
  const [form, setForm] = useState(() => initialState(entry, defaultKind));
  const [openCategories, setOpenCategories] = useState(
    () => new Set(form.items.filter((item) => !item.custom).map((item) => item.category)),
  );
  const [addService, addState] = useAddServiceMutation();
  const [updateService, updateState] = useUpdateServiceMutation();
  const saveState = entry ? updateState : addState;
  const errorMessage = errorText(saveState.error, "Nie udało się zapisać serwisu.");
  const selectedKeys = new Set(form.items.map((item) => item.key));
  const customItems = form.items.filter((item) => item.custom);
  const totalCents = form.items.reduce((sum, item) => sum + toCents(item.cost), 0);
  const nextInspectionDate = form.nextInspectionDate ?? oneYearLater(form.entryDate);

  const setField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const setKind = (kind) => {
    setForm((current) => {
      const needsFee =
        kind === "INSPECTION" &&
        !current.items.some((item) => item.key === catalogKey(inspectionCategory, inspectionFeeItem));

      return { ...current, kind, items: needsFee ? [...current.items, feeItem()] : current.items };
    });

    if (kind === "INSPECTION") {
      setOpenCategories((current) => new Set(current).add(inspectionCategory));
    }
  };

  const toggleItem = (category, name) => {
    const key = catalogKey(category, name);

    setForm((current) => ({
      ...current,
      items: current.items.some((item) => item.key === key)
        ? current.items.filter((item) => item.key !== key)
        : [...current.items, { key, category, name, cost: "", custom: false }],
    }));
  };

  const updateItem = (key, changes) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.key === key ? { ...item, ...changes } : item)),
    }));
  };

  const setCost = (key, cost) => updateItem(key, { cost });

  const addCustomItem = () => {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        { key: nextCustomKey(), category: otherCategory, name: "", cost: "", custom: true },
      ],
    }));
  };

  const removeItem = (key) => {
    setForm((current) => ({ ...current, items: current.items.filter((item) => item.key !== key) }));
  };

  const onToggleCategory = (category, isOpen) => {
    setOpenCategories((current) => {
      const next = new Set(current);

      if (isOpen) {
        next.add(category);
      } else {
        next.delete(category);
      }

      return next;
    });
  };

  // A required price inside a collapsed category cannot show its validation message,
  // so categories with selected items are opened before the browser validates the form.
  const openSelectedCategories = () => {
    flushSync(() => {
      setOpenCategories((current) => {
        const next = new Set(current);

        for (const item of form.items) {
          if (!item.custom) {
            next.add(item.category);
          }
        }

        return next;
      });
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    const body = {
      carId,
      kind: form.kind,
      title: form.title,
      entryDate: form.entryDate,
      odometerKm: Number(form.odometerKm),
      nextInspectionDate: form.kind === "INSPECTION" ? nextInspectionDate || null : null,
      items: form.items.map((item) => ({
        category: item.category,
        name: item.name,
        cost: Number(item.cost),
      })),
    };

    try {
      if (entry) {
        await updateService({ id: entry.id, ...body }).unwrap();
      } else {
        await addService(body).unwrap();
      }

      onSaved();
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <KindToggle kind={form.kind} onChange={setKind} />
      <div className="grid grid-cols-2 gap-4">
        <Field
          id="service-date"
          label="Data"
          name="entryDate"
          type="date"
          value={form.entryDate}
          onChange={setField}
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
          onChange={setField}
          required
        />
        <Field
          id="service-title"
          label="Tytuł (opcjonalnie)"
          name="title"
          placeholder={form.kind === "INSPECTION" ? "Badanie techniczne" : "np. Przegląd przed zimą"}
          maxLength={80}
          className="col-span-2"
          value={form.title}
          onChange={setField}
        />
        {form.kind === "INSPECTION" ? (
          <div className="col-span-2 grid gap-1">
            <Field
              id="service-next-inspection"
              label="Badanie ważne do"
              name="nextInspectionDate"
              type="date"
              value={nextInspectionDate}
              onChange={setField}
            />
            <p className="text-xs text-muted-foreground">
              {entry
                ? "Wpisz datę, jeśli chcesz zmienić termin badania auta."
                : "Ten termin pojawi się na Pulpicie."}
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-2">
        <h3 className="font-heading font-semibold">Co zostało zrobione?</h3>
        {serviceCatalog
          .filter((group) => group.items.length > 0)
          // For an inspection, its own category (with the fee) comes first.
          .toSorted((a, b) =>
            form.kind === "INSPECTION"
              ? Number(b.category === inspectionCategory) - Number(a.category === inspectionCategory)
              : 0,
          )
          .map((group) => {
            const selectedCount = group.items.filter((name) =>
              selectedKeys.has(catalogKey(group.category, name)),
            ).length;

            return (
              <details
                key={group.category}
                open={openCategories.has(group.category)}
                onToggle={(event) => onToggleCategory(group.category, event.currentTarget.open)}
                className="group rounded-xl border bg-background/40"
              >
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 font-medium [&::-webkit-details-marker]:hidden">
                  <span>{group.category}</span>
                  <span className="flex items-center gap-2">
                    {selectedCount > 0 ? (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                        {selectedCount}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground transition-transform group-open:rotate-45">
                      <Icon icon={Add01Icon} size={18} />
                    </span>
                  </span>
                </summary>
                <ul className="grid border-t px-3 py-1">
                  {group.items.map((name) => {
                    const key = catalogKey(group.category, name);
                    const item = form.items.find((current) => current.key === key);
                    const checkboxId = `item-${key}`;

                    return (
                      <li key={key} className="flex min-h-12 items-center gap-3">
                        <Checkbox
                          id={checkboxId}
                          className="size-5"
                          checked={Boolean(item)}
                          onCheckedChange={() => toggleItem(group.category, name)}
                        />
                        <label htmlFor={checkboxId} className="flex-1 py-2">
                          {name}
                        </label>
                        {item ? <PriceInput item={item} label={name} onChange={setCost} /> : null}
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
      </div>

      <div className="grid gap-2">
        <h3 className="font-heading font-semibold">Własne pozycje</h3>
        {customItems.map((item, index) => (
          <div key={item.key} className="grid gap-2 rounded-xl border border-dashed p-3">
            <div className="flex gap-2">
              <Input
                aria-label={`Nazwa własnej pozycji ${index + 1}`}
                placeholder="Co zostało zrobione?"
                className="h-10 text-base"
                maxLength={80}
                value={item.name}
                onChange={(event) => updateItem(item.key, { name: event.target.value })}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Usuń pozycję"
                className="size-10 shrink-0 text-muted-foreground"
                onClick={() => removeItem(item.key)}
              >
                <Icon icon={Cancel01Icon} size={18} />
              </Button>
            </div>
            <div className="flex gap-2">
              <Select
                value={item.category}
                onValueChange={(category) => updateItem(item.key, { category })}
              >
                <SelectTrigger
                  aria-label="Kategoria"
                  className="h-10 min-w-0 flex-1 px-3 text-sm data-[size=default]:h-10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  {categoryNames.map((category) => (
                    <SelectItem key={category} value={category} className="min-h-10 text-sm">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PriceInput item={item} label={item.name || "własna pozycja"} onChange={setCost} />
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="lg" onClick={addCustomItem}>
          <Icon icon={Add01Icon} size={18} />
          Dodaj własną pozycję
        </Button>
      </div>

      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {/* Reaches over the drawer's bottom padding so nothing scrolls visibly beneath it. */}
      <div className="sticky bottom-[calc(-1.5rem-env(safe-area-inset-bottom))] -mx-4 -mb-[calc(1.5rem+env(safe-area-inset-bottom))] grid gap-3 border-t bg-popover px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">
            Razem · {form.items.length}{" "}
            {plural(form.items.length, "pozycja", "pozycje", "pozycji")}
          </span>
          <span className="font-heading text-xl font-semibold">{money.format(totalCents / 100)}</span>
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={saveState.isLoading || form.items.length === 0}
          onClick={openSelectedCategories}
        >
          {saveState.isLoading ? "Zapisywanie..." : entry ? "Zapisz zmiany" : "Zapisz wpis"}
        </Button>
      </div>
    </form>
  );
};
