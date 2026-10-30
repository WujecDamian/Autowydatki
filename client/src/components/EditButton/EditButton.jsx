import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Icon } from "../Icon/Icon.jsx";

// Sits next to ConfirmDelete on list cards, so it is obvious that entries can be edited.
export const EditButton = ({ label, onClick }) => (
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    aria-label={label}
    onClick={onClick}
    className="text-muted-foreground hover:text-foreground"
  >
    <Icon icon={PencilEdit02Icon} size={18} />
  </Button>
);
