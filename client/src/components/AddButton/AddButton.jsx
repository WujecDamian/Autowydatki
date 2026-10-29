import { Add01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Icon } from "../Icon/Icon.jsx";

// Floating action button that sits above the bottom navigation on phones.
export const AddButton = ({ label, onClick }) => (
  <Button
    type="button"
    aria-label={label}
    onClick={onClick}
    className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 size-14 rounded-full shadow-lg shadow-primary/30 md:right-8 md:bottom-8"
  >
    <Icon icon={Add01Icon} size={26} />
  </Button>
);
