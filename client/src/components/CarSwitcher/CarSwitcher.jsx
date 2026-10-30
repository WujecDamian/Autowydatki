import { useState } from "react";
import { ArrowDown01Icon, Car01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { carNeedsAttention, mostUrgentExpiry } from "../../lib/expiry.js";
import { todayString } from "../../lib/format.js";
import { FormDrawer } from "../FormDrawer/FormDrawer.jsx";
import { Icon } from "../Icon/Icon.jsx";

const CarCard = ({ car, isSelected, today, onChoose }) => {
  const urgent = mostUrgentExpiry(car, today);

  return (
    <button
      type="button"
      onClick={() => onChoose(car.id)}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "relative block aspect-[16/9] w-full overflow-hidden rounded-3xl border text-left transition-transform active:scale-[0.98]",
        isSelected ? "border-transparent ring-2 ring-primary" : "border-border",
      )}
    >
      {car.coverUrl ? (
        <img src={car.coverUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/40 via-primary/10 to-card text-primary/70">
          <Icon icon={Car01Icon} size={64} />
        </span>
      )}
      {/* Frosted strip so the name stays readable on any photo. */}
      <span className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-white/10 bg-background/45 px-4 py-3 backdrop-blur-md">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-heading text-lg font-semibold">{car.name}</span>
          {urgent ? (
            <span className="block truncate text-xs font-medium text-destructive">
              {urgent.label}: {urgent.status.message.toLowerCase()}
            </span>
          ) : null}
        </span>
        {isSelected ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Icon icon={Tick02Icon} size={18} />
            <span className="sr-only">Wybrane</span>
          </span>
        ) : null}
      </span>
    </button>
  );
};

export const CarSwitcher = ({ cars, selectedCar, onSelect }) => {
  const [open, setOpen] = useState(false);
  const today = todayString();
  const anyNeedsAttention = cars.some((car) => carNeedsAttention(car, today));

  const choose = (carId) => {
    onSelect(carId);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={cars.length === 0}
        className="-ml-2 flex min-w-0 items-center gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-accent/50 disabled:hover:bg-transparent"
      >
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          {selectedCar?.coverThumbUrl ? (
            <img src={selectedCar.coverThumbUrl} alt="" className="size-full rounded-xl object-cover" />
          ) : (
            <Icon icon={Car01Icon} />
          )}
          {anyNeedsAttention ? (
            <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-destructive">
              <span className="sr-only">Termin wymaga uwagi</span>
            </span>
          ) : null}
        </span>
        <span className="min-w-0">
          <span className="block text-xs text-muted-foreground">Autowydatki</span>
          <span className="block truncate font-heading font-semibold">
            {selectedCar ? selectedCar.name : "Dodaj auto"}
          </span>
        </span>
        {cars.length > 0 ? (
          <Icon icon={ArrowDown01Icon} size={16} className="shrink-0 text-muted-foreground" />
        ) : null}
      </button>
      <FormDrawer open={open} onOpenChange={setOpen} title="Twoje auta">
        <ul className="grid gap-3" aria-label="Auta">
          {cars.map((car) => (
            <li key={car.id}>
              <CarCard
                car={car}
                isSelected={car.id === selectedCar?.id}
                today={today}
                onChoose={choose}
              />
            </li>
          ))}
        </ul>
      </FormDrawer>
    </>
  );
};
