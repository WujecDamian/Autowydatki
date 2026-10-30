import { useState } from "react";
import { useOutletContext } from "react-router";
import { Badge } from "@/components/ui/badge";
import { useDeleteServiceMutation, useGetServicesQuery } from "../../app/api.js";
import { formatDate, kilometers, money } from "../../lib/format.js";
import { useMediaQuery } from "../../lib/useMediaQuery.js";
import { FormPanel } from "../FormPanel/FormPanel.jsx";
import { AddButton } from "../AddButton/AddButton.jsx";
import { ConfirmDelete } from "../ConfirmDelete/ConfirmDelete.jsx";
import { EditButton } from "../EditButton/EditButton.jsx";
import { FormDrawer } from "../FormDrawer/FormDrawer.jsx";
import { PageHeader } from "../PageHeader/PageHeader.jsx";
import { ServiceForm } from "../ServiceForm/ServiceForm.jsx";

const entryTitle = (entry) => {
  if (entry.title) {
    return entry.title;
  }

  if (entry.kind === "INSPECTION") {
    return "Badanie techniczne";
  }

  return entry.items.length === 1 ? entry.items[0].name : "Naprawa";
};

const itemSummary = (items) => {
  const names = items.slice(0, 3).map((item) => item.name);
  const rest = items.length - names.length;

  return rest > 0 ? `${names.join(", ")} +${rest}` : names.join(", ");
};

export const ServiceSection = () => {
  const { car } = useOutletContext();
  const serviceQuery = useGetServicesQuery(car.id);
  const [deleteService, deleteState] = useDeleteServiceMutation();
  // null: drawer closed, { entry: null }: new entry, { entry }: editing that entry.
  const [editing, setEditing] = useState(null);
  const desktop = useMediaQuery("(min-width: 64rem)");
  const active = editing ?? (desktop ? { entry: null } : null);
  const services = serviceQuery.data ?? [];
  const serviceForm = active ? (
    <ServiceForm
      key={active.entry?.id ?? "new"}
      carId={car.id}
      entry={active.entry}
      onSaved={() => setEditing(null)}
    />
  ) : null;

  return (
    <section className="grid gap-4">
      <PageHeader title="Serwis" description="Naprawy i badania techniczne." />
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
          Brak wpisów. Dodaj pierwszą naprawę albo badanie przyciskiem +.
        </p>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <ul className="grid gap-3">
        {services.map((entry) => (
          <li key={entry.id} data-glow="" className="flex items-start gap-1 rounded-2xl border bg-card p-1 md:items-center">
            <button
              type="button"
              onClick={() => setEditing({ entry })}
              className="grid min-w-0 flex-1 gap-2 rounded-xl p-3 text-left transition-colors hover:bg-accent/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid min-w-0 gap-1">
                  <Badge
                    variant={entry.kind === "INSPECTION" ? "default" : "secondary"}
                    className="w-fit"
                  >
                    {entry.kind === "INSPECTION" ? "Badanie techniczne" : "Naprawa"}
                  </Badge>
                  <p className="truncate font-medium">{entryTitle(entry)}</p>
                </div>
                <p className="shrink-0 font-heading text-lg font-semibold tabular-nums">
                  {money.format(entry.cost)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(entry.entryDate)} · {kilometers.format(entry.odometerKm)} km
              </p>
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {itemSummary(entry.items)}
              </p>
            </button>
            <div className="flex flex-col pt-2 pr-1 md:flex-row md:pt-0">
              <EditButton label="Edytuj wpis" onClick={() => setEditing({ entry })} />
              <ConfirmDelete
                title="Usunąć wpis?"
                description={`„${entryTitle(entry)}” z ${formatDate(entry.entryDate)} zostanie usunięty razem z pozycjami.`}
                onConfirm={() => deleteService(entry.id)}
                disabled={deleteState.isLoading}
              />
            </div>
          </li>
        ))}
      </ul>
      {desktop && active ? (
        <FormPanel
          title={active.entry ? "Edytuj wpis" : "Nowy wpis serwisowy"}
          onReset={editing ? () => setEditing(null) : undefined}
        >
          {serviceForm}
        </FormPanel>
      ) : null}
      </div>
      <AddButton label="Dodaj wpis serwisowy" onClick={() => setEditing({ entry: null })} />
      <FormDrawer
        open={editing !== null && !desktop}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        title={editing?.entry ? "Edytuj wpis" : "Nowy wpis serwisowy"}
      >
        {serviceForm}
      </FormDrawer>
    </section>
  );
};
