import { Home01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Icon } from "../Icon/Icon.jsx";
import { homeChargingName, stationHue, stationLogoUrl } from "../../features/stations/logos.js";

// Brand logos sit on a white tile because favicons are designed for light backgrounds.
export const StationLogo = ({ name, className }) => {
  if (name === homeChargingName) {
    return (
      <span
        aria-hidden="true"
        className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white", className)}
      >
        <Icon icon={Home01Icon} size={20} />
      </span>
    );
  }

  const logoUrl = stationLogoUrl(name);

  if (logoUrl) {
    return (
      <span
        className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl bg-white p-1.5", className)}
      >
        <img src={logoUrl} alt="" className="size-full object-contain" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl font-heading font-semibold text-white",
        className,
      )}
      style={{ backgroundColor: `oklch(0.55 0.15 ${stationHue(name)})` }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
};
