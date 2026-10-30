import { useEffect, useRef, useState } from "react";
import { useBlocker, useLocation, useNavigate, useOutletContext } from "react-router";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useDeleteCarMutation, useUpdateCarMutation } from "../../app/api.js";
import { expiryTone, getExpiryStatus } from "../../lib/expiry.js";
import { errorText, formErrors, todayString } from "../../lib/format.js";
import { CarPhotos } from "../CarPhotos/CarPhotos.jsx";
import { Field } from "../Field/Field.jsx";
import { PageHeader } from "../PageHeader/PageHeader.jsx";

const dateInputs = [
  { field: "inspectionValidUntil", label: "Badanie techniczne ważne do" },
  { field: "ocValidUntil", label: "OC ważne do" },
  { field: "acValidUntil", label: "AC ważne do (jeśli masz)" },
];

const formFromCar = (car) => ({
  name: car.name,
  purchasePrice: car.purchasePrice === null ? "" : String(car.purchasePrice),
  inspectionValidUntil: car.inspectionValidUntil ?? "",
  ocValidUntil: car.ocValidUntil ?? "",
  acValidUntil: car.acValidUntil ?? "",
  hasLpg: car.hasLpg,
});

const isSameForm = (a, b) => Object.keys(a).every((key) => a[key] === b[key]);

// Leaving /auto with unsaved changes asks first; deleting the car passes discardChanges to skip that.
const useUnsavedChangesGuard = (dirty) => {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      currentLocation.pathname !== nextLocation.pathname &&
      !nextLocation.state?.discardChanges,
  );

  // Closing or reloading the tab can only get the browser's own prompt.
  useEffect(() => {
    if (!dirty) {
      return;
    }

    const onBeforeUnload = (event) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return blocker;
};

const highlightMs = 1500;

// The dashboard's expiry tiles link here with the date they show, which gets scrolled to and briefly highlighted.
const useHighlightedField = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [highlighted, setHighlighted] = useState(() => location.state?.highlight ?? null);
  const refs = useRef({});

  useEffect(() => {
    if (!highlighted) {
      return;
    }

    refs.current[highlighted]?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Drop the request from history so a refresh or going back doesn't replay it.
    navigate(location.pathname, { replace: true, state: null });
    const timeout = setTimeout(() => setHighlighted(null), highlightMs);
    return () => clearTimeout(timeout);
  }, [highlighted, location.pathname, navigate]);

  const fieldRef = (field) => (element) => {
    refs.current[field] = element;
  };

  return { highlighted, fieldRef };
};

