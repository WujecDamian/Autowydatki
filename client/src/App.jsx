import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { api, useGetCarsQuery } from "./app/api.js";
import { logout } from "./features/auth/authSlice.js";
import { CarSidebar } from "./components/CarSidebar/CarSidebar.jsx";
import { FuelSection } from "./components/FuelSection/FuelSection.jsx";
import { Login } from "./components/Login/Login.jsx";
import { ServiceSection } from "./components/ServiceSection/ServiceSection.jsx";
import { Summary } from "./components/Summary/Summary.jsx";

const App = () => {
  const token = useSelector((state) => state.auth.token);
  const dispatch = useDispatch();
  const carsQuery = useGetCarsQuery(undefined, { skip: !token });
  const [chosenCarId, setChosenCarId] = useState(null);
  const cars = carsQuery.data ?? [];
  const selectedCar = cars.find((car) => car.id === chosenCarId) ?? cars[0] ?? null;

  if (!token) {
    return <Login />;
  }

  const onLogout = () => {
    setChosenCarId(null);
    dispatch(logout());
    dispatch(api.util.resetApiState());
  };

  return (
    <div className="min-h-svh bg-muted/40 md:grid md:grid-cols-[17rem_1fr]">
      <CarSidebar
        cars={cars}
        isLoading={carsQuery.isLoading}
        selectedCar={selectedCar}
        onSelect={setChosenCarId}
      />
      <div className="min-w-0">
        <header className="border-b bg-background">
          <div className="flex items-center justify-between gap-4 px-4 py-4">
            <div>
              <h1 className="text-2xl font-semibold">Autowydatki</h1>
              <p className="text-sm text-muted-foreground">
                {selectedCar ? selectedCar.name : "Dodaj auto"}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={onLogout}>
              Wyloguj
            </Button>
          </div>
        </header>
        <main className="grid gap-8 px-4 py-6">
          {carsQuery.isLoading ? <p>Wczytywanie aut...</p> : null}
          {carsQuery.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Nie udało się wczytać aut.
            </p>
          ) : null}
          {!carsQuery.isLoading && !carsQuery.isError && !selectedCar ? (
            <p>Dodaj auto, żeby zobaczyć koszty.</p>
          ) : null}
          {selectedCar ? (
            <>
              <Summary carId={selectedCar.id} purchasePrice={selectedCar.purchasePrice} />
              <div className="grid items-start gap-8 lg:grid-cols-2">
                <FuelSection carId={selectedCar.id} />
                <ServiceSection carId={selectedCar.id} />
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
};

export default App;
