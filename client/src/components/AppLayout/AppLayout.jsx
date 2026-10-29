import { useState } from "react";
import { useDispatch } from "react-redux";
import { Outlet } from "react-router";
import { api, useGetCarsQuery } from "../../app/api.js";
import { logout } from "../../features/auth/authSlice.js";
import { AddCarForm } from "../AddCarForm/AddCarForm.jsx";
import { BottomNav } from "../BottomNav/BottomNav.jsx";
import { CarSwitcher } from "../CarSwitcher/CarSwitcher.jsx";
import { UserMenu } from "../UserMenu/UserMenu.jsx";

const carKey = "autowydatki-car";

// The last chosen car is a per-device convenience, so storage failures are ignored.
const readStoredCarId = () => {
  try {
    const value = Number(localStorage.getItem(carKey));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const storeCarId = (carId) => {
  try {
    localStorage.setItem(carKey, String(carId));
  } catch {
    // Ignored, see readStoredCarId.
  }
};

export const AppLayout = () => {
  const dispatch = useDispatch();
  const carsQuery = useGetCarsQuery();
  const [chosenCarId, setChosenCarId] = useState(readStoredCarId);
  const cars = carsQuery.data ?? [];
  const selectedCar = cars.find((car) => car.id === chosenCarId) ?? cars[0] ?? null;

  const onSelectCar = (carId) => {
    setChosenCarId(carId);
    storeCarId(carId);
  };

  const onLogout = () => {
    dispatch(logout());
    dispatch(api.util.resetApiState());
  };

  return (
    <div className="min-h-svh md:grid md:grid-cols-[6rem_1fr]">
      <BottomNav />
      <div className="min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
        <header className="sticky top-0 z-30 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <CarSwitcher cars={cars} selectedCar={selectedCar} onSelect={onSelectCar} />
            <UserMenu onLogout={onLogout} />
          </div>
        </header>
        <main className="mx-auto grid max-w-3xl gap-6 px-4 py-6">
          {carsQuery.isLoading ? <p className="text-muted-foreground">Wczytywanie aut...</p> : null}
          {carsQuery.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Nie udało się wczytać aut.
            </p>
          ) : null}
          {!carsQuery.isLoading && !carsQuery.isError && !selectedCar ? (
            <section className="grid gap-4 rounded-2xl border bg-card p-5">
              <div className="grid gap-1">
                <h1 className="font-heading text-2xl font-semibold">Dodaj pierwsze auto</h1>
                <p className="text-sm text-muted-foreground">
                  Potem zapiszesz tankowania, serwisy i zobaczysz koszty.
                </p>
              </div>
              <AddCarForm onAdded={onSelectCar} />
            </section>
          ) : null}
          {selectedCar ? <Outlet context={{ car: selectedCar }} /> : null}
        </main>
      </div>
    </div>
  );
};
