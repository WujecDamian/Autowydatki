import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
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
import { errorText, todayString } from "../../lib/format.js";
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

const CarForm = ({ car }) => {
  const [form, setForm] = useState(() => formFromCar(car));
  const [updateCar, updateState] = useUpdateCarMutation();
  const errorMessage = errorText(updateState.error, "Nie udało się zapisać auta.");
  const today = todayString();

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

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
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  return (
    <form className="grid gap-4 rounded-2xl border bg-card p-4" onSubmit={onSubmit}>
      <Field
        id="car-name-edit"
        label="Nazwa auta"
        name="name"
        maxLength={60}
        value={form.name}
        onChange={onChange}
        required
      />
      <Field
        id="purchase-price"
        label="Cena zakupu (zł)"
        name="purchasePrice"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={form.purchasePrice}
        onChange={onChange}
      />
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
      <div className="grid gap-4 border-t pt-4">
        <h2 className="font-heading font-semibold">Terminy</h2>
        {dateInputs.map(({ field, label }) => {
          const status = getExpiryStatus(form[field], today);

          return (
            <div key={field} className="grid gap-2">
              <Field
                id={`car-${field}`}
                label={label}
                name={field}
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
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      {updateState.isSuccess && !updateState.isLoading ? (
        <p className="text-sm text-success">Zapisano.</p>
      ) : null}
      <Button type="submit" size="lg" disabled={updateState.isLoading}>
        {updateState.isLoading ? "Zapisywanie..." : "Zapisz"}
      </Button>
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
      navigate("/");
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
    <section className="grid gap-4">
      <PageHeader title={car.name} description="Zdjęcia, dane auta i terminy" />
      <CarPhotos car={car} />
      <CarForm key={car.id} car={car} />
      <DeleteCar car={car} />
    </section>
  );
};
