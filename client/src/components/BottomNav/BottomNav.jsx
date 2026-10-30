import {
  Car01Icon,
  DashboardSquare01Icon,
  FuelStationIcon,
  Note01Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { NavLink } from "react-router";
import { Icon } from "../Icon/Icon.jsx";

const tabs = [
  { to: "/", label: "Pulpit", icon: DashboardSquare01Icon },
  { to: "/paliwo", label: "Paliwo", icon: FuelStationIcon },
  { to: "/serwis", label: "Serwis", icon: Wrench01Icon },
  { to: "/notatki", label: "Notatki", icon: Note01Icon },
  { to: "/auto", label: "Auto", icon: Car01Icon },
];

// A bottom tab bar on phones, a left rail from md up.
export const BottomNav = () => (
  <nav
    aria-label="Nawigacja"
    className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:sticky md:top-0 md:h-svh md:border-t-0 md:border-r md:pb-0"
  >
    <span
      aria-hidden="true"
      className="mx-auto mt-6 hidden size-12 items-center justify-center rounded-2xl bg-primary/20 text-primary-soft md:flex"
    >
      <Icon icon={Car01Icon} size={26} />
    </span>
    <ul className="mx-auto grid max-w-md grid-cols-5 md:mt-6 md:max-w-none md:grid-cols-1 md:gap-1 md:px-2">
      {tabs.map((tab) => (
        <li key={tab.to}>
          <NavLink
            to={tab.to}
            end
            className="group flex flex-col items-center gap-1 py-2 text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground"
          >
            <span className="flex h-8 w-12 items-center justify-center rounded-full transition-colors group-hover:bg-primary/25 group-aria-[current=page]:bg-primary/20 group-aria-[current=page]:text-primary-soft">
              <Icon icon={tab.icon} size={22} />
            </span>
            <span className="text-[11px] font-medium md:text-xs">{tab.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
