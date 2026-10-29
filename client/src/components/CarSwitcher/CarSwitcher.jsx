import { useState } from "react";
import { ArrowDown01Icon, Car01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { AddCarForm } from "../AddCarForm/AddCarForm.jsx";
import { FormDrawer } from "../FormDrawer/FormDrawer.jsx";
import { Icon } from "../Icon/Icon.jsx";

export const CarSwitcher = ({ cars, selectedCar, onSelect }) => {
  const [open, setOpen] = useState(false);

  const choose = (carId) => {
    onSelect(carId);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-2 flex min-w-0 items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-accent/50"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon icon={Car01Icon} />
        </span>
        <span className="min-w-0">
          <span className="block text-xs text-muted-foreground">Autowydatki</span>
          <span className="block truncate font-heading font-semibold">
            {selectedCar ? selectedCar.name : "Dodaj auto"}
          </span>
        </span>
        <Icon icon={ArrowDown01Icon} size={16} className="shrink-0 text-muted-foreground" />
      </button>
      <FormDrawer open={open} onOpenChange={setOpen} title="Twoje auta">
        <div className="grid gap-6">
          {cars.length > 0 ? (
            <ul className="grid gap-2" aria-label="Auta">
              {cars.map((car) => {
                const isSelected = car.id === selectedCar?.id;

                return (
                  <li key={car.id}>
                    <button
                      type="button"
                      onClick={() => choose(car.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                        isSelected ? "border-primary/60 bg-primary/10" : "hover:bg-accent/50",
                      )}
                    >
                      <Icon icon={Car01Icon} className="text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-medium">{car.name}</span>
                      {isSelected ? <Icon icon={Tick02Icon} className="text-primary" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className="grid gap-3 border-t pt-4">
            <h3 className="font-heading font-semibold">Nowe auto</h3>
            <AddCarForm onAdded={choose} />
          </div>
        </div>
      </FormDrawer>
    </>
  );
};
