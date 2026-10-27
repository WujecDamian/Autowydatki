import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddCarMutation, useUpdateCarPriceMutation } from "../../app/api.js";

const PurchasePriceForm = ({ car }) => {
  const [purchasePrice, setPurchasePrice] = useState(
    car.purchasePrice === null ? "" : String(car.purchasePrice),
  );
  const [updateCarPrice, updateState] = useUpdateCarPriceMutation();
  const errorMessage =
    updateState.error?.data?.message || (updateState.error ? "Nie udało się zapisać ceny zakupu." : "");

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
    <form className="grid gap-3 border-t px-4 py-4" onSubmit={onSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="purchase-price">Cena zakupu (zł)</Label>
        <Input
          id="purchase-price"
          type="number"
          min="0"
          step="0.01"
          value={purchasePrice}
          onChange={(event) => setPurchasePrice(event.target.value)}
        />
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" variant="outline" disabled={updateState.isLoading}>
        {updateState.isLoading ? "Zapisywanie..." : "Zapisz cenę"}
      </Button>
    </form>
  );
};

export const CarSidebar = ({ cars, isLoading, selectedCar, onSelect }) => {
  const [name, setName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [addCar, addState] = useAddCarMutation();
  const errorMessage = addState.error?.data?.message || (addState.error ? "Nie udało się dodać auta." : "");

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      const car = await addCar({
        name,
        purchasePrice: purchasePrice === "" ? null : Number(purchasePrice),
      }).unwrap();
      setName("");
      setPurchasePrice("");
      onSelect(car.id);
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  return (
    <aside className="border-b bg-background md:min-h-svh md:border-r md:border-b-0">
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold">Auta</h2>
      </div>
      <nav className="grid gap-1 px-3" aria-label="Auta">
        {!isLoading && cars.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">Brak aut.</p>
        ) : null}
        {cars.map((car) => {
          const isSelected = car.id === selectedCar?.id;

          return (
            <button
              key={car.id}
              type="button"
              onClick={() => onSelect(car.id)}
              aria-current={isSelected ? "page" : undefined}
              className={
                isSelected
                  ? "rounded-md bg-primary px-3 py-2 text-left text-sm text-primary-foreground"
                  : "rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
              }
            >
              {car.name}
            </button>
          );
        })}
      </nav>
      {selectedCar ? <PurchasePriceForm key={selectedCar.id} car={selectedCar} /> : null}
      <form className="grid gap-3 p-4" onSubmit={onSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="car-name">Nowe auto</Label>
          <Input
            id="car-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-car-price">Cena zakupu (zł)</Label>
          <Input
            id="new-car-price"
            type="number"
            min="0"
            step="0.01"
            value={purchasePrice}
            onChange={(event) => setPurchasePrice(event.target.value)}
          />
        </div>
        {errorMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <Button type="submit" disabled={addState.isLoading}>
          {addState.isLoading ? "Dodawanie..." : "Dodaj auto"}
        </Button>
      </form>
    </aside>
  );
};
