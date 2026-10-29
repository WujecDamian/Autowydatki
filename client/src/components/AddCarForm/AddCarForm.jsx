import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAddCarMutation } from "../../app/api.js";
import { errorText } from "../../lib/format.js";
import { Field } from "../Field/Field.jsx";

export const AddCarForm = ({ onAdded }) => {
  const [name, setName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [addCar, addState] = useAddCarMutation();
  const errorMessage = errorText(addState.error, "Nie udało się dodać auta.");

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
        placeholder="np. Skoda Octavia"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <Field
        id="new-car-price"
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
      <Button type="submit" size="lg" disabled={addState.isLoading}>
        {addState.isLoading ? "Dodawanie..." : "Dodaj auto"}
      </Button>
    </form>
  );
};
