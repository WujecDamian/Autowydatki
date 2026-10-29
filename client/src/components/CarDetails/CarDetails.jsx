import { useState } from "react";
import { useOutletContext } from "react-router";
import { Button } from "@/components/ui/button";
import { useUpdateCarPriceMutation } from "../../app/api.js";
import { errorText } from "../../lib/format.js";
import { Field } from "../Field/Field.jsx";
import { PageHeader } from "../PageHeader/PageHeader.jsx";

const PurchasePriceForm = ({ car }) => {
  const [purchasePrice, setPurchasePrice] = useState(
    car.purchasePrice === null ? "" : String(car.purchasePrice),
  );
  const [updateCarPrice, updateState] = useUpdateCarPriceMutation();
  const errorMessage = errorText(updateState.error, "Nie udało się zapisać ceny zakupu.");

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      await updateCarPrice({
        id: car.id,
        purchasePrice: purchasePrice === "" ? null : Number(purchasePrice),
      }).unwrap();
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  return (
    <form className="grid gap-4 rounded-2xl border bg-card p-4" onSubmit={onSubmit}>
      <Field
        id="purchase-price"
        label="Cena zakupu (zł)"
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={purchasePrice}
        onChange={(event) => setPurchasePrice(event.target.value)}
      />
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      {updateState.isSuccess ? <p className="text-sm text-success">Zapisano.</p> : null}
      <Button type="submit" variant="secondary" size="lg" disabled={updateState.isLoading}>
        {updateState.isLoading ? "Zapisywanie..." : "Zapisz cenę"}
      </Button>
    </form>
  );
};

export const CarDetails = () => {
  const { car } = useOutletContext();

  return (
    <section className="grid gap-4">
      <PageHeader title={car.name} description="Dane auta" />
      <PurchasePriceForm key={car.id} car={car} />
    </section>
  );
};
