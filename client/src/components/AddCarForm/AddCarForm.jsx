import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAddCarMutation } from "../../app/api.js";
import { formErrors } from "../../lib/format.js";
import { limits } from "../../lib/limits.js";
import { Field } from "../Field/Field.jsx";

export const AddCarForm = ({ onAdded }) => {
  const [name, setName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [addCar, addState] = useAddCarMutation();
  const errors = formErrors(addState.error, "Nie udało się dodać auta.", ["name", "purchasePrice"]);
  const errorMessage = errors.message;

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      const car = await addCar({
        name,
        purchasePrice: purchasePrice === "" ? null : Number(purchasePrice),
      }).unwrap();
      setName("");
      setPurchasePrice("");
      onAdded(car.id);
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <Field
        id="car-name"
        label="Nazwa auta"
        error={errors.field("name")}
        maxLength={60}
        placeholder="np. Skoda Octavia"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <Field
        id="new-car-price"
        label="Cena zakupu (zł)"
        error={errors.field("purchasePrice")}
        type="number"
        inputMode="decimal"
        min="0"
        max={limits.maximumPurchasePrice}
        step="0.01"
        value={purchasePrice}
        onChange={(event) => setPurchasePrice(event.target.value)}
      />
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={addState.isLoading}>
        {addState.isLoading ? "Dodawanie..." : "Dodaj auto"}
      </Button>
    </form>
  );
};
