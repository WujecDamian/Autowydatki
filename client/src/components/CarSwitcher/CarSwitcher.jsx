import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown01Icon, Car01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { carNeedsAttention, mostUrgentExpiry } from "../../lib/expiry.js";
import { todayString } from "../../lib/format.js";
import { FormDrawer } from "../FormDrawer/FormDrawer.jsx";
import { Icon } from "../Icon/Icon.jsx";

const CarCard = ({ car, isSelected, today, onChoose, alone }) => {
  const urgent = mostUrgentExpiry(car, today);

  return (
    <button
      type="button"
      data-glow=""
      onClick={() => onChoose(car.id)}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "group relative block w-full overflow-hidden rounded-3xl border text-left shadow-lg shadow-black/25 transition-transform active:scale-[0.98]",
        // A lone card spans the whole drawer, so a cinematic frame keeps it from getting too tall.
        alone ? "aspect-[21/9]" : "aspect-[16/9]",
        isSelected
          ? "border-transparent ring-[3px] ring-primary ring-offset-2 ring-offset-background"
          : "border-border",
      )}
    >
      {car.coverUrl ? (
        <img
          src={car.coverUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
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
            <span className="block truncate text-xs font-medium text-destructive-soft">
              {urgent.label}: {urgent.status.message.toLowerCase()}
            </span>
          ) : null}
        </span>
        {isSelected ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-fill text-primary-foreground">
            <Icon icon={Tick02Icon} size={18} />
            <span className="sr-only">Wybrane</span>
          </span>
        ) : null}
      </span>
    </button>
  );
};

// Cards stay wide: on a phone each takes most of the row (the next one peeks in), on wider screens
// they share the row while each is at least min-w-96 wide. Past that the row scrolls.
const CarCarousel = ({ cars, selectedCar, today, onChoose }) => {
  const listRef = useRef(null);

  // Start with the selected car in view. Set scrollLeft directly: scrollIntoView would also
  // scroll the drawer mid-animation. The drawer remounts its content on open, so [] is enough.
  useLayoutEffect(() => {
    const list = listRef.current;
    const target = list.querySelector("[aria-current]")?.parentElement;
    if (target) list.scrollLeft = target.offsetLeft - (list.clientWidth - target.offsetWidth) / 2;
  }, []);

  return (
    // overflow-x-auto clips vertically too; the padding leaves room for the selection ring and shadow.
    <ul
      ref={listRef}
      aria-label="Auta"
      className="relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-2 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {cars.map((car) => (
        <li key={car.id} className="min-w-[92%] flex-1 snap-start sm:min-w-96">
          <CarCard
            car={car}
            isSelected={car.id === selectedCar?.id}
            today={today}
            onChoose={onChoose}
            alone={cars.length === 1}
          />
        </li>
      ))}
    </ul>
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
        className="-ml-2 flex min-w-0 items-center gap-3 rounded-2xl px-2 py-1 text-left transition-colors hover:bg-accent/50 disabled:hover:bg-transparent"
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
      <FormDrawer open={open} onOpenChange={setOpen} title="Twoje auta" className="max-w-[57rem]">
        <CarCarousel cars={cars} selectedCar={selectedCar} today={today} onChoose={choose} />
      </FormDrawer>
    </>
  );
};