const CarForm = ({ car }) => {
  const [saved, setSaved] = useState(() => formFromCar(car));
  const [form, setForm] = useState(saved);
  const dirty = !isSameForm(form, saved);
  const blocker = useUnsavedChangesGuard(dirty);
  const { highlighted, fieldRef } = useHighlightedField();
  const [updateCar, updateState] = useUpdateCarMutation();
  const errors = formErrors(updateState.error, "Nie udało się zapisać auta.", [
    "name",
    "purchasePrice",
    "inspectionValidUntil",
    "ocValidUntil",
    "acValidUntil",
  ]);
  const errorMessage = errors.message;
  const today = todayString();

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const submitted = form;

    try {
      await updateCar({
        id: car.id,
        name: form.name,
        purchasePrice: form.purchasePrice === "" ? null : Number(form.purchasePrice),
        inspectionValidUntil: form.inspectionValidUntil || null,
        ocValidUntil: form.ocValidUntil || null,
        acValidUntil: form.acValidUntil || null,
        hasLpg: form.hasLpg,
      }).unwrap();
      setSaved(submitted);
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  return (
    <form className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6" onSubmit={onSubmit}>
      <section aria-labelledby="car-dates-title" data-glow="" style={{ "--i": 2 }} className="reveal grid gap-4 rounded-2xl border bg-card p-4 lg:p-6">
        <h2 id="car-dates-title" className="font-heading font-semibold">
          Terminy
        </h2>
        {dateInputs.map(({ field, label }) => {
          const status = getExpiryStatus(form[field], today);

          return (
            <div
              key={field}
              ref={fieldRef(field)}
              className={cn(
                "-m-2 grid gap-2 rounded-xl p-2 ring-2 ring-transparent transition-[background-color,box-shadow] duration-500",
                highlighted === field && "bg-primary/10 ring-primary",
              )}
            >
              <Field
                id={`car-${field}`}
                label={label}
                name={field}
                error={errors.field(field)}
                type="date"
                value={form[field]}
                onChange={onChange}
              />
              {status ? (
                <p
                  className={cn(
                    "w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    expiryTone[status.level],
                  )}
                >
                  {status.message}
                </p>
              ) : null}
            </div>
          );
        })}
      </section>
      <section aria-labelledby="car-data-title" data-glow="" style={{ "--i": 3 }} className="reveal grid gap-4 rounded-2xl border bg-card p-4 lg:p-6">
        <h2 id="car-data-title" className="font-heading font-semibold">
          Dane auta
        </h2>
      <Field
        id="car-name-edit"
        label="Nazwa auta"
        name="name"
        error={errors.field("name")}
        maxLength={60}
        value={form.name}
        onChange={onChange}
        required
      />
      <Field
        id="purchase-price"
        label="Cena zakupu (zł)"
        name="purchasePrice"
        error={errors.field("purchasePrice")}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={form.purchasePrice}
        onChange={onChange}
      />
      {car.powertrain === "ELECTRIC" ? null : (
      <label
        htmlFor="car-has-lpg"
        className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border bg-background/40 px-3"
      >
        <span className="grid gap-0.5">
          <span className="font-medium">Instalacja LPG</span>
          <span className="text-xs text-muted-foreground">
            Tankowania dzielą się na benzynę i LPG, każde z osobnym spalaniem.
          </span>
        </span>
        <Switch
          id="car-has-lpg"
          className="mr-1 scale-125"
          checked={form.hasLpg}
          onCheckedChange={(hasLpg) => setForm((current) => ({ ...current, hasLpg }))}
        />
      </label>
      )}
      </section>
      <div className="grid gap-4 lg:col-span-2">
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      {updateState.isSuccess && !updateState.isLoading && !dirty ? (
        <p className="text-sm text-success">Zapisano.</p>
      ) : null}
      <Button type="submit" size="lg" disabled={updateState.isLoading || !dirty}>
        {updateState.isLoading ? "Zapisywanie..." : "Zapisz"}
      </Button>
      {dirty ? (
        // Pinned above the bottom nav (or at the bottom next to the rail) until the changes are saved or undone.
        <div
          data-unsaved=""
          className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 px-4 md:bottom-6 md:left-24"
        >
          <div className="mx-auto flex max-w-6xl items-center gap-2 rounded-2xl border border-primary/50 bg-card/95 p-2 pl-4 shadow-lg shadow-black/30 backdrop-blur-xl">
            <p className="min-w-0 flex-1 text-sm font-medium">Masz niezapisane zmiany</p>
            <Button type="button" variant="ghost" size="lg" onClick={() => setForm(saved)}>
              Cofnij
            </Button>
            <Button type="submit" size="lg" disabled={updateState.isLoading}>
              {updateState.isLoading ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </div>
        </div>
      ) : null}
      </div>
      <AlertDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") {
            blocker.reset();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wyjść bez zapisywania?</AlertDialogTitle>
            <AlertDialogDescription>
              Zmiany w danych auta nie zostały zapisane. Jeśli wyjdziesz teraz, przepadną.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zostań i zapisz</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                // Keep the dialog from closing itself, which would reset the blocker before it proceeds.
                event.preventDefault();
                blocker.proceed();
              }}
            >
              Wyjdź bez zapisywania
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};

const DeleteCar = ({ car }) => {
  const navigate = useNavigate();
  const [deleteCar, deleteState] = useDeleteCarMutation();
  const errorMessage = errorText(deleteState.error, "Nie udało się usunąć auta.");

  const onConfirm = async () => {
    try {
      await deleteCar(car.id).unwrap();
      navigate("/", { state: { discardChanges: true } });
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  return (
    <section className="grid gap-3 rounded-2xl border border-destructive/30 p-4">
      <div className="grid gap-1">
        <h2 className="font-heading font-semibold">Usuń auto</h2>
        <p className="text-sm text-muted-foreground">
          Razem z autem znikną wszystkie jego tankowania, wpisy serwisowe, zdjęcia i notatki.
        </p>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" size="lg" disabled={deleteState.isLoading}>
            Usuń auto
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć „{car.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Tankowania, wpisy serwisowe, zdjęcia i notatki tego auta zostaną usunięte. Tego nie da się cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirm}>
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export const CarDetails = () => {
  const { car } = useOutletContext();

  return (
    <section className="grid gap-4 has-[[data-unsaved]]:pb-20">
      <PageHeader title={car.name} description="Zdjęcia, dane auta i terminy" />
      <CarPhotos car={car} />
      <CarForm key={car.id} car={car} />
      <DeleteCar car={car} />
    </section>
  );
};
