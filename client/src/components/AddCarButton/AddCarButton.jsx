import { useState } from "react";
import { useNavigate } from "react-router";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AddCarForm } from "../AddCarForm/AddCarForm.jsx";
import { FormDrawer } from "../FormDrawer/FormDrawer.jsx";
import { Icon } from "../Icon/Icon.jsx";

export const AddCarButton = ({ onAdded }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // A new car opens on the Auto tab, where its photo and dates are added.
  const onCarAdded = (carId) => {
    onAdded(carId);
    setOpen(false);
    navigate("/auto");
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label="Dodaj auto"
        className="rounded-full border bg-card/60"
        onClick={() => setOpen(true)}
      >
        <Icon icon={Add01Icon} size={22} />
      </Button>
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="Nowe auto"
        description="Zdjęcie i terminy dodasz w zakładce Auto."
      >
        <AddCarForm onAdded={onCarAdded} />
      </FormDrawer>
    </>
  );
};
