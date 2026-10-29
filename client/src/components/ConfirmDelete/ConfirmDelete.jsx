import { Delete02Icon } from "@hugeicons/core-free-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "../Icon/Icon.jsx";

export const ConfirmDelete = ({ title, description, onConfirm, disabled }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={title}
        disabled={disabled}
        className="text-muted-foreground hover:text-destructive"
      >
        <Icon icon={Delete02Icon} size={18} />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Anuluj</AlertDialogCancel>
        <AlertDialogAction variant="destructive" onClick={onConfirm}>
          Usuń
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
